import { IntersectionType } from "@nestjs/mapped-types";
import { IsString } from "class-validator";
import { ErrorCode } from "src/exception-filter/errors.enum";
import { SendVerifyEmailDTO } from "./SendVerifyEmailDTO";

export class Code {
    @IsString({message: ErrorCode.MUST_BE_INT})
    code: string;
}

export class CheckForgotPassCodeDTO extends IntersectionType(
    Code, SendVerifyEmailDTO
) {};