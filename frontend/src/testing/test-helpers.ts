import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuthService } from '../app/auth/services/auth.service';

/**
 * Providers most component tests need: a router without routes, an HttpClient
 * backed by HttpTestingController (no real requests), and a TranslateService
 * without loader (the `translate` pipe then simply renders the keys).
 */
export function commonTestProviders(): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter([]),
    provideHttpClient(),
    provideHttpClientTesting(),
    provideTranslateService({ lang: 'en' }),
  ];
}

/** Stand-in for AuthService so tests never touch Firebase. */
export function mockAuthServiceProvider(email: string | null = null): Provider {
  return {
    provide: AuthService,
    useValue: {
      user$: of(email ? { email } : null),
      login: async () => true,
      register: async () => true,
      resetPassword: async () => true,
      logout: async () => true,
    },
  };
}
