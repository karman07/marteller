// One-off cleanup: removes a Firebase login and its matching Mongo user.
// Run with:
//   npx ts-node -r tsconfig-paths/register scripts/delete-test-user.ts <email>
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { FirebaseService } from '../src/firebase/firebase.service';
import { User, UserDocument } from '../src/users/schemas/user.schema';

async function main() {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error('Usage: delete-test-user.ts <email>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const firebase = app.get(FirebaseService);
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

  try {
    const record = await firebase.getUserByEmail(email);
    await firebase.deleteUser(record.uid);
    console.log(`Deleted Firebase user ${email}`);
  } catch {
    console.log(`No Firebase user for ${email}`);
  }

  const res = await userModel.deleteOne({ email }).exec();
  console.log(`Deleted ${res.deletedCount} Mongo user(s) for ${email}`);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
