import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { BulkCreateContactsDto } from './dto/bulk-create-contacts.dto';
import { CreateContactListDto } from './dto/create-contact-list.dto';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  list(
    @Req() req: Request & { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('list') list?: string,
    @Query('search') search?: string,
  ) {
    return this.contactsService.list(req.userId, Number(page) || 1, Number(limit) || 20, list, search);
  }

  @Get('lists')
  getLists(@Req() req: Request & { userId: string }) {
    return this.contactsService.getLists(req.userId);
  }

  @Post('lists')
  createList(@Req() req: Request & { userId: string }, @Body() dto: CreateContactListDto) {
    return this.contactsService.createList(req.userId, dto.name);
  }

  @Post()
  create(@Req() req: Request & { userId: string }, @Body() dto: CreateContactDto) {
    return this.contactsService.create(req.userId, dto);
  }

  @Post('bulk')
  bulkCreate(@Req() req: Request & { userId: string }, @Body() dto: BulkCreateContactsDto) {
    return this.contactsService.bulkCreate(req.userId, dto);
  }

  @Patch(':id')
  update(@Req() req: Request & { userId: string }, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(req.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.contactsService.remove(req.userId, id);
  }
}
