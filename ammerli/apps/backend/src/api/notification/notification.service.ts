import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as admin from 'firebase-admin';
import { AppLogger } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { DeviceTokenEntity } from './entities/device-token.entity';

@Injectable()
export class NotificationService implements OnModuleInit {
  constructor(
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokenRepo: Repository<DeviceTokenEntity>,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(NotificationService.name);
  }

  onModuleInit() {
    if (admin.apps.length) return; // Already initialized

    try {
      // ── الطريقة 1: ملف firebase-key.json (موصى به للتطوير المحلي) ──────────
      // ضع ملف Service Account من Firebase Console في:
      // ammerli/apps/backend/firebase-key.json
      const fs = require('fs');
      const path = require('path');
      const keyPath = path.resolve(process.cwd(), 'firebase-key.json');

      if (fs.existsSync(keyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('✅ Firebase Admin initialized from firebase-key.json');
        return;
      }

      // ── الطريقة 2: متغير بيئة GOOGLE_APPLICATION_CREDENTIALS ───────────────
      // ضع المسار لملف JSON في .env:
      // GOOGLE_APPLICATION_CREDENTIALS=./firebase-key.json
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        this.logger.log('✅ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS');
        return;
      }

      // ── لا يوجد إعداد Firebase ─────────────────────────────────────────────
      this.logger.warn(
        '⚠️  Firebase not configured. Push notifications will be disabled.\n' +
        '   To enable:\n' +
        '   1. Go to https://console.firebase.google.com\n' +
        '   2. Project Settings → Service Accounts → Generate new private key\n' +
        '   3. Save the file as: ammerli/apps/backend/firebase-key.json',
      );
    } catch (error) {
      this.logger.error('❌ Firebase Init Failed', error);
    }
  }


  async saveToken(
    userId: string,
    token: string,
    platform: string,
    userType: 'USER' | 'DRIVER',
  ) {
    // Check if token already exists for this user to avoid duplicates
    const existing = await this.deviceTokenRepo.findOne({ where: { token } });
    if (existing) {
      if (existing.userId !== userId) {
        // Token moved to a new user (logout/login scenario)
        existing.userId = userId;
        existing.userType = userType;
        await this.deviceTokenRepo.save(existing);
      }
      return existing;
    }

    const newToken = this.deviceTokenRepo.create({
      userId,
      token,
      platform,
      userType,
    });
    return await this.deviceTokenRepo.save(newToken);
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const tokens = await this.deviceTokenRepo.find({ where: { userId } });
    if (!tokens.length) return;

    const fcmTokens = tokens.map((t) => t.token);

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data,
      });

      this.logger.log(
        `Sent push to ${userId}: ${response.successCount} success, ${response.failureCount} failed`,
      );

      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            // Remove invalid token
            this.deviceTokenRepo.delete({ token: fcmTokens[idx] });
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error sending push to ${userId}`, error);
    }
  }

  async sendDataNotification(
    userId: string,
    data: Record<string, string>,
  ) {
    const tokens = await this.deviceTokenRepo.find({ where: { userId } });
    if (!tokens.length) return;

    const fcmTokens = tokens.map((t) => t.token);

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        data,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      });

      this.logger.log(
        `Sent high-priority data push to ${userId}: ${response.successCount} success, ${response.failureCount} failed`,
      );

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.deviceTokenRepo.delete({ token: fcmTokens[idx] });
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error sending data push to ${userId}`, error);
    }
  }
}
