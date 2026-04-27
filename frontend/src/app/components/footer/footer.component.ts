import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  showCookieBanner = false;

  constructor() {
    this.showCookieBanner = !localStorage.getItem('cookieAccepted');
  }

  acceptCookies() {
    localStorage.setItem('cookieAccepted', 'true');
    this.showCookieBanner = false;
  }
}
