import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
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
