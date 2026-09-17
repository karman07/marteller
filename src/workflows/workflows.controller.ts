import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  list(@Req() req: Request & { userId: string }) {
    return this.workflowsService.listOrSeed(req.userId);
  }

  @Get(':id')
  findOne(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.workflowsService.findOne(req.userId, id);
  }

  @Post()
  create(
    @Req() req: Request & { userId: string },
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowsService.create(req.userId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request & { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(req.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.workflowsService.remove(req.userId, id);
  }

  @Post(':id/run')
  run(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.workflowsService.run(req.userId, id, 'manual');
  }

  @Get(':id/runs')
  listRuns(@Req() req: Request & { userId: string }, @Param('id') id: string) {
    return this.workflowsService.listRuns(req.userId, id);
  }
}
