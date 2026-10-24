import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { errorInterceptor } from '../http/error.interceptor';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService> & { token: jasmine.Spy; actingTenant: jasmine.Spy };

  beforeEach(() => {
    auth = Object.assign(jasmine.createSpyObj<AuthService>('AuthService', ['logout']), {
      token: jasmine.createSpy('token').and.returnValue('abc'),
      actingTenant: jasmine.createSpy('actingTenant').and.returnValue('acme'),
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('sends the token and the company chosen by the superadmin', () => {
    http.get('/api/x').subscribe();

    const req = backend.expectOne('/api/x');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    expect(req.request.headers.get('X-Tenant-Id')).toBe('acme');
    req.flush({});
  });

  it('logs out on 401 and shows the ProblemDetails message', async () => {
    const call = firstValueFrom(http.get('/api/x'));
    backend.expectOne('/api/x').flush({ title: 'Auth', detail: 'La sesión ya no es válida.' }, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(call).toBeRejectedWithError('La sesión ya no es válida.');
    expect(auth.logout).toHaveBeenCalled();
  });

  it('joins validation messages', async () => {
    const call = firstValueFrom(http.get('/api/x'));
    backend.expectOne('/api/x').flush({ title: 'x', errors: { Nombre: ['El nombre es obligatorio.'] } }, { status: 400, statusText: 'Bad Request' });

    await expectAsync(call).toBeRejectedWithError('El nombre es obligatorio.');
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
