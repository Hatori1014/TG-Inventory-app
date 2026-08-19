import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { SupplierPrismaRepository } from '../../infrastructure/supplier.prisma.repository';
import { CreateSupplierDto } from '../../dto/create-supplier.dto';
import { SupplierResponseDto } from '../../dto/supplier-response.dto';
import { toSupplierResponseDto } from '../supplier-response.mapper';
import { isForeignKeyViolation, isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateSupplierUseCase {
  constructor(private readonly supplierRepository: SupplierPrismaRepository) {}

  async execute(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    if (dto.taxId) {
      const duplicate = await this.supplierRepository.findActiveByTaxId(dto.taxId, dto.documentTypeId);
      if (duplicate) {
        throw new ConflictException(`An active supplier with tax ID "${dto.taxId}" already exists`);
      }
    }

    try {
      const supplier = await this.supplierRepository.create({
        name: dto.name,
        taxId: dto.taxId,
        documentTypeId: dto.documentTypeId,
        personTypeId: dto.personTypeId,
        contact: dto.contact,
        phone: dto.phone,
        email: dto.email,
      });
      return toSupplierResponseDto(supplier);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`An active supplier with tax ID "${dto.taxId}" already exists`);
      }
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('documentTypeId or personTypeId does not exist');
      }
      throw error;
    }
  }
}
