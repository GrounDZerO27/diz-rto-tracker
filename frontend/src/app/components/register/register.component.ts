import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  fullName   = '';
  employeeNo = '';
  email      = '';
  password   = '';
  error      = '';
  loading    = false;
  showPass   = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.error = '';
    if (!this.fullName || !this.employeeNo || !this.email || !this.password) {
      this.error = 'Please fill in all fields.';
      return;
    }
    this.loading = true;
    this.auth.register({
      fullName: this.fullName,
      employeeNo: this.employeeNo,
      email: this.email,
      password: this.password,
    }).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.error   = err.error?.error ?? 'Registration failed. Please try again.';
        this.loading = false;
      },
    });
  }
}
