// One-off provisioning script: creates a real Firebase login (or reuses one
// that already exists for the email) and makes sure the matching Mongo user
// has the sales role. Run with:
//   npx ts-node -r tsconfig-paths/register scripts/create-sales-user.ts <email> <password>
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FirebaseService } from '../src/firebase/firebase.service';
import { UsersService } from '../src/users/users.service';

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: create-sales-user.ts <email> <password>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const firebase = app.get(FirebaseService);
  const users = app.get(UsersService);

  let uid: string;
  try {
    const record = await firebase.getUserByEmail(email);
    uid = record.uid;
    console.log(`Firebase user already exists for ${email} (${uid})`);
  } catch {
    const record = await firebase.createUser(email, password);
    uid = record.uid;
    console.log(`Created Firebase user for ${email} (${uid})`);
  }

  let user = await users.findByFirebaseUid(uid);
  if (!user) {
    user = await users.createFromToken(uid, { email, emailVerified: true });
    console.log(`Created Mongo user ${user.id}`);
  }

  await users.setRole(user.id, 'sales');
  console.log(`Granted sales role to ${email}`);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
