import { Unit } from '@prisma/client';
import { UnitResponseDto } from '../dto/unit-response.dto';

export function toUnitResponseDto(unit: Unit): UnitResponseDto {
  return {
    id: unit.id,
    name: unit.name,
    status: unit.status,
  };
}
