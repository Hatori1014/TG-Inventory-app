export interface LocationResponseDto {
  id: string;
  name: string;
  parentId: string | null;
  status: 'active' | 'inactive';
}
