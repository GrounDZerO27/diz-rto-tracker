import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { authGuard, guestGuard } from './app/guards/auth.guard';
import { CalendarComponent } from './app/components/calendar/calendar.component';
import { LoginComponent } from './app/components/login/login.component';
import { RegisterComponent } from './app/components/register/register.component';
import { ForgotPasswordComponent } from './app/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './app/components/reset-password/reset-password.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideAnimations(),
    provideRouter([
      { path: '',               component: CalendarComponent,      canActivate: [authGuard] },
      { path: 'login',          component: LoginComponent,         canActivate: [guestGuard] },
      { path: 'register',       component: RegisterComponent,      canActivate: [guestGuard] },
      { path: 'forgot-password',component: ForgotPasswordComponent,canActivate: [guestGuard] },
      { path: 'reset-password', component: ResetPasswordComponent },
      { path: '**',             redirectTo: '' },
    ]),
  ],
}).catch(err => console.error(err));

