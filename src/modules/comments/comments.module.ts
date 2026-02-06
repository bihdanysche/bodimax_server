import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { RedisModule } from "src/redis/redis.module";

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        RedisModule
    ],
    providers: [ CommentsService ],
    controllers: [ CommentsController ]
})
export class CommentsModule {}