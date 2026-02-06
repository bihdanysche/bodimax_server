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
type Rating = {
    likes: number;
    dislikes: number;
    views: number;
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
        const rating = await this.getPostRating(postId, post.views, userId);
        
        return {
            commentsCount: _count.comments,
            ...rating,
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

            const ratings: Record<number, Rating> = await this.getPostsRating(
                posts.map(p => [ p.id, p.views ]),
                userId
            );

            let nextCursor: number | null = null;
            if (posts.length > dto.take) {
                nextCursor = posts.pop()!.id;
            }

            return {
                results: posts.map(p => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {_count, views:_, ...rest} = p;
                    const rat = ratings[p.id] || {
                        likes: 0,
                        dislikes: 0,
                        views: p.views
                    };

                    return {
                        commentsCount: _count.comments,
                        ...rat,
                        ...rest
                    }
                }),
                nextCursor
            }
        } catch(e) {
            console.log(e)
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
    
    async getPostsRating(postIds: number[][], userId?: number): Promise<Record<number, Rating>> {
        const result: Record<number, Rating> = {};
        const missedIdsForRating: number[] = [];

        if (postIds.length === 0) {
            return result;
        }

        const pipe = this.redis.pipeline();
        for (const post of postIds) {
            const postId = post[0];

            const ratingKey = `post:${postId}`;
            const viewKey = `postpf:${postId}`;
            pipe.hmget(ratingKey, "likes", "dislikes");
            if (userId) {
                pipe.pfadd(viewKey, userId);
            } else pipe.set("_____bb", 0);
            pipe.pfcount(viewKey);
            pipe.sadd("postvs", postId);
        }

        const res = await pipe.exec();
        if (!res) {
            return result;
        }

        for (let i = 0; i < postIds.length; i++) {
            const postId = postIds[i][0];
            const r = res[i*3][1] as [string, string];
            const likes = r[0];
            const dislikes = r[1];
            const views = res[i*3+2][1];
            
            const rating: Rating = {
                likes: 0,
                dislikes: 0,
                views: postIds[i][1]
            };

            if (likes !== null && dislikes !== null) {
                rating.likes = Number(likes);
                rating.dislikes = Number(dislikes);
            } else missedIdsForRating.push(postId);

            if (views !== null) {
                rating.views += Number(views);
            }

            result[postId] = rating;
        };

        if (missedIdsForRating.length === 0) {
            return result;
        }

        const ratings = await this.prisma.postRating.groupBy({
            by: ["postId", "type"],
            _count: true,
            where: { postId: { in: missedIdsForRating } }
        });

        const cachePipe = this.redis.pipeline();

        for (const rat of ratings) {
            const postId = rat.postId;
            const ratingKey = `post:${postId}`;
            const field: keyof Omit<Rating, "views"> = rat.type === "Like" ? "likes" : "dislikes";

            result[postId][field] = rat._count;
            cachePipe.hset(ratingKey, { [field]: rat._count });
            cachePipe.expire(ratingKey, 60);
        }
        
        void cachePipe.exec();
        return result;
    }

    async getPostRating(postId: number, initialViews: number, userId?: number) {
        const resp = await this.getPostsRating([ [postId, initialViews] ], userId);
        return resp[postId];
    }

    async incPostRating(postId: number, type: "likes" | "dislikes", val: number, updRating?: boolean) {
        const key = `post:${postId}`;
        const exists = await this.redis.exists(key);

        if (exists) {
            await this.redis.hincrby(key, type, val);
        }

        if (updRating) {
            return await this.getPostRating(postId, 0);
        }
    }
}