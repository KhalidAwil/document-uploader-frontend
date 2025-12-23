import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface LogoData {
  header: { url: string | null; size: string };
  footer: { url: string | null; size: string };
  pdf: { url: string | null };
}

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private logoSubject = new BehaviorSubject<LogoData | null>(null);

  // Expose the full logo data
  logoData$ = this.logoSubject.asObservable();

  // Backward compatibility for header logo URL
  headerLogoUrl$ = this.logoSubject.asObservable().pipe(
    map(logoData => logoData?.header.url || null)
  );

  // Backward compatibility for footer logo URL
  footerLogoUrl$ = this.logoSubject.asObservable().pipe(
    map(logoData => logoData?.footer.url || null)
  );

  constructor(private http: HttpClient) {
    this.loadInitialLogos();
  }

  private loadInitialLogos() {
    this.getLogos().subscribe({
      next: (logoData) => {
        this.logoSubject.next(logoData);
      },
      error: (error) => {
        console.error('Error loading logos:', error);
        this.logoSubject.next(null);
      }
    });
  }

  getLogos(): Observable<LogoData | null> {
    return this.http.get<LogoData>(`${environment.apiUrl}/logos`, { withCredentials: true });
  }

  uploadLogo(headerUrl: string | null, headerSize: string, footerUrl: string | null, footerSize: string, pdfUrl: string | null): Observable<any> {
    return this.http.post(`${environment.apiUrl}/logo`, {
      header_url: headerUrl,
      header_size: headerSize,
      footer_url: footerUrl,
      footer_size: footerSize,
      pdf_url: pdfUrl
    }, { withCredentials: true }).pipe(
      tap((response: any) => {
        this.logoSubject.next({
          header: { url: response.header.url, size: response.header.size },
          footer: { url: response.footer.url, size: response.footer.size },
          pdf: { url: response.pdf.url }
        });
      })
    );
  }

  updateLogoSize(type: 'header' | 'footer', size: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/logo/size`, { type, size }, { withCredentials: true }).pipe(
      tap((response: any) => {
        this.logoSubject.next({
          header: { url: response.header.url, size: response.header.size },
          footer: { url: response.footer.url, size: response.footer.size },
          pdf: { url: response.pdf.url }
        });
      })
    );
  }

  deleteLogo(type: 'header' | 'footer' | 'pdf'): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/logo`, { body: { type }, withCredentials: true }).pipe(
      tap((response: any) => {
        this.logoSubject.next({
          header: { url: response.header.url, size: response.header.size },
          footer: { url: response.footer.url, size: response.footer.size },
          pdf: { url: response.pdf.url }
        });
      })
    );
  }
}
