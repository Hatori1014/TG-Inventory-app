// TT-19 — standard response envelope for every listing endpoint. Kept as a
// plain interface (not a class) since it only ever describes an outgoing
// shape built by paginate.util.ts — nothing constructs or validates it as
// an instance.
export interface PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
