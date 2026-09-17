import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { VerificationDocument } from './schemas/business-verification.schema';

// Shared by every route that accepts verification documents — the
// applicant's own self-submit (VerificationController) and the sales/admin
// "submit on behalf of this applicant" routes (SalesController,
// AdminController) — so storage location, filename scheme and the two
// fixed document slots never drift between them.
export const VERIFICATION_UPLOAD_DIR = join(process.cwd(), 'uploads', 'verification');

export const VERIFICATION_FILE_FIELDS = [
  { name: 'businessProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
];

export const VERIFICATION_MULTER_OPTIONS = {
  storage: diskStorage({
    destination: VERIFICATION_UPLOAD_DIR,
    filename: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
};

export type UploadedVerificationFiles = {
  businessProof?: Express.Multer.File[];
  addressProof?: Express.Multer.File[];
};

export function buildVerificationDocuments(
  files: UploadedVerificationFiles | undefined,
): VerificationDocument[] {
  const documents: VerificationDocument[] = [];
  for (const [type, list] of Object.entries(files ?? {})) {
    const file = list?.[0];
    if (!file) continue;
    documents.push({
      type,
      fileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date(),
    });
  }
  return documents;
}

export function parseFieldValuesJson(json: string): Record<string, string> {
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    throw new BadRequestException('fieldValuesJson must be valid JSON');
  }
}
