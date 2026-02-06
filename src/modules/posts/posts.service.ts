import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
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

    async getPost(postId: number, userId?: number) {
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
    
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {_count, views:_, ...rest} = post;
        const rating = await this.getPostRating(postId);
        const views = await this.getPostViews(postId, post.views, userId);
        
        return {
            commentsCount: _count.comments,
            rating,
            views,
            ...rest
        }
    }

    async filterPosts(dto: PaginationDTO, authorId?: number, userId?: number) {
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

            const ratings: Array<any> = [];
            for (let i = 0; i < posts.length; i++) {
                const rating = await this.getPostRating(posts[i].id);
                ratings.push(rating);
            }

            const views: Array<any> = [];
            for (let i = 0; i < posts.length; i++) {
                const count = await this.getPostViews(posts[i].id, posts[i].views, userId);
                views.push(count);
            }

            let nextCursor: number | null = null;
            if (posts.length > dto.take) {
                nextCursor = posts.pop()!.id;
            }

            return {
                results: posts.map((p,i) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {_count, views:_, ...rest} = p;
                    
                    return {
                        commentsCount: _count.comments,
                        rating: ratings[i],
                        views: views[i],
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
        const rec = await this.prisma.postRating.findUnique({
            where: { postId_userId: {postId, userId} },
            select: { type: true }
        });

        if ((rec && rec.type === state) || (!rec && !state)) {
            throw new BadRequestException({
                code: ErrorCode.ALREADY_SETTED_THIS_RATING_STATE
            });
        }

        if (!state) {
            let type: "likes" | "dislikes" = "likes";
            let inc = 0;

            if (rec) {
                inc = -1;
                if (rec.type === "Dislike") {
                    type = "dislikes";
                }
                await this.prisma.postRating.delete({
                    where: {
                        postId_userId: { postId, userId }
                    }
                });
            }

            return await this.incPostRating(postId, type, inc, true);
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

        if (rec) {
            await this.incPostRating(postId, state === "Like" ? "dislikes" : "likes", -1);
        }

        return await this.incPostRating(postId, state === "Like" ? "likes" : "dislikes", 1, true);
    }

    async getPostRating(postId: number) {
        const key = `post:${postId}`;
        const exists = await this.redis.exists(key);

        if (!exists) {
            const query = await this.prisma.postRating.groupBy({
                by: "type",
                where: { postId },
                _count: true,
            });
            
            const rating = query.reduce(
                (acc, item) => {
                    acc[item.type === "Like" ? "likes" : "dislikes"] = item._count;
                    return acc;
                }, 
                { likes: 0, dislikes: 0 }
            );

            await this.redis.multi()
                .hset(key, rating)
                .expire(key, 60)
                .exec();
            
            return rating;
        } else {
            const res = await this.redis.hmget(key, "likes", "dislikes");
            return {
                likes: res[0],
                dislikes: res[1]
            }
        }
    }

    async incPostRating(postId: number, type: "likes" | "dislikes", val: number, updRating?: boolean) {
        const key = `post:${postId}`;
        const exists = await this.redis.exists(key);

        if (exists) {
            await this.redis.hincrby(key, type, val);
        }

        if (updRating) {
            return await this.getPostRating(postId); 
        }
    }

    async getPostViews(postId: number, initialViews: number, userId?: number) {
        const additionalViewsKey = `postpf:${postId}`;

        if (userId) {
            await this.redis.pfadd(additionalViewsKey, userId);
        }

        const count = await this.redis.pfcount(additionalViewsKey);

        return initialViews + count;
    }
}