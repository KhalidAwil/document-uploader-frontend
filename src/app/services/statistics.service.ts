import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  private apiUrl = environment.apiUrl + '/statistics';  // Base URL for API requests

  constructor(private http: HttpClient) {}

  getStatistics(params: any): Observable<any> {
    return this.http.get<any>(this.apiUrl, {params});
  }

  incrementView(documentType: string, documentId: number, viewType: 'views' | 'image_views' | 'pdf_views' | 'video_views', mediaType?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/increment`, {
      document_type: documentType,
      media_type: mediaType,
      document_id: documentId,
      action: viewType
    }, { withCredentials: true });
  }

  incrementPageView(pageType: 'homepage' | 'join-us' | 'contact-us'): Observable<any> {
    return this.http.post(`${this.apiUrl}/increment`, {
      page_type: pageType,
      action: 'page_views'
    }, { withCredentials: true });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken'); // Assuming token is stored in localStorage
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }
}
