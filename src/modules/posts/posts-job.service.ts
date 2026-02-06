import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import Redis from "ioredis";
import { PrismaService } from "src/prisma/prisma.service";
import { REDIS } from "src/redis/redis.module";
import type { PrismaPromise } from "@prisma/client";

const BATCH_SIZE = 25;
const PROC_PER_REQ_ROUNDS = 8;

@Injectable()
export class PostsJobService {
    private readonly logger = new Logger(PostsJobService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(REDIS) private readonly redis: Redis
    ) {}
    
    @Cron("*/10 * * * *")
    async syncViews() {
        const t = Date.now();

        const ids = await this.redis.spop("postvs", BATCH_SIZE*PROC_PER_REQ_ROUNDS);
        if (ids.length === 0) {
            this.logger.log("No data to do job.");
            return;
        }

        for (let i = 0; i < PROC_PER_REQ_ROUNDS; i++) {
            const chunkIds = ids.slice(-BATCH_SIZE);
            if (chunkIds.length === 0) break;
            ids.length = Math.max(ids.length - chunkIds.length, 0);
            await this.procChunk(chunkIds);
        }
        
        this.logger.log(`Views sync job finished in ${(Date.now()-t)/1000}s.`);
    }

    async procChunk(ids: string[]) {
        const pipe = this.redis.pipeline();

        for (const id of ids) {
            const key = `postpf:${id}`;
            pipe.pfcount(key);
            pipe.del(key);
        }

        const res = await pipe.exec();
        if (!res) return;

        const chunk: PrismaPromise<any>[] = [];

        for (let i = 0; i < ids.length; i++) {
            const postid = Number(ids[i]);
            const views = res[i*2][1];

            if (views === null) continue;

            chunk.push(this.prisma.post.update({
                where: { id: postid },
                data: { views: { increment: Number(views) } },
                select: { id: true }
            }));
        }

        await Promise.all(chunk);
    }
}