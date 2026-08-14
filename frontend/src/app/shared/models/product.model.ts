// Mirrors the backend DTO (plan section 7.4) — keep in sync by hand until
// it's worth sharing a types package between backend/ and frontend/.
import { Category } from './category.model';
import { Unit } from './unit.model';

export interface Product {
  id: string;
  name: string;
  description?: string;
  unit: Unit; // selected from the Unit catalog, not free text (TT-23)
  category?: Category; // selected from the Category catalog, not free text (TT-23)
  requiresBatch: boolean;
  imageUrl?: string; // HU-26, post-MVP
  status: 'active' | 'discontinued';
}
