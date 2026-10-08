import {
  type PipeTransform,
  Injectable,
  type ArgumentMetadata,
  BadRequestException
} from '@nestjs/common';
import { type ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Ошибка валидации входных данных',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      throw new BadRequestException('Некорректные данные запроса');
    }
  }
}
