import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentRequestStatus = 'requested' | 'uploaded';

@Schema({ _id: false })
export class RequestedFile {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  storedFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  sizeBytes: number;

  @Prop({ default: () => new Date() })
  uploadedAt: Date;
}

const RequestedFileSchema = SchemaFactory.createForClass(RequestedFile);

export type DocumentRequestDocument = HydratedDocument<DocumentRequest>;

// An ad-hoc "please upload your X" ask, scoped to one specific customer —
// separate from the general verification form, which is the same for
// everyone. Only the named userId can see or fulfill it.
@Schema({ timestamps: true })
export class DocumentRequest {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  label: string;

  @Prop()
  note?: string;

  @Prop({ enum: ['requested', 'uploaded'], default: 'requested' })
  status: DocumentRequestStatus;

  @Prop({ type: RequestedFileSchema })
  file?: RequestedFile;

  createdAt: Date;
  updatedAt: Date;
}

export const DocumentRequestSchema =
  SchemaFactory.createForClass(DocumentRequest);
