import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { NewPostDTO } from "./dtos/NewPostDTO";
import { UserId } from "../auth/decorators/user-id.decorator";
import { EditPostDTO } from "./dtos/EditPostDTO";
import { PaginationDTO } from "src/common/dtos/PaginationDTO";
import { FilesInterceptor } from "@nestjs/platform-express";
import { anyFileUploadConfig } from "src/config/multer.config";
import { SetRatingDTO } from "./dtos/SetRatingDTO";
import { OptionalAuthGuard } from "../auth/guards/optional-auth.guard";

@Controller("/posts")
export class PostsController {
    constructor(
        private readonly postsService: PostsService
    ) {}

    @Post("/create")
    @UseGuards(AuthGuard)
    @UseInterceptors(FilesInterceptor("files", 4, anyFileUploadConfig))
    async createNewPost(@Body() dto: NewPostDTO, @UserId() usId: number, @UploadedFiles() attachments?: Express.Multer.File[]) {
        return await this.postsService.createPost(dto, usId, attachments);
    }

    @Post("/:id/set-rating")
    @UseGuards(AuthGuard)
    async updateRating(@Query() dto: SetRatingDTO, @UserId() usId: number, @Param("id", ParseIntPipe) postId: number) {
        return await this.postsService.updateRating(usId, postId, dto.newState);
    }

    @Patch("/:id/edit")
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async editPost(@Param("id", ParseIntPipe) postId: number, @Body() dto: EditPostDTO, @UserId() usId: number) {
        await this.postsService.editPost(dto, postId, usId);
    }

    @Delete("/:id/delete")
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deletePost(@Param("id", ParseIntPipe) postId: number, @UserId() usId: number) {
        return await this.postsService.deletePost(postId, usId);
    }

    @Get("/")
    @UseGuards(OptionalAuthGuard)
    async getAllPosts(@Query() dto: PaginationDTO, @UserId() userId: number) {
        return await this.postsService.filterPosts(dto, undefined, userId);
    }

    @Get("/from-user/:id")
    @UseGuards(OptionalAuthGuard)
    async getAllPostsFromUser(@Param("id", ParseIntPipe) userId: number, @Query() dto: PaginationDTO, @UserId() authUserId: number) {
        return await this.postsService.filterPosts(dto, userId, authUserId);
    }

    @Get("/:id")
    @UseGuards(OptionalAuthGuard)
    async getPost(@Param("id", ParseIntPipe) postId: number, @UserId() userId: number) {
        return await this.postsService.getPost(postId, userId);
    }
}