import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocumentService } from '../../../services/document.service';
import { CommonModule, Location } from '@angular/common';
import { DocumentConfigurations, DocumentType } from '../../../config/document.config';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { SafeUrlPipe } from '../../../pipes/safe-url-pipe.pipe';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StatisticsService } from '../../../services/statistics.service';
import { AuthService } from '../../../services/auth.service';
import { ArabicDatePipe } from '../../../pipes/arabic-date.pipe';
import { shareOptions, ShareOption } from '../../../config/sharing.config';
import { TruncatePipe } from "../../../pipes/truncate.pipe";
import { ArabicDateHelper } from '../../../utils/arabic-date-helper';
import { Modal } from 'bootstrap';
import { DropdownService } from '../../../services/dropdown.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ArabicNumeralsPipe } from "../../../pipes/arabic-numerals.pipe";
import { ImageUrlPipe } from "../../../pipes/image-url.pipe";
import { HttpClient } from '@angular/common/http';

// Define dropdown field mapping to specify which fields should use which dropdown
interface DropdownFieldMapping {
  [fieldName: string]: string; // Maps field name to dropdown name
}

@Component({
  standalone: true,
  selector: 'app-view-document',
  templateUrl: './view-document.component.html',
  styleUrls: ['./view-document.component.scss'],
  imports: [CommonModule, RouterModule, SafeUrlPipe, TranslatePipe, ArabicDatePipe, TruncatePipe, ArabicNumeralsPipe, ImageUrlPipe]
})
export class ViewDocumentComponent implements OnInit, OnDestroy, AfterViewInit {
  document: any = null;
  isLoading: boolean = true;
  modelType: string = '';
  viewableFields: string[] = [];
  videoEmbedUrl: SafeResourceUrl = '';
  currentImageUrl: string | null = null;
  shareOptions: ShareOption[] = shareOptions;
  imageFields: string[] = [];
  images: { url: string, label: string }[] = [];
  selectedImageIndex: number = 0;
  shouldShowImageMenu: boolean = false;
  isRtl: boolean = false;
  lightboxImageUrl: string | null = null;
  private lightboxModal: Modal | null = null;
  private destroy$ = new Subject<void>();
  
  // Field value cache to avoid repeated lookups
  private fieldValueCache: Map<string, string> = new Map();
  
  // Map fields to their dropdown sources
  private dropdownFieldMapping: DropdownFieldMapping = {
    'release_type': 'release_type',
    'media_type': 'media_type',
    'role_code': 'role_code',
    'type_c': 'type_c',
    'author_type': 'author_type',
    'event_type': 'event_type',
    'language': 'language'
    // Add any other field-to-dropdown mappings you need
  };

