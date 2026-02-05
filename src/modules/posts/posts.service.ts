import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NewPostDTO } from "./dtos/NewPostDTO";
import { EditPostDTO } from "./dtos/EditPostDTO";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { PaginationDTO } from "src/common/dtos/PaginationDTO";
import { MinioService } from "src/minio/minio.service";
import { randomUUID } from "crypto";
import { PostRatingType } from "@prisma/client";
import Redis from "ioredis";
import { REDIS } from "src/redis/redis.module";

type UploadedFile = {
    url: string;
    mimeType: string;
};

@Injectable()
export class PostsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly minio: MinioService,
        @Inject(REDIS) private readonly redis: Redis
    ) {}

    async createPost(dto: NewPostDTO, authorId: number, attachments?: Express.Multer.File[]) {
        const uploadedFiles: UploadedFile[] = [];

        if (attachments && attachments.length > 0) {
            for (const f of attachments) {
                const url = `/post_attachments/${randomUUID()}_${f.originalname}`;
                
                await this.minio.upload(url, f.buffer, f.mimetype);
                uploadedFiles.push({
                    mimeType: f.mimetype,
                    url
                })
            }
        }

        return await this.prisma.post.create({
            data: {
                content: dto.content.trim(),
                attachments: {
                    createMany: {
                        data: uploadedFiles.map(f => ({
                            url: f.url,
                            mimeType: f.mimeType
                        }))
                    }
                },
                authorId
            },
            include: {
                attachments: {
                    select: {
                        url: true, mimeType: true
                    }
                }
            }
        });
    }

    async editPost(dto: EditPostDTO, postId: number, authorId: number) {
        try {
            await this.prisma.post.update({
                where: {
                    id: postId,
                    authorId
                },
                data: {
                    content: dto.content?.trim(),
                    editedAt: new Date()
                }
            });
        } catch {
            throw new NotFoundException({
                code: ErrorCode.INVALID_POST
            })
        }
    }

    async deletePost(postId: number, authorId: number) {
        try {
            await this.prisma.post.delete({
                where: {
                    id: postId,
                    authorId
                }
            });
        } catch {
            throw new NotFoundException({
                code: ErrorCode.INVALID_POST
            })
        }
    }

    async getPost(postId: number) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: {
                    select: {
                        firstName: true, lastName: true, username: true,
                        avatarUrl: true, id: true
                    }
                },
                attachments: {
                    select: {
                        url: true, mimeType: true
                    }
                },
                _count: {
                    select: {
                        comments: true
                    }
                }
            }
        });

        if (!post) {
            throw new NotFoundException({
                code: ErrorCode.INVALID_POST
            })
        }

        const {_count, ...rest} = post;
        
        return {
            commentsCount: _count.comments,
            ...rest
        }
    }

    async filterPosts(dto: PaginationDTO, authorId?: number) {
        try {
            const posts = await this.prisma.post.findMany({
                where: {
                    authorId: authorId ? authorId : undefined
                },
                orderBy: { createdAt: "desc" }, // MUST FIX
                take: dto.take+1,
                cursor: dto.cursor ? { id: dto.cursor } : undefined,
                include: {
                    author: {
                        select: {
                            firstName: true, lastName: true, username: true, id: true,
                            avatarUrl: true
                        }
                    },
                    attachments: {
                        select: {
                            url: true, mimeType: true
                        }
                    },
                    _count: {
                        select: {
                            comments: true
                        }
                    }
                }
            });

            let nextCursor: number | null = null;
            if (posts.length > dto.take) {
                nextCursor = posts.pop()!.id;
            }

            return {
                results: posts.map(p => {
                    const {_count, ...rest} = p;
                    return {
                        commentsCount: _count.comments,
                        ...rest
                    }
                }),
                nextCursor
            }
        } catch {
            return {
                results: [],
                nextCursor: null
            }
        }
    }

    async updateRating(userId: number, postId: number, state?: PostRatingType) {
        if (!state) {
            await this.prisma.postRating.delete({
                where: {
                    postId_userId: { postId, userId }
                }
            }).catch(() => {});
            return;
        }

        await this.prisma.postRating.upsert({
            where: { postId_userId: { postId, userId } },
            update: {
                type: state
            },
            create: {
                postId, userId, type: state
            },
            select: { id: true }
        });

        const new_count = await this.prisma.$transaction([
            this.prisma.postRating.count({
                where: {
                    postId,
                    type: "Like"
                }
            }),
            this.prisma.postRating.count({
                where: {
                    postId,
                    type: "Dislike"
                }
            })
        ]);

        await this.redis.set(`post:${postId}:likes`, new_count[0], "EX", 60);
        await this.redis.set(`post:${postId}:dislikes`, new_count[1], "EX", 60);
    }
}