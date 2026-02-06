import type { PostRatingType } from "@prisma/client";
import { IsIn, IsOptional, IsString } from "class-validator";
import { ErrorCode } from "src/exception-filter/errors.enum";

export class SetRatingDTO {
    @IsString({message: ErrorCode.MUST_BE_STRING})
    @IsOptional()
    @IsIn(["Like", "Dislike"], {message: ErrorCode.INVALID_RATING_TYPE})
    newState?: PostRatingType;
}