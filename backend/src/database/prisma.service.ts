import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Shared by every module for database access through Prisma. Each module's
// infrastructure repository (e.g. supplier.prisma.repository.ts, section 8.2)
// injects this service.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // ADR-22 — Role is the first model using logical deletion
    // (migration 20260822010000): normal reads exclude soft-deleted rows
    // here, once, instead of a `where: { deletedAt: null }` repeated by
    // hand in every use-case/repository (same reasoning as TT-19's shared
    // pagination helpers — don't reimplement a cross-cutting pattern per
    // call site). Deliberately scoped to `role` only, per ADR-22's own
    // text — never applied blanket to every model. Only findMany/
    // findFirst/count are overridden (ADR-22's own list) — repository code
    // that needs a single row by id uses findFirst({ where: { id } })
    // rather than findUnique, specifically so it goes through this filter
    // too (see RolePrismaRepository.findById).
    return Object.assign(
      this,
      this.$extends({
        query: {
          role: {
            findMany: withActiveOnly,
            findFirst: withActiveOnly,
            count: withActiveOnly,
          },
        },
      }),
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

type QueryArgsWithWhere = { where?: Record<string, unknown> };

async function withActiveOnly<Args extends QueryArgsWithWhere, Result>(params: {
  args: Args;
  query: (args: Args) => Promise<Result>;
}): Promise<Result> {
  return params.query({ ...params.args, where: { ...params.args.where, deletedAt: null } });
}
