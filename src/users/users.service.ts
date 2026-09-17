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
import { FirebaseService } from '../firebase/firebase.service';
import { generateTempPassword } from '../common/generate-temp-password';

type TokenClaims = {
  email?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly firebase: FirebaseService,
  ) {}

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

  listByRole(role: UserRole) {
    return this.userModel
      .find({ role })
      .sort({ name: 1, createdAt: -1 })
      .limit(500)
      .exec();
  }

  // Admin-provisioned staff account (sales/admin) — same Firebase-then-Mongo
  // pattern as SalesLeadsService.promote() (reuses the Firebase user if the
  // email already has one, e.g. a former test customer account), but always
  // sets the requested role and marks the account onboarded since staff
  // skip the customer onboarding flow entirely.
  async createTeamMember(email: string, name: string, role: 'sales' | 'admin') {
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

    let user = await this.findByFirebaseUid(uid);
    if (!user) {
      user = await this.createFromToken(uid, { email, emailVerified: true });
    }
    user.role = role;
    user.name = name;
    user.onboarded = true;
    await user.save();

    return { user, temporaryPassword };
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
