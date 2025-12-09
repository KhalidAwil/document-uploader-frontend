import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map, first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    // Get the required permission and role directly from route data
    const requiredPermission = route.data['requiredPermission'];
    const requiredRole = route.data['requiredRole'];

    return this.authService.currentUser.pipe(
      first(), // take the first emitted value
      map(user => {
        if (!user) {
          this.router.navigate(['/not-found']);
          return false;
        }

        const hasPermission = !requiredPermission || user.permissions.includes(requiredPermission);
        const hasRole = !requiredRole || user.roles.includes(requiredRole);

        if (!hasPermission || !hasRole) {
          this.router.navigate(['/not-found']);
          return false;
        }

        return true;
      })
    );
  }
}