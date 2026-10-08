import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { createLogger } from '@bizx/utils';

const logger = createLogger('BullMQ-QueueService');

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private redisConnection!: Redis;
  private defaultQueue!: Queue;
  private defaultWorker!: Worker;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 2) {
          return null; // Stop looping if Redis is down locally
        }
        return 5000;
      }
    });

    let loggedWarning = false;
    this.redisConnection.on('error', (err) => {
      if (!loggedWarning) {
        logger.warn(`Redis connection warning (is Redis running on ${redisUrl}?): ${err.message}`);
        loggedWarning = true;
      }
    });

    this.defaultQueue = new Queue('bizx-jobs', {
      connection: this.redisConnection
    });

    this.defaultQueue.on('error', (err) => {
      logger.warn(`BullMQ queue warning: ${err.message}`);
    });

    this.defaultWorker = new Worker(
      'bizx-jobs',
      async (job: Job) => {
        logger.info(`Processing job ${job.id} (${job.name})`, job.data);
        return { success: true, processedAt: new Date().toISOString() };
      },
      {
        connection: this.redisConnection,
        concurrency: 5
      }
    );

    this.defaultWorker.on('error', (err) => {
      logger.warn(`BullMQ worker warning: ${err.message}`);
    });

    this.defaultWorker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    this.defaultWorker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed with error:`, err.message);
    });

    logger.info('BullMQ Queue and Worker initialized with Redis');
  }

  async addJob<T = unknown>(name: string, data: T, options = {}) {
    return await this.defaultQueue.add(name, data, options);
  }

  async onModuleDestroy() {
    await this.defaultWorker?.close();
    await this.defaultQueue?.close();
    await this.redisConnection?.quit();
    logger.info('BullMQ Queue and Worker cleanly closed');
  }
}
