import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ErrorCode } from "src/exception-filter/errors.enum";

export class EditUserDTO {
    @IsString({message: ErrorCode.MUST_BE_STRING})
    @MinLength(2, {message: ErrorCode.USERNAME_SHORT_LENGTH})
    @MaxLength(50, {message: ErrorCode.USERNAME_LONG_LENGTH})
    @Matches(/^[a-zA-Z0-9_]+$/, {message: ErrorCode.USERNAME_INVALID_FORMAT})
    @IsOptional()
    username?: string;
    
    @IsString({message: ErrorCode.MUST_BE_STRING})
    @MinLength(3, {message: ErrorCode.FIRSTNAME_SHORT_LENGTH})
    @MaxLength(50, {message: ErrorCode.FIRSTNAME_LONG_LENGTH})
    @IsOptional()
    firstName?: string;
    
    @IsString({message: ErrorCode.MUST_BE_STRING})
    @MinLength(3, {message: ErrorCode.LASTNAME_SHORT_LENGTH})
    @MaxLength(50, {message: ErrorCode.LASTNAME_LONG_LENGTH})
    @IsOptional()
    lastName?: string;
}