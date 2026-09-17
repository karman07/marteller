import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { ContactList, ContactListDocument } from './schemas/contact-list.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { BulkCreateContactsDto } from './dto/bulk-create-contacts.dto';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private readonly model: Model<ContactDocument>,
    @InjectModel(ContactList.name) private readonly listModel: Model<ContactListDocument>,
  ) {}

  async list(userId: string, page = 1, limit = 20, list?: string, search?: string) {
    const filter: Record<string, unknown> = { userId };
    if (list) {
      filter.list = list === 'Uncategorized' ? { $in: [null, undefined, ''] } : list;
    }
    if (search?.trim()) {
      const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }, { notes: pattern }];
    }
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit };
  }

  async getLists(userId: string) {
    const [explicitLists, counts] = await Promise.all([
      this.listModel.find({ userId }).sort({ name: 1 }).exec(),
      this.model.aggregate<{ _id: string | null; count: number }>([
        { $match: { userId } },
        { $group: { _id: { $ifNull: ['$list', null] }, count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((c) => [c._id, c.count]));
    const names = new Set(explicitLists.map((l) => l.name));
    for (const key of countMap.keys()) {
      if (key) names.add(key);
    }

    const result = Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ list: name, count: countMap.get(name) ?? 0 }));

    const uncategorizedCount = countMap.get(null) ?? 0;
    if (uncategorizedCount > 0) {
      result.push({ list: 'Uncategorized', count: uncategorizedCount });
    }
    return result;
  }

  async createList(userId: string, name: string) {
    const clean = name.trim();
    return this.listModel
      .findOneAndUpdate({ userId, name: clean }, { userId, name: clean }, { upsert: true, new: true })
      .exec();
  }

  private async ensureListExists(userId: string, name?: string) {
    if (!name) return;
    await this.listModel.findOneAndUpdate({ userId, name }, { userId, name }, { upsert: true }).exec();
  }

  create(userId: string, dto: CreateContactDto) {
    return this.model.create({ ...dto, userId });
  }

  async bulkCreate(userId: string, dto: BulkCreateContactsDto) {
    const list = dto.list?.trim() || undefined;
    const valid: { userId: string; name: string; phone?: string; email?: string; notes?: string; list?: string }[] =
      [];
    let skipped = 0;

    for (const row of dto.contacts) {
      const name = row.name?.trim();
      const phone = row.phone?.trim() || undefined;
      const email = row.email?.trim() || undefined;

      if (!name || (!phone && !email) || (email && !isValidEmail(email))) {
        skipped += 1;
        continue;
      }

      valid.push({ userId, name, phone, email, notes: row.notes?.trim() || undefined, list });
    }

    const created = valid.length > 0 ? await this.model.insertMany(valid) : [];
    if (created.length > 0) await this.ensureListExists(userId, list);
    return { created: created.length, skipped };
  }

  async update(userId: string, id: string, dto: UpdateContactDto) {
    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};

    if (dto.name !== undefined) set.name = dto.name.trim();
    if (dto.phone !== undefined) set.phone = dto.phone.trim() || undefined;
    if (dto.email !== undefined) set.email = dto.email.trim() || undefined;
    if (dto.notes !== undefined) set.notes = dto.notes.trim() || undefined;

    if ('list' in dto) {
      const clean = dto.list?.trim() || null;
      if (clean) {
        await this.ensureListExists(userId, clean);
        set.list = clean;
      } else {
        unset.list = '';
      }
    }

    const update: Record<string, unknown> = {};
    if (Object.keys(set).length > 0) update.$set = set;
    if (Object.keys(unset).length > 0) update.$unset = unset;

    const updated = await this.model.findOneAndUpdate({ _id: id, userId }, update, { new: true }).exec();
    if (!updated) throw new NotFoundException('Contact not found');
    return updated;
  }

  async remove(userId: string, id: string) {
    const res = await this.model.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Contact not found');
    return { deleted: true };
  }
}
