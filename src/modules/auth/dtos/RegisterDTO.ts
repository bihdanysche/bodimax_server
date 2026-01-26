import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ErrorCode } from "src/exception-filter/errors.enum";

export class RegisterDTO {
    @IsString({message: ErrorCode.MUST_BE_STRING})
    @MinLength(2, {message: ErrorCode.USERNAME_SHORT_LENGTH})
    @MaxLength(50, {message: ErrorCode.USERNAME_LONG_LENGTH})
    @Matches(/^[a-zA-Z0-9_]+$/, {message: ErrorCode.USERNAME_INVALID_FORMAT})
    username: string;

    @IsString({message: ErrorCode.MUST_BE_STRING})
    @MinLength(5, {message: ErrorCode.PASSWORD_SHORT_LENGTH})
    @MaxLength(50, {message: ErrorCode.PASSWORD_LONG_LENGTH})
    password: string;

    @IsString({message: ErrorCode.MUST_BE_STRING})
    @MinLength(3, {message: ErrorCode.FIRSTNAME_SHORT_LENGTH})
    @MaxLength(50, {message: ErrorCode.FIRSTNAME_LONG_LENGTH})
    firstName: string;

    @IsString({message: ErrorCode.MUST_BE_STRING})
    @MinLength(3, {message: ErrorCode.LASTNAME_SHORT_LENGTH})
    @MaxLength(50, {message: ErrorCode.LASTNAME_LONG_LENGTH})
    lastName: string;
}