import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root',
})
export class ContactMessagesService {
  private apiUrl = `${environment.apiUrl}/contact-message`;

  constructor(private http: HttpClient) {}

  // Fetch all messages
  getMessages(): Observable<any> {
    return this.http.get(`${this.apiUrl}`, { withCredentials: true });
  }

  // Delete a specific message by ID
  deleteMessage(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}