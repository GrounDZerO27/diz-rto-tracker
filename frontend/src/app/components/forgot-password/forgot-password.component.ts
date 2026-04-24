import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  email   = '';
  message = '';
  error   = '';
  loading = false;
  sent    = false;

  constructor(private auth: AuthService) {}

  submit(): void {
    this.error = '';
    this.message = '';
    if (!this.email) {
      this.error = 'Please enter your email address.';
      return;
    }
    this.loading = true;
    this.auth.forgotPassword(this.email).subscribe({
      next: res => {
        this.message = res.message;
        this.sent    = true;
        this.loading = false;
      },
      error: err => {
        this.error   = err.error?.error ?? 'Something went wrong. Please try again.';
        this.loading = false;
      },
    });
  }
}
