import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Exposes request.rawBody alongside the normal parsed JSON body on
    // every request — needed by BillingController's Razorpay webhook
    // route to verify the HMAC signature against the exact raw bytes
    // Razorpay signed, without disabling JSON parsing for every other
    // route in the app.
    rawBody: true,
  });

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      process.env.SALES_URL ?? 'http://localhost:3002',
    ],
    credentials: true,
  });

  // Template media (header/banner images) — public, unlike verification
  // documents which stay behind the authenticated download endpoint.
  app.useStaticAssets(join(process.cwd(), 'uploads', 'templates'), {
    prefix: '/uploads/templates/',
  });

  app.useStaticAssets(join(process.cwd(), 'uploads', 'profile-photos'), {
    prefix: '/uploads/profile-photos/',
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  await app.listen(process.env.PORT ?? 5010);
}
bootstrap();
