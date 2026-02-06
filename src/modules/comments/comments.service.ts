import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NewCommentDTO } from "./dto/NewCommentDTO";
import { EditCommentDTO } from "./dto/EditCommentDTO";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { FilterCommentsDTO } from "./dto/FilterCommentsDTO";
import { REDIS } from "src/redis/redis.module";
import Redis from "ioredis";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class CommentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        @Inject(REDIS) private readonly redis: Redis
    ) {}

    async createComment(dto: NewCommentDTO, authorId: number) {
        try {
            let parentId: number | undefined = undefined;

            if (dto.replyTo) {
                const comment = await this.prisma.comment.findUniqueOrThrow({
                    where: {
                        id: dto.replyTo
                    }
                });

                if (comment.postId !== dto.postId) {
                    throw new Error();
                }

                parentId = comment.parentId ? comment.parentId : dto.replyTo;
            }

            const newComm = await this.prisma.comment.create({
                data: {
                    content: dto.content,
                    postId: dto.postId,
                    repliedToId: dto.replyTo,
                    authorId,
                    parentId,
                }
            });

            this.eventEmitter.emit("comment.created", { postId: dto.postId });
            return newComm;
        } catch {
            throw new BadRequestException({
                code: ErrorCode.INVALID_POST_OR_REPLY
            })
        }
    }

    async editComment(commentId: number, dto: EditCommentDTO, userId: number) {
        try {
            return await this.prisma.comment.update({
                where: {
                    id: commentId,
                    authorId: userId
                },
                data: {
                    content: dto.content,
                    editedAt: new Date()
                }
            });
        } catch {
            throw new NotFoundException({
                code: ErrorCode.INVALID_COMMENT
            })
        }
    }

    async deleteComment(commentId: number, userId: number) {
        try {
            const res = await this.prisma.comment.delete({
                where: {
                    id: commentId,
                    authorId: userId
                }
            });
            this.eventEmitter.emit("comment.deleted", { postId: res.postId });
        } catch {
            throw new NotFoundException({
                code: ErrorCode.INVALID_COMMENT
            })
        }
    }

    async getCommentsFromPost(postId: number, dto: FilterCommentsDTO) {
         const comments = await this.prisma.comment.findMany({
            where: {
                postId,
                parentId: dto.parentId || null
            },
            take: dto.take + 1,
            cursor: dto.cursor ? { id: dto.cursor } : undefined,
            orderBy: { createdAt: dto.parentId ? "asc" : "desc" },
            include: {
                author: {
                    select: { firstName: true, lastName: true, username: true, avatarUrl: true }
                },
                _count: {
                    select: { parentReplies: true }
                },
                parentReplies: {
                    take: 1,
                    orderBy: { createdAt: "asc" },
                    include: {
                        author: {
                            select: { firstName: true, lastName: true, avatarUrl: true, username: true }
                        },
                        repliedTo: {
                            include: {
                                author: {
                                    select: { firstName: true, lastName: true, avatarUrl: true, username: true }
                                }
                            }
                        }
                    }
                }
            }
         });

         let nextCursor: number | null = null;

         if (comments.length > dto.take) {
            const obj = comments.pop();
            nextCursor = obj!.id;
         }

         return {
            results: comments.map(obj => {
                const {_count, parentReplies, ...rest} = obj;
                return {
                    repliesCount: _count.parentReplies,
                    replies: parentReplies,
                    ...rest
                }
            }),
            nextCursor
         }
    }
}