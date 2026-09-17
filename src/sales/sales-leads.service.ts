import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesLead, SalesLeadDocument } from './schemas/sales-lead.schema';
import {
  CreateSalesLeadDto,
  PromoteLeadDto,
  UpdateSalesLeadDto,
} from './dto/sales-lead.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { generateTempPassword } from '../common/generate-temp-password';

@Injectable()
export class SalesLeadsService {
  constructor(
    @InjectModel(SalesLead.name)
    private readonly model: Model<SalesLeadDocument>,
    private readonly firebase: FirebaseService,
    private readonly usersService: UsersService,
  ) {}

  list() {
    return this.model.find().sort({ createdAt: -1 }).limit(1000).exec();
  }

  create(dto: CreateSalesLeadDto) {
    return this.model.create(dto);
  }

  async update(id: string, dto: UpdateSalesLeadDto) {
    const lead = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Lead not found');
    return { deleted: true };
  }

  // Turns a prospect into a real, working login — the honest version of
  // "promote": we actually provision the account (Firebase + Mongo) rather
  // than just flipping a status, and hand back credentials for the sales
  // rep to pass along themselves (there's no email/SMS delivery wired up).
  async promote(id: string, dto: PromoteLeadDto) {
    const lead = await this.model.findById(id).exec();
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === 'converted' && lead.convertedUserId) {
      throw new BadRequestException('This lead has already been converted');
    }

    const email = dto.email ?? lead.email;
    if (!email) {
      throw new BadRequestException(
        'Add an email for this lead before promoting them',
      );
    }

    let uid: string;
    let temporaryPassword: string | null = null;
    try {
      const existing = await this.firebase.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      temporaryPassword = generateTempPassword();
      const created = await this.firebase.createUser(email, temporaryPassword);
      uid = created.uid;
    }

    let user = await this.usersService.findByFirebaseUid(uid);
    if (!user) {
      user = await this.usersService.createFromToken(uid, {
        email,
        emailVerified: true,
      });
    }
    if (lead.name || lead.companyName) {
      await this.usersService.updateProfile(user.id, {
        name: lead.name,
        companyName: lead.companyName,
      });
    }

    lead.status = 'converted';
    lead.convertedUserId = user.id;
    await lead.save();

    return { lead, email, temporaryPassword, userId: user.id };
  }
}
