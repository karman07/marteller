import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesGuard } from './sales.guard';
import { SalesLeadsService } from './sales-leads.service';
import {
  CreateSalesLeadDto,
  PromoteLeadDto,
  UpdateSalesLeadDto,
} from './dto/sales-lead.dto';

@UseGuards(JwtAuthGuard, SalesGuard)
@Controller('sales/leads')
export class SalesLeadsController {
  constructor(private readonly salesLeadsService: SalesLeadsService) {}

  @Get()
  list() {
    return this.salesLeadsService.list();
  }

  @Post()
  create(@Body() dto: CreateSalesLeadDto) {
    return this.salesLeadsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesLeadDto) {
    return this.salesLeadsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesLeadsService.remove(id);
  }

  @Post(':id/promote')
  promote(@Param('id') id: string, @Body() dto: PromoteLeadDto) {
    return this.salesLeadsService.promote(id, dto);
  }
}
