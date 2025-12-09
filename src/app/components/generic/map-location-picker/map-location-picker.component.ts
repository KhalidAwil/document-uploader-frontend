import { Component, EventEmitter, Input, OnInit, Output, AfterViewInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';

declare var L: any;

@Component({
  selector: 'app-map-location-picker',
  templateUrl: './map-location-picker.component.html',
  styleUrls: ['./map-location-picker.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, HttpClientModule]
})
export class MapLocationPickerComponent implements OnInit, AfterViewInit, OnChanges {
  
  constructor(private http: HttpClient) {}
  @Input() initialValue: string = '';
  @Input() disabled: boolean = false;
  @Output() locationChanged = new EventEmitter<string>();
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  isModalOpen = false;
  map: any;
  marker: any;
  selectedLocation = '';
  manualInput = '';
  locationName = '';
  isLoadingLocation = false;

  ngOnInit(): void {
    this.updateLocationFromInitialValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue']) {
      this.updateLocationFromInitialValue();
    }
  }

  private updateLocationFromInitialValue(): void {
    if (this.initialValue) {
      this.selectedLocation = this.initialValue;
      this.manualInput = this.initialValue;
      this.reverseGeocode(this.initialValue);
    }
  }

  ngAfterViewInit(): void {
    // Leaflet is now loaded globally from index.html
    // No need for dynamic loading
  }


  openMapModal(): void {
    if (this.disabled) return;
    
    this.isModalOpen = true;
    
    // Wait for modal to be rendered
    setTimeout(() => {
      this.initializeMap();
    }, 200);
  }

  closeMapModal(): void {
    this.isModalOpen = false;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initializeMap(): void {
    if (!this.mapContainer || !this.mapContainer.nativeElement) {
      console.error('Map container not found');
      return;
    }

    // Default to Makkah if no initial location
    let lat = 21.422510;
    let lng = 39.826168;

    // Parse existing location if available
    if (this.selectedLocation) {
      const coords = this.selectedLocation.split(',');
      if (coords.length === 2) {
        lat = parseFloat(coords[0].trim());
        lng = parseFloat(coords[1].trim());
      }
    }

    // Initialize map
    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], 10);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Add marker if location exists
    if (this.selectedLocation) {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }

    // Handle map clicks
    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      
      // Remove existing marker
      if (this.marker) {
        this.map.removeLayer(this.marker);
      }
      
      // Add new marker
      this.marker = L.marker([lat, lng]).addTo(this.map);
      
      // Update location string
      this.selectedLocation = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      this.manualInput = this.selectedLocation;
      
      // Get location name
      this.reverseGeocode(this.selectedLocation);
    });
  }

  onManualInputChange(): void {
    // Validate coordinate format
    const coordPattern = /^-?([1-8]?[0-9](\.[0-9]+)?|90(\.0+)?),\s*-?(180(\.0+)?|((1[0-7][0-9])|([1-9]?[0-9]))(\.[0-9]+)?)$/;
    
    if (coordPattern.test(this.manualInput)) {
      this.selectedLocation = this.manualInput;
      
      // Update map if open
      if (this.map) {
        const coords = this.manualInput.split(',');
        const lat = parseFloat(coords[0].trim());
        const lng = parseFloat(coords[1].trim());
        
        // Remove existing marker
        if (this.marker) {
          this.map.removeLayer(this.marker);
        }
        
        // Add new marker and center map
        this.marker = L.marker([lat, lng]).addTo(this.map);
        this.map.setView([lat, lng], this.map.getZoom());
      }
      
      // Get location name for manually entered coordinates
      this.reverseGeocode(this.selectedLocation);
    }
  }

  confirmLocation(): void {
    this.locationChanged.emit(this.selectedLocation);
    this.closeMapModal();
  }

  clearLocation(): void {
    this.selectedLocation = '';
    this.manualInput = '';
    this.locationName = '';
    this.locationChanged.emit('');
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  getDisplayValue(): string {
    if (!this.selectedLocation) return '';
    
    try {
      const coords = this.selectedLocation.split(',');
      if (coords.length === 2) {
        const lat = parseFloat(coords[0].trim());
        const lng = parseFloat(coords[1].trim());
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (e) {
      // Invalid format
    }
    
    return this.selectedLocation;
  }

  private reverseGeocode(coordinates: string): void {
    if (!coordinates || this.isLoadingLocation) return;
    
    const coords = coordinates.split(',');
    if (coords.length !== 2) return;
    
    const lat = parseFloat(coords[0].trim());
    const lng = parseFloat(coords[1].trim());
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    this.isLoadingLocation = true;
    this.locationName = '';
    
    // Using OpenStreetMap Nominatim for reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`;
    
    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.isLoadingLocation = false;
        if (response && response.display_name) {
          // Extract meaningful location parts
          const address = response.address || {};
          let locationParts: string[] = [];
          
          // Add city/town/village
          if (address.city) {
            locationParts.push(address.city);
          } else if (address.town) {
            locationParts.push(address.town);
          } else if (address.village) {
            locationParts.push(address.village);
          }
          
          // Add state/region
          if (address.state) {
            locationParts.push(address.state);
          } else if (address.region) {
            locationParts.push(address.region);
          }
          
          // Add country
          if (address.country) {
            locationParts.push(address.country);
          }
          
          // If we have specific parts, use them; otherwise use display_name
          if (locationParts.length > 0) {
            this.locationName = locationParts.join(', ');
          } else {
            // Fallback to display_name but limit length
            this.locationName = response.display_name.length > 100 
              ? response.display_name.substring(0, 100) + '...' 
              : response.display_name;
          }
        }
      },
      error: (error) => {
        this.isLoadingLocation = false;
        console.warn('Reverse geocoding failed:', error);
        // Silently fail - not critical functionality
      }
    });
  }

  getLocationDisplayText(): string {
    if (!this.selectedLocation) return '';
    
    const coords = this.getDisplayValue();
    if (this.isLoadingLocation) {
      return `${coords} (Loading location...)`;
    }
    
    if (this.locationName) {
      return `${coords} (${this.locationName})`;
    }
    
    return coords;
  }
}