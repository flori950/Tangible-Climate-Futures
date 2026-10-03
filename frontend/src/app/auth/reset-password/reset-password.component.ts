import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class ResetPasswordComponent {
  email = '';

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  async resetPassword() {
    const success = await this.auth.resetPassword(this.email);
    if (success) {
      this.router.navigate(['/auth/login']);
    }
  }
}
