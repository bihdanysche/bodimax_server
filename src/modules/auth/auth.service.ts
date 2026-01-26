import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";
import { RegisterDTO } from "./dtos/RegisterDTO";
import type { User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import * as crypto from "crypto";
import { Request, Response } from "express";
import { LoginDTO } from "./dtos/LoginDTO";
import { AppConfig } from "src/config/config";

@Injectable()
export class AuthService {
    IS_PROD = process.env.NODE_ENV === 'production';
    ACCESS_TOKEN_AGE = AppConfig.ACCESS_TOKEN_AGE;
    REFRESH_TOKEN_AGE = AppConfig.REFRESH_TOKEN_AGE;
    
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService
    ) {}
    
    async login(dto: LoginDTO, res: Response) {
        const user = await this.prisma.user.findUnique({
            where: {username: dto.username}
        });

        if (!user) {
            throw new UnauthorizedException({code: ErrorCode.NOT_EXISTING_USER});
        }

        const isPassValid = await bcrypt.compare(dto.password, user.password);
        
        if (!isPassValid) {
            throw new UnauthorizedException({code: ErrorCode.INVALID_PASSWORD});
        }
        
        await this.issueToken(user.id, res);
    }

    async register(dto: RegisterDTO, res: Response) {
        let user: User;
        try {
            const hash = await bcrypt.hash(dto.password, 10);
            user = await this.prisma.user.create({
                data: {
                    username: dto.username,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    password: hash
                }
            });
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError && e.code == "P2002") {
                throw new ConflictException({code: ErrorCode.USERNAME_TAKEN});
            }
            throw e;
        }

        await this.issueToken(user.id, res);
    }

    async logout(req: Request, res: Response) {
        try {
            const token = req.cookies?.refresh_token as string;
            await this.prisma.refreshToken.delete({
                where: {hash: token}
            });
        } finally {
            this.clearCookies(res);
        }
    }
    
    async logoutOtherSessions(userId: number, req: Request) {
        const token = req.cookies?.refresh_token as string;
        await this.prisma.refreshToken.deleteMany({
            where: {
                userId,
                NOT: {hash: token}
            }
        });
    }

    async rotateRefreshToken(req: Request, res: Response) {
        const tokenHash = req.cookies?.refresh_token as string;
        const tok = await this.prisma.refreshToken.findUnique({
            where: { hash: tokenHash }
        });

        if (!tok || tok.expiresAt < new Date()) {
            this.clearCookies(res);
            if (tok) {
                await this.prisma.refreshToken.delete({
                    where: {id: tok.id}
                });
            }
            throw new UnauthorizedException({code: ErrorCode.REFRESH_TOKEN_INVALID});
        }

        await this.issueToken(req.user!.userId, res, tok.id);
    }

    async getSessions(sessionId: number, userId: number) {
        const list = await this.prisma.refreshToken.findMany({
            where: { userId },
            omit: { hash: true, userId: true }
        });
        return list.map(el => ({...el, isCurrentSession: el.id === sessionId}));
    }

    async shutdownSession(userId: number, sessionId: number, currentSessionId: number) {
        if (sessionId === currentSessionId) {
            throw new BadRequestException({
                code: ErrorCode.CANNOT_SHUTDOWN_CURRENT_SESSION
            });
        }

        try {
            await this.prisma.refreshToken.delete({
                where: { id: sessionId, userId}
            });
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
                throw new NotFoundException({
                    code: ErrorCode.INVALID_SESSION
                });
            }
        }
    }

    async issueToken(userId: number, res: Response, refreshTokenId?: number) {
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_AGE);

        if (!refreshTokenId) {
            const tok = await this.prisma.refreshToken.create({
                data: {
                    userId, hash: refreshToken, expiresAt
                }
            });
            refreshTokenId = tok.id;
        } else {
            await this.prisma.refreshToken.update({
                where: {id: refreshTokenId},
                data: {
                    hash: refreshToken, expiresAt
                }
            })
        }

        
        const accessToken = this.jwt.sign({ sessionId: refreshTokenId });
        
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            sameSite: "strict",
            secure: this.IS_PROD,
            maxAge: this.ACCESS_TOKEN_AGE,
            path: "/"
        });

        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            sameSite: "strict",
            secure: this.IS_PROD,
            maxAge: this.REFRESH_TOKEN_AGE,
            path: "/auth"
        });
    }

    clearCookies(res: Response) {
        res.clearCookie("access_token", {
            httpOnly: true,
            sameSite: "strict",
            secure: this.IS_PROD,
            maxAge: this.ACCESS_TOKEN_AGE,
            path: "/"
        });

        res.clearCookie("refresh_token", {
            httpOnly: true,
            sameSite: "strict",
            secure: this.IS_PROD,
            maxAge: this.REFRESH_TOKEN_AGE,
            path: "/auth"
        });
    }
}