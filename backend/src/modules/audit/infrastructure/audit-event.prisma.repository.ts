import { Injectable } from '@nestjs/common';
import { AuditEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export type AuditEventWithUser = AuditEvent & {
  user: { id: string; name: string; email: string } | null;
};

export interface AuditEventFilters {
  entity?: string;
  action?: string;
  userId?: string;
}

// No domain/ layer — recording/listing an event is trivial CRUD
// (convenciones.md: "CRUD triviales pueden empezar sin las 4 capas"),
// same carve-out as locations/products/suppliers.
@Injectable()
export class AuditEventPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { userId: string | null; action: string; entity: string; entityId: string }): Promise<AuditEvent> {
    return this.prisma.auditEvent.create({ data });
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters: AuditEventFilters,
  ): Promise<{ items: AuditEventWithUser[]; total: number }> {
    const where: Prisma.AuditEventWhereInput = {
      entity: filters.entity,
      action: filters.action,
      userId: filters.userId,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return { items, total };
  }
}
