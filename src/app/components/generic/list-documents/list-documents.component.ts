import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DocumentService, PaginatedResponse } from '../../../services/document.service';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DocumentConfigurations, DocumentType } from '../../../config/document.config';
import { CommonModule, SlicePipe, TitleCasePipe, ViewportScroller } from '@angular/common';
import { BsDatepickerModule, BsDaterangepickerConfig } from 'ngx-bootstrap/datepicker';
import { ArabicDatePipe } from '../../../pipes/arabic-date.pipe';
import { AuthService } from '../../../services/auth.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { DropdownSelectComponent } from '../dropdown-select/dropdown-select.component';
import { ArabicNumeralsPipe } from '../../../pipes/arabic-numerals.pipe';
import { ImageUrlPipe } from '../../../pipes/image-url.pipe';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

@Component({
  selector: 'app-list-documents',
  templateUrl: './list-documents.component.html',
  standalone: true,
  styleUrls: ['./list-documents.component.scss'],
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BsDatepickerModule,
    TranslatePipe,
    ArabicDatePipe,
    TruncatePipe,
    DropdownSelectComponent,
    ArabicNumeralsPipe,
    ImageUrlPipe,
    InfiniteScrollModule
  ],
})
export class ListDocumentsComponent implements OnInit {
  isBianType(): boolean {
    return this.modelType === 'bian';
  }

  isAtharType(): boolean {
    return this.modelType === 'athar';
  }

  isUnknownDate(date: any): boolean {
    return !date || date === '' || date === 'unknown' || date === null;
  }
  @ViewChild('timelineScrollContainer') private timelineScrollContainer?: ElementRef<HTMLDivElement>;

  documents: any[] = [];
  filterForm: FormGroup;
  @Input() modelType: DocumentType = 'guide';
  filterableFields: string[] = [];
  config: any = null;
  releaseTypes: string[] = ['Annually', 'Quarterly', 'Monthly', 'Bi-Annually'];
  viewDocLabel: string = "";
  editDocLabel: string = "";
  isLoading: boolean = false;
  loadingMore: boolean = false;
  filtersCollapsed: boolean = true;
  isHistoricalView = false;
  activeMarkerYear: number | null = null;
  
