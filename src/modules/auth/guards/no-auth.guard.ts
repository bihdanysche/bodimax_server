import { CanActivate, ConflictException, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { ErrorCode } from "src/exception-filter/errors.enum";

@Injectable()
export class NoAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const res: Request = context.switchToHttp().getRequest();
        
        if (res.cookies.access_token || res.cookies.refresh_token) {
            throw new ConflictException({code: ErrorCode.ALREADY_AUTHORIZED});
        }

        return true;
    }
}