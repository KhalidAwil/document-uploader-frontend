import { inject, Injectable } from '@angular/core';
import {
  HttpEvent, HttpRequest, HttpXsrfTokenExtractor,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpClient
} from '@angular/common/http';
import { firstValueFrom, from, Observable, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export const httpXsrfInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const headerName = 'X-XSRF-TOKEN';
  if (req.headers.has(headerName)) { // If header already exists, skip
    return next(req);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return next(req);
  }

  const http = inject(HttpClient);
  const xsrfExtractor = inject(HttpXsrfTokenExtractor);

  // Convert the Promise to an Observable and use switchMap to wait for it
  return from(getCsrfCookie(http, xsrfExtractor)).pipe(
    switchMap(token => {
      // Ensure token is available before modifying the request
      if (token !== null && !req.headers.has(headerName)) {
        req = req.clone({ headers: req.headers.set(headerName, token) });
      }
      // Proceed with the next handler
      return next(req);
    })
  );
}

async function getCsrfCookie(httpClient: HttpClient, xsrfExtractor: HttpXsrfTokenExtractor): Promise<string | null> {
  // Get the CSRF cookie from the backend
  let baseUrl = '';
  try {
    baseUrl = new URL(environment.apiUrl).origin;
  } catch (e) {
    console.error('Invalid API URL in environment', e);
    baseUrl = window.location.origin; // Fallback
  }

  await firstValueFrom(httpClient.get(`${baseUrl}/sanctum/csrf-cookie`, { withCredentials: true }));
  const token = xsrfExtractor.getToken();
  return token;
}
