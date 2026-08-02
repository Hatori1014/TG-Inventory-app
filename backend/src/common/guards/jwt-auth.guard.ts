import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// HU-01 — validates the JWT on every request. Wired up globally in
// app.module once the auth module exists (Iteration 1); stub for now.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
