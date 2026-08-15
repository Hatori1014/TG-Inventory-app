import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsersService } from './users.service';
import { environment } from '../../../environments/environment';
import { UserAccount } from '../../shared/models/user-account.model';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listUsers() calls GET /users with page/pageSize params', () => {
    service.listUsers(2, 10).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/users` && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush({ items: [], total: 0, page: 2, pageSize: 10 });
  });

  it('createUser() POSTs to /users with the request body', () => {
    const expected: UserAccount = {
      id: '1',
      name: 'Buyer',
      email: 'buyer@tg-group.local',
      role: { id: 'role-1', name: 'Comprador' },
      status: 'active',
    };
    const requestBody = { name: 'Buyer', email: 'buyer@tg-group.local', password: 'password123', roleId: 'role-1' };

    service.createUser(requestBody).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestBody);
    req.flush(expected);
  });

  it('updateUser() PATCHes /users/:id with the request body', () => {
    const expected: UserAccount = {
      id: '1',
      name: 'Buyer',
      email: 'buyer@tg-group.local',
      role: { id: 'role-2', name: 'Administrador' },
      status: 'active',
    };

    service.updateUser('1', { roleId: 'role-2' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ roleId: 'role-2' });
    req.flush(expected);
  });
});
