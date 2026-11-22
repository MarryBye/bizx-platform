import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createLogger } from '@bizx/utils';

const logger = createLogger('GlobalExceptionFilter');

/**
 * Global exception filter that converts PostgreSQL driver constraint/syntax errors
 * (e.g. invalid UUID syntax 22P02, int32 overflow 22003, invalid date 22007, unique 23505)
 * into clean 4xx HTTP responses instead of leaking 500 Internal Server Error.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        response.status(status).json({
          statusCode: status,
          message: body
        });
      } else {
        response.status(status).json(body);
      }
      return;
    }

    const pgCode =
      (exception as { code?: string; cause?: { code?: string } })?.code ||
      (exception as { cause?: { code?: string } })?.cause?.code;

    if (pgCode === '22P02') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Некоректний формат ідентифікатора або параметра запиту'
      });
      return;
    }

    if (pgCode === '22001') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Текстове значення перевищує максимально допустиму довжину'
      });
      return;
    }

    if (pgCode === '22003') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Числове значення виходить за допустимі межі'
      });
      return;
    }

    if (pgCode === '22007' || pgCode === '22008') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Некоректний формат дати або часу'
      });
      return;
    }

    if (pgCode === '23505') {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Запис із такими унікальними даними вже існує'
      });
      return;
    }

    if (pgCode === '23503') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Пов’язаний ресурс не знайдено або порушено цілісність даних'
      });
      return;
    }

    const request = ctx.getRequest<Request>();
    const errMsg = exception instanceof Error ? exception.message : 'Unknown error';
    logger.error(
      `Unhandled exception on ${request?.method || '?'} ${request?.path || '?'}: ${errMsg}`
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Внутрішня помилка сервера'
    });
  }
}
