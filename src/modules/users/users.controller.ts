import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, UseGuards } from "@nestjs/common";
import { UserId } from "src/modules/auth/decorators/user-id.decorator";
import { UsersService } from "./users.service";
import { AuthGuard } from "src/modules/auth/guards/auth.guard";
import { UsersFilterDTO } from "./dtos/UsersFilterDTO";
import { EditUserDTO } from "./dtos/EditUserDTO";

@Controller("users")
export class UsersController {
    constructor(
        private readonly usersService: UsersService
    ) {};

    @Get("/by-username/:username")
    async getUserByUsername(@Param("username") username: string) {
        return await this.usersService.getByUsername(username);
    };

    @Get("/by-id/:id")
    async getUserById(@Param("id", ParseIntPipe) id: number) {
        return await this.usersService.getById(id);
    };

    @Get("/filter-users")
    async allUsers(@Body() filter: UsersFilterDTO) {
        return await this.usersService.filterUsers(filter);
    };

    @Get("/me")
    @UseGuards(AuthGuard)
    async me(@UserId() userId: number) {
        return await this.usersService.me(userId);
    };

    @Patch("/me/edit")
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async editMe(@UserId() userId: number, @Body() dto: EditUserDTO) {
        return await this.usersService.editUser(userId, dto);
    };
}