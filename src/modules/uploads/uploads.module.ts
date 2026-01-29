import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { MinioModule } from "src/minio/minio.module";

@Module({
    imports: [ MinioModule ],
    controllers: [ UploadsController ]
})

export class UploadsModule {};