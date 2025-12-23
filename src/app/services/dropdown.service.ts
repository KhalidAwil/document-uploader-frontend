import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DropdownOption {
  label: string;
  value: string;
}

export interface Dropdown {
  id: number;
  name: string;
  options: DropdownOption[];
}

/**
 * Service to manage dropdowns with enhanced caching and label retrieval
 */
@Injectable({
  providedIn: 'root',
})
export class DropdownService {
  private dropdownCache = new BehaviorSubject<Dropdown[]>([]);
  private isLoaded = false;
  private apiUrl = `${environment.apiUrl}/dropdowns`;
  
  // New in-memory lookup tables for fast access
  private optionLabelCache: Map<string, Map<string, string>> = new Map();
  private dropdownMap: Map<string, Dropdown> = new Map();
  
  // Shared observable for concurrent requests
  private activeRequest: Observable<Dropdown[]> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Get all dropdowns with caching support
   * @param forceRefresh Whether to force a refresh from the server
   */
  getDropdowns(forceRefresh: boolean = false): Observable<Dropdown[]> {
    // If already loading, return the active request
    if (this.activeRequest && !forceRefresh) {
      return this.activeRequest;
    }
    
    if (!this.isLoaded || forceRefresh) {
      // Create a new request with shareReplay to handle concurrent subscriptions
      this.activeRequest = this.http.get<Dropdown[]>(this.apiUrl, { withCredentials: true }).pipe(
        map((data) => {
          // Process data to ensure options are parsed if they're strings
          const processedData = data.map(dropdown => ({
            ...dropdown,
            options: typeof dropdown.options === 'string' ? JSON.parse(dropdown.options) : dropdown.options
          }));
          
          this.dropdownCache.next(processedData);
          this.isLoaded = true;
          
          // Update our lookup tables
          this.updateLookupTables(processedData);
          
          return processedData;
        }),
        shareReplay(1), // Share the result with multiple subscribers
        tap(() => {
          // Clear the active request after completion
          setTimeout(() => {
            this.activeRequest = null;
          }, 0);
        })
      );
      
      return this.activeRequest;
    }
    
    return this.dropdownCache.asObservable();
  }

  /**
   * Get a dropdown by name
   * @param name Dropdown name
   * @param forceRefresh Whether to force a refresh from the server
   */
  getDropdownByName(name: string, forceRefresh: boolean = false): Observable<Dropdown | null> {
    // Check the map first for immediate response if available
    if (!forceRefresh && this.dropdownMap.has(name)) {
      return of(this.dropdownMap.get(name) || null);
    }
    
    if (forceRefresh) {
      // If forcing refresh, bypass cache and get directly from API
      return this.http.get<Dropdown[]>(this.apiUrl, { withCredentials: true }).pipe(
        map(data => {
          // Update cache with fresh data
          const processedData = data.map(dropdown => ({
            ...dropdown,
            options: typeof dropdown.options === 'string' ? JSON.parse(dropdown.options) : dropdown.options
          }));
          
          this.dropdownCache.next(processedData);
          this.isLoaded = true;
          
          // Update lookup tables
          this.updateLookupTables(processedData);
          
          // Find the requested dropdown
          return this.dropdownMap.get(name) || null;
        })
      );
    }
    
    return this.getDropdowns().pipe(
      map((dropdowns) => {
        return this.dropdownMap.get(name) || null;
      }),
      switchMap((dropdown) => {
        if (!dropdown) {
          return this.http.get<Dropdown>(`${this.apiUrl}/${name}`, {withCredentials: true}).pipe(
            map((data) => {
              if (data) {
                // Process options if needed
                if (typeof data.options === 'string') {
                  data.options = JSON.parse(data.options);
                }
                
                // Update caches
                const updatedDropdowns = [...this.dropdownCache.value];
                const existingIndex = updatedDropdowns.findIndex(d => d.id === data.id);
                
                if (existingIndex >= 0) {
                  updatedDropdowns[existingIndex] = data;
                } else {
                  updatedDropdowns.push(data);
                }
                
                this.dropdownCache.next(updatedDropdowns);
                this.updateLookupTables(updatedDropdowns);
              }
              return data;
            })
          );
        }
        return of(dropdown);
      })
    );
  }

  /**
   * Get the label for a specific dropdown option
   * @param dropdownName The name of the dropdown
   * @param optionValue The value of the option
   * @param defaultLabel Optional default label to return if not found
   */
  getOptionLabel(dropdownName: string, optionValue: string | number, defaultLabel: string = ''): Observable<string> {
    // Convert value to string for consistency in the lookup
    const valueStr = String(optionValue);
    
    // Check if we have this value in our cache
    if (this.optionLabelCache.has(dropdownName)) {
      const optionMap = this.optionLabelCache.get(dropdownName);
      if (optionMap && optionMap.has(valueStr)) {
        return of(optionMap.get(valueStr) || defaultLabel);
      }
    }
    
    // If not in cache, try to get the dropdown
    return this.getDropdownByName(dropdownName).pipe(
      map(dropdown => {
        if (!dropdown) return defaultLabel;
        
        const option = dropdown.options.find(opt => opt.value === valueStr);
        return option?.label || defaultLabel;
      })
    );
  }

