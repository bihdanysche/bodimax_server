import { Controller } from "@nestjs/common";
import { NotificationsService } from "./notifcations.service";

@Controller("/notifications")
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService
    ) {}
}