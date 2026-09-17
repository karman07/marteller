import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Contact, ContactSchema } from './schemas/contact.schema';
import { ContactList, ContactListSchema } from './schemas/contact-list.schema';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Contact.name, schema: ContactSchema },
      { name: ContactList.name, schema: ContactListSchema },
    ]),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
