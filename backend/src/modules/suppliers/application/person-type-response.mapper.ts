import { PersonType } from '@prisma/client';
import { PersonTypeResponseDto } from '../dto/person-type-response.dto';

export function toPersonTypeResponseDto(personType: PersonType): PersonTypeResponseDto {
  return {
    id: personType.id,
    name: personType.name,
    status: personType.status,
  };
}
