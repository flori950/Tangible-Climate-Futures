import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    const success = await this.auth.login(this.email, this.password);
    if (success) this.router.navigate(['/dashboard']);
    console.log(success);
  }
}
