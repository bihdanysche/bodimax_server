import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";
import { ErrorCode } from "src/exception-filter/errors.enum";

export async function validateImgRatio(file: Buffer, ratioMustBe: number) {
    try {
        const metadata = await sharp(file).metadata();
        const ratio = metadata.width / metadata.height;

        if (Math.abs(ratio - ratioMustBe) > 0.1) {
            throw new BadRequestException({
                code: ErrorCode.INVALID_FILE_FORMAT
            });
        }
        
        return true;
    } catch {
        throw new BadRequestException({
            code: ErrorCode.INVALID_FILE_FORMAT
        })
    }
}