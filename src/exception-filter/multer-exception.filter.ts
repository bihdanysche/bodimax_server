import {
  ExceptionFilter,
  Catch,
  ArgumentsHost
} from '@nestjs/common';
import { MulterError } from 'multer';
import { ErrorCode } from './errors.enum';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        code: ErrorCode.FILE_TOO_LARGE
      });
    }

    return res.status(400).json({
      code: exception.code,
      message: exception.message,
    });
  }
}
