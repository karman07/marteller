import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (getApps().length) {
      this.app = getApps()[0];
      return;
    }

    const path = this.config.getOrThrow<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    const serviceAccount = JSON.parse(
      readFileSync(join(process.cwd(), path), 'utf8'),
    );

    this.app = initializeApp({ credential: cert(serviceAccount) });
  }

  verifyIdToken(idToken: string) {
    return getAuth(this.app).verifyIdToken(idToken);
  }

  // Server-side account provisioning (e.g. creating an internal sales
  // login) — everything else in this app only ever verifies tokens the
  // client already obtained.
  createUser(email: string, password: string) {
    return getAuth(this.app).createUser({
      email,
      password,
      emailVerified: true,
    });
  }

  getUserByEmail(email: string) {
    return getAuth(this.app).getUserByEmail(email);
  }

  deleteUser(uid: string) {
    return getAuth(this.app).deleteUser(uid);
  }
}
