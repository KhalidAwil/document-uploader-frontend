import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChildren, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { DocumentService } from '../../../services/document.service';
import { DocumentConfigurations } from '../../../config/document.config';
import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FileUploadComponent } from '../../generic/file-upload/file-upload.component';
import { DropdownService } from '../../../services/dropdown.service';
import { NgbTimepickerModule, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { DropdownSelectComponent } from '../../generic/dropdown-select/dropdown-select.component';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { VideoService } from '../../../services/video.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ArabicNumeralsDirective } from '../../../directives/arabic-numerals.directive';
import { ArabicNumeralsPipe } from '../../../pipes/arabic-numerals.pipe';
import { MapLocationPickerComponent } from '../../generic/map-location-picker/map-location-picker.component';
import { 
  passwordStrengthValidator,
  youtubeUrlValidator,
  urlValidator,
  geoLocationValidator,
  timeValidator as objectTimeValidator,
  dateOrUnknownValidator,
  uuidValidator,
  atharIdFormatValidator,
  atharIdUniquenessValidator
} from '../../../validators/custom-validators';

@Component({
  selector: 'app-edit-athar-document',
  templateUrl: './edit-athar-document.component.html',
  styleUrls: ['./edit-athar-document.component.scss'],
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
export class EditAtharDocumentComponent implements OnInit, OnDestroy {
  editDocumentForm?: FormGroup;
  documentId = '';
  documentType = 'athar';
  editableFields: string[] = [];
  imageFields: string[] = [];
  fileUploadControls = new Map<string, FormControl>();
  availableRoles: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private documentService: DocumentService,
    private dropdownService: DropdownService,
    private confirmationModalService: ConfirmationModalService,
    private authService: AuthService,
    private toastService: ToastService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeRouteParams();
    this.initializeForm();
    this.loadDocumentData();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private initializeRouteParams(): void {
    this.documentId = this.route.snapshot.paramMap.get('id') ?? '';
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
        // Make athar_id user-editable with format validation (uniqueness will be added after data load)
        const validators = isRequired ? [Validators.required, atharIdFormatValidator()] : [atharIdFormatValidator()];
        formControls[field] = ['', validators];
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

    this.editDocumentForm = this.fb.group(formControls);
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

  loadDocumentData(): void {
    if (!this.editDocumentForm) return;
    
    this.documentService.getDocument(this.documentType, this.documentId).subscribe((document) => {
      const patchData: { [key: string]: any } = {};
      this.editableFields.forEach(field => {
        if (!this.isFileUploadField(field) && document.hasOwnProperty(field)) {
          patchData[field] = document[field];
        }
      });

      this.editDocumentForm?.patchValue(patchData);
      
      // Add async validator for athar_id after we know the current value
      const atharIdControl = this.editDocumentForm?.get('athar_id');
      if (atharIdControl) {
        atharIdControl.setAsyncValidators([
          atharIdUniquenessValidator(this.documentService, this.documentId)
        ]);
        atharIdControl.updateValueAndValidity();
      }
      
      Object.entries(document).forEach(([key, value]) => {
        if (this.isFileUploadField(key) && value) {
          const control = this.getFileUploadControl(key);
          if (control) {
            control.setValue(value);
            control.markAsPristine();
            control.updateValueAndValidity();
          }
        }
      });

      this.cdr.detectChanges();
    });
  }

  onLocationChanged(fieldName: string, location: string): void {
    if (this.editDocumentForm) {
      this.editDocumentForm.get(fieldName)?.setValue(location);
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

  onFileUploaded(fieldName: string, fileUrl: string): void {
    const control = this.getFileUploadControl(fieldName);
    control.setValue(fileUrl);
    control.markAsDirty();
    control.updateValueAndValidity();
  }

  onFileDeleted(fieldName: string): void {
    const control = this.getFileUploadControl(fieldName);
    control.setValue(null);
    control.markAsDirty();
    control.updateValueAndValidity();
  }


  shouldShowFieldError(fieldName: string): boolean {
    const control = this.editDocumentForm?.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.editDocumentForm?.get(fieldName);
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
    return !!(this.editDocumentForm && this.editDocumentForm.invalid && this.editDocumentForm.touched);
  }

  getFormErrorSummary(): string[] {
    const errors: string[] = [];
    if (this.editDocumentForm) {
      Object.keys(this.editDocumentForm.controls).forEach(fieldName => {
        if (this.shouldShowFieldError(fieldName)) {
          errors.push(this.getFieldErrorMessage(fieldName));
        }
      });
    }
    return errors;
  }

  onSubmit(): void {
    if (!this.editDocumentForm || this.editDocumentForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    const formData = { ...this.editDocumentForm.getRawValue() };

    this.documentService.updateDocument(this.documentType, this.documentId, formData).subscribe({
      next: (response) => {
        const documentTypeLabel = this.translateService.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
        this.toastService.documentUpdated(documentTypeLabel);
        this.router.navigate(['/documents', this.documentType]);
      },
      error: (error) => {
        console.error('Error updating document:', error);
        const documentTypeLabel = this.translateService.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
        this.toastService.documentError('update', documentTypeLabel);
      }
    });
  }

  private markAllFieldsAsTouched(): void {
    if (this.editDocumentForm) {
      Object.keys(this.editDocumentForm.controls).forEach(fieldName => {
        this.editDocumentForm?.get(fieldName)?.markAsTouched();
      });
    }
  }

  onDelete(): void {
    const documentTypeTranslation = this.translateService.instant('ADMIN_PANEL_CREATE_' + this.documentType.toUpperCase());
    
    this.confirmationModalService.confirm({
      titleKey: 'MODAL.DELETE_CONFIRMATION',
      messageKey: 'MODAL.CONFIRM_DELETE_DOCUMENT',
      messageParams: { documentType: documentTypeTranslation },
      confirmBtnKey: 'MODAL.DELETE',
      confirmBtnClass: 'btn-danger'
    }).then(confirmed => {
      if (confirmed) {
        this.documentService.deleteDocument(this.documentType, this.documentId).subscribe({
          next: () => {
            const documentTypeLabel = this.translateService.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
            this.toastService.documentDeleted(documentTypeLabel);
            this.router.navigate(['/documents', this.documentType]);
          },
          error: (error) => {
            console.error('Error deleting document:', error);
            const documentTypeLabel = this.translateService.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
            this.toastService.documentError('delete', documentTypeLabel);
          }
        });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  isRootSuperAdmin(): boolean {
    return this.authService.isRootSuperAdmin();
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