import { CategoryResponseDto } from './category-response.dto';
import { UnitResponseDto } from './unit-response.dto';

export interface ProductResponseDto {
  id: string;
  name: string;
  description: string | null;
  unit: UnitResponseDto;
  category: CategoryResponseDto | null;
  requiresBatch: boolean;
  imageUrl: string | null;
  status: 'active' | 'discontinued';
}
