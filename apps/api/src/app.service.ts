import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: 'ok',
      message: 'BizX API is ready',
      timestamp: new Date().toISOString()
    };
  }
}
