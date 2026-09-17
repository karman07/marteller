import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private readonly model: Model<PlanDocument>,
  ) {}

  // Public — the pricing page needs this for logged-out visitors too.
  listActive() {
    return this.model
      .find({ isActive: true })
      .sort({ sortOrder: 1 })
      .exec();
  }

  // Admin-only — includes inactive/retired plans for management.
  listAll() {
    return this.model.find().sort({ sortOrder: 1 }).exec();
  }

  async findById(id: string) {
    const plan = await this.model.findById(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.model.findOne({ slug: dto.slug }).exec();
    if (existing) {
      throw new BadRequestException(
        `A plan with slug "${dto.slug}" already exists`,
      );
    }
    return this.model.create(dto);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Plan not found');
    return { deleted: true };
  }
}