  pagination = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 12
  };
  
  pageSizes: any[] = [{ label: "١٢", value: 12 }, {label: "٢٤", value: 24}, {label: "٤٨", value: 48}, {label: "٩٦", value: 96}];

  dateMarkers: { date: string, year: number, elementId: string }[] = [];

  bsConfig: Partial<BsDaterangepickerConfig> = {
    isAnimated: true,
    showWeekNumbers: false,
    adaptivePosition: true,
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'YYYY-MM-DD',
    showClearButton: true
  };

  math = Math;

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentService,
    private authService: AuthService,
    public translate: TranslateService,
    private viewportScroller: ViewportScroller,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.filterForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.config = DocumentConfigurations[this.modelType];
    if (this.config && this.config.filterableFields) {
      this.filterableFields = this.config.filterableFields;
    }

    // Check for view query parameter
    this.route.queryParamMap.subscribe(params => {
      const viewParam = params.get('view');
      if (viewParam === 'historical' && (this.modelType === 'archive_c' || this.modelType === 'athar')) {
        this.isHistoricalView = true;
      } else if (viewParam === 'grid') {
        this.isHistoricalView = false;
      }
    });

    this.initializeFilterForm();
    this.loadDocuments(1);
    this.getTranslations();
  }

  initializeFilterForm(): void {
    const formControls: {[key: string]: any} = {};
    this.filterableFields.forEach(field => {
      formControls[field] = [''];
    });
    if (this.modelType === 'archive_c') {
        formControls['sort_field'] = ['date_of_event'];
        formControls['sort_order'] = ['desc'];
    } else if (this.modelType === 'athar') {
        formControls['sort_field'] = ['athar_date_of_presentation'];
        formControls['sort_order'] = ['desc'];
        formControls['filter_unknown_date_presentation'] = [''];
    } else {
        formControls['sort_field'] = ['date_of_publication'];
        formControls['sort_order'] = ['desc'];
    }
    this.filterForm = this.fb.group(formControls);
  }

  loadDocuments(page: number = 1, filters: any = this.filterForm?.value || {}, appendData: boolean = false): void {
    if (!appendData) {
        this.isLoading = true;
        this.documents = [];
        this.pagination.currentPage = page;
        this.activeMarkerYear = null;
        if ((this.modelType === 'archive_c' || this.modelType === 'athar') && this.isHistoricalView && this.timelineScrollContainer?.nativeElement) {
            this.timelineScrollContainer.nativeElement.scrollTop = 0;
        }
    } else {
        this.loadingMore = true;
    }

    const currentFilters = { ...this.filterForm?.value, ...filters };

    if (this.modelType === 'archive_c') {
        currentFilters['sort_field'] = this.filterForm.get('sort_field')?.value || 'date_of_event';
        currentFilters['sort_order'] = this.filterForm.get('sort_order')?.value || 'desc';
    } else if (this.modelType === 'athar') {
        currentFilters['sort_field'] = this.filterForm.get('sort_field')?.value || 'athar_date_of_presentation';
        currentFilters['sort_order'] = this.filterForm.get('sort_order')?.value || 'desc';
    } else {
        currentFilters['sort_field'] = this.filterForm.get('sort_field')?.value || 'date_of_publication';
        currentFilters['sort_order'] = this.filterForm.get('sort_order')?.value || 'desc';
    }

    console.log('Loading documents with filters:', currentFilters, 'Page:', page, 'Append:', appendData);

    this.documentService.getDocuments(
      this.modelType,
      page,
      this.pagination.perPage,
      currentFilters
    ).subscribe({
      next: (response: PaginatedResponse<any>) => {
        console.log('Received response:', response);
        if (appendData) {
          this.documents.push(...response.data);
        } else {
          this.documents = response.data;
        }
        this.pagination = {
          currentPage: response.current_page,
          lastPage: response.last_page,
          total: response.total,
          perPage: response.per_page
        };
        if (this.isHistoricalView) {
           this.updateDateMarkers();
        }
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.isLoading = false;
        this.loadingMore = false;
      },
      complete: () => {
        this.isLoading = false;
        this.loadingMore = false;
      }
    });
  }

  onScroll(): void {
    console.log('onScroll triggered');
    if ((this.modelType !== 'archive_c' && this.modelType !== 'athar') || !this.isHistoricalView || this.loadingMore || this.pagination.currentPage >= this.pagination.lastPage) {
      console.log('Infinite scroll exit condition met:', { isHistoricalView: this.isHistoricalView, loadingMore: this.loadingMore, currentPage: this.pagination.currentPage, lastPage: this.pagination.lastPage });
      return;
    }
    const nextPage = this.pagination.currentPage + 1;
    console.log(`Loading next page: ${nextPage}`);
    this.loadDocuments(nextPage, this.filterForm.value, true);
  }

  onPageChange(page: number): void {
    if ((this.modelType !== 'archive_c' && this.modelType !== 'athar') || !this.isHistoricalView) {
       if (page >= 1 && page <= this.pagination.lastPage && !this.isLoading) {
         this.loadDocuments(page, this.filterForm?.value, false);
       }
    }
  }

  onPageSizeChange(newPageSize: number): void {
    this.pagination.perPage = Number(newPageSize);
    this.activeMarkerYear = null;
    this.loadDocuments(1, this.filterForm.value, false);
  }

  toggleFilters(): void {
    this.filtersCollapsed = !this.filtersCollapsed;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.activeMarkerYear = null;
    if (this.modelType === 'archive_c') {
        this.filterForm.patchValue({ sort_field: 'date_of_event', sort_order: 'desc' });
    } else if (this.modelType === 'athar') {
        this.filterForm.patchValue({ sort_field: 'athar_date_of_presentation', sort_order: 'desc', filter_unknown_date_presentation: '' });
    } else {
        this.filterForm.patchValue({ sort_field: 'date_of_publication', sort_order: 'desc' });
    }
    this.loadDocuments(1, this.filterForm.value, false);
  }

  onFilter(): void {
    const filters = { ...this.filterForm.value };
    if (filters.date_of_publication && filters.date_of_publication[0] && filters.date_of_publication[1]) {
      const startDate = new Date(filters.date_of_publication[0]).toISOString().slice(0, 10);
      const endDate = new Date(filters.date_of_publication[1]).toISOString().slice(0, 10);
      filters.date_of_publication = `${startDate},${endDate}`;
    } else if (filters.date_of_publication && filters.date_of_publication.length === 0) {
        delete filters.date_of_publication;
    }
    if (filters.date_of_event && filters.date_of_event[0] && filters.date_of_event[1]) {
      const startEventDate = new Date(filters.date_of_event[0]).toISOString().slice(0, 10);
      const endEventDate = new Date(filters.date_of_event[1]).toISOString().slice(0, 10);
      filters.date_of_event = `${startEventDate},${endEventDate}`;
    } else if (filters.date_of_event && filters.date_of_event.length === 0) {
         delete filters.date_of_event;
    }
    if (filters.athar_date_of_loss && filters.athar_date_of_loss[0] && filters.athar_date_of_loss[1]) {
      const startAtharDate = new Date(filters.athar_date_of_loss[0]).toISOString().slice(0, 10);
      const endAtharDate = new Date(filters.athar_date_of_loss[1]).toISOString().slice(0, 10);
      filters.athar_date_of_loss = `${startAtharDate},${endAtharDate}`;
    } else if (filters.athar_date_of_loss && filters.athar_date_of_loss.length === 0) {
         delete filters.athar_date_of_loss;
    }

    console.log('Applying filters:', filters);
    this.activeMarkerYear = null;
    this.loadDocuments(1, filters, false);
  }

  onSortChange(order: string): void {
     this.activeMarkerYear = null;
     this.filterForm.patchValue({ sort_order: order, sort_field: 'date_of_publication' });
     this.loadDocuments(1, this.filterForm.value, false);
  }

  onEventDateSortChange(order: string): void {
    this.activeMarkerYear = null;
    this.filterForm.patchValue({ sort_field: 'date_of_event', sort_order: order });
    this.loadDocuments(1, this.filterForm.value, false);
  }

  onAtharDateSortChange(order: string): void {
    this.activeMarkerYear = null;
    this.filterForm.patchValue({ sort_field: 'athar_date_of_presentation', sort_order: order });
    this.loadDocuments(1, this.filterForm.value, false);
  }

  getPages(): number[] {
     if ((this.modelType === 'archive_c' || this.modelType === 'athar') && this.isHistoricalView) return [];
    const { currentPage, lastPage } = this.pagination;
    const maxPages = 5;
    const pages: number[] = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(lastPage, startPage + maxPages - 1);
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  canEditDocument(): boolean {
    const permissionModelType = this.modelType === 'archive_c' ? 'archive_c' : this.modelType;
    const editPermission = `edit ${permissionModelType}`;
    return this.authService.isAuthenticated() && this.authService.hasPermission(editPermission);
  }

  getTranslations() {
    this.translate.get(['VIEW', 'EDIT']).subscribe(translations => {
      this.viewDocLabel = translations['VIEW'];
      this.editDocLabel = translations['EDIT'];
    });
  }

  updateDateMarkers(): void {
      if (this.modelType !== 'archive_c' && this.modelType !== 'athar') return;
      const markers: { date: string, year: number, elementId: string }[] = [];
      const uniqueYears = new Set<number>();
      this.documents.forEach(doc => {
          let dateField = null;
          if (this.modelType === 'archive_c' && doc.date_of_event) {
              dateField = doc.date_of_event;
          } else if (this.modelType === 'athar') {
              // Priority: athar_date_of_presentation first, then fallback to date_of_publication
              if (!doc.athar_date_of_presentation_unknown && doc.athar_date_of_presentation) {
                  dateField = doc.athar_date_of_presentation;
              } else if (!doc.date_of_publication_unknown && doc.date_of_publication) {
                  dateField = doc.date_of_publication;
              }
          }
          
          if (dateField) {
              const date = new Date(dateField);
              const year = date.getFullYear();
              const elementId = `doc-${doc.id}`;
              if (!uniqueYears.has(year)) {
                  uniqueYears.add(year);
                  markers.push({
                      date: dateField,
                      year: year,
                      elementId: elementId
                  });
              }
          }
      });
      markers.sort((a, b) => b.year - a.year);
      this.dateMarkers = markers;
  }

  scrollToMarker(marker: { date: string, year: number, elementId: string }): void {
    console.log('Scrolling to marker:', marker);
    this.activeMarkerYear = marker.year;
  
    const scrollContainer = this.timelineScrollContainer?.nativeElement;
    if (scrollContainer) {
      const element = scrollContainer.querySelector(`#${marker.elementId}`);
      if (element) {
        console.log('Element found, scrolling:', element);
        const elementRect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const offsetTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        scrollContainer.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      } else {
        console.warn('Element not found within scroll container for marker:', marker.elementId);
      }
    } else {
      console.warn('Timeline scroll container not found.');
    }
  }

  toggleView(historical: boolean) {
    if (this.modelType === 'archive_c' || this.modelType === 'athar') {
      const needsReload = this.isHistoricalView !== historical;
      this.isHistoricalView = historical;
      this.activeMarkerYear = null;

      // Update URL with view query parameter
      const queryParams = { ...this.route.snapshot.queryParams };
      if (historical) {
        queryParams['view'] = 'historical';
      } else {
        queryParams['view'] = 'grid';
      }
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: queryParams,
        queryParamsHandling: 'merge'
      });

      if (needsReload) {
           if (this.isHistoricalView) {
                 this.updateDateMarkers();
                 setTimeout(() => { 
                   if (this.timelineScrollContainer?.nativeElement) {
                     this.timelineScrollContainer.nativeElement.scrollTop = 0;
                   }
                 }, 0);
            }
      }
    }
  }
}