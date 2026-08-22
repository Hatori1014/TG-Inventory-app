import { PurchaseRequestSubmission } from './purchase-request-submission.entity';
import { RequestItemInput } from './request-item-input.value-object';

describe('PurchaseRequestSubmission', () => {
  const oneItem = [new RequestItemInput('product-1', 'location-1', 5)];

  it('can submit with a supplier and at least one item', () => {
    const submission = new PurchaseRequestSubmission('supplier-1', oneItem);

    expect(submission.canSubmit()).toBe(true);
  });

  it('cannot submit without a supplier', () => {
    const submission = new PurchaseRequestSubmission(null, oneItem);

    expect(submission.canSubmit()).toBe(false);
  });

  it('cannot submit without any items', () => {
    const submission = new PurchaseRequestSubmission('supplier-1', []);

    expect(submission.canSubmit()).toBe(false);
  });

  it('a draft may be saved with no supplier and no items', () => {
    // Saving as a draft never calls canSubmit() — this just documents that
    // construction itself doesn't enforce the submission rule.
    expect(() => new PurchaseRequestSubmission(null, [])).not.toThrow();
  });
});
