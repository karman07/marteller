// One-off: flips on the Email/Password sign-in provider for the Firebase
// project, using the same Admin SDK service account already configured for
// this app. Run with:
//   npx ts-node -r tsconfig-paths/register scripts/enable-email-password-auth.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { cert } from 'firebase-admin/app';
import * as dotenv from 'dotenv';

dotenv.config();

type IdentityConfig = {
  signIn?: unknown;
  [key: string]: unknown;
};

async function main() {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!path) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set');

  // Left untyped (matches FirebaseService's own parse) — cert() wants the
  // raw snake_case JSON shape, which doesn't match the SDK's camelCase
  // ServiceAccount type.
  const raw = JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
  const credential = cert(raw);
  const { access_token: accessToken } = await credential.getAccessToken();
  const projectId = (raw as { project_id: string }).project_id;

  const configUrl = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config`;

  const before = await fetch(configUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const beforeBody = (await before.json()) as IdentityConfig;
  console.log(
    'Current signIn config:',
    JSON.stringify(beforeBody.signIn, null, 2),
  );

  const res = await fetch(
    `${configUrl}?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signIn: { email: { enabled: true, passwordRequired: true } },
      }),
    },
  );

  const body = (await res.json()) as IdentityConfig;
  if (!res.ok) {
    console.error(`Failed (${res.status}):`, JSON.stringify(body, null, 2));
    process.exit(1);
  }
  console.log('Updated signIn config:', JSON.stringify(body.signIn, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
