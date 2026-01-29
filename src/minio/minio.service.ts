import { Injectable, OnModuleInit } from "@nestjs/common";
import { Client } from "minio";
import { AppConfig } from "src/config/app.config";

const BUCKET = AppConfig.minio.bucket;

@Injectable()
export class MinioService implements OnModuleInit {
    public client: Client;

    onModuleInit() {
        this.client = new Client({
            endPoint: process.env.MINIO_ENDPOINT || "localhost",
            port: parseInt(process.env.MINIO_PORT || "9000"),
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
            secretKey: process.env.MINIO_SECRET_KEY || "minioadmin"
        })
    }

    async upload(
        objName: string,
        buffer: Buffer,
        mimeType: string 
    ) {
        return await this.client.putObject(
            BUCKET,
            objName,
            buffer,
            buffer.length,
            {
                "Content-Type": mimeType
            }
        );
    }

    getStream(objName: string) {
        return this.client.getObject(BUCKET, objName);
    }

    async remove(objName: string) {
        return await this.client.removeObject(BUCKET, objName);
    }
}