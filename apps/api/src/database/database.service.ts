import { Injectable, type OnModuleInit } from '@nestjs/common';
import { createDatabaseClient, type Database } from '@bizx/database';
import { createLogger } from '@bizx/utils';

const logger = createLogger('DatabaseService');

@Injectable()
export class DatabaseService implements OnModuleInit {
  private dbInstance!: Database;

  onModuleInit() {
    this.dbInstance = createDatabaseClient(process.env.DATABASE_URL);
    logger.info('Drizzle ORM database client initialized');
  }

  get db(): Database {
    return this.dbInstance;
  }
}
