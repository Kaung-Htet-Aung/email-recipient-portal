import { Request } from 'express';
import { AdminUser, Application, ApplicationCredential } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user: AdminUser;
}

export interface AppApiRequest extends Request {
  credential: ApplicationCredential;
  application: Application;
}