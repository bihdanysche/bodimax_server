import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersFilterDTO } from "./dtos/UsersFilterDTO";
import { EditUserDTO } from "./dtos/EditUserDTO";

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService
    ) {};

    async me(userId: number) {
        return await this.getById(userId);
    }

    async editUser(userId: number, dto: EditUserDTO) {
        if (dto.username) {
            const us = await this.prisma.user.findUnique({
                where: { username: dto.username },
                select: { id: true }
            });

            if (us) {
                throw new ConflictException({
                    code: ErrorCode.USERNAME_TAKEN
                });
            }
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: dto
        });
    }

    async getByUsername(username: string) {
        const us = await this.prisma.user.findUnique({
            where: { username },
            select: {
                firstName: true, lastName: true, username: true, id: true,
                createdAt: true,
                _count: {
                    select: {
                        followed: true,
                        followsTo: true,
                        friends1: true,
                        friends2: true
                    }
                }
            }
        });
        
        if (!us) {
            throw new NotFoundException({
                code: ErrorCode.NOT_EXISTING_USER
            })
        }

        return us;
    }

    async getById(id: number) {
        const us = await this.prisma.user.findUnique({
            where: { id },
            select: {
                firstName: true, lastName: true, username: true, id: true,
                createdAt: true,
                _count: {
                    select: {
                        followed: true,
                        followsTo: true,
                        friends1: true,
                        friends2: true
                    }
                }
            },
        });

        if (!us) {
            throw new NotFoundException({
                code: ErrorCode.NOT_EXISTING_USER
            })
        }

        const {_count, ...rest} = us;

        return {
            ...rest,
            followedCount: _count.followed,
            followersCount: _count.followsTo,
            friendsCount: _count.friends1+_count.friends2
        };
    }

    async filterUsers(dto: UsersFilterDTO) {
        const searchString = dto.searchString || "";
        const words = searchString
                    .trim()
                    .split(/\s+/)
                    .slice(0, 3);

        if (words.length === 0) {
            words.push('');
        }
        
        try {
            const users = await this.prisma.user.findMany({
                where: {
                    OR: words.flatMap((w) => [
                        { firstName: { contains: w, mode: "insensitive" } },
                        { lastName: { contains: w, mode: "insensitive" } },
                        { username: { contains: w, mode: "insensitive" } },
                    ])
                },
                select: {
                    firstName: true, lastName: true, username: true, id: true,
                },
                orderBy: { username: "asc" },
                take: dto.take+1,
                cursor: dto.cursor ? { id: dto.cursor } : undefined
            });

            let nextCursor: number | null = null;
            if (users.length > dto.take) {
                nextCursor = users.pop()!.id;
            }

            return {
                results: users,
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