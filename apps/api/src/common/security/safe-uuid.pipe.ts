import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const RFC_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reusable UUID path-parameter validation pipe.
 * Rejects malformed IDs at the HTTP boundary (400) before guards, services, or DB queries execute.
 */
@Injectable()
export class SafeUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !RFC_UUID_RE.test(value.trim())) {
      throw new BadRequestException('Некоректний формат ідентифікатора (очікується UUID)');
    }
    return value.trim().toLowerCase();
  }
}
