import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';

@Injectable()
export class CryptoService {
  async hashPassword(password: string) {
    return createHash('sha512')
      .update(password)
      .digest('hex');
  }

  async verifyPassword(password: string, hashedPassword: string) {
    return createHash('sha512')
      .update(password)
      .digest('hex') === hashedPassword;
  }

  async generateResetPasswordKey() {
    return randomUUID();
  }

  async generateSessionId() {
    const bytes = randomBytes(64);
    const sessionId = bytes.toString('hex');
    return sessionId;
  }
}
