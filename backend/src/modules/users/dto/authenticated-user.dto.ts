// Owned by users (moved from auth/dto in HU-03, ADR-26) — the narrow,
// password-free projection ValidateUserCredentialsUseCase returns to auth.
export interface AuthenticatedUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}
