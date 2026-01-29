import { Module } from "@nestjs/common";
import { AuthModule } from "src/modules/auth/auth.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { NotificationsService } from "./notifcations.service";
import { NotificationsController } from "./notifcations.controller";

@Module({
    imports: [
        PrismaModule,
        AuthModule
    ],
    providers: [NotificationsService],
    controllers: [NotificationsController],
    exports: [NotificationsService]
})
export class NotificationsModule {};