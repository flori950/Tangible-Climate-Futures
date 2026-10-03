import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { AuthModule } from '../auth.module';
import { AuthService } from '../services/auth.service';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requests a reset mail and returns to the login page', async () => {
    const reset = vi.spyOn(TestBed.inject(AuthService), 'resetPassword').mockResolvedValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.email = 'a@b.de';

    await component.resetPassword();

    expect(reset).toHaveBeenCalledWith('a@b.de');
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
