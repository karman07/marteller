import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccountType,
  CompanySize,
  Interest,
  SalesStage,
  User,
  UserDocument,
  UserRole,
} from './schemas/user.schema';

type TokenClaims = {
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
};

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findByFirebaseUid(firebaseUid: string) {
    return this.userModel.findOne({ firebaseUid }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  findByPhoneNumber(phoneNumber: string) {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  createFromToken(firebaseUid: string, claims: TokenClaims) {
    return this.userModel.create({
      firebaseUid,
      email: claims.email,
      emailVerified: claims.emailVerified ?? false,
      phoneNumber: claims.phoneNumber,
      onboarded: false,
    });
  }

  async syncClaims(id: string, claims: TokenClaims) {
    const update: Partial<Record<keyof TokenClaims, unknown>> = {
      emailVerified: claims.emailVerified ?? false,
    };
    if (claims.email) update.email = claims.email;
    if (claims.phoneNumber) update.phoneNumber = claims.phoneNumber;

    return this.userModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async setPhoneNumber(id: string, phoneNumber: string) {
    return this.userModel.findByIdAndUpdate(id, { phoneNumber }, { new: true }).exec();
  }

  async setPhoto(id: string, photoUrl: string) {
    return this.userModel.findByIdAndUpdate(id, { photoUrl }, { new: true }).exec();
  }

  async updateProfile(
    id: string,
    update: {
      name: string;
      accountType?: AccountType;
      companyName?: string;
      companySize?: CompanySize;
      interests?: Interest[];
      address?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      countryIso2?: string;
      countryDialCode?: string;
    },
  ) {
    return this.userModel
      .findByIdAndUpdate(id, { ...update, onboarded: true }, { new: true })
      .exec();
  }

  async skipOnboarding(id: string) {
    return this.userModel.findByIdAndUpdate(id, { onboarded: true }, { new: true }).exec();
  }

  async setRole(id: string, role: UserRole) {
    return this.userModel.findByIdAndUpdate(id, { role }, { new: true }).exec();
  }

  listCustomers() {
    return this.userModel
      .find({ role: 'customer' })
      .sort({ createdAt: -1 })
      .limit(500)
      .exec();
  }

  async updateSalesStage(
    id: string,
    salesStage: SalesStage,
    salesNotes?: string,
  ) {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { salesStage, ...(salesNotes !== undefined ? { salesNotes } : {}) },
        { new: true },
      )
      .exec();
  }
}
