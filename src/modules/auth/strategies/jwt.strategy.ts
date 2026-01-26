import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Strategy } from "passport-jwt";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtCookieStrategy extends PassportStrategy(Strategy, "jwt-cookie") {
    constructor(private readonly prismaService: PrismaService) {
        super({
            jwtFromRequest: (req: Request) => {
                const tok = req.cookies?.access_token as string;

                if (!tok) {
                    throw new UnauthorizedException({
                        code: ErrorCode.INVALID_TOKEN
                    });
                }

                return tok;
            },
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET!
        });
    }

    async validate(payload: { sessionId: number }): Promise<Express.User> {
        const session = await this.prismaService.refreshToken.findUnique({
            where: {id: payload.sessionId},
            select: {userId: true}
        });

        if (!session) {
            throw new UnauthorizedException({
                code: ErrorCode.INVALID_TOKEN
            })
        }
        
        return { userId: session.userId, sessionId: payload.sessionId };
    }
}