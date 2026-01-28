import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap, catchError, of, map } from 'rxjs';

export interface SiteLabel {
    id: number;
    key: string;
    value: string;
    section: string;
    created_at?: string;
    updated_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class LabelService {
    private apiUrl = `${environment.apiUrl}/site-labels`;
    private labelsSignal = signal<Record<string, string>>({});

    constructor(private http: HttpClient) { }

    /**
     * Load all labels from the API.
     * Should be called during app initialization.
     */
    loadLabels(): Observable<any> {
        return this.http.get<{ data: SiteLabel[] }>(this.apiUrl).pipe(
            tap(response => {
                const labelsMap: Record<string, string> = {};
                response.data.forEach(label => {
                    labelsMap[label.key] = label.value;
                });
                this.labelsSignal.set(labelsMap);
            }),
            catchError(error => {
                console.error('Failed to load site labels', error);
                // Fallback or empty (static text usually remains if pipe fails to find key? 
                // Or pipe assumes key IS the text if not found)
                return of({});
            })
        );
    }

    /**
     * Get a label value by key.
     * Returns the key itself if not found.
     */
    get(key: string): string {
        const labels = this.labelsSignal();
        return labels[key] !== undefined ? labels[key] : key;
    }

    /**
     * Get all labels (for admin management)
     * We re-fetch to ensure fresh data for admin, or use cached.
     * But actually this service stores a Map. Admin needs the full object list including sections.
     * So Admin will likely use a different method or just use HttpClient directly, 
     * BUT it's better if this service handles it.
     */
    getAllLabels(): Observable<SiteLabel[]> {
        return this.http.get<{ data: SiteLabel[] }>(this.apiUrl).pipe(
            map(res => res.data)
        );
    }

    /**
     * Update labels (bulk)
     */
    updateLabels(labels: Partial<SiteLabel>[]): Observable<any> {
        return this.http.put(this.apiUrl, { labels }).pipe(
            tap(() => {
                // Refresh local cache after update
                this.loadLabels().subscribe();
            })
        );
    }
}
