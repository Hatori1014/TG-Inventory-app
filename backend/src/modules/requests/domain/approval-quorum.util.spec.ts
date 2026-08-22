import { decideApprovalOutcome } from './approval-quorum.util';

// HU-17 — TDD-first per convenciones.md's rule ("si el error de esa lógica
// cuesta caro... TDD obligatorio"): getting quorum wrong means a request
// stalls forever or resolves with too few approvals.
describe('decideApprovalOutcome', () => {
  it('awaits more approvals when none have been cast yet', () => {
    expect(decideApprovalOutcome({ decisions: [], requiredApprovals: 2 })).toBe('awaiting_more');
  });

  it('awaits more approvals when below the required count', () => {
    expect(decideApprovalOutcome({ decisions: ['approved'], requiredApprovals: 2 })).toBe('awaiting_more');
  });

  it('reaches quorum exactly at the required count', () => {
    expect(decideApprovalOutcome({ decisions: ['approved', 'approved'], requiredApprovals: 2 })).toBe(
      'quorum_reached',
    );
  });

  it('reaches quorum with a single required approval', () => {
    expect(decideApprovalOutcome({ decisions: ['approved'], requiredApprovals: 1 })).toBe('quorum_reached');
  });

  it('stays at quorum_reached with more approvals than required', () => {
    expect(decideApprovalOutcome({ decisions: ['approved', 'approved', 'approved'], requiredApprovals: 2 })).toBe(
      'quorum_reached',
    );
  });

  it('rejects immediately on a single rejection, regardless of required count', () => {
    expect(decideApprovalOutcome({ decisions: ['rejected'], requiredApprovals: 2 })).toBe('rejected');
  });

  it('rejects even when quorum would otherwise have been reached by the other votes', () => {
    expect(decideApprovalOutcome({ decisions: ['approved', 'rejected'], requiredApprovals: 2 })).toBe('rejected');
  });

  it('rejects when the rejection is cast before any approvals', () => {
    expect(decideApprovalOutcome({ decisions: ['rejected', 'approved'], requiredApprovals: 1 })).toBe('rejected');
  });
});
