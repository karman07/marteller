import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { StaffActivity, StaffActivitySchema } from './schemas/staff-activity.schema';
import { StaffActivityService } from './staff-activity.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: StaffActivity.name, schema: StaffActivitySchema }]),
  ],
  providers: [StaffActivityService],
  exports: [StaffActivityService],
})
export class StaffActivityModule {}
