import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { NewPostDTO } from "./dtos/NewPostDTO";
import { EditPostDTO } from "./dtos/EditPostDTO";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { PaginationDTO } from "src/common/dtos/PaginationDTO";
import { MinioService } from "src/minio/minio.service";
import { randomUUID } from "crypto";

type UploadedFile = {
    url: string;
    mimeType: string;
};

@Injectable()
export class PostsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly minio: MinioService
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
                        avatarUrl: true
                    }
                },
                attachments: {
                    select: {
                        url: true, mimeType: true
                    }
                }
            }
        });

        if (!post) {
            throw new NotFoundException({
                code: ErrorCode.INVALID_POST
            })
        }

        return post;
    }

    async filterPosts(dto: PaginationDTO, authorId?: number) {
        try {
            const posts = await this.prisma.post.findMany({
                where: {
                    authorId: authorId ? authorId : undefined
                },
                orderBy: { createdAt: "desc" },
                take: dto.take+1,
                cursor: dto.cursor ? { id: dto.cursor } : undefined,
                include: {
                    author: {
                        select: {
                            firstName: true, lastName: true, username: true,
                            avatarUrl: true
                        }
                    },
                    attachments: {
                        select: {
                            url: true, mimeType: true
                        }
                    }
                }
            });

            let nextCursor: number | null = null;
            if (posts.length > dto.take) {
                nextCursor = posts.pop()!.id;
            }

            return {
                results: posts,
                nextCursor
            }
        } catch {
            return {
                results: [],
                nextCursor: null
            }
        }
    }
}