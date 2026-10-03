import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { AuthModule } from '../auth.module';
import { AuthService } from '../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('logs in with the entered credentials and opens the dashboard', async () => {
    const login = vi.spyOn(auth, 'login').mockResolvedValue(true);
    component.email = 'a@b.de';
    component.password = 'secret';

    await component.login();

    expect(login).toHaveBeenCalledWith('a@b.de', 'secret');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('stays on the page when the login fails', async () => {
    vi.spyOn(auth, 'login').mockResolvedValue(false);
    await component.login();
    expect(navigate).not.toHaveBeenCalled();
  });
});
