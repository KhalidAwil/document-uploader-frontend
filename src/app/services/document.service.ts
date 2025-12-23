import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { User } from './auth.service';

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all documents with optional filters
   * @param modelType The type of document (e.g., guide, news, etc.)
   * @param filters Object containing filter key-value pairs
   * @param page current page
   * @param perPage amount of documents shown per page
   */
  getDocuments(
    modelType: string, 
    page: number = 1, 
    perPage: number = 12, 
    filters: any = {}
  ): Observable<PaginatedResponse<Document>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    // Add filters to the query parameters if they exist
    for (let key in filters) {
      if (filters[key]) {
        params = params.append(key, filters[key]);
      }
    }

    return this.http.get<PaginatedResponse<Document>>(`${this.apiUrl}/${modelType}`, { params });
  }

  /**
   * Get a single document by ID
   * @param modelType The type of document (e.g., guide, news, etc.)
   * @param documentId The ID of the document
   */
  getDocument(modelType: string, documentId: string): Observable<any> {
    if(modelType === 'user') {
      return this.getUser(documentId);
    }
    return this.http.get<Document>(`${this.apiUrl}/${modelType}/${documentId}`, { withCredentials: true });
  }

  /**
   * Update a document by ID
   * @param modelType The type of document (e.g., guide, news, etc.)
   * @param documentId The ID of the document
   * @param data The document data to be updated
   */
  updateDocument(modelType: string, documentId: string, data: any): Observable<any> {
    if(modelType === 'user') {
      return this.updateUser(documentId, data);
    }
    return this.http.put<Document>(`${this.apiUrl}/${modelType}/${documentId}`, data, { withCredentials: true });
  }

  /**
 * Create a document
 * @param modelType The type of document (e.g., guide, news, etc.)
 * @param data The document data to be updated
 */
  createDocument(modelType: string, data: any): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${modelType}`, data, { withCredentials: true });
  }

  /**
   * Delete a document by ID
   * @param modelType The type of document (e.g., guide, news, etc.)
   * @param documentId The ID of the document to delete
   */
  deleteDocument(modelType: string, documentId: string): Observable<Document> {
    return this.http.delete<Document>(`${this.apiUrl}/${modelType}/${documentId}`, { withCredentials: true });
  }

  getLatestAllTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/latest-documents`);
  }

  trackDocumentView(modelType: string, documentId: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${modelType}/track_doc_view`, { document_id: documentId },  { withCredentials: true });
  }

  trackImgView(modelType: string, documentId: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${modelType}/track_img_view`, { document_id: documentId }, { withCredentials: true });
  }

  trackPdfView(modelType: string, documentId: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${modelType}/track_pdf_view`, { document_id: documentId }, { withCredentials: true });
  }

  trackVideoView(modelType: string, documentId: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${modelType}/track_video_view`, { document_id: documentId }, { withCredentials: true });
  }

  getRoles(): Observable<any>{
    return this.http.get(`${this.apiUrl}/roles`, {withCredentials: true});
  }
  
  createUser(userData: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/user`, userData, { withCredentials: true });
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/user`, { withCredentials: true });
  }

  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user/${userId}`, { withCredentials: true });
  }

  updateUser(userId: string, userData: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/user/${userId}`, userData, { withCredentials: true });
  }

  updateAuthUser(userData: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/user}`, userData, { withCredentials: true });
  }

  deleteUser(userId: string): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/user/${userId}`, { withCredentials: true });
  }

  /**
   * Check if an athar ID is unique
   * @param atharId The athar ID to check
   * @param excludeId Optional ID to exclude from the check (for editing)
   * @returns Observable<boolean> - true if unique, false if already exists
   */
  checkAtharIdUniqueness(atharId: string, excludeId?: string): Observable<boolean> {
    let params = new HttpParams();
    if (excludeId) {
      params = params.set('exclude_id', excludeId);
    }
    
    return this.http.get<{ isUnique: boolean }>(`${this.apiUrl}/athar/check-id/${encodeURIComponent(atharId)}`, { 
      params,
      withCredentials: true 
    }).pipe(
      map(response => response.isUnique)
    );
  }
}

export interface Document {
  id: number,
  title: string;
  description: string;
  date_of_publication: Date,
  type: string,
  image_url: string,
  image_url_1?: string,
  image_url_2?: string,
  image_url_3?: string,
  image_url_4?: string,
  image_url_5?: string,
  image_url_6?: string,
  image_url_7?: string,
  date_of_event?: Date,
  type_c?: string,
  video_url?: string,
  video_length?: string,
  pdf_url?: string,
  media_type?: string,
  month_of_publication?: string
}