  constructor(
    private route: ActivatedRoute,
    private documentService: DocumentService,
    private sanitizer: DomSanitizer,
    private statisticsService: StatisticsService,
    private authService: AuthService,
    private location: Location,
    private translate: TranslateService,
    private dropdownService: DropdownService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('id') ?? '';
    const modelType = this.route.snapshot.data['modelType'] as DocumentType ?? '';
    this.modelType = modelType;

    const config = DocumentConfigurations[this.modelType as keyof typeof DocumentConfigurations];
    this.viewableFields = config ? config.viewableFields : [];
    this.imageFields = this.viewableFields.filter(field => /^image_url_\d$|^image_url_(en|ar|fr|de|ru|zh_cn|msd)$/.test(field));

    // Subscribe to dropdown changes to refresh labels if needed
    this.dropdownService.dropdownsChanged()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Clear the cache when dropdowns change
        this.fieldValueCache.clear();
        
        // Refresh document display if already loaded
        if (this.document) {
          // No need to reload the document, just update the UI
          this.cdr.detectChanges();
        }
      });

    this.fetchDocument(modelType, documentId);
  }

  ngAfterViewInit(): void {
    // Initialize Bootstrap Modal
    const modalElement = document.getElementById('imageLightboxModal');
    if (modalElement) {
      this.lightboxModal = new Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });
    }
  }

  ngOnDestroy(): void {
    if (this.lightboxModal) {
      this.lightboxModal.dispose();
    }
    
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchDocument(modelType: string, documentId: string): void {
    this.isLoading = true;
    const shimmerMinTime = 1000;
    const shimmerStart = Date.now();
  
    this.documentService.getDocument(modelType, documentId).subscribe({
      next: response => {
        this.document = response;
        this.setupImageDisplay();
        this.trackDocumentView();
        if (this.document?.type === 'media' && this.document?.media_type === 'video') {
          this.setVideoEmbedUrl();
        }
        
        // Prefetch dropdown labels for fields that will be displayed
        this.prefetchDropdownLabels();
        
        const elapsed = Date.now() - shimmerStart;
        const remaining = Math.max(0, shimmerMinTime - elapsed);
        setTimeout(() => { this.isLoading = false; }, remaining);
      },
      error: err => {
        const elapsed = Date.now() - shimmerStart;
        const remaining = Math.max(0, shimmerMinTime - elapsed);
        setTimeout(() => { this.isLoading = false; }, remaining);
      }
    });
  }

  /**
   * Prefetch dropdown labels for fields that will be displayed
   * This loads all the necessary dropdown labels in parallel
   */
  private prefetchDropdownLabels(): void {
    if (!this.document) return;
    
    // Create a set of unique dropdown names to fetch
    const dropdownsToFetch = new Set<string>();
    
    // Check which dropdown fields exist in this document
    for (const [fieldName, dropdownName] of Object.entries(this.dropdownFieldMapping)) {
      if (this.document[fieldName] !== undefined && this.document[fieldName] !== null) {
        dropdownsToFetch.add(dropdownName);
      }
    }
    
    // Prefetch all needed dropdowns
    dropdownsToFetch.forEach(dropdownName => {
      this.dropdownService.getDropdownByName(dropdownName)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Success - dropdown is now cached in the service
          },
          error: err => {
            console.error(`Error prefetching dropdown ${dropdownName}:`, err);
          }
        });
    });
  }

  setupImageDisplay(): void {
    this.currentImageUrl = this.document?.image_url;
    if (this.isSpecialDocumentType()) {
      this.setupImages();
    }
  }

  setupImages(): void {
    this.images = [];
    // Main image_url
    if (this.document.image_url) {
      this.images.push({
        url: this.document.image_url,
        label: this.translate.instant('IMAGE_COVER', { default: 'Cover Image' })
      });
    }
    // Numbered images (image_url_1..7)
    for (let i = 1; i <= 7; i++) {
      const fieldName = `image_url_${i}`;
      const imageUrl = this.document[fieldName];
      if (imageUrl && imageUrl !== this.document.image_url) {
        const numeral = this.getArabicNumeral(i);
        this.images.push({
          url: imageUrl,
          label: this.translate.instant(`IMAGE_${i}`, { default: `Image ${numeral}` })
        });
      }
    }
    // Language images
    const languageLabels: { [key: string]: string } = {
      ar: 'Arabic',
      en: 'English',
      fr: 'French',
      de: 'German',
      ru: 'Russian',
      zh_cn: 'Chinese',
      msd: 'Musnad'
    };
    Object.keys(languageLabels).forEach(lang => {
      const fieldName = `image_url_${lang}`;
      const imageUrl = this.document[fieldName];
      if (imageUrl && imageUrl !== this.document.image_url) {
        this.images.push({
          url: imageUrl,
          label: this.translate.instant(`IMAGE_${lang.toUpperCase()}`, { default: languageLabels[lang] })
        });
      }
    });
    this.shouldShowImageMenu = this.images.length > 1;
    if (this.images.length > 0) {
      this.currentImageUrl = this.images[0].url;
      this.selectedImageIndex = 0;
    }
  }

  selectImage(index: number): void {
    if (index >= 0 && index < this.images.length) {
      this.selectedImageIndex = index;
      this.currentImageUrl = this.images[index].url;
    }
  }

  setVideoEmbedUrl() {
    if (this.document && this.document?.video_url) {
      const videoId = this.extractVideoId(this.document.video_url);
      const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : '';
      this.videoEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }
  }

  trackDocumentView() {
    this.statisticsService.incrementView(this.modelType, this.document?.id, 'views', this.document?.media_type).subscribe(() => console.log('Page viewed...'));
  }

  viewImage(imageUrl: string, event: Event) {
    event.preventDefault();
    const urlToOpen = this.currentImageUrl || imageUrl;
    this.statisticsService.incrementView(this.modelType, this.document?.id, 'image_views', this.document?.media_type).subscribe(() => window.open(urlToOpen));
  }

  openLightbox(imageUrl: string) {
    this.lightboxImageUrl = imageUrl;
    if (this.lightboxModal) {
      this.lightboxModal.show();
      this.statisticsService.incrementView(this.modelType, this.document?.id, 'image_views', this.document?.media_type).subscribe(() => console.log('Lightbox image viewed'));
    }
  }

  closeLightbox() {
    if (this.lightboxModal) {
      this.lightboxModal.hide();
      this.lightboxImageUrl = null;
    }
  }

  viewPdf(pdfUrl: string, event: Event) {
    event.preventDefault();
    this.statisticsService.incrementView(this.modelType, this.document?.id, 'pdf_views', this.document?.media_type).subscribe(() => window.open(pdfUrl));
  }

  viewVideo(videoUrl: string, event: Event) {
    event.preventDefault();
    this.statisticsService.incrementView(this.modelType, this.document?.id, 'video_views', this.document?.media_type).subscribe(() => window.open(videoUrl));
  }

  getTranslationKey(field: string): string {
    const translationMap: { [key: string]: string } = {
      'title': 'TITLE',
      'description': 'DESCRIPTION',
      'date_of_publication': 'DATE_OF_PUBLICATION',
      'image_url': 'IMAGE_URL',
      'pdf_url': 'PDF_URL',
      'release_type': 'RELEASE_TYPE',
      'author': 'AUTHOR',
      'date_of_event': 'DATE_OF_EVENT',
      'type_c': 'TYPE_C',
      'video_url': 'VIDEO_URL'
    };
    return translationMap[field] || field.toUpperCase();
  }

  /**
   * Get the display value for a field, using dropdown service for dropdown fields
   * @param field The field name
   * @returns The formatted field value
   */
  getFieldValue(field: string): string {
    console.log('Hala', field, this.document[field]);
    if (!field || !this.document) return 'N/A';
    
    const value = this.document[field];
    
    // Handle special athar fields with "unknown" values (including null/undefined)
    if (this.document.type === 'athar') {
      // Handle athar date fields with Arabic formatting
      if (field === 'athar_date_of_loss' || field === 'athar_date_of_presentation') {
        return this.isUnknownValue(value) ? 'غير معروف' : this.formatDate(value, false);
      }

      // Handle athar dropdown fields - show "غير معروف" for null/unknown values
      const atharDropdownFields = [
        'athar_type',
        'athar_material', 
        'athar_period',
        'athar_origin_country',
        'athar_preservation_status',
        'athar_legal_status',
        'athar_present_location',
        'athar_present_location_country',
        'athar_required_procedure'
      ];

      if (atharDropdownFields.includes(field)) {
        if (this.isUnknownValue(value)) {
          return 'غير معروف';
        }
        // For dropdown fields, we need to get the Arabic label from the dropdown
        return this.getAtharDropdownValue(field, value);
      }

      // Handle geo-location display (including null/undefined)
      if (field === 'athar_geo_location') {
        return this.formatGeoLocation(value);
      }

      // Handle all other athar fields - show "غير معروف" for unknown/null/undefined values
      const allAtharTextFields = [
        'athar_id',
        'athar_name',
        'athar_arch_original_area',
        'athar_present_location_name',
        'athar_case_number',
        'athar_page_link'
      ];

      if (allAtharTextFields.includes(field)) {
        return this.isUnknownValue(value) ? 'غير معروف' : String(value);
      }
    }
    
    // General null/undefined check for non-athar fields
    if (value === undefined || value === null) return 'N/A';
    
    // Check if this is a date field
    if (field.includes('date')) {
      try {
        return this.formatDate(value);
      } catch (e) {
        return value;
      }
    }
    
    // Check if this field has a dropdown mapping
    if (this.dropdownFieldMapping[field]) {
      // Create a cache key for this lookup
      const cacheKey = `${field}:${value}`;
      
      // Check cache first
      if (this.fieldValueCache.has(cacheKey)) {
        return this.fieldValueCache.get(cacheKey) || String(value);
      }
      
      // If not in cache, use synchronized lookup for immediate display
      // and set up async update for correctness
      const dropdownName = this.dropdownFieldMapping[field];
      
      // Start with a fallback value (could be from translations)
      let displayValue = this.getFallbackDisplayValue(field, value);
      
      // Set up async lookup for correct value
      this.dropdownService.getOptionLabel(dropdownName, value)
        .pipe(takeUntil(this.destroy$))
        .subscribe(label => {
          if (label && label !== value) {
            // Cache the result for future use
            this.fieldValueCache.set(cacheKey, label);
            
            // Only update if different from current display
            if (displayValue !== label) {
              displayValue = label;
              // Trigger update only if component is still alive
              // Use a setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
              setTimeout(() => {
                this.cdr.detectChanges();
              });
            }
          }
        });
      
      return displayValue;
    }
    
    // Default case - just return the value
    return String(value);
  }
  
  /**
   * Get a fallback display value for a field when dropdown lookup is in progress
   * @param field The field name
   * @param value The field value
   * @returns A fallback display value
   */
  private getFallbackDisplayValue(field: string, value: any): string {
    // First try the translation approach for backward compatibility
    switch(field) {
      case 'release_type':
        return this.translate.instant(`OPTION_${value.toUpperCase()}`);
      case 'media_type':
        return this.translate.instant(`${value.toUpperCase()}`);
      case 'role_code':
        return this.translate.instant(`ROLE_${value.toUpperCase()}`);
      default:
        return String(value);
    }
  }

  private extractVideoId(url: string): string | null {
    const urlParts = new URL(url);
    let videoId = urlParts.searchParams.get('v'); 
    if (!videoId) {
      const pathParts = urlParts.pathname.split('/'); 
      videoId = pathParts[pathParts.length - 1]; 
    }
    return videoId;
  }

  shouldShowImage(): boolean {
    if (!this.document) return false;
    if (this.document.type === 'media' && this.document.media_type === 'video') {
      return false;
    }
    return !!this.currentImageUrl;
  }

  isSpecialDocumentType(): boolean {
    return this.document && (this.modelType === 'archive_c' || this.modelType === 'bian' || this.modelType === 'athar');
  }

  setCurrentImage(imageUrl: string): void {
    this.currentImageUrl = imageUrl;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  canEdit(): boolean {
    return this.authService.isAuthenticated() && this.authService.hasPermission(`edit ${this.modelType}`);
  }

  goBack() {
    this.location.back();
  }

  share(option: ShareOption): void {
    const currentUrl = window.location.href;
    const title = this.document?.title || '';
    if (option.name === 'PRINT') {
      window.print();
      return;
    }
    const shareUrl = option.shareUrl(currentUrl, title);
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  hasMetaData(): boolean {
    return this.document && (this.document?.author || this.document?.release_type || this.document?.type_c || this.document?.date_of_event || this.document?.event_location || this.document?.media_type || this.document?.video_length);
  }

  getAtharFieldValue(fieldName: string, value: string): string {
    if (!value) return value;
    
    const translationKey = `ATHAR_${fieldName.toUpperCase()}_VALUES.${value}`;
    const translated = this.translate.instant(translationKey);
    
    // If translation exists and is different from the key, return it
    if (translated && translated !== translationKey) {
      return translated;
    }
    
    // Otherwise return the original value
    return value;
  }

  getArabicNumeral(num: number): string {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
  }

  formatDate(date: string | Date, fullFormat: boolean = true): string {
    if (!date) return 'N/A';
    if (fullFormat) {
      return ArabicDateHelper.toArabicDateString(date, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } else {
      return ArabicDateHelper.toArabicDateString(date, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
    }
  }

  isBianType(): boolean {
    return this.modelType === 'bian';
  }

  // Helper methods
  private isUnknownValue(value: any): boolean {
    return value === 'unknown' || value === '' || value === null || value === undefined;
  }

  private formatGeoLocation(value: string): string {
    if (!value || value.trim() === '') {
      return 'غير معروف';
    }

    try {
      const [lat, lng] = value.split(',').map(coord => parseFloat(coord.trim()));
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (e) {
      return value;
    }
  }

  /**
   * Get the Arabic label for athar dropdown field values
   * @param fieldName The athar field name
   * @param value The field value
   * @returns The Arabic label from dropdown or fallback value
   */
  private getAtharDropdownValue(fieldName: string, value: string): string {
    if (!value) return 'غير معروف';
    
    // Create a cache key for this lookup
    const cacheKey = `${fieldName}:${value}`;
    
    // Check cache first
    if (this.fieldValueCache.has(cacheKey)) {
      return this.fieldValueCache.get(cacheKey) || 'غير معروف';
    }
    
    // Start with fallback value
    let displayValue = value;
    
    // Handle special case for "unknown" value
    if (value === 'unknown') {
      displayValue = 'غير معروف';
      this.fieldValueCache.set(cacheKey, displayValue);
      return displayValue;
    }
    
    // Set up async lookup for correct Arabic label from dropdown
    this.dropdownService.getOptionLabel(fieldName, value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: label => {
          if (label && label !== value) {
            // Cache the result for future use
            this.fieldValueCache.set(cacheKey, label);
            
            // Only update if different from current display
            if (displayValue !== label) {
              displayValue = label;
              // Trigger update only if component is still alive
              setTimeout(() => {
                this.cdr.detectChanges();
              });
            }
          }
        },
        error: err => {
          console.error(`Error getting dropdown label for ${fieldName}:${value}:`, err);
          // Fallback to the original value on error
          this.fieldValueCache.set(cacheKey, value);
        }
      });
    
    return displayValue;
  }
}