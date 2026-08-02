# Known issues

> Source: `plan-inicial-proyecto-inventario.md`. **This document can't have real content yet** — a "gotcha" is something detected in code, tests, or comments that exist and fail in a specific way; the GitHub repository hasn't been created yet (TT-01 pending), although a local code skeleton already exists (Iteration 0) with the health-check and Prisma migration verified. Versión en español: `errores-conocidos.md`.

[PENDING: this file should be regenerated from real code, tests, and comments as business-story implementation progresses (Iteration 1 onward).]

## Anticipated design risks (not bugs — fragile points flagged during planning)

This is different from a real "known issue", but it's included because the planning document explicitly identified these points as prone to failure if not implemented carefully:

- **`LocationStock` can drift out of sync with `InventoryMovement`** if a future implementation updates stock without going through the same transaction as the movement. The design assumes `InventoryMovement` always wins in case of inconsistency, but that requires the code to actually honor it — it's not automatic.
- **`requiresBatch` validation is easy to skip**: since it's conditional per product (not every product requires it), a DTO or form that doesn't validate this flag properly could allow creating a batch for a product that doesn't require one, or the reverse — allowing a batch-less movement for a product that does require one.
- **Poorly tuned rate limiting (HU-20) could lock out the functional stakeholder themselves** during UAT, if failed login attempts from human error exceed the threshold — worth reviewing the threshold before each UAT checkpoint.
- **The timeline estimates (plan section 6) are assumptions, not measurements**: the document already warns they need to be recalibrated after Iteration 1 closes, once there's a real measure of the developer's actual pace.

[PENDING: everything else — any real library gotcha (known bugs in specific NestJS/Angular/Prisma versions), Cloudflare R2 configuration quirks, real free-tier limits hit in practice, etc. — can only be documented once business-logic implementation exists]
