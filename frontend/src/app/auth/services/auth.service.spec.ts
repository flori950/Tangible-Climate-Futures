import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { commonTestProviders } from '../../../testing/test-helpers';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let open: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...commonTestProviders(),
        // The Firebase Auth instance is never reached by the tested code paths.
        { provide: Auth, useValue: {} },
        { provide: MatSnackBar, useValue: { open } },
      ],
    });
    TestBed.inject(TranslateService).setTranslation('en', {
      auth: {
        error: {
          'password-mismatch': 'Passwords differ',
          'wrong-password': 'Wrong password',
          unknown: 'Unknown error',
          dismiss: 'Close',
        },
      },
    });
    service = TestBed.inject(AuthService);
  });

  it('rejects a registration with differing passwords before calling Firebase', async () => {
    const result = await service.register('a@b.de', 'one', 'two');

    expect(result).toBe(false);
    expect(open).toHaveBeenCalledWith('Passwords differ', 'Close', {
      duration: 5000,
      panelClass: ['theme-snackbar-error'],
    });
  });

  it('maps known Firebase error codes to translated messages', () => {
    service.handleAuthError({ code: 'auth/wrong-password' } as never);
    expect(open).toHaveBeenCalledWith('Wrong password', 'Close', expect.any(Object));
  });

  it('falls back to a generic message for unknown error codes', () => {
    service.handleAuthError('auth/too-many-requests');
    expect(open).toHaveBeenCalledWith('Unknown error', 'Close', expect.any(Object));
  });
});
