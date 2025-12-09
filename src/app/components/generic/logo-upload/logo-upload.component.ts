import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FileUploadComponent, PendingFileOperation } from '../file-upload/file-upload.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-logo-upload',
  templateUrl: './logo-upload.component.html',
  styleUrls: ['./logo-upload.component.scss'],
  imports: [CommonModule, TranslatePipe, FileUploadComponent, ReactiveFormsModule],
  standalone: true
})
export class LogoUploadComponent implements OnInit, OnChanges {
  @Input() headerLogoUrl: string | null = null;
  @Input() footerLogoUrl: string | null = null;
  @Input() pdfLogoUrl: string | null = null;
  @Input() headerLogoSize: string = 'medium';
  @Input() footerLogoSize: string = 'medium';
  @Output() pendingChange = new EventEmitter<void>();

  @ViewChildren(FileUploadComponent) fileUploadComponents!: QueryList<FileUploadComponent>;

  logoForm!: FormGroup;
  
  // Expose form controls as properties to ensure they're correctly typed as FormControl
  get headerLogoControl(): FormControl {
    return this.logoForm.get('headerLogo') as FormControl;
  }

  // Expose preview link for header logo (immediate preview)
  get headerLogoPreview(): string | null {
    // fileUploadComponents may be undefined on first render
    const comp = this.fileUploadComponents?.get(0);
    return comp?.previewLink || this.headerLogoControl.value;
  }
  
  // Expose preview link for footer logo (immediate preview)
  get footerLogoPreview(): string | null {
    const comp = this.fileUploadComponents?.get(1);
    return comp?.previewLink || this.footerLogoControl.value;
  }
  
  // Expose preview link for pdf logo (immediate preview)
  get pdfLogoPreview(): string | null {
    const comp = this.fileUploadComponents?.get(2);
    return comp?.previewLink || this.pdfLogoControl.value;
  }
  
  get footerLogoControl(): FormControl {
    return this.logoForm.get('footerLogo') as FormControl;
  }
  
  get pdfLogoControl(): FormControl {
    return this.logoForm.get('pdfLogo') as FormControl;
  }

  constructor(private fb: FormBuilder, private translate: TranslateService) {
    this.createForm();
  }

  createForm() {
    this.logoForm = this.fb.group({
      headerLogo: new FormControl<string | null>(null),
      footerLogo: new FormControl<string | null>(null),
      pdfLogo: new FormControl<string | null>(null),
      headerSize: new FormControl<string>('medium', {nonNullable: true}),
      footerSize: new FormControl<string>('medium', {nonNullable: true})
    });
  }

  ngOnInit(): void {
    this.updateFormValues();
    
    // Listen to form value changes to detect pending changes
    this.logoForm.valueChanges.subscribe(() => {
      this.checkPendingChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update form when inputs change
    if (changes['headerLogoUrl'] || changes['footerLogoUrl'] || 
        changes['pdfLogoUrl'] || changes['headerLogoSize'] || 
        changes['footerLogoSize']) {
      this.updateFormValues();
    }
  }

  updateFormValues(): void {
    // Initialize form with input values, ensuring sizes are strings
    if (this.logoForm) {
      console.log('Updating form values with:', {
        headerLogo: this.headerLogoUrl,
        footerLogo: this.footerLogoUrl,
        pdfLogo: this.pdfLogoUrl,
        headerSize: this.headerLogoSize || 'medium',
        footerSize: this.footerLogoSize || 'medium'
      });
      
      this.logoForm.patchValue({
        headerLogo: this.headerLogoUrl,
        footerLogo: this.footerLogoUrl,
        pdfLogo: this.pdfLogoUrl,
        headerSize: this.headerLogoSize || 'medium',
        footerSize: this.footerLogoSize || 'medium'
      });
    }
  }

  // Handle file upload or deletion events from FileUploadComponent
  onFileOperation(controlName: string, fileUrl?: string): void {
    const control = this.logoForm.get(controlName);
    if (control) {
      control.setValue(fileUrl || null);
      this.checkPendingChanges();
    }
  }

  // Check if there are pending operations or form changes
  hasPendingChanges(): boolean {
    const hasFilePending = this.fileUploadComponents?.some((comp) => comp.hasPendingOperation());
    const hasSizeChanged =
      this.logoForm.get('headerSize')?.value !== (this.headerLogoSize || 'medium') ||
      this.logoForm.get('footerSize')?.value !== (this.footerLogoSize || 'medium');
    
    console.log('Checking pending changes:', { 
      hasFilePending, 
      hasSizeChanged,
      headerSizeForm: this.logoForm.get('headerSize')?.value,
      headerSizeInput: this.headerLogoSize || 'medium',
      footerSizeForm: this.logoForm.get('footerSize')?.value,
      footerSizeInput: this.footerLogoSize || 'medium'
    });
    
    return !!hasFilePending || !!hasSizeChanged;
  }

  // Emit pendingChange event if there are changes
  checkPendingChanges(): void {
    if (this.hasPendingChanges()) {
      this.pendingChange.emit();
    }
  }

  // Execute all pending operations and return final values
  async executePendingOperations(): Promise<{
    headerLogo: string | null;
    footerLogo: string | null;
    pdfLogo: string | null;
    headerSize: string;
    footerSize: string;
  }> {
    try {
      console.log('Executing pending operations for logos');
      // Execute pending operations for each FileUploadComponent
      const results = await Promise.all(
        this.fileUploadComponents.map((comp) => comp.executePendingOperation())
      );

      // Map results to respective controls
      const headerLogo = results[0] ?? this.logoForm.get('headerLogo')?.value;
      const footerLogo = results[1] ?? this.logoForm.get('footerLogo')?.value;
      const pdfLogo = results[2] ?? this.logoForm.get('pdfLogo')?.value;

      // Get size values from form
      const headerSize = this.logoForm.get('headerSize')?.value || 'medium';
      const footerSize = this.logoForm.get('footerSize')?.value || 'medium';
      
      console.log('Logo operations executed:', {
        headerLogo, footerLogo, pdfLogo, headerSize, footerSize
      });

      // Update form with final values
      this.logoForm.patchValue({
        headerLogo,
        footerLogo,
        pdfLogo,
        headerSize,
        footerSize
      });

      return {
        headerLogo,
        footerLogo,
        pdfLogo,
        headerSize,
        footerSize
      };
    } catch (error) {
      console.error('Error executing pending operations:', error);
      // Revert to original values on error
      this.logoForm.patchValue({
        headerLogo: this.headerLogoUrl,
        footerLogo: this.footerLogoUrl,
        pdfLogo: this.pdfLogoUrl,
        headerSize: this.headerLogoSize || 'medium',
        footerSize: this.footerLogoSize || 'medium'
      });
      throw error; // Let AdminPanelComponent handle the error
    }
  }

  // Calculate CSS classes for image preview
  getImageSizeClass(size: string): string {
    switch (size) {
      case 'small': return 'logo-preview-small';
      case 'medium': return 'logo-preview-medium';
      case 'large': return 'logo-preview-large';
      case 'xlarge': return 'logo-preview-xlarge';
      default: return 'logo-preview-medium';
    }
  }

  // Cancel all pending operations
  cancelPendingOperations(): void {
    this.fileUploadComponents.forEach((comp) => comp.cancelPendingOperation());
    this.logoForm.patchValue({
      headerLogo: this.headerLogoUrl,
      footerLogo: this.footerLogoUrl,
      pdfLogo: this.pdfLogoUrl,
      headerSize: this.headerLogoSize || 'medium',
      footerSize: this.footerLogoSize || 'medium' // 'original' is a valid value
    });
    this.checkPendingChanges();
  }
}