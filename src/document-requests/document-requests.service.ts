import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DocumentRequest,
  DocumentRequestDocument,
  RequestedFile,
} from './schemas/document-request.schema';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';

@Injectable()
export class DocumentRequestsService {
  constructor(
    @InjectModel(DocumentRequest.name)
    private readonly model: Model<DocumentRequestDocument>,
  ) {}

  listForUser(userId: string) {
    return this.model.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  create(userId: string, dto: CreateDocumentRequestDto) {
    return this.model.create({
      userId,
      label: dto.label,
      note: dto.note,
      status: 'requested',
    });
  }

  async cancel(userId: string, id: string) {
    const res = await this.model.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0)
      throw new NotFoundException('Request not found');
    return { deleted: true };
  }

  async fulfil(userId: string, id: string, file: RequestedFile) {
    const request = await this.model
      .findOneAndUpdate(
        { _id: id, userId },
        { file, status: 'uploaded' },
        { new: true },
      )
      .exec();
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async findOne(userId: string, id: string) {
    const request = await this.model.findOne({ _id: id, userId }).exec();
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }
}
