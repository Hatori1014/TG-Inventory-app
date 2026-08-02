// Mirrors the backend DTO (plan section 7.4) — keep in sync by hand until
// it's worth sharing a types package between backend/ and frontend/.
export interface Product {
  id: string;
  name: string;
  description?: string;
  unit: string;
  category?: string;
  requiresBatch: boolean;
  imageUrl?: string; // HU-26, post-MVP
  status: 'active' | 'discontinued';
}
