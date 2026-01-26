import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard as PassportAuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { AuthService } from "../auth.service";

@Injectable()
export class AuthGuard extends PassportAuthGuard("jwt-cookie") {
    constructor(
        private readonly authService: AuthService
    ) {
        super();
    }

    handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
        const response = context.switchToHttp().getResponse<Response>();
        
        if (err || !user || info) {
            this.authService.clearCookies(response);
            throw new UnauthorizedException({
                code: ErrorCode.INVALID_TOKEN
            });
        }
        
        return user;
    }
}