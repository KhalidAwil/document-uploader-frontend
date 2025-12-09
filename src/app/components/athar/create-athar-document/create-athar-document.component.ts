import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { DocumentService } from '../../../services/document.service';
import { DocumentConfigurations } from '../../../config/document.config';
import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FileUploadComponent } from '../../generic/file-upload/file-upload.component';
import { DropdownService } from '../../../services/dropdown.service';
import { NgbTimepickerModule, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { DropdownSelectComponent } from '../../generic/dropdown-select/dropdown-select.component';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { Subject } from 'rxjs';
import { ArabicNumeralsDirective } from '../../../directives/arabic-numerals.directive';
import { ArabicNumeralsPipe } from '../../../pipes/arabic-numerals.pipe';
import { MapLocationPickerComponent } from '../../generic/map-location-picker/map-location-picker.component';
import { 
  urlValidator,
  geoLocationValidator,
  uuidValidator,
  dateOrUnknownValidator,
  atharIdFormatValidator,
  atharIdUniquenessValidator
} from '../../../validators/custom-validators';

@Component({
  selector: 'app-create-athar-document',
  templateUrl: './create-athar-document.component.html',
  styleUrls: ['./create-athar-document.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    TruncatePipe,
    TranslatePipe,
    FileUploadComponent,
    NgbTimepickerModule,
    DropdownSelectComponent,
    BsDatepickerModule,
    ArabicNumeralsDirective,
    ArabicNumeralsPipe,
    MapLocationPickerComponent
  ]
})
export class CreateAtharDocumentComponent implements OnInit, OnDestroy {
  createDocumentForm?: FormGroup;
  documentType = 'athar';
  editableFields: string[] = [];
  imageFields: string[] = [];
  fileUploadControls = new Map<string, FormControl>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private location: Location,
    private documentService: DocumentService,
    private dropdownService: DropdownService,
    private authService: AuthService,
    private toastService: ToastService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private initializeForm(): void {
    const config = DocumentConfigurations['athar'];
    if (config) {
      this.editableFields = config.editableFields;
      this.imageFields = this.editableFields.filter(field => /^image_url_\d$|^image_url_(en|ar|fr|de|ru|zh_cn|msd)$/.test(field));
    }

    const formControls: { [key: string]: any } = {};

    this.editableFields.forEach(field => {
      const isRequired = config.required.includes(field);
      
      if (this.isFileUploadField(field)) {
        this.fileUploadControls.set(field, new FormControl(null, isRequired ? Validators.required : null));
        formControls[field] = this.fileUploadControls.get(field);
      } else if (field === 'athar_id') {
        // Make athar_id user-editable with format and uniqueness validation
        const validators = isRequired ? [Validators.required, atharIdFormatValidator()] : [atharIdFormatValidator()];
        const asyncValidators = [atharIdUniquenessValidator(this.documentService)];
        formControls[field] = ['', { validators, asyncValidators }];
      } else if (field === 'athar_page_link') {
        const validators = isRequired ? [Validators.required, urlValidator()] : [urlValidator()];
        formControls[field] = ['', validators];
      } else if (field === 'athar_geo_location') {
        const validators = isRequired ? [Validators.required, geoLocationValidator()] : [geoLocationValidator()];
        formControls[field] = ['', validators];
      } else if (field === 'date_of_publication' || field === 'athar_date_of_loss' || field === 'athar_date_of_presentation') {
        const validators = isRequired ? [Validators.required, dateOrUnknownValidator()] : [dateOrUnknownValidator()];
        formControls[field] = ['', validators];
      } else {
        formControls[field] = ['', isRequired ? Validators.required : null];
      }
    });

    this.createDocumentForm = this.fb.group(formControls);
  }

  private isFileUploadField(fieldName: string): boolean {
    const languageKeys = ['ar', 'en', 'fr', 'de', 'ru', 'zh_cn', 'msd'];
    return (
      fieldName === 'image_url' ||
      fieldName === 'pdf_url' ||
      /^image_url_\d$/.test(fieldName) ||
      languageKeys.some(lang => fieldName === `image_url_${lang}`)
    );
  }

  onLocationChanged(fieldName: string, location: string): void {
    if (this.createDocumentForm) {
      this.createDocumentForm.get(fieldName)?.setValue(location);
    }
  }

  onFileUploaded(controlName: string, filePath: string): void {
    if (this.createDocumentForm && this.createDocumentForm.get(controlName)) {
      this.createDocumentForm.get(controlName)?.setValue(filePath);
      this.createDocumentForm.get(controlName)?.markAsDirty();
    }
  }

  onFileDeleted(controlName: string): void {
    if (this.createDocumentForm && this.createDocumentForm.get(controlName)) {
      this.createDocumentForm.get(controlName)?.setValue(null);
      this.createDocumentForm.get(controlName)?.markAsDirty();
    }
  }

  getFileUploadControl(fieldName: string): FormControl {
    let control = this.fileUploadControls.get(fieldName);
    if (!control) {
      control = new FormControl(null);
      this.fileUploadControls.set(fieldName, control);
    }
    return control;
  }

  shouldShowFieldError(fieldName: string): boolean {
    const control = this.createDocumentForm?.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.createDocumentForm?.get(fieldName);
    if (control && control.errors) {
      if (control.errors['required']) {
        return this.translateService.instant('IS_REQUIRED', { field: this.translateService.instant(fieldName.toUpperCase()) });
      }
      if (control.errors['invalidGeoLocation']) {
        return this.translateService.instant('INVALID_COORDINATE_FORMAT');
      }
      if (control.errors['invalidDate']) {
        return this.translateService.instant('INVALID_DATE_FORMAT');
      }
      if (control.errors['invalidUrl']) {
        return this.translateService.instant('INVALID_URL_FORMAT');
      }
      if (control.errors['invalidAtharIdFormat']) {
        return this.translateService.instant('INVALID_ATHAR_ID_FORMAT');
      }
      if (control.errors['atharIdNotUnique']) {
        return this.translateService.instant('ATHAR_ID_NOT_UNIQUE');
      }
      if (control.errors['pattern']) {
        return this.translateService.instant('INVALID_URL_FORMAT');
      }
    }
    return '';
  }

  hasFormErrors(): boolean {
    return !!(this.createDocumentForm && this.createDocumentForm.invalid && this.createDocumentForm.touched);
  }

  getFormErrorSummary(): string[] {
    const errors: string[] = [];
    if (this.createDocumentForm) {
      Object.keys(this.createDocumentForm.controls).forEach(fieldName => {
        if (this.shouldShowFieldError(fieldName)) {
          errors.push(this.getFieldErrorMessage(fieldName));
        }
      });
    }
    return errors;
  }

  onSubmit(): void {
    if (!this.createDocumentForm || this.createDocumentForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    const formData = { ...this.createDocumentForm.getRawValue() };

    this.documentService.createDocument(this.documentType, formData).subscribe({
      next: (response) => {
        const documentTypeLabel = this.translateService.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
        this.toastService.documentCreated(documentTypeLabel);
        this.router.navigate(['/documents', this.documentType]);
      },
      error: (error) => {
        console.error('Error creating document:', error);
        const documentTypeLabel = this.translateService.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
        this.toastService.documentError('create', documentTypeLabel);
      }
    });
  }

  private markAllFieldsAsTouched(): void {
    if (this.createDocumentForm) {
      Object.keys(this.createDocumentForm.controls).forEach(fieldName => {
        this.createDocumentForm?.get(fieldName)?.markAsTouched();
      });
    }
  }

  goBack(): void {
    this.location.back();
  }

  getImageLabelKey(field: string): string {
    if (field === 'image_url') return 'IMAGE_URL';
    if (/^image_url_\d$/.test(field)) {
      const number = field.split('_')[2];
      return `IMAGE_URL_${number}`;
    }
    if (field.startsWith('image_url_')) {
      const lang = field.split('_')[2];
      return `IMAGE_URL_${lang.toUpperCase()}`;
    }
    return field.toUpperCase();
  }
}