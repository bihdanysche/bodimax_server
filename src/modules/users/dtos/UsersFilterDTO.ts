import { IsInt, IsOptional, IsString } from "class-validator";
import { ErrorCode } from "src/exception-filter/errors.enum";

export class UsersFilterDTO {
    @IsString({ message: ErrorCode.MUST_BE_STRING })
    @IsOptional()
    searchString?: string;

    @IsInt({message: ErrorCode.MUST_BE_INT})
    @IsOptional()
    page?: number;

    @IsInt({message: ErrorCode.MUST_BE_INT})
    @IsOptional()
    maxPerPage?: number;
}