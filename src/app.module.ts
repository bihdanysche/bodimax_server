import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from './config/app.config';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { TestModule } from './modules/test/test.module';
import { FollowsModule } from './modules/follows/follows.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: AppConfig.ACCESS_TOKEN_AGE }
    }),
    PrismaModule,
    AuthModule,
    UploadsModule,
    UsersModule,
    PostsModule,
    CommentsModule,
    FollowsModule,

    //ONLYTEST!
    TestModule
  ],
  controllers: [],
  providers: [],
})

export class AppModule {}