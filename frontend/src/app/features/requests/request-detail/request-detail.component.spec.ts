import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RequestDetailComponent } from './request-detail.component';

function fakeJwt(payload: object): string {
  const base64url = (obj: object) => {
    const utf8Bytes = encodeURIComponent(JSON.stringify(obj)).replace(
      /%([0-9A-F]{2})/g,
      (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
    );
    return btoa(utf8Bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.signature`;
}

function seedSession(userId: string): void {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = fakeJwt({ sub: userId, email: 'approver@tg-group.local', name: 'Beto', role: 'Administrador', exp });
  localStorage.setItem('access_token', token);
}

const baseRequest = {
  id: 'request-1',
  type: 'purchase' as const,
  status: 'pending',
  requesterId: 'requester-1',
  requesterName: 'Ana',
  supplierId: 'supplier-1',
  supplierName: 'Acme Corp',
  purchaseId: null,
  createdAt: '2026-08-20T00:00:00.000Z',
  resolvedAt: null,
  notes: null,
  items: [
    { id: 'item-1', productId: 'product-1', productName: 'Arroz', locationId: 'location-1', locationName: 'Bodega A', quantity: 5, estimatedPrice: 1000 },
  ],
  approvals: [],
};

describe('RequestDetailComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function create(userId: string, overrides: Record<string, unknown> = {}): RequestDetailComponent {
    seedSession(userId);
    TestBed.configureTestingModule({
      imports: [RequestDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'request-1' }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RequestDetailComponent);
    httpMock.expectOne((r) => r.url.endsWith('/requests/request-1')).flush({ ...baseRequest, ...overrides });
    return fixture.componentInstance;
  }

  it('loads the request and stops loading', () => {
    const component = create('approver-1');

    expect(component.loading()).toBe(false);
    expect(component.request()?.id).toBe('request-1');
  });

  it('canActOnApproval() is true for a non-requester when status is pending', () => {
    const component = create('approver-1');

    expect(component.canActOnApproval()).toBe(true);
  });

  it('canActOnApproval() is false for the request\'s own requester (no self-approval)', () => {
    const component = create('requester-1');

    expect(component.canActOnApproval()).toBe(false);
  });

  it('canActOnApproval() is false once the request is closed', () => {
    const component = create('approver-1', { status: 'closed' });

    expect(component.canActOnApproval()).toBe(false);
  });

  it('canIntegrate() is true only for a purchase request pending_inventory_integration', () => {
    const component = create('approver-1', { status: 'pending_inventory_integration' });

    expect(component.canIntegrate()).toBe(true);
  });

  it('canIntegrate() is false for a consumption request even if somehow in that status', () => {
    const component = create('approver-1', { type: 'consumption', status: 'pending_inventory_integration' });

    expect(component.canIntegrate()).toBe(false);
  });

  it('approve() sends the request and updates the displayed request on success', () => {
    const component = create('approver-1');

    component.approve();

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1/approve'));
    expect(req.request.headers.has('Idempotency-Key')).toBe(true);
    req.flush({ ...baseRequest, status: 'in_review' });

    expect(component.request()?.status).toBe('in_review');
    expect(component.isSubmitting).toBe(false);
  });

  it('confirmReject() refuses to submit without a comment', () => {
    const component = create('approver-1');
    component.openRejectForm();

    component.confirmReject();

    httpMock.expectNone((r) => r.url.endsWith('/requests/request-1/reject'));
    expect(component.actionError).toBeTruthy();
  });

  it('confirmReject() sends the mandatory comment and closes the form on success', () => {
    const component = create('approver-1');
    component.openRejectForm();
    component.rejectForm.setValue({ comment: 'Budget exceeded' });

    component.confirmReject();

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1/reject'));
    expect(req.request.body).toEqual({ comment: 'Budget exceeded' });
    req.flush({ ...baseRequest, status: 'closed' });

    expect(component.showRejectForm).toBe(false);
    expect(component.request()?.status).toBe('closed');
  });

  it('integrate() blocks submission when any item has no real unit price', () => {
    const component = create('approver-1', { status: 'pending_inventory_integration' });
    component.integrateItems[0].unitPrice = 0;

    component.integrate();

    httpMock.expectNone((r) => r.url.endsWith('/requests/request-1/integrate'));
    expect(component.actionError).toBeTruthy();
  });

  it('integrate() sends the per-item receiving details and updates on success', () => {
    const component = create('approver-1', { status: 'pending_inventory_integration' });
    component.integrateItems[0].unitPrice = 1200;
    component.integrateItems[0].batchNumber = 'LOT-1';

    component.integrate();

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1/integrate'));
    expect(req.request.body).toEqual({ items: [{ requestItemId: 'item-1', unitPrice: 1200, batchNumber: 'LOT-1' }] });
    req.flush({ ...baseRequest, status: 'closed', purchaseId: 'purchase-1' });

    expect(component.request()?.purchaseId).toBe('purchase-1');
  });

  it('translates a 403 approve response into a clear Spanish message', () => {
    const component = create('approver-1');

    component.approve();

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1/approve'));
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(component.actionError).toBe('No tenés permiso para esta acción.');
  });

  it('translates a 409 approve response (already voted / already resolved) into the backend message', () => {
    const component = create('approver-1');

    component.approve();

    const req = httpMock.expectOne((r) => r.url.endsWith('/requests/request-1/approve'));
    req.flush({ message: 'You already voted on this request' }, { status: 409, statusText: 'Conflict' });

    expect(component.actionError).toBe('You already voted on this request');
  });
});
