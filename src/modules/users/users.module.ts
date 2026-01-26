import { Module } from "@nestjs/common";
import { AuthModule } from "src/modules/auth/auth.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Module({
    imports: [
        PrismaModule,
        AuthModule
    ],
    providers: [UsersService],
    controllers: [UsersController]
})
export class UsersModule {};