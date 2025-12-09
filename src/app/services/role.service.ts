import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environment';

export interface Role {
  name: string;
  role_code: string;
  role_label: string;
}

export interface RoleUpdateResponse {
  success: boolean;
  message?: string;
  errors?: { [key: string]: string[] };
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${environment.apiUrl}/roles`;
  private roleCache = new BehaviorSubject<Role[]>([]); // Cache as BehaviorSubject

  constructor(private http: HttpClient) {}

  getRoles(forceRefresh: boolean = false): Observable<Role[]> {
    console.log(`Getting roles (forceRefresh: ${forceRefresh})`);
    if (forceRefresh || this.roleCache.value.length === 0) {
      const timestamp = new Date().getTime();
      const params = new HttpParams().set('_', timestamp.toString());
      const headers = new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      return this.http.get<Role[]>(this.apiUrl, { withCredentials: true, headers, params }).pipe(
        map(roles => {
          const processedRoles = roles.map(role => ({
            ...role,
            role_code: String(role.role_code)
          }));
          console.log('Roles fetched from server:', processedRoles);
          this.roleCache.next(processedRoles); // Update cache
          return processedRoles;
        }),
        catchError(error => {
          console.error('Error fetching roles:', error);
          return of([]);
        })
      );
    }
    console.log('Returning cached roles:', this.roleCache.value);
    return this.roleCache.asObservable(); // Return cached roles as Observable
  }

  // Expose the BehaviorSubject value synchronously
  getCachedRoles(): Role[] {
    return this.roleCache.getValue();
  }

  updateRole(originalRoleCode: string, updatedRole: { role_label: string; role_code: string }): Observable<RoleUpdateResponse> {
    const payload = {
      role_label: updatedRole.role_label,
      role_code: String(updatedRole.role_code)
    };
    console.log(`Updating role ${originalRoleCode} with:`, payload);

    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return this.http.put<{ message: string; role: Role }>(`${this.apiUrl}/${originalRoleCode}`, payload, { withCredentials: true, headers }).pipe(
      map(response => {
        console.log('Role update response:', response);
        this.clearCache(); // Clear cache on update
        return { success: true, message: response.message };
      }),
      catchError(error => {
        console.error('Role update error:', error);
        const errorResponse = error.error || { message: 'Unknown error', errors: { general: ['An unexpected error occurred'] } };
        return of({ success: false, message: errorResponse.message, errors: errorResponse.errors });
      })
    );
  }

  convertDropdownOptionsToRoles(options: { label: string; value: string }[], originalRoles: Role[]): Role[] {
    return options.map((option, index) => {
      const labelParts = option.label.split(' - ');
      const roleLabel = labelParts.length > 1 ? labelParts[1] : option.label;
      const roleCode = String(option.value);

      const originalRole = originalRoles[index] || { name: '' };

      if (!originalRole.name) {
        const matchedRole = originalRoles.find(role =>
          String(role.role_code) === roleCode || role.role_label === roleLabel
        );
        if (matchedRole) {
          return {
            name: matchedRole.name,
            role_code: roleCode,
            role_label: roleLabel
          };
        }
        console.warn(`No matching original role found for role_code: ${roleCode}, role_label: ${roleLabel}`);
        return {
          name: `role_${roleCode}`,
          role_code: roleCode,
          role_label: roleLabel
        };
      }

      return {
        name: originalRole.name,
        role_code: roleCode,
        role_label: roleLabel
      };
    });
  }

  clearCache(): void {
    console.log('Clearing role cache');
    this.roleCache.next([]);
  }
}