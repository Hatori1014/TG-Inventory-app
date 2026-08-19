import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupplierPrismaRepository } from '../../infrastructure/supplier.prisma.repository';
import { UpdateSupplierDto } from '../../dto/update-supplier.dto';
import { SupplierResponseDto } from '../../dto/supplier-response.dto';
import { toSupplierResponseDto } from '../supplier-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdateSupplierUseCase {
  constructor(private readonly supplierRepository: SupplierPrismaRepository) {}

  async execute(id: string, dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    if (
      dto.name === undefined &&
      dto.taxId === undefined &&
      dto.contact === undefined &&
      dto.phone === undefined &&
      dto.email === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.supplierRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    // The uniqueness rule only bites when the *result* of this update would
    // be an active supplier with that tax ID — so it fires both when taxId
    // changes and when status flips (back) to active, but never when the
    // change is a deactivation (moving out of the active pool can't create
    // a new conflict).
    if (dto.taxId !== undefined || dto.status !== undefined) {
      const effectiveTaxId = dto.taxId !== undefined ? dto.taxId : existing.taxId;
      const effectiveStatus = dto.status ?? existing.status;
      if (effectiveTaxId && effectiveStatus === 'active') {
        const duplicate = await this.supplierRepository.findActiveByTaxId(effectiveTaxId);
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException(`An active supplier with tax ID "${effectiveTaxId}" already exists`);
        }
      }
    }

    try {
      const updated = await this.supplierRepository.update(id, dto);
      return toSupplierResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`An active supplier with tax ID "${dto.taxId}" already exists`);
      }
      throw error;
    }
  }
}
