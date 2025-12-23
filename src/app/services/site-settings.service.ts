import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface SiteSettings {
  logos: {
    header_url?: string | null;
    footer_url?: string | null;
    pdf_url?: string | null;
    header_size?: string;
    footer_size?: string;
  };
  carousel_images: { id: number; image_url: string }[];
}

const DEFAULT_SETTINGS: SiteSettings = {
  logos: {
    header_url: null,
    footer_url: null,
    pdf_url: null,
    header_size: 'medium',
    footer_size: 'medium'
  },
  carousel_images: []
};

@Injectable({
  providedIn: 'root'
})
export class SiteSettingsService {
  private apiUrl = `${environment.apiUrl}/site-settings`;
  private cachedSettings$: Observable<SiteSettings> | null = null;
  
  // BehaviorSubject to store and emit the current site settings
  private siteSettingsSubject = new BehaviorSubject<SiteSettings>(DEFAULT_SETTINGS);
  
  // Observable that components can subscribe to
  public siteSettings$ = this.siteSettingsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize by loading settings
    this.refreshSettings();
  }

  // Refresh the settings from the server
  refreshSettings(): void {
    this.http.get<SiteSettings>(this.apiUrl, {withCredentials: true}).pipe(
      tap(data => console.log('Fetched site settings:', data)),
      map((data) => ({
        logos: {
          header_url: data.logos?.header_url || null,
          footer_url: data.logos?.footer_url || null,
          pdf_url: data.logos?.pdf_url || null,
          header_size: data.logos?.header_size || 'medium',
          footer_size: data.logos?.footer_size || 'medium'
        },
        carousel_images: data.carousel_images || []
      })),
      catchError((error) => {
        console.error('Error fetching site settings:', error);
        return throwError(() => new Error('Failed to fetch site settings'));
      })
    ).subscribe({
      next: (settings) => {
        // Update the BehaviorSubject with new settings
        this.siteSettingsSubject.next(settings);
        console.log('Site settings updated in BehaviorSubject');
      },
      error: (error) => {
        console.error('Error refreshing settings:', error);
      }
    });
  }

  getSiteSettings(forceRefresh = false): Observable<SiteSettings> {
    // If we need a fresh copy or don't have a cached version, make a new request
    if (forceRefresh || !this.cachedSettings$) {
      this.cachedSettings$ = this.http.get<SiteSettings>(this.apiUrl, {withCredentials: true}).pipe(
        tap(data => console.log('Fetched site settings:', data)),
        map((data) => ({
          logos: {
            header_url: data.logos?.header_url || null,
            footer_url: data.logos?.footer_url || null,
            pdf_url: data.logos?.pdf_url || null,
            header_size: data.logos?.header_size || 'medium',
            footer_size: data.logos?.footer_size || 'medium'
          },
          carousel_images: data.carousel_images || []
        })),
        catchError((error) => {
          console.error('Error fetching site settings:', error);
          this.cachedSettings$ = null; // Clear cache on error
          return throwError(() => new Error('Failed to fetch site settings'));
        }),
        // Use shareReplay to cache the latest emission and share it with all subscribers
        shareReplay(1)
      );
      
      // Also update the BehaviorSubject when we fetch new data
      this.cachedSettings$.subscribe({
        next: (settings) => this.siteSettingsSubject.next(settings),
        error: () => {} // Error already handled above
      });
    }

    return this.cachedSettings$;
  }

  updateSiteSettings(settings: Partial<SiteSettings>): Observable<void> {
    console.log('Updating site settings with:', settings);
    // Clear the cache whenever we update settings
    this.cachedSettings$ = null;
    
    return this.http.post<void>(this.apiUrl, settings, {withCredentials: true}).pipe(
      tap(() => {
        console.log('Settings updated successfully');
        // Force a settings refresh from the server so all subscribers get the latest data immediately
        this.refreshSettings();
      }),
      catchError((error) => {
        console.error('Error updating site settings:', error);
        return throwError(() => new Error('Failed to update site settings'));
      })
    );
  }

  deleteCarouselImage(id: number): Observable<void> {
    console.log(`Deleting carousel image with ID: ${id}`);
    // Clear the cache whenever we delete an image
    this.cachedSettings$ = null;
    
    return this.http.delete<void>(`${this.apiUrl}/carousel-images/${id}`, {withCredentials: true}).pipe(
      tap(() => {
        console.log(`Carousel image ${id} deleted successfully`);
        // Refresh settings after deletion
        this.refreshSettings();
      }),
      catchError((error) => {
        console.error('Error deleting carousel image:', error);
        return throwError(() => new Error('Failed to delete carousel image'));
      })
    );
  }
}
