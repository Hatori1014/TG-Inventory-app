// Mirrors the backend DTO (plan section 7.4, TT-23) — keep in sync by hand
// until it's worth sharing a types package between backend/ and frontend/.
export interface Unit {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface CreateUnitRequest {
  name: string;
}

export interface UpdateUnitRequest {
  name?: string;
  status?: 'active' | 'inactive';
}
