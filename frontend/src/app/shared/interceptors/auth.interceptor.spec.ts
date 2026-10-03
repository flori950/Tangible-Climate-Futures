import { HttpClient, provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { of } from 'rxjs';
import { BACKEND_API_URL } from '../service/api.service';
import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let interceptor: AuthInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: {} },
        { provide: HTTP_INTERCEPTORS, useExisting: AuthInterceptor, multi: true },
      ],
    });
    interceptor = TestBed.inject(AuthInterceptor);
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  function setToken(token: string | null) {
    // replace the Firebase token stream with a fixed value
    Object.defineProperty(interceptor, 'idToken$', { value: of(token) });
  }

  it('adds the Firebase ID token as bearer token', () => {
    setToken('token-123');
    http.get(`${BACKEND_API_URL}/journey/1`).subscribe();
    const req = controller.expectOne(`${BACKEND_API_URL}/journey/1`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush({});
  });

  it('sends anonymous requests unchanged', () => {
    setToken(null);
    http.get(`${BACKEND_API_URL}/journey/1`).subscribe();
    const req = controller.expectOne(`${BACKEND_API_URL}/journey/1`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('never sends the token to third parties or for assets', () => {
    setToken('token-123');
    http.get('https://nominatim.openstreetmap.org/search?q=x').subscribe();
    http.get('assets/i18n/de.json').subscribe();
    for (const req of controller.match(() => true)) {
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }
  });
});
