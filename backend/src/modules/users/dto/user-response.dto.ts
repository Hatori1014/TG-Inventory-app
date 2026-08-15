export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
  status: 'active' | 'blocked';
}
