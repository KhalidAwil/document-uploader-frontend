import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate() {
    if (this.auth.isAuthenticated()) {
      return true;
    }
    
    this.router.navigate(['/login-yemnat-aqy']);
    return false;
  }
}