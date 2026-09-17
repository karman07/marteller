import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '../api-keys/api-key-or-jwt.guard';
import { MailDomainsService } from '../mail-core/mail-domains.service';
import { SuppressionService } from '../mail-core/suppression.service';
import { MailCredentialsService } from './mail-credentials.service';
import { MailService } from './mail.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { AddSuppressionDto } from './dto/add-suppression.dto';

// ApiKeyOrJwtGuard accepts either the dashboard's Bearer JWT or an
// `x-api-key` header — same routes serve both the dashboard and
// programmatic/API sending, per the "send emails through an API" goal.
@UseGuards(ApiKeyOrJwtGuard)
@Controller('mail')
export class MailController {
  constructor(
    private readonly mailDomainsService: MailDomainsService,
    private readonly mailCredentialsService: MailCredentialsService,
    private readonly suppressionService: SuppressionService,
    private readonly mailService: MailService,
  ) {}

  @Get('domains')
  listDomains(@Req() req: Request & { userId: string }) {
    return this.mailDomainsService.list(req.userId);
  }

  @Post('domains')
  createDomain(
    @Req() req: Request & { userId: string },
    @Body() dto: CreateDomainDto,
  ) {
    return this.mailDomainsService.create(req.userId, dto.domain);
  }

  @Get('domains/:id/dns')
  async domainDns(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    const domain = await this.mailDomainsService.findOne(req.userId, id);
    if (!domain) return null;
    return this.mailDomainsService.dnsRecords(domain);
  }

  @Post('domains/:id/verify')
  verifyDomain(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.mailDomainsService.verify(req.userId, id);
  }

  @Post('domains/:id/default')
  setDefaultDomain(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.mailDomainsService.setDefault(req.userId, id);
  }

  @Delete('domains/:id')
  removeDomain(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.mailDomainsService.remove(req.userId, id);
  }

  @Get('credentials')
  listCredentials(@Req() req: Request & { userId: string }) {
    return this.mailCredentialsService.list(req.userId);
  }

  @Post('credentials')
  createCredential(
    @Req() req: Request & { userId: string },
    @Body() dto: CreateCredentialDto,
  ) {
    return this.mailCredentialsService.create(
      req.userId,
      dto.label,
      dto.domainId,
    );
  }

  @Delete('credentials/:id')
  revokeCredential(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.mailCredentialsService.revoke(req.userId, id);
  }

  @Post('send')
  send(@Req() req: Request & { userId: string }, @Body() dto: SendEmailDto) {
    return this.mailService.send(req.userId, dto);
  }

  @Get('messages')
  listMessages(
    @Req() req: Request & { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mailService.list(
      req.userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get('messages/:id')
  getMessage(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.mailService.get(req.userId, id);
  }

  @Get('suppressions')
  listSuppressions(@Req() req: Request & { userId: string }) {
    return this.suppressionService.list(req.userId);
  }

  @Post('suppressions')
  addSuppression(
    @Req() req: Request & { userId: string },
    @Body() dto: AddSuppressionDto,
  ) {
    return this.suppressionService.add(req.userId, dto.email, 'manual');
  }

  @Delete('suppressions/:id')
  removeSuppression(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
  ) {
    return this.suppressionService.remove(req.userId, id);
  }
}
