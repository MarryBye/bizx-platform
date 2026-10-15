import { Injectable, type OnModuleInit, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '@bizx/utils';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const logger = createLogger('StorageService(R2)');

export interface FileStreamResult {
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private s3Client!: S3Client;
  private bucketName!: string;
  private publicDomain!: string;

  onModuleInit() {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'dummy_account_id';
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'dummy_access_key';
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 'dummy_secret_key';
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'bizx-assets';
    this.publicDomain =
      process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    logger.info(`Cloudflare R2 client configured for bucket: ${this.bucketName}`);
  }

  getFileUrl(key: string): string {
    // Якщо налаштований публічний CDN або кастомний домен Cloudflare
    if (this.publicDomain && !this.publicDomain.includes('r2.cloudflarestorage.com')) {
      return `${this.publicDomain.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
    }
    // Інакше повертаємо локальний API proxy маршрут
    return `/storage/file/${key.replace(/^\//, '')}`;
  }

  generateFileKey(folder: string, originalFileName: string): string {
    const ext = path.extname(originalFileName) || '.jpg';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    return `${cleanFolder}/${timestamp}-${randomHex}${ext}`;
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType
    });

    await this.s3Client.send(command);
    logger.info(`File uploaded to R2: ${key}`);
    return this.getFileUrl(key);
  }

  async getPresignedUploadUrl(
    folder: string,
    fileName: string,
    contentType: string,
    expiresInSeconds = 3600
  ): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
    const key = this.generateFileKey(folder, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds
    });
    const publicUrl = this.getFileUrl(key);

    return {
      uploadUrl,
      fileKey: key,
      publicUrl
    };
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds
    });
  }

  async getFileStream(key: string): Promise<FileStreamResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      return {
        stream: response.Body as unknown as NodeJS.ReadableStream,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength
      };
    } catch {
      throw new NotFoundException(`Файл "${key}" не знайдено у сховищі R2`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    await this.s3Client.send(command);
    logger.info(`File deleted: ${key}`);
  }

  getDefaultPlaceholderSvg(name: string): string {
    const validNames = ['avatar', 'store', 'product', 'banner'];
    const assetName = validNames.includes(name) ? name : 'avatar';

    const localPath = path.resolve(process.cwd(), 'public/defaults', `${assetName}.svg`);

    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath, 'utf-8');
    }

    // Запасной встроенный SVG если файл не найден на диске
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#3b82f6"/><circle cx="64" cy="50" r="22" fill="#ffffff"/><path d="M64 78 C42 78 24 94 24 116 C35 124 50 128 64 128 C78 128 93 124 104 116 C104 94 86 78 64 78 Z" fill="#ffffff"/></svg>`;
  }
}
