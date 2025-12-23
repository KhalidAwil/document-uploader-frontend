import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { first, last, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

export interface User {
  user: any,
  roles: string[];
  permissions: string[];
  access_token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('currentUser') || 'null')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(credentials: { email: string; password: string }) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      map((user: User) => {
        // Store user details and token in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      })
    );
  }

  logout() {
    // Remove user from localStorage and set currentUser to null
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login-yemnat-aqy']);
  }
  
  updateUserDetails(updatedData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/user`, updatedData, {
      withCredentials: true
    }).pipe(
      map((response: any) => {
        // Extract the nested user object
        const updatedUser = response.user;
  
        if (updatedUser) {
          // Merge the updated user with existing data
          const updatedCurrentUser: User = {
            ...this.currentUserValue, // Retain existing roles, permissions, and other top-level data
            user: {
              ...this.currentUserValue?.user, // Retain existing user data
              ...updatedUser // Overwrite with updated user data
            },
            roles: response.roles || [], // Ensure roles is always an array
            permissions: response.permissions || [] // Ensure permissions is always an array
          };
  
          // Update localStorage and the BehaviorSubject
          localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
          this.currentUserSubject.next(updatedCurrentUser);
  
          return updatedCurrentUser;
        }
  
        // If no nested user object is found, log a warning
        console.warn('No nested user object found in the response.');
        return response;
      })
    );
  }

  isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user ? user.roles.includes(role) : false;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUserValue;
    return user ? user.permissions.includes(permission) : false;
  }

  isRootSuperAdmin(): boolean {
    return this.hasRole('root_super_admin');
  }

  // Helper method for setting headers, including authentication
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken'); // Assuming token is stored in localStorage
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }
}

