import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { AuthModule } from '../auth.module';
import { AuthService } from '../services/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('registers and redirects to the login page', async () => {
    const register = vi.spyOn(auth, 'register').mockResolvedValue(true);
    component.email = 'a@b.de';
    component.password = 'pw';
    component.repeatPassword = 'pw';

    await component.register();

    expect(register).toHaveBeenCalledWith('a@b.de', 'pw', 'pw');
    expect(navigate).toHaveBeenCalledWith(['auth/login']);
  });

  it('does not navigate when registration fails', async () => {
    vi.spyOn(auth, 'register').mockResolvedValue(false);
    await component.register();
    expect(navigate).not.toHaveBeenCalled();
  });
});
