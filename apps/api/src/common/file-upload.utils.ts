import { BadRequestException } from '@nestjs/common';

export interface UploadedFileDto {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif'
] as const;

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file?: UploadedFileDto): UploadedFileDto {
  if (!file || !file.buffer || file.size === 0) {
    throw new BadRequestException('Файл не надано або він порожній');
  }

  if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype as (typeof ALLOWED_IMAGE_MIMES)[number])) {
    throw new BadRequestException(
      `Непідтримуваний формат файлу "${file.mimetype}". Дозволені формати: JPEG, PNG, WebP, SVG, GIF`
    );
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new BadRequestException(
      `Розмір файлу (${Math.round(file.size / 1024 / 1024)} МБ) перевищує ліміт у 10 МБ`
    );
  }

  return file;
}
