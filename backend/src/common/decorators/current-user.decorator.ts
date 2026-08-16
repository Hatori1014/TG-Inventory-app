import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Shape set by JwtStrategy.validate() (backend/src/modules/auth/infrastructure/jwt.strategy.ts).
export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// First real consumer: HU-07 needs to know who registered a movement
// (InventoryMovement.userId) without the client being able to spoof it.
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
