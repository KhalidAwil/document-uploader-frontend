import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { timeout, catchError, retry } from 'rxjs/operators';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = environment.apiUrl + '/reports';
  private usersApiUrl = environment.apiUrl + '/user';

  constructor(private http: HttpClient) { }

  generateReport(documentType: string, filters: any[], page: number = 1, perPage: number = 12): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generate`, {
      documentType,
      filters,
      page,
      per_page: perPage
    }, { withCredentials: true }).pipe(
      timeout(30000), // 30 seconds timeout
      retry(1), // Retry once on failure
      catchError(error => {
        console.error('Error generating report:', error);
        return throwError(() => new Error('Failed to generate report. Please try again.'));
      })
    );
  }

  downloadReport(documentType: string, filters: any[], format: 'pdf' | 'xlsx' | 'csv'): Observable<Blob> {
    return this.http.post<Blob>(`${this.apiUrl}/download/${format}`, {
      documentType,
      filters
    }, {
      responseType: 'blob' as 'json',
      withCredentials: true
    }).pipe(
      timeout(60000), // 60 seconds timeout for downloads
      catchError(error => {
        if (error.name === 'TimeoutError') {
          console.error('Download request timed out');
          return throwError(() => new Error('Download timed out. The report may be too large or the server is busy.'));
        }
        console.error(`Error downloading ${format} report:`, error);
        return throwError(() => new Error(`Failed to download ${format} report. Please try again or choose a different format.`));
      })
    );
  }

  triggerDownload(blob: Blob, format: string, documentType: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report_${documentType}_${timestamp}.${format}`;
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    try {
      if (format === 'csv') {
        const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const csvWithBOM = new Blob([BOM, blob], { type: 'text/csv;charset=utf-8' });
        
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(csvWithBOM);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error triggering download:', error);
      alert('Failed to download the file. Please try again.');
    } finally {
      // Always clean up the URL
      window.URL.revokeObjectURL(url);
    }
  }

  getUsers(): Observable<{ id: number; nickname: string }[]> {
    return this.http.get<{ id: number; nickname: string }[]>(this.usersApiUrl, { 
      withCredentials: true 
    }).pipe(
      timeout(15000), // 15 seconds timeout
      catchError(error => {
        console.error('Error fetching users:', error);
        return throwError(() => new Error('Failed to fetch users. Please refresh the page.'));
      })
    );
  }
}