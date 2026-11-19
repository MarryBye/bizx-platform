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
  'image/gif'
] as const;

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function hasValidMagicBytes(buf: Buffer, mime: string): boolean {
  if (buf.length < 4) return false;
  if (mime === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/gif') {
    const header = buf.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (mime === 'image/webp') {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mime === 'application/pdf') {
    return buf.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  return false;
}

export function validateImageFile(file?: UploadedFileDto): UploadedFileDto {
  if (!file || !file.buffer || file.size === 0) {
    throw new BadRequestException('Файл не надано або він порожній');
  }

  if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype as (typeof ALLOWED_IMAGE_MIMES)[number])) {
    throw new BadRequestException(
      `Непідтримуваний формат файлу "${file.mimetype}". Дозволені формати: JPEG, PNG, WebP, GIF`
    );
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new BadRequestException(
      `Розмір файлу (${Math.round(file.size / 1024 / 1024)} МБ) перевищує ліміт у 10 МБ`
    );
  }

  if (!hasValidMagicBytes(file.buffer, file.mimetype)) {
    throw new BadRequestException('Вміст файлу не відповідає заявленому формату зображення');
  }

  return file;
}

export const ALLOWED_CHAT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
] as const;

export function validateChatAttachmentFile(file?: UploadedFileDto): UploadedFileDto {
  if (!file || !file.buffer || file.size === 0) {
    throw new BadRequestException('Файл не надано або він порожній');
  }

  if (!ALLOWED_CHAT_MIMES.includes(file.mimetype as (typeof ALLOWED_CHAT_MIMES)[number])) {
    throw new BadRequestException(
      `Непідтримуваний формат файлу "${file.mimetype}". Дозволені формати: JPEG, PNG, WebP, GIF, PDF`
    );
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new BadRequestException(
      `Розмір файлу (${Math.round(file.size / 1024 / 1024)} МБ) перевищує ліміт у 10 МБ`
    );
  }

  if (!hasValidMagicBytes(file.buffer, file.mimetype)) {
    throw new BadRequestException('Вміст файлу не відповідає заявленому формату');
  }

  return file;
}
