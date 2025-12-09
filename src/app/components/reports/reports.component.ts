import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DocumentConfig, DocumentConfigurations, DocumentType } from '../../config/document.config';
import { ReportService } from '../../services/reports.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ArabicNumeralsPipe } from '../../pipes/arabic-numerals.pipe';
import { ArabicDatePipe } from '../../pipes/arabic-date.pipe';
import { BsDatepickerModule, BsDaterangepickerConfig } from 'ngx-bootstrap/datepicker';
import { DropdownSelectComponent } from '../generic/dropdown-select/dropdown-select.component';
import { DropdownService } from '../../services/dropdown.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface Filter {
  field: string;
  value: any;
}

interface User {
  id: number;
  nickname: string;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TranslatePipe,
    BsDatepickerModule,
    ArabicNumeralsPipe,
    ArabicDatePipe,
    DropdownSelectComponent
  ]
})
export class ReportsComponent implements OnInit {
  typeForm: FormGroup;
  reportForm: FormGroup;
  configurations = DocumentConfigurations;
  documentTypes: DocumentType[] = ['guide', 'release', 'news', 'bian', 'archive_c', 'athar', 'image', 'video', 'user', 'contact_message', 'audit_log', 'site_setting'];
  selectedConfig: DocumentConfig | null = null;
  reportData: any[] = [];
  isLoading: boolean = false;
  filtersCollapsed: boolean = true;
  math = Math;
  expandedCells: Set<string> = new Set();
  displayFields: string[] = [];
  users: User[] = [];
  sortField: string | null = null;
  sortOrder: 'asc' | 'desc' | null = null;

