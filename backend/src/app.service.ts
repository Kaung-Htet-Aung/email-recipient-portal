import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'Email Recipient Portal API',
      description:
        'Centralized management and secure retrieval of email recipients for multiple applications.',
      version: '1.0.0',
      docs: '/api/docs',
    };
  }

  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}