// Thrown from inside RequestPrismaRepository's approval transaction and
// translated to the appropriate HTTP status by the use-case — same split as
// InsufficientStockError/VersionConflictError in inventory-ledger.util.ts.
export class RequestNotFoundError extends Error {}
export class SelfApprovalError extends Error {}
export class AlreadyVotedError extends Error {}
export class RequestAlreadyResolvedError extends Error {}