  pagination = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 12
  };

  // Store page sizes with Arabic numerals only for display
  pageSizes: any[] = [
    { label: "١٢", value: 12 },
    { label: "٢٤", value: 24 },
    { label: "٤٨", value: 48 },
    { label: "٩٦", value: 96 }
  ];

  bsConfig: Partial<BsDaterangepickerConfig> = {
    isAnimated: true,
    showWeekNumbers: false,
    adaptivePosition: true,
    containerClass: 'theme-dark-blue',
    dateInputFormat: 'YYYY-MM-DD',
    showClearButton: true
  };

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private translate: TranslateService,
    private dropdownService: DropdownService
  ) {
    this.translate.use('ar');
    this.typeForm = this.fb.group({
      documentType: ['', Validators.required],
      user_id: ['']
    });
    this.reportForm = this.fb.group({});
  }

  ngOnInit() {
    this.typeForm.get('documentType')?.valueChanges.subscribe(() => this.onDocumentTypeChange());
    this.loadUsers();
  }

  loadUsers() {
    this.reportService.getUsers().subscribe({
      next: (users) => this.users = users,
      error: (error) => console.error('Error loading users:', error)
    });
  }

  onDocumentTypeChange() {
    const type = this.typeForm.get('documentType')?.value;
    if (!type) return;

    this.selectedConfig = this.configurations[type as keyof typeof DocumentConfigurations];
    this.initializeFilterForm();
    this.typeForm.get('user_id')?.setValue(''); // Reset user_id
    this.reportData = []; // Clear previous data

    const editableFields = this.selectedConfig?.editableFields || [];
    this.displayFields = [...editableFields, 'created_at', 'updated_at'];
    
    if (type !== 'contact_message' && type !== 'audit_log') {
      this.displayFields.push('created_by_nickname');
    }

    this.sortField = null;
    this.sortOrder = null;

    if (type !== 'audit_log') {
      this.loadReportData();
    }
  }

  initializeFilterForm() {
    const formControls: any = {};
    this.selectedConfig?.filterableFields
      .filter(field => field !== 'user_id') // Exclude user_id
      .forEach(field => {
        formControls[field] = [''];
      });
    this.reportForm = this.fb.group(formControls);
  }

  hasFilterField(field: string): boolean {
    return this.selectedConfig?.filterableFields.includes(field) || false;
  }

  getTextFilters(): string[] {
    return this.selectedConfig?.filterableFields.filter(field => !field.includes('date_') && field !== 'user_id') || [];
  }

  getOtherTextFilters(): string[] {
    const specificFields = [
      'title', 'description', 'event_location', 'field_name', 'action', 'user_nickname', 'model_type', 'created_by_nickname',
      // Dropdown fields that should NOT be text inputs
      'release_type', 'type_c', 'media_type', 'role_code',
      // Athar dropdown fields
      'athar_type', 'athar_material', 'athar_preservation_status', 'athar_legal_status',
      'athar_origin_country', 'athar_present_location_country', 'athar_required_procedure'
    ];
    return this.getTextFilters().filter(field => !specificFields.includes(field));
  }

  onUserSelect() {
    if (this.getDocumentType() === 'audit_log' && this.typeForm.get('user_id')?.value) {
      this.loadReportData();
    }
  }

  loadReportData(page: number = 1) {
    if (!this.selectedConfig) return;

    const documentType = this.typeForm.get('documentType')?.value;
    if (!documentType) {
      console.error('Document type is required');
      return;
    }

    if (documentType === 'audit_log' && !this.typeForm.get('user_id')?.value) {
      return; // Wait for user selection
    }

    this.isLoading = true;
    const filters = this.prepareFilters();

    this.reportService.generateReport(documentType, filters, page, this.pagination.perPage)
      .subscribe({
        next: (response) => {
          this.reportData = response.data;
          this.clearExpandedCells(); // Reset expansion state when new data loads
          this.pagination = {
            currentPage: response.meta.current_page,
            lastPage: response.meta.last_page,
            perPage: response.meta.per_page,
            total: response.meta.total
          };
        },
        error: (error) => console.error('Error loading report data:', error),
        complete: () => this.isLoading = false
      });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.pagination.lastPage && !this.isLoading) {
      this.loadReportData(page);
    }
  }

  onPageSizeChange(perPage: number): void {
    this.pagination.perPage = perPage;
    this.loadReportData(1);
  }

  toggleFilters(): void {
    this.filtersCollapsed = !this.filtersCollapsed;
  }

  clearFilters(): void {
    this.initializeFilterForm();
    this.sortOrder = null;
    this.sortField = null;
    if (this.getDocumentType() === 'audit_log') {
      this.typeForm.get('user_id')?.setValue('');
      this.reportData = [];
    } else {
      this.loadReportData(1);
    }
  }

  onFilter(): void {
    this.loadReportData(1);
  }

  onSortChange(order: 'asc' | 'desc'): void {
    this.sortOrder = order;
    this.sortField = 'date_of_publication';
    this.loadReportData(1);
  }

  onEventDateSortChange(order: 'asc' | 'desc'): void {
    this.sortOrder = order;
    this.sortField = 'date_of_event';
    this.loadReportData(1);
  }

  prepareFilters(): Filter[] {
    const filters: Filter[] = [];
    const formValues = this.reportForm.value;

    if (this.sortOrder) {
      filters.push({ field: 'sort_order', value: this.sortOrder });
      if (this.sortField) {
        filters.push({ field: 'sort_field', value: this.sortField });
      }
    }

    if (this.getDocumentType() === 'audit_log') {
      const userId = this.typeForm.get('user_id')?.value;
      if (userId) {
        filters.push({ field: 'user_id', value: userId });
      }
    }

    Object.keys(formValues).forEach(key => {
      if (formValues[key]) {
        if (key.includes('date_') && Array.isArray(formValues[key])) {
          const [start, end] = formValues[key];
          if (start && end) {
            filters.push({
              field: key,
              value: `${start.toISOString().slice(0, 10)},${end.toISOString().slice(0, 10)}`
            });
          }
        } else {
          filters.push({ field: key, value: formValues[key] });
        }
      }
    });

    return filters;
  }

  getPages(): number[] {
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

  exportReport(format: 'pdf' | 'xlsx' | 'csv') {
    if (!this.selectedConfig || !this.reportData.length) return;

    const documentType = this.typeForm.get('documentType')?.value;
    const filters = this.prepareFilters();

    this.isLoading = true;
    this.reportService.downloadReport(documentType, filters, format)
      .subscribe({
        next: (blob) => {
          this.reportService.triggerDownload(blob, format, documentType);
        },
        error: (error) => console.error(`Error exporting to ${format}:`, error),
        complete: () => this.isLoading = false
      });
  }

  isUrlField(field: string): boolean {
    return field.includes('_url');
  }

  isDateField(field: string): boolean {
    return field.includes('date_') || field === 'created_at' || field === 'updated_at' || field === 'action_at' || field === 'report_timestamp';
  }


  isNumericField(field: string): boolean {
    return field === 'view_count' || field === 'user_id' || field === 'model_id' || field === 'video_length' || field === 'id';
  }

  isDropdownField(field: string): boolean {
    const documentType = this.getDocumentType();
    const dropdownFields = {
      'release': ['release_type'],
      'archive_c': ['type_c'],
      'image': ['media_type'],
      'video': ['media_type'],
      'user': ['role_code'],
      'audit_log': ['role_code'],
      'athar': [
        'athar_type', 'athar_material', 'athar_period', 'athar_preservation_status', 
        'athar_legal_status', 'athar_present_location', 'athar_origin_country', 
        'athar_present_location_country', 'athar_required_procedure'
      ]
    };
    return dropdownFields[documentType as keyof typeof dropdownFields]?.includes(field) || false;
  }

  getDropdownLabel(field: string, value: any): string {
    if (!value || !this.isDropdownField(field)) {
      return value || '';
    }

    // If the value is already in Arabic (contains Arabic characters), return it as-is
    // This means the backend successfully converted it
    if (typeof value === 'string' && /[\u0600-\u06FF]/.test(value)) {
      return value;
    }

    // If the value is still in English, it means backend conversion failed
    // Provide a frontend fallback using the dropdown service
    if (typeof value === 'string' && /^[a-zA-Z_]+$/.test(value)) {
      // Try to get Arabic label from dropdown service as fallback
      try {
        // Note: This is synchronous for immediate display, but not ideal
        // The backend should handle this conversion
        return this.getFallbackLabel(field, value);
      } catch (error) {
        console.warn(`Could not get Arabic label for ${field}:${value}`, error);
        return value;
      }
    }
    
    return value;
  }

  private getFallbackLabel(field: string, value: string): string {
    // Provide basic fallback translations for common values
    // This is a temporary solution - the backend should handle this
    const fallbackTranslations: { [key: string]: { [value: string]: string } } = {
      'athar_type': {
        'artifact': 'أثر',
        'artwork': 'عمل فني',
        'inscription': 'نقش',
        'manuscript': 'مخطوطة',
        'coin': 'عملة',
        'jewelry': 'مجوهرات',
        'pottery': 'فخار',
        'tool': 'أداة',
        'weapon': 'سلاح',
        'textile': 'نسيج',
        'architectural_element': 'عنصر معماري',
        'sculpture': 'منحوتة'
      },
      'athar_material': {
        'stone': 'حجر',
        'marble': 'رخام',
        'wood': 'خشب',
        'metal': 'معدن',
        'gold': 'ذهب',
        'silver': 'فضة',
        'bronze': 'برونز',
        'clay': 'طين',
        'glass': 'زجاج',
        'fabric': 'قماش',
        'paper': 'ورق',
        'leather': 'جلد'
      },
      'athar_legal_status': {
        'stolen': 'مسروق',
        'lost': 'مفقود',
        'disputed': 'متنازع عليه',
        'documented': 'موثق',
        'unknown': 'غير معروف'
      },
      'athar_preservation_status': {
        'excellent': 'ممتاز',
        'good': 'جيد',
        'fair': 'متوسط',
        'poor': 'سيء',
        'damaged': 'متضرر',
        'restored': 'مُرمم'
      },
      'release_type': {
        'book': 'كتاب',
        'article': 'مقال',
        'report': 'تقرير',
        'study': 'دراسة',
        'document': 'وثيقة'
      },
      'media_type': {
        'image': 'صورة',
        'video': 'فيديو'
      },
      'type_c': {
        'type_1': 'النوع ١',
        'type_2': 'النوع ٢',
        'type_3': 'النوع ٣'
      },
      'role_code': {
        'admin': 'مدير',
        'editor': 'محرر',
        'viewer': 'مشاهد',
        'super_admin': 'مدير عام'
      }
    };

    return fallbackTranslations[field]?.[value] || value;
  }

  getRowNumber(index: number): number {
    return (this.pagination.currentPage - 1) * this.pagination.perPage + index + 1;
  }

  isTextTruncated(value: any, field?: string): boolean {
    if (!value) return false;
    
    // For URL fields, check the displayed text ("انقر على الرابط") not the URL value
    if (field && this.isUrlField(field)) {
      return false; // URL fields show "انقر على الرابط" which is always short
    }
    
    const text = String(value);
    return text.length > 50;
  }

  isCellExpanded(rowIndex: number, field: string): boolean {
    const cellKey = `${rowIndex}-${field}`;
    return this.expandedCells.has(cellKey);
  }

  toggleCellExpansion(rowIndex: number, field: string, value: any): void {
    if (!this.isTextTruncated(value, field)) return;
    
    const cellKey = `${rowIndex}-${field}`;
    if (this.expandedCells.has(cellKey)) {
      this.expandedCells.delete(cellKey);
    } else {
      this.expandedCells.add(cellKey);
    }
  }

  getCellTooltip(value: any, rowIndex: number, field: string): string {
    if (!value) return '';
    if (!this.isTextTruncated(value, field)) return '';
    
    const isExpanded = this.isCellExpanded(rowIndex, field);
    return isExpanded ? 'انقر للتصغير' : 'انقر لعرض النص كاملاً';
  }

  clearExpandedCells(): void {
    this.expandedCells.clear();
  }

  getUrlValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    } else if (value && typeof value === 'object' && value.url) {
      return value.url;
    }
    return '#';
  }

  getDocumentType(): string {
    return this.typeForm.get('documentType')?.value || '';
  }

  getFieldTranslationKey(field: string): string {
    return field.toUpperCase();
  }


  private convertToArabicNumerals(text: string): string {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return text.replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  }
}