import { inject, Injectable } from '@angular/core';
import {
  HttpEvent, HttpRequest, HttpXsrfTokenExtractor,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpClient
} from '@angular/common/http';

import { firstValueFrom, from, Observable, switchMap } from 'rxjs';

export const httpXsrfInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const headerName = 'X-XSRF-TOKEN';

  if (req.method === 'GET' || req.method === 'HEAD') {
    return next(req);
  }

  const http = inject(HttpClient);
  const xsrfExtractor = inject(HttpXsrfTokenExtractor);

  // Convert the Promise to an Observable and use switchMap to wait for it
  return from(getCsrfCookie(http, xsrfExtractor)).pipe(
    switchMap(token => {
      console.log(token);
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
  // In production, this will use the same domain (proxied through Nginx)
  // In development, this uses localhost:8000
  const baseUrl = window.location.origin.includes('localhost')
    ? 'http://localhost:8000'
    : window.location.origin;

  await firstValueFrom(httpClient.get(`${baseUrl}/sanctum/csrf-cookie`, { withCredentials: true }));
  const token = xsrfExtractor.getToken();
  return token;
}
