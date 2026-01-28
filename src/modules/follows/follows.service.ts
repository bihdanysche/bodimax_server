import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginationDTO } from "src/common/dtos/PaginationDTO";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class FollowsService {
    constructor(
        private readonly prisma: PrismaService
    ) {}

    async followUser(followTo: number, userId: number) {
        if (followTo === userId) {
            throw new BadRequestException({
                code: ErrorCode.THIS_IS_YOU
            });
        }
        const relation = await this.prisma.followShip.findMany({
            where: {
                OR: [
                    { followedId: userId, followedToInt: followTo },
                    { followedId: followTo, followedToInt: userId }
                ]
            },
            select: { followedId: true, followedToInt: true }
        });

        if (relation.length === 2 || (relation.length > 0 && relation[0].followedToInt === followTo)) {
            throw new ConflictException({
                code: ErrorCode.ALREADY_FOLLOWED
            });
        }

        try {
            await this.prisma.followShip.create({
                data: {
                    followedId: userId,
                    followedToInt: followTo
                }
            });

            if (relation.length === 1) {
                await this.prisma.friendShip.create({
                    data: {
                        user1Id: userId,
                        user2Id: followTo,
                    }
                });
            }
        } catch {
            throw new BadRequestException({
                code: ErrorCode.INVALID_USER
            })
        }
    }

    async unfollowUser(followTo: number, userId: number) {
        if (followTo === userId) {
            throw new BadRequestException({
                code: ErrorCode.THIS_IS_YOU
            });
        }

        const relation = await this.prisma.followShip.findMany({
            where: {
                OR: [
                    { followedId: userId, followedToInt: followTo },
                    { followedId: followTo, followedToInt: userId }
                ]
            },
            select: { followedId: true, followedToInt: true }
        });

        if (
            (relation.length == 1 && relation[0].followedToInt != followTo) ||
            relation.length == 0
         ) {
            throw new ConflictException({
                code: ErrorCode.NOT_FOLLOWED
            });
        }

        await this.prisma.followShip.deleteMany({
            where: {
                followedId: userId,
                followedToInt: followTo
            }
        });
        
        if (relation.length === 2) {
            await this.prisma.friendShip.deleteMany({
                where: {
                    OR: [
                        { user1Id: userId, user2Id: followTo },
                        { user1Id: followTo, user2Id: userId }
                    ]
                }
            });
        }
    }

    async getMyFollows(userId: number, dto: PaginationDTO) {
        const query = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                followed: {
                    select: {
                        followedTo: {
                            select: { firstName: true, lastName: true, username: true, id: true }
                        },
                        id: true,
                    },
                    orderBy: { createdAt: "desc" },
                    cursor: dto.cursor ? { id: dto.cursor } : undefined,
                    take: dto.take + 1
                },
                _count: {
                    select: {
                        followed: true
                    }
                },
            }
        });

        if (!query) {
            throw new NotFoundException({
                code: ErrorCode.INVALID_USER
            });
        }

        let nextCursor: number | null = null;

        if (query.followed.length > dto.take) {
            const us = query.followed.pop();
            nextCursor = us!.id;
        }

        return {
            results: query.followed.map(inf => ({
                id: inf.followedTo.id,
                firstName: inf.followedTo.firstName,
                lastName: inf.followedTo.lastName,
                username: inf.followedTo.username,
            })),
            total: query._count.followed,
            nextCursor
        };
    }

    async getFollowedToMe(userId: number, dto: PaginationDTO) {
        const query = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                followsTo: {
                    select: {
                        followed: {
                            select: { firstName: true, lastName: true, username: true, id: true }
                        },
                        id: true,
                    },
                    orderBy: { createdAt: "desc" },
                    cursor: dto.cursor ? { id: dto.cursor } : undefined,
                    take: dto.take + 1
                },
                _count: {
                    select: {
                        followsTo: true
                    }
                },
            }
        })

        if (!query) {
            throw new NotFoundException({
                code: ErrorCode.INVALID_USER
            });
        }

        let nextCursor: number | null = null;
        if (query.followsTo.length > dto.take) {
            const us = query.followsTo.pop();
            nextCursor = us!.id;
        }

        return {
            results: query.followsTo.map(inf => ({
                id: inf.followed.id,
                firstName: inf.followed.firstName,
                lastName: inf.followed.lastName,
                username: inf.followed.username,
            })),
            total: query._count.followsTo,
            nextCursor
        };
    }

    async getFriends(userId: number, dto: PaginationDTO) {
        try {
            const query = await this.prisma.friendShip.findMany({
                where: {
                    OR: [
                        { user1Id: userId },
                        { user2Id: userId }
                    ]
                },
                select: {
                    user1: {
                        select: {
                            id: true, username: true, firstName: true, lastName: true
                        }
                    },
                    user2: {
                        select: {
                            id: true, username: true, firstName: true, lastName: true
                        }
                    },
                    id: true
                },
                orderBy: { id: 'desc' },
                take: dto.take + 1,
                cursor: dto.cursor ? { id: dto.cursor } : undefined
            });

            const count = await this.prisma.friendShip.count({
                where: {
                    OR: [
                        { user1Id: userId },
                        { user2Id: userId }
                    ]
                }
            });

            let nextCursor: number | null = null;
            if (query.length > dto.take) {
                const us = query.pop();
                nextCursor = us!.id;
            }

            return {
                results: query.map(f => f.user1.id === userId ? f.user2 : f.user1),
                total: count,
                nextCursor
            }
        } catch {
            throw new NotFoundException({
                code: ErrorCode.INVALID_USER
            });
        }
    }
}