import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

export const UserId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const req: Request = ctx.switchToHttp().getRequest();
        if (!req.user) {
            throw new UnauthorizedException();
        }
        return req.user.userId;
    }
)