import {
  Injectable,
  type OnModuleInit,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
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
import { getMediaSigningSecret } from '../common/security/security-config.js';
import {
  canonicalizeStorageKey,
  isPrivateStorageKey,
  getSafeExtensionForMime,
  MIME_TO_SAFE_EXT
} from '../common/security/safe-storage-key.js';

const logger = createLogger('StorageService(R2)');

export interface FileStreamResult {
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: number;
}

const ALLOWED_FALLBACK_EXTS = new Set(Object.values(MIME_TO_SAFE_EXT));

@Injectable()
export class StorageService implements OnModuleInit {
  private s3Client!: S3Client;
  private publicBucketName!: string;
  private privateBucketName!: string;
  private publicDomain!: string;
  private signingSecret!: string;

  onModuleInit() {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'dummy_account_id';
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'dummy_access_key';
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 'dummy_secret_key';
    this.publicBucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'bizx-assets';
    this.privateBucketName =
      process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME?.trim() || this.publicBucketName;
    this.publicDomain =
      process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || `https://${accountId}.r2.cloudflarestorage.com`;
    this.signingSecret = getMediaSigningSecret();

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    logger.info(
      `Cloudflare R2 configured (public=${this.publicBucketName}, private=${this.privateBucketName})`
    );
  }

  private resolveBucketForKey(key: string): string {
    return this.isPrivateKey(key) ? this.privateBucketName : this.publicBucketName;
  }

  isPrivateKey(fileKey: string): boolean {
    return isPrivateStorageKey(fileKey);
  }

  /**
   * Extracts a canonical storage key ONLY from relative `/storage/file/<key>` paths.
   * Never matches `/storage/file/` inside arbitrary external `https://` URLs.
   */
  private extractStorageKeyFromUrl(url: string): { basePath: string; fileKey: string } | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    const [withoutQuery] = trimmed.split('?');
    if (!withoutQuery.startsWith('/storage/file/')) return null;

    try {
      const fileKey = canonicalizeStorageKey(withoutQuery.slice('/storage/file/'.length));
      return { basePath: `/storage/file/${fileKey}`, fileKey };
    } catch {
      return null;
    }
  }

  private computeSignature(fileKey: string, exp: number): string {
    const cleanKey = fileKey.replace(/^\/+/, '');
    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(`bizx-private-media:${cleanKey}:${exp}`)
      .digest('hex');
  }

  /**
   * Повертає підписаний URL з коротким TTL для приватних вкладень (order-chat/*, inbox/*).
   * Публічні медіафайли повертаються без змін.
   */
  signPrivateUrl(url: string, ttlSeconds = 3600): string {
    const extracted = this.extractStorageKeyFromUrl(url);
    if (!extracted || !this.isPrivateKey(extracted.fileKey)) {
      return url;
    }
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = this.computeSignature(extracted.fileKey, exp);
    return `${extracted.basePath}?exp=${exp}&sig=${sig}`;
  }

  /**
   * Знімає тимчасовий підпис перед збереженням вкладення у БД, щоб не зберігати прострочені параметри.
   */
  stripPrivateSignature(url: string): string {
    const extracted = this.extractStorageKeyFromUrl(url);
    if (!extracted || !this.isPrivateKey(extracted.fileKey)) {
      return url;
    }
    return extracted.basePath;
  }

  /**
   * Перевіряє, що кожне вкладення належить саме поточному ресурсу (наприклад `order-chat/<orderId>/`
   * або `inbox/<threadId>/`). Запобігає cross-tenant HMAC signing oracle.
   */
  assertAttachmentsScopedToPrefix<T extends { url: string }>(
    attachments: T[],
    expectedFolderPrefix: string
  ): T[] {
    const cleanPrefix = `${expectedFolderPrefix.replace(/^\/+|\/+$/g, '')}/`;
    return attachments.map((att) => {
      const extracted = this.extractStorageKeyFromUrl(att.url);
      if (!extracted || !extracted.fileKey.startsWith(cleanPrefix)) {
        throw new BadRequestException(
          'Вкладення має бути завантажене безпосередньо в цей чат через форму завантаження'
        );
      }
      return {
        ...att,
        url: extracted.basePath
      };
    });
  }

  /**
   * Забороняє передавати приватні ключі (order-chat/*, inbox/*) у публічних чи групових розсилках.
   */
  assertNotPrivateAttachmentUrl(url: string | null | undefined): void {
    if (!url) return;
    const extracted = this.extractStorageKeyFromUrl(url);
    if (extracted && this.isPrivateKey(extracted.fileKey)) {
      throw new BadRequestException('Приватні вкладення не можна використовувати у розсилках');
    }
  }

  /**
   * Перевіряє HMAC-підпис і термін дії приватного медіафайлу у constant-time режимі.
   */
  verifyPrivateSignature(fileKey: string, expParam?: unknown, sigParam?: unknown): boolean {
    if (typeof expParam !== 'string' || typeof sigParam !== 'string') return false;
    if (!expParam || !sigParam || sigParam.length !== 64) return false;
    const exp = Number(expParam);
    if (!Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expected = this.computeSignature(fileKey, exp);
    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(sigParam, 'utf8');
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  signAttachments<T extends { url: string }>(attachments: T[], ttlSeconds = 3600): T[] {
    return attachments.map((att) => ({
      ...att,
      url: this.signPrivateUrl(att.url, ttlSeconds)
    }));
  }

  stripAttachmentsSignatures<T extends { url: string }>(attachments: T[]): T[] {
    return attachments.map((att) => ({
      ...att,
      url: this.stripPrivateSignature(att.url)
    }));
  }

  getFileUrl(key: string): string {
    // Приватні вкладення завжди йдуть через захищений API proxy маршрут із перевіркою HMAC-підпису
    if (this.isPrivateKey(key)) {
      return `/storage/file/${key.replace(/^\//, '')}`;
    }
    // Якщо налаштований публічний CDN або кастомний домен Cloudflare
    if (this.publicDomain && !this.publicDomain.includes('r2.cloudflarestorage.com')) {
      return `${this.publicDomain.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
    }
    // Інакше повертаємо локальний API proxy маршрут
    return `/storage/file/${key.replace(/^\//, '')}`;
  }

  generateFileKey(folder: string, originalFileName: string, validatedMimeType?: string): string {
    let ext: string;
    if (validatedMimeType) {
      ext = getSafeExtensionForMime(validatedMimeType);
    } else {
      const candidate = path.extname(originalFileName || '').toLowerCase();
      ext = ALLOWED_FALLBACK_EXTS.has(candidate) ? candidate : '.jpg';
    }
    const randomHex = crypto.randomBytes(12).toString('hex');
    const timestamp = Date.now();
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    return `${cleanFolder}/${timestamp}-${randomHex}${ext}`;
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.resolveBucketForKey(key),
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
    expiresInSeconds = 300,
    contentLength?: number
  ): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
    const key = this.generateFileKey(folder, fileName, contentType);

    const command = new PutObjectCommand({
      Bucket: this.resolveBucketForKey(key),
      Key: key,
      ContentType: contentType,
      ...(typeof contentLength === 'number' ? { ContentLength: contentLength } : {})
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

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.resolveBucketForKey(key),
      Key: key
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds
    });
  }

  async getFileStream(key: string): Promise<FileStreamResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.resolveBucketForKey(key),
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
      Bucket: this.resolveBucketForKey(key),
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

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#3b82f6"/><circle cx="64" cy="50" r="22" fill="#ffffff"/><path d="M64 78 C42 78 24 94 24 116 C35 124 50 128 64 128 C78 128 93 124 104 116 C104 94 86 78 64 78 Z" fill="#ffffff"/></svg>`;
  }
}
