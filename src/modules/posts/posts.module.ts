import { Module } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { PostsController } from "./posts.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { MinioModule } from "src/minio/minio.module";
import { RedisModule } from "src/redis/redis.module";

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        MinioModule,
        RedisModule
    ],
    providers: [PostsService],
    controllers: [PostsController]
})
export class PostsModule {};