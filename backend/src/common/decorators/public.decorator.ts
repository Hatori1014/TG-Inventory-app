import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks an endpoint as not requiring a JWT, read by JwtAuthGuard (ADR-24).
// JwtAuthGuard/RolesGuard are registered globally (auth.module.ts) — every
// new endpoint requires auth by default; use this to opt out explicitly.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
