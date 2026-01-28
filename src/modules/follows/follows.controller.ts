import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { FollowsService } from "./follows.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { UserId } from "../auth/decorators/user-id.decorator";
import { PaginationDTO } from "src/common/dtos/PaginationDTO";

@Controller("/follows")
export class FollowsController {
    constructor(
        private readonly followsService: FollowsService
    ) {}

    @Post("/follow/:id")
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async followUser(@Param("id") followUserId: number, @UserId() userId: number) {
        await this.followsService.followUser(followUserId, userId);
    }

    @Post("/unfollow/:id")
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async unfollowUser(@Param("id") unfollowUserId: number, @UserId() userId: number) {
        await this.followsService.unfollowUser(unfollowUserId, userId);
    }

    @Get("/")
    @UseGuards(AuthGuard)
    async getMyFollows(@UserId() userId: number, @Query() dto: PaginationDTO) {
        return await this.followsService.getMyFollows(userId, dto);
    }
    @Get("/to-me")
    @UseGuards(AuthGuard)
    async getFollowsToMe(@UserId() userId: number, @Query() dto: PaginationDTO) {
        return await this.followsService.getFollowedToMe(userId, dto);
    }
    @Get("/friends")
    @UseGuards(AuthGuard)
    async getFriends(@UserId() userId: number, @Query() dto: PaginationDTO) {
        return await this.followsService.getFriends(userId, dto);
    }

    @Get("/:id/follows")
    async getOthFollows(@Param("id", ParseIntPipe) userId: number, @Query() dto: PaginationDTO) {
        return await this.followsService.getMyFollows(userId, dto);
    }
    @Get("/:id/followers")
    async getOthFollowers(@Param("id", ParseIntPipe) userId: number, @Query() dto: PaginationDTO) {
        return await this.followsService.getFollowedToMe(userId, dto);
    }
    @Get("/:id/friends")
    async getOthFriends(@Param("id", ParseIntPipe) userId: number, @Query() dto: PaginationDTO) {
        return await this.followsService.getFriends(userId, dto);
    }
}