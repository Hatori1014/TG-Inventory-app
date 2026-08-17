// TT-19 — mirrors backend/src/common/dto/paginated-response.dto.ts, the
// envelope every listing endpoint returns.
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
