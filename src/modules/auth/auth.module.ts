import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtCookieStrategy } from "./strategies/jwt.strategy";

@Module({
    imports: [
        PrismaModule
    ],
    controllers: [AuthController],
    providers: [JwtCookieStrategy, AuthService]
})

export class AuthModule {};