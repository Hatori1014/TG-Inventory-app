import { Location } from '@prisma/client';
import { LocationResponseDto } from '../dto/location-response.dto';

export function toLocationResponseDto(location: Location): LocationResponseDto {
  return {
    id: location.id,
    name: location.name,
    parentId: location.parentId,
    status: location.status,
  };
}