  /**
   * Add a new dropdown
   * @param name Dropdown name
   * @param options Dropdown options
   */
  addDropdown(name: string, options: DropdownOption[]): Observable<Dropdown> {
    return this.http.post<Dropdown>(
      this.apiUrl,
      { name, options },
      { withCredentials: true }
    ).pipe(
      map((newDropdown) => {
        // Ensure we're working with parsed options
        if (typeof newDropdown.options === 'string') {
          newDropdown.options = JSON.parse(newDropdown.options);
        }
        
        const updatedDropdowns = [...this.dropdownCache.value, newDropdown];
        this.dropdownCache.next(updatedDropdowns);
        
        // Update lookup tables
        this.updateLookupTables(updatedDropdowns);
        
        return newDropdown;
      })
    );
  }

  /**
   * Update an existing dropdown
   * @param id Dropdown ID
   * @param data Updated dropdown data
   */
  updateDropdown(id: number, data: { name: string, options: DropdownOption[] }): Observable<Dropdown> {
    return this.http.put<Dropdown>(
      `${this.apiUrl}/${id}`,
      data,
      { withCredentials: true }
    ).pipe(
      map((updatedDropdown) => {
        // Ensure we're working with parsed options
        if (typeof updatedDropdown.options === 'string') {
          updatedDropdown.options = JSON.parse(updatedDropdown.options);
        }
        
        const updatedDropdowns = this.dropdownCache.value.map((dropdown) =>
          dropdown.id === id ? updatedDropdown : dropdown
        );
        
        this.dropdownCache.next(updatedDropdowns);
        
        // Update lookup tables
        this.updateLookupTables(updatedDropdowns);
        
        // Force a refresh for certain critical dropdowns
        if (data.name === 'role_code') {
          this.refreshDropdowns();
        }
        
        return updatedDropdown;
      })
    );
  }

  /**
   * Delete a dropdown
   * @param id Dropdown ID
   */
  deleteDropdown(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true }).pipe(
      map(() => {
        const updatedDropdowns = this.dropdownCache.value.filter(
          (dropdown) => dropdown.id !== id
        );
        this.dropdownCache.next(updatedDropdowns);
        
        // Update lookup tables
        this.updateLookupTables(updatedDropdowns);
      })
    );
  }

  /**
   * Force refresh all dropdowns
   */
  refreshDropdowns(): void {
    this.isLoaded = false; // Reset loaded flag to force refresh
    this.activeRequest = null; // Clear any active request
    
    this.http.get<Dropdown[]>(this.apiUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        // Process data to ensure options are parsed
        const processedData = data.map(dropdown => ({
          ...dropdown,
          options: typeof dropdown.options === 'string' ? JSON.parse(dropdown.options) : dropdown.options
        }));
        
        this.dropdownCache.next(processedData);
        this.isLoaded = true;
        
        // Update lookup tables
        this.updateLookupTables(processedData);
      },
      error: (error) => {
        console.error('Error refreshing dropdowns:', error);
      }
    });
  }
  
  /**
   * Clear the cache and force reload
   */
  clearCache(): void {
    this.isLoaded = false;
    this.dropdownCache.next([]);
    this.optionLabelCache.clear();
    this.dropdownMap.clear();
    this.activeRequest = null;
  }
  
  /**
   * Rebuild the internal lookup tables for fast access
   * @param dropdowns List of dropdowns to build lookup tables from
   */
  private updateLookupTables(dropdowns: Dropdown[]): void {
    // Clear existing caches
    this.optionLabelCache.clear();
    this.dropdownMap.clear();
    
    // Rebuild the caches
    dropdowns.forEach(dropdown => {
      // Update dropdown map by name
      this.dropdownMap.set(dropdown.name, dropdown);
      
      // Update option label lookup map
      const optionMap = new Map<string, string>();
      dropdown.options.forEach(option => {
        optionMap.set(String(option.value), option.label);
      });
      
      this.optionLabelCache.set(dropdown.name, optionMap);
    });
  }
  
  /**
   * Subscribe to get updates whenever dropdowns change
   * Useful for components that need to react to dropdown changes
   */
  dropdownsChanged(): Observable<Dropdown[]> {
    return this.dropdownCache.asObservable();
  }
  
  /**
   * Get all dropdown options as a simple lookup object
   * @param dropdownName Name of the dropdown
   * @returns Observable of options as a simple lookup object
   */
  getOptionsLookup(dropdownName: string): Observable<{[key: string]: string}> {
    return this.getDropdownByName(dropdownName).pipe(
      map(dropdown => {
        if (!dropdown) return {};
        
        const lookup: {[key: string]: string} = {};
        dropdown.options.forEach(option => {
          lookup[option.value] = option.label;
        });
        
        return lookup;
      })
    );
  }
}
