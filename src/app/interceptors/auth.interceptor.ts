import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  // Get token from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const token = currentUser?.access_token;

  // Clone request and add Authorization header if token exists
  // Also include withCredentials: true for stateful Sanctum authentication
  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  } else {
    // Even without token, include withCredentials for CSRF cookies
    request = request.clone({
      withCredentials: true
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
