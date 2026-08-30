import { Injectable } from '@nestjs/common';
import { ErrorEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export type ErrorEventWithUser = ErrorEvent & {
  user: { id: string; name: string; email: string } | null;
};

export interface ErrorEventFilters {
  module?: string;
  action?: string;
}

export interface CreateErrorEventData {
  userId: string | null;
  module: string | null;
  action: string | null;
  method: string;
  path: string;
  statusCode: number;
  message: string;
}

// No domain/ layer — same trivial-CRUD carve-out as AuditEventPrismaRepository.
@Injectable()
export class ErrorEventPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateErrorEventData): Promise<ErrorEvent> {
    return this.prisma.errorEvent.create({ data });
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters: ErrorEventFilters,
  ): Promise<{ items: ErrorEventWithUser[]; total: number }> {
    const where: Prisma.ErrorEventWhereInput = {
      module: filters.module,
      action: filters.action,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.errorEvent.findMany({
        where,
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.errorEvent.count({ where }),
    ]);
    return { items, total };
  }
}
