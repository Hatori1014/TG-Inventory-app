export type ApprovalDecision = 'approved' | 'rejected';

export interface ApprovalOutcomeInput {
  decisions: ApprovalDecision[];
  requiredApprovals: number;
}

export type ApprovalOutcome = 'awaiting_more' | 'quorum_reached' | 'rejected';

// HU-17, at the user's explicit request: parallel multi-approval — any of
// the required approvers can cast one of the needed votes (not a strict
// sequence). A single rejection closes the request immediately ("si existe
// un rechazo se cierra la solicitud"), even if enough approvals were also
// cast — rejection always wins over quorum.
export function decideApprovalOutcome(input: ApprovalOutcomeInput): ApprovalOutcome {
  if (input.decisions.includes('rejected')) {
    return 'rejected';
  }
  const approvedCount = input.decisions.filter((decision) => decision === 'approved').length;
  return approvedCount >= input.requiredApprovals ? 'quorum_reached' : 'awaiting_more';
}
