import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { CompleteProfileDto } from './dto/complete-profile.dto';

const DEV_OTP_CODE = '123456';

@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Called right after email/password or Google sign-in on the client, and
  // again after linking a phone number — finds-or-creates the backend user
  // for this Firebase identity and syncs whatever claims the token carries.
  async syncFromToken(idToken: string) {
    let decoded;
    try {
      decoded = await this.firebase.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }

    const claims = {
      email: decoded.email,
      emailVerified: decoded.email_verified,
      phoneNumber: decoded.phone_number,
    };

    let user = await this.usersService.findByFirebaseUid(decoded.uid);

    if (!user) {
      user = await this.usersService.createFromToken(decoded.uid, claims);
    } else {
      user = await this.usersService.syncClaims(user.id as string, claims);
    }

    if (!user) throw new NotFoundException('User not found');

    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    return {
      token: accessToken,
      user: this.serialize(user),
    };
  }

  isDevBypassEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('DEV_PHONE_AUTH_BYPASS') === 'true'
    );
  }

  // Dev-only shortcut for the phone-linking step: the user is already
  // authenticated (via our own JWT from the email/Google sync step above),
  // so this just stamps the phone number onto their existing record.
  async devLinkPhone(userId: string, phoneNumber: string, code: string) {
    if (!this.isDevBypassEnabled()) {
      throw new ForbiddenException('Dev phone auth bypass is disabled');
    }
    if (code !== DEV_OTP_CODE) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const existing = await this.usersService.findByPhoneNumber(phoneNumber);
    if (existing && existing.id !== userId) {
      throw new ConflictException('This phone number is already linked to another account');
    }

    const user = await this.usersService.setPhoneNumber(userId, phoneNumber);
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async updatePhoto(userId: string, photoUrl: string) {
    const user = await this.usersService.setPhoto(userId, photoUrl);
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async skipOnboarding(userId: string) {
    const user = await this.usersService.skipOnboarding(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  // Dev-only bootstrap: there's no production admin UI yet for granting the
  // sales role, so this is how the first sales account gets promoted. Only
  // ever affects the caller's own account.
  async devSetRole(userId: string, role: 'customer' | 'sales') {
    if (!this.isDevBypassEnabled()) {
      throw new ForbiddenException('Dev role bypass is disabled');
    }
    const user = await this.usersService.setRole(userId, role);
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  private serialize(user: UserDocument) {
    return {
      id: user.id as string,
      firebaseUid: user.firebaseUid,
      email: user.email ?? null,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber ?? null,
      name: user.name ?? null,
      photoUrl: user.photoUrl ?? null,
      accountType: user.accountType ?? null,
      companyName: user.companyName ?? null,
      companySize: user.companySize ?? null,
      interests: user.interests ?? [],
      address: user.address ?? null,
      city: user.city ?? null,
      state: user.state ?? null,
      postalCode: user.postalCode ?? null,
      country: user.country ?? null,
      countryIso2: user.countryIso2 ?? null,
      countryDialCode: user.countryDialCode ?? null,
      onboarded: user.onboarded,
      role: user.role,
    };
  }
}
