/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

export const SessionId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const req: Request = ctx.switchToHttp().getRequest();
        if (!req.user) {
            throw new UnauthorizedException();
        }
        return req.user.sessionId;
    }
)