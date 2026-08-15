// Mirrors the backend DTO (plan section 7.4, HU-06) — keep in sync by hand
// until it's worth sharing a types package between backend/ and frontend/.
export interface Location {
  id: string;
  name: string;
  parentId: string | null;
  status: 'active' | 'inactive';
}

export interface CreateLocationRequest {
  name: string;
  parentId?: string;
}

export interface UpdateLocationRequest {
  name?: string;
  parentId?: string;
  status?: 'active' | 'inactive';
}
