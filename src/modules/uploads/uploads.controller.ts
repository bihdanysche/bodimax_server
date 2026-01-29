import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { MinioService } from "src/minio/minio.service";

@Controller("/uploads")
export class UploadsController {
    constructor (
        private readonly minio: MinioService
    ) {}

    @Get("/*path")
    async getFile(@Param('path') pathArr: string[], @Res() res: Response) {
        const path = pathArr.join('/');
       try {
            const stream = await this.minio.getStream(path);

            res.setHeader(
                'Content-Disposition',
                `filename="${pathArr.pop()}"`
            ); //attachment
            //`inline; filename="${path.split('/').pop()}"`
            stream.pipe(res);
       } catch {
        throw new NotFoundException({
            code: ErrorCode.FILE_NOT_FOUND
        });
       }
    }
}