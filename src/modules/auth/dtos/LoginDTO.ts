import { IsString } from "class-validator";
import { ErrorCode } from "src/exception-filter/errors.enum";

export class LoginDTO {
    @IsString({message: ErrorCode.MUST_BE_STRING})
    username: string;

    @IsString({message: ErrorCode.MUST_BE_STRING})
    password: string;
}