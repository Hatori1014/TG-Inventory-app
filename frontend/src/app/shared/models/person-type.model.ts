// Mirrors the backend DTO (HU-04, at the user's explicit request — an
// administrable catalog like Category/Unit, TT-23). Keep in sync by hand
// until it's worth sharing a types package between backend/ and frontend/.
export interface PersonType {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface CreatePersonTypeRequest {
  name: string;
}

export interface UpdatePersonTypeRequest {
  name?: string;
  status?: 'active' | 'inactive';
}
