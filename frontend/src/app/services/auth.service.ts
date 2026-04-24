import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginPayload, RegisterPayload } from '../models/rto.models';

const TOKEN_KEY    = 'rto_token';
const FULLNAME_KEY = 'rto_fullName';
const EMPNO_KEY    = 'rto_employeeNo';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/register`, payload).pipe(
      tap(res => this.storeSession(res))
    );
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, payload).pipe(
      tap(res => this.storeSession(res))
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/reset-password`, { token, password });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(FULLNAME_KEY);
    localStorage.removeItem(EMPNO_KEY);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get fullName(): string {
    return localStorage.getItem(FULLNAME_KEY) ?? '';
  }

  get employeeNo(): string {
    return localStorage.getItem(EMPNO_KEY) ?? '';
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(FULLNAME_KEY, res.fullName);
    localStorage.setItem(EMPNO_KEY, res.employeeNo);
  }
}
