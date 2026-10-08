import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '@bizx/utils';

const logger = createLogger('StorageService(R2)');

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
    this.publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || 'https://assets.bizx.io';

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

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600
  ): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds
    });
    const publicUrl = `${this.publicDomain}/${key}`;

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

    return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    await this.s3Client.send(command);
    logger.info(`File deleted: ${key}`);
  }
}
