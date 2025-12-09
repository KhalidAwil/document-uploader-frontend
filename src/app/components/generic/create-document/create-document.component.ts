import { AfterViewInit, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, FormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DocumentService } from '../../../services/document.service';
import { DocumentConfigurations } from '../../../config/document.config';
import { CommonModule, Location } from '@angular/common';
import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FileUploadComponent, UploadProgress } from '../file-upload/file-upload.component';
import { DropdownService } from '../../../services/dropdown.service';
import { DropdownSelectComponent } from '../dropdown-select/dropdown-select.component';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
import { RoleHierarchyService } from '../../../services/role-hierarchy.service';
import { ToastService } from '../../../services/toast.service';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { VideoService } from '../../../services/video.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { MapLocationPickerComponent } from '../map-location-picker/map-location-picker.component';
import { passwordStrengthValidator, youtubeUrlValidator, urlValidator, geoLocationValidator, dateOrUnknownValidator, uuidValidator } from '../../../validators/custom-validators';
import { NgbTimepickerModule, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { ArabicNumeralsDirective } from '../../../directives/arabic-numerals.directive';

declare var bootstrap: any;

interface MediaControls {
  image: FormControl;
  video: FormControl | null;
  videoLength: FormControl | null;
}


@Component({
  selector: 'app-create-document',
  templateUrl: './create-document.component.html',
  styleUrls: ['./create-document.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, TruncatePipe, ReactiveFormsModule, FormsModule, TranslatePipe, FileUploadComponent, DropdownSelectComponent, BsDatepickerModule, MapLocationPickerComponent, NgbTimepickerModule, ArabicNumeralsDirective]
})
export class CreateDocumentComponent implements OnInit, AfterViewInit, OnDestroy {
  // Custom validator to ensure a valid YouTube URL with a video ID
  youtubeUrlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const url = control.value;
      if (!url) return null; // Don't validate empty value here (handled by required)
      const videoId = this.extractYouTubeId(url);
      return videoId ? null : { invalidYoutube: true };
    };
  }

  createDocumentForm: FormGroup | null = null;
  documentType: string = '';
  editableFields: string[] = [];
  imageFields: string[] = [];
  availableRoles: { name: string; role_code: string }[] = [];
  generatedPassword: string = '';
  archiveCDropdown: any | undefined | null = null;
  releaseTypeDropdown: any | undefined | null = null;
  archiveCDropdownOptions: any[] = [];
  formSubmitAttempted: boolean = false;
  releaseTypeDropdownOptions: any[] = [];

  passwordCopied = false;
  public videoLengthParsed: NgbTimeStruct | null = null;

  // Upload tracking properties
  uploadProgress: { [key: string]: UploadProgress } = {};
  globalUploadState = {
    activeUploads: 0,
    totalProgress: 0,
    totalSize: 0,
    uploadedSize: 0,
    overallSpeed: 0
  };

  // Map to store all file upload controls
  private fileUploadControls: Map<string, FormControl> = new Map();

  // Video URL auto-population functionality
  private videoUrlChangeSubject = new Subject<string>();
  private videoUrlSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private router: Router,
    private dropdownService: DropdownService,
    private location: Location,
    private roleHierarchyService: RoleHierarchyService,
    private confirmationModalService: ConfirmationModalService,
    private translate: TranslateService,
    private toastService: ToastService,
    private videoService: VideoService,
    private cdr: ChangeDetectorRef
  ) { }

  // Utility method to get file upload control
  getFileUploadControl(fieldName: string): FormControl {
    if (!this.fileUploadControls.has(fieldName)) {
      this.fileUploadControls.set(fieldName, new FormControl(null));
    }
    return this.fileUploadControls.get(fieldName)!;
  }

  // Method to handle map location updates
  onLocationChanged(fieldName: string, location: string): void {
    if (this.createDocumentForm) {
      this.createDocumentForm.get(fieldName)?.setValue(location);
    }
  }

  // Helper method to check if a field is a file upload field
  private isFileUploadField(fieldName: string): boolean {
    return fieldName === 'image_url' || fieldName === 'pdf_url' || /^image_url_\d$/.test(fieldName);
  }

  ngOnInit(): void {
    this.documentType = this.route.snapshot.data['modelType'] ?? '';
    this.initializeForm();
    this.fetchRoles();
    this.setupVideoUrlDebounce();
  }

  ngAfterViewInit(): void {
    if (this.documentType === 'media') {
      this.setupMediaTypeValidation();
    }
  }

  ngOnDestroy(): void {
    if (this.videoUrlSubscription) {
      this.videoUrlSubscription.unsubscribe();
    }
  }

  private setupMediaTypeValidation(): void {
    this.createDocumentForm?.get('media_type')?.valueChanges.subscribe(value => {
      if (!this.createDocumentForm) return;

      const controls: MediaControls = {
        image: this.getFileUploadControl('image_url'),
        video: this.createDocumentForm.get('video_url') as FormControl,
        videoLength: this.createDocumentForm.get('video_length') as FormControl
      };

      if (value === 'image') {
        this.updateMediaValidators(controls, true);
      } else if (value === 'video') {
        this.updateMediaValidators(controls, false);
      } else {
        this.disableAllMediaControls(controls);
      }
    });
  }

  private updateMediaValidators(controls: MediaControls, isImage: boolean): void {
    if (isImage) {
      controls.image.setValidators(Validators.required);
      controls.video?.clearValidators();
      controls.videoLength?.clearValidators();
      controls.image.enable();
      controls.video?.disable();
      controls.videoLength?.disable();
    } else {
      controls.image.clearValidators();
      if (controls.video && controls.videoLength) {
        controls.video.setValidators([
          Validators.required,
          Validators.pattern(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/),
          this.youtubeUrlValidator()
        ]);
        controls.videoLength.setValidators([
          Validators.required,
          Validators.required,
          this.timestampValidator()
        ]);
        controls.image.disable();
        controls.video.enable();
        controls.videoLength.enable();
      }
    }

    controls.image.updateValueAndValidity();
    controls.video?.updateValueAndValidity();
    controls.videoLength?.updateValueAndValidity();
  }

  onVideoLengthChange(time: NgbTimeStruct | null): void {
    const videoLengthControl = this.createDocumentForm?.get('video_length');
    if (videoLengthControl) {
      if (time) {
        const formattedTime = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:${String(time.second).padStart(2, '0')}`;
        videoLengthControl.setValue(formattedTime);
        this.videoLengthParsed = time;
      } else {
        videoLengthControl.setValue('');
        this.videoLengthParsed = null;
      }
      videoLengthControl.markAsDirty();
      videoLengthControl.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  onSubmit(): void {
    if (!this.createDocumentForm) return;

    // Mark that user has attempted to submit
    this.formSubmitAttempted = true;

    // Prevent submission during active uploads
    if (!this.canSubmitForm()) {
      this.toastService.error(
        this.translate.instant('FILE_UPLOAD.UPLOADS_IN_PROGRESS'),
        this.translate.instant('FILE_UPLOAD.WAIT_FOR_UPLOADS')
      );
      return;
    }

    if (this.createDocumentForm.invalid) {
      Object.values(this.createDocumentForm.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    const formValue = this.createDocumentForm.getRawValue();

    // Additional role hierarchy validation for user creation
    if (this.documentType === 'user') {
      const roleCode = formValue.role_code;

      // Check if current user can create users at all
      if (!this.roleHierarchyService.canCreateUsers()) {
        this.showRoleHierarchyError('غير مخول لإنشاء المستخدمين');
        return;
      }

      // Check if current user can assign the specific role
      if (roleCode && !this.roleHierarchyService.canAssignRole(roleCode)) {
        const errorMessage = this.roleHierarchyService.getRoleAssignmentError(roleCode);
        this.showRoleHierarchyError(errorMessage);
        return;
      }
    }

    // Handle athar-specific processing with new boolean flag structure
    if (this.documentType === 'athar') {
      // Handle unknown date flags for athar_date_of_loss
      if (formValue.athar_date_of_loss === '' || formValue.athar_date_of_loss === null) {
        formValue.athar_date_of_loss = null;
        formValue.athar_date_of_loss_unknown = true;
      } else {
        formValue.athar_date_of_loss_unknown = false;
      }

      // Handle unknown date flags for athar_date_of_presentation
      if (formValue.athar_date_of_presentation === '' || formValue.athar_date_of_presentation === null) {
        formValue.athar_date_of_presentation = null;
        formValue.athar_date_of_presentation_unknown = true;
      } else {
        formValue.athar_date_of_presentation_unknown = false;
      }

      // Handle unknown date flags for date_of_publication
      if (formValue.date_of_publication === '' || formValue.date_of_publication === null) {
        formValue.date_of_publication = null;
        formValue.date_of_publication_unknown = true;
      } else {
        formValue.date_of_publication_unknown = false;
      }

      // Handle country unknown values (still using 'unknown' string for these)
      if (formValue.athar_origin_country === '' || formValue.athar_origin_country === null) {
        formValue.athar_origin_country = 'unknown';
      }
      if (formValue.athar_present_location_country === '' || formValue.athar_present_location_country === null) {
        formValue.athar_present_location_country = 'unknown';
      }
    }

    // Remove password fields if not setting a password (user create)
    if (this.documentType === 'user') {
      if (!formValue.password) {
        delete formValue.password;
        delete formValue.password_confirmation;
      }
    }

    // Ensure password_confirmation is sent for user creation
    if (this.documentType === 'user' && formValue.password) {
      formValue.password_confirmation = formValue.password;
    }

    // Format date fields to 'YYYY-MM-DD' - only format valid dates, not when unknown flags are set
    if (formValue.date_of_publication && !formValue.date_of_publication_unknown) {
      const date = new Date(formValue.date_of_publication);
      formValue.date_of_publication = date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    }
    if (formValue.date_of_event) {
      const date = new Date(formValue.date_of_event);
      formValue.date_of_event = date.toISOString().slice(0, 10);
    }
    // Format athar date fields - only format actual dates, not when unknown flags are set
    if (formValue.athar_date_of_loss && !formValue.athar_date_of_loss_unknown) {
      const date = new Date(formValue.athar_date_of_loss);
      if (!isNaN(date.getTime())) {
        formValue.athar_date_of_loss = date.toISOString().slice(0, 10);
      }
    }
    if (formValue.athar_date_of_presentation && !formValue.athar_date_of_presentation_unknown) {
      const date = new Date(formValue.athar_date_of_presentation);
      if (!isNaN(date.getTime())) {
        formValue.athar_date_of_presentation = date.toISOString().slice(0, 10);
      }
    }

    // Handle media type specific fields
    if (this.documentType === 'media') {
      if (formValue.media_type === 'image') {
        delete formValue.video_url;
        delete formValue.video_length;
      } else if (formValue.media_type === 'video') {
        if (formValue.video_length) {
          // Keep video_length as provided
        }
        // Ensure image_url is set to the generated thumbnail if available
        if (formValue.video_url && this.createDocumentForm?.get('image_url')) {
          const thumbnailUrl = this.generateThumbnail(formValue.video_url);
          if (thumbnailUrl) {
            formValue.image_url = thumbnailUrl;
          }
        }
      }
    }

    // Submit form data
    if (this.documentType === 'user') {
      this.documentService.createUser(formValue).subscribe({
        next: () => {
          const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
          this.toastService.documentCreated(documentTypeLabel);
          this.router.navigate(['/admin']).then(() => {
            var triggerEl = document.querySelector('#myTab a[href="#users-tab-pane"]');
            bootstrap.Tab.getInstance(triggerEl).show();
          });
        },
        error: (error) => {
          console.error('Error creating user:', error);
          const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
          this.toastService.documentError('create', documentTypeLabel);
        }
      });
    } else {
      this.documentService.createDocument(this.documentType, formValue).subscribe({
        next: () => {
          const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
          this.toastService.documentCreated(documentTypeLabel);
          this.router.navigate(['/documents/' + this.documentType]);
        },
        error: (error) => {
          console.error('Error creating document:', error);
          const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
          this.toastService.documentError('create', documentTypeLabel);
        }
      });
    }
  }

  private disableAllMediaControls(controls: MediaControls): void {
    controls.image.disable();
    controls.video?.disable();
    controls.videoLength?.disable();
  }

  initializeForm(): void {
    const config = DocumentConfigurations[this.documentType as keyof typeof DocumentConfigurations];
    if (config) {
      this.editableFields = config.editableFields;
      // Extract image_url_1 to image_url_7 and image_url_{lang}
      this.imageFields = this.editableFields.filter(field => /^image_url_\d$|^image_url_(en|ar|fr|de|ru|zh_cn|msd)$/.test(field));
    }

    const formControls: { [key: string]: any } = {};
    // Track file upload controls for dynamic handling
    this.fileUploadControls = new Map();

    this.editableFields.forEach(field => {
      const isRequired = config.required.includes(field);

      // Skip user fields if we're creating a user - they'll be handled by addUserFormControls
      if (this.documentType === 'user' && ['first_name', 'last_name', 'nickname', 'email', 'password', 'role_code'].includes(field)) {
        return;
      }

      if (this.isFileUploadField(field)) {
        // Apply required validator for file upload fields if configured as required
        this.fileUploadControls.set(field, new FormControl(null, isRequired ? Validators.required : null));
        formControls[field] = this.fileUploadControls.get(field);
      } else if (field === 'video_length') {
        formControls[field] = ['', isRequired ? [Validators.required, this.timestampValidator()] : [this.timestampValidator()]];
      } else if (field === 'video_url') {
        formControls[field] = ['', [youtubeUrlValidator()]];
      } else if (field === 'athar_id') {
        // athar_id should allow letters, numbers, and dashes
        const validators = isRequired ? [Validators.required, Validators.pattern(/^[a-zA-Z0-9\-]+$/)] : [Validators.pattern(/^[a-zA-Z0-9\-]+$/)];
        formControls[field] = ['', validators];
      } else if (field === 'athar_page_link') {
        // URL validation for athar_page_link
        const validators = isRequired ? [Validators.required, urlValidator()] : [urlValidator()];
        formControls[field] = ['', validators];
      } else if (field === 'athar_geo_location') {
        const validators = isRequired ? [Validators.required, geoLocationValidator()] : [geoLocationValidator()];
        formControls[field] = ['', validators];
      } else if (field === 'date_of_publication' || field === 'date_of_event' || field === 'athar_date_of_loss' || field === 'athar_date_of_presentation') {
        const validators = isRequired ? [Validators.required, dateOrUnknownValidator()] : [dateOrUnknownValidator()];
        formControls[field] = ['', validators];
      } else {
        formControls[field] = ['', isRequired ? Validators.required : null];
      }
    });


    if (this.documentType === 'user') {
      this.generatedPassword = this.generatePassword();
      this.addUserFormControls(formControls);
    }

    this.createDocumentForm = this.fb.group(formControls);
    console.log('Form controls after initialization:', formControls);

    // Add dynamic password confirmation validation
    if (this.documentType === 'user') {
      this.createDocumentForm.get('password')?.valueChanges.subscribe(password => {
        const confirmationControl = this.createDocumentForm?.get('password_confirmation');
        if (password) {
          confirmationControl?.setValidators([Validators.required]);
        } else {
          confirmationControl?.clearValidators();
        }
        confirmationControl?.updateValueAndValidity();
      });
    }

    if (this.documentType === 'media') {
      this.setupMediaTypeValidation();
    }
  }

  private addUserFormControls(formControls: any): void {
    const passwordValue = this.generatedPassword;
    formControls['first_name'] = new FormControl('', Validators.required);
    formControls['last_name'] = new FormControl('', Validators.required);
    formControls['nickname'] = new FormControl('', Validators.required);
    formControls['email'] = new FormControl('', [Validators.required, Validators.email]);
    formControls['password'] = new FormControl(passwordValue, [Validators.required, Validators.minLength(8), passwordStrengthValidator()]);
    formControls['password_confirmation'] = new FormControl(passwordValue, [Validators.required]);
    formControls['role_code'] = new FormControl('', Validators.required);

    console.log('Form controls after adding user fields:', formControls);
  }

  fetchRoles(): void {
    // Make a call to fetch roles from the backend
    this.documentService.getRoles().subscribe(
      (roles: any) => {
        this.availableRoles = roles;
      },
      error => {
        console.error('Failed to fetch roles:', error);
      }
    );
  }

  checkIfFieldRequired(config: any, field: string) {
    console.log(config, config['required'], field);
    return config['required'].includes(field);
  }

  generatePassword(): string {
    // Generate a password that meets validation requirements:
    // - Minimum 8 characters
    // - At least one letter and one number
    // - Optional symbols for better security

    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = letters + numbers + symbols;

    let password = '';

    // Ensure at least one letter
    password += letters.charAt(Math.floor(Math.random() * letters.length));

    // Ensure at least one number
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));

    // Ensure at least one symbol for better security
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));

    // Fill the rest with random characters to reach 12 characters total
    for (let i = password.length; i < 12; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  getRoleTranslationKey(roleName: string): string {
    return `ROLE_${roleName.toUpperCase()}`;
  }

  onFileUploaded(controlName: string, filePath: string): void {
    if (this.createDocumentForm && this.createDocumentForm.get(controlName)) {
      this.createDocumentForm.get(controlName)?.setValue(filePath);
      this.createDocumentForm.get(controlName)?.markAsDirty();
      console.log(`File uploaded for ${controlName}: ${filePath}`);

      // Complete the upload tracking
      this.onUploadComplete(controlName);
    } else {
      console.error(`Control ${controlName} not found in form.`);
    }
  }

  onFileDeleted(controlName: string): void {
    if (this.createDocumentForm && this.createDocumentForm.get(controlName)) {
      this.createDocumentForm.get(controlName)?.setValue(null);
      this.createDocumentForm.get(controlName)?.markAsDirty();
      console.log(`File deleted for ${controlName}`);

      // Clear any upload tracking
      this.clearUploadProgress(controlName);
    } else {
      console.error(`Control ${controlName} not found in form.`);
    }
  }

  // Upload progress tracking methods
  onUploadProgress(controlName: string, progress: UploadProgress): void {
    this.uploadProgress[controlName] = progress;
    this.updateGlobalUploadState();
    this.cdr.detectChanges();
  }

  onUploadComplete(controlName: string): void {
    if (this.uploadProgress[controlName]) {
      this.uploadProgress[controlName] = {
        ...this.uploadProgress[controlName],
        status: 'completed',
        percentage: 100
      };
    }
    this.globalUploadState.activeUploads = Math.max(0, this.globalUploadState.activeUploads - 1);
    this.updateGlobalUploadState();
    this.clearUploadProgress(controlName);
    this.cdr.detectChanges();
  }

  clearUploadProgress(controlName: string): void {
    delete this.uploadProgress[controlName];
    this.updateGlobalUploadState();
    this.cdr.detectChanges();
  }

  private updateGlobalUploadState(): void {
    const activeUploads = Object.values(this.uploadProgress);

    this.globalUploadState.activeUploads = activeUploads.length;

    if (activeUploads.length === 0) {
      this.globalUploadState.totalProgress = 0;
      this.globalUploadState.totalSize = 0;
      this.globalUploadState.uploadedSize = 0;
      this.globalUploadState.overallSpeed = 0;
      return;
    }

    // Calculate totals
    this.globalUploadState.totalSize = activeUploads.reduce((sum, progress) =>
      sum + (progress.totalBytes || 0), 0);

    this.globalUploadState.uploadedSize = activeUploads.reduce((sum, progress) =>
      sum + (progress.uploadedBytes || 0), 0);

    this.globalUploadState.overallSpeed = activeUploads.reduce((sum, progress) =>
      sum + (progress.uploadSpeed || 0), 0);

    this.globalUploadState.totalProgress = this.globalUploadState.totalSize > 0 ?
      Math.round((this.globalUploadState.uploadedSize / this.globalUploadState.totalSize) * 100) : 0;
  }

  // Global upload progress display methods
  public hasActiveUploads(): boolean {
    return Object.keys(this.uploadProgress).length > 0;
  }

  public canSubmitForm(): boolean {
    return !this.hasActiveUploads() && !this.hasAnyUploadInProgress();
  }

  public hasAnyUploadInProgress(): boolean {
    // Check if any FileUpload component is currently uploading
    const uploadingControls = Object.values(this.uploadProgress).filter(
      progress => progress.status === 'uploading' || progress.status === 'compressing'
    );
    return uploadingControls.length > 0;
  }

  public getActiveUploadCount(): number {
    return Object.keys(this.uploadProgress).length;
  }

  public getOverallProgress(): number {
    return this.globalUploadState.totalProgress;
  }

  public getUploadStatusText(): string {
    const activeCount = this.getActiveUploadCount();
    if (activeCount === 0) return '';

    const speed = this.globalUploadState.overallSpeed;
    if (speed > 0) {
      return `${this.formatBytes(speed)}/s`;
    }

    return `${activeCount} file${activeCount > 1 ? 's' : ''} uploading`;
  }

  public getUploadedSize(): string {
    return this.formatBytes(this.globalUploadState.uploadedSize);
  }

  public getTotalSize(): string {
    return this.formatBytes(this.globalUploadState.totalSize);
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  public getSubmitButtonTitle(): string {
    if (this.hasActiveUploads()) {
      return this.translate.instant('FILE_UPLOAD.WAIT_FOR_UPLOADS');
    }
    if (this.createDocumentForm?.invalid) {
      return this.translate.instant('FORM_HAS_ERRORS');
    }
    return '';
  }

  parseToJSONArray(json: string) {
    return JSON.parse(json);
  }

  generateThumbnail(videoUrl: string): string | null {
    if (!videoUrl) return null;

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = this.extractYouTubeId(videoUrl);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    // Add logic for other platforms here (e.g., Vimeo)
    return null;
  }

  extractYouTubeId(url: string): string | null {
    // Updated regex to support YouTube Shorts URLs (youtube.com/shorts/VIDEO_ID)
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  onVideoUrlChange(): void {
    const videoUrl = this.createDocumentForm?.get('video_url')?.value;
    const mediaType = this.createDocumentForm?.get('media_type')?.value;
    console.log('=== VIDEO URL CHANGE EVENT ===');
    console.log('Video URL changed:', videoUrl);
    console.log('Current media type:', mediaType);
    console.log('Form exists:', !!this.createDocumentForm);
    console.log('Video URL control exists:', !!this.createDocumentForm?.get('video_url'));

    if (videoUrl) {
      console.log('Sending to videoUrlChangeSubject:', videoUrl);
      this.videoUrlChangeSubject.next(videoUrl);
    } else {
      console.log('Video URL is empty, not processing');
    }
  }

  private setupVideoUrlDebounce(): void {
    console.log('Setting up video URL debounce subscription');
    this.videoUrlSubscription = this.videoUrlChangeSubject.pipe(
      filter(url => {
        console.log('Filter: URL received:', url, 'Valid:', !!url);
        return !!url;
      }),
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(url => {
      console.log('Debounced URL processing triggered for:', url);
      this.processVideoUrl(url);
    });
  }

  private processVideoUrl(videoUrl: string): void {
    console.log('Processing video URL:', videoUrl);
    const mediaType = this.createDocumentForm?.get('media_type')?.value;
    const videoUrlControl = this.createDocumentForm?.get('video_url');
    const imageUrlControl = this.getFileUploadControl('image_url');
    const videoLengthControl = this.createDocumentForm?.get('video_length');

    console.log('Media type:', mediaType);
    console.log('Controls available:', {
      videoUrlControl: !!videoUrlControl,
      imageUrlControl: !!imageUrlControl,
      videoLengthControl: !!videoLengthControl
    });

    if (videoLengthControl) {
      console.log('Video length control current value:', videoLengthControl.value);
      console.log('Video length control valid:', videoLengthControl.valid);
      console.log('Video length control errors:', videoLengthControl.errors);
    } else {
      console.error('Video length control not found!');
    }

    if (mediaType === 'video' && videoUrlControl && imageUrlControl && videoLengthControl) {
      const thumbnailUrl = this.generateThumbnail(videoUrl);
      imageUrlControl.setValue(thumbnailUrl);
      console.log('Set image_url to thumbnail:', thumbnailUrl);

      const videoId = this.extractYouTubeId(videoUrl);
      console.log('Extracted video ID:', videoId);
      if (videoId) {
        console.log('Making API call to get video duration for ID:', videoId);
        this.videoService.getVideoDuration(videoId).subscribe({
          next: (duration: any) => {
            if (duration) {
              // Convert duration object to string format
              const formattedDuration = `${String(duration.hour).padStart(2, '0')}:${String(duration.minute).padStart(2, '0')}:${String(duration.second).padStart(2, '0')}`;
              console.log('About to set video_length to:', formattedDuration);
              console.log('Control before setValue:', {
                value: videoLengthControl.value,
                valid: videoLengthControl.valid,
                errors: videoLengthControl.errors
              });

              videoLengthControl.setValue(formattedDuration);

              // Parse duration to struct for timepicker
              const hour = parseInt(duration.hour);
              const minute = parseInt(duration.minute);
              const second = parseInt(duration.second);
              this.videoLengthParsed = { hour, minute, second };

              // Don't mark as touched during auto-population from YouTube API
              videoLengthControl.markAsDirty();
              videoLengthControl.updateValueAndValidity();
              this.cdr.detectChanges();

              console.log('Control after setValue:', {
                value: videoLengthControl.value,
                valid: videoLengthControl.valid,
                errors: videoLengthControl.errors
              });
              console.log('Set video_length:', formattedDuration);
            } else {
              console.warn('No valid duration returned for video:', videoUrl);
              videoLengthControl.setValue('');
              // Don't mark as touched during auto-population failure
            }
          },
          error: (error) => {
            console.error('Failed to fetch video duration:', error);
            if (error.message && error.message.includes('YouTube API key is not configured')) {
              console.warn('YouTube API key is not configured. Video duration auto-population is disabled.');
            }
            videoLengthControl.setValue('');
            // Don't mark as touched during auto-population error
          }
        });
      } else {
        console.warn('Invalid YouTube URL:', videoUrl);
        videoLengthControl.setValue('');
        // Don't mark as touched during invalid URL processing
      }
    }
  }

  timestampValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const timestampRegex = /^(?:[0-9]+(?::[0-5][0-9]){0,2})$/;
      return timestampRegex.test(control.value) ? null : { 'invalidTimestamp': true };
    };
  }

  goBack() {
    this.location.back();
  }

  copyPasswordToClipboard(): void {
    if (this.generatedPassword) {
      navigator.clipboard.writeText(this.generatedPassword).then(() => {
        this.passwordCopied = true;
        setTimeout(() => {
          this.passwordCopied = false;
        }, 1500);
      });
    }
  }

  /**
   * Show role hierarchy error using confirmation modal
   */
  private showRoleHierarchyError(message: string): void {
    this.confirmationModalService.showConfirmation(
      'تحذير صلاحيات',  // Title
      message,          // Message
      'حسناً',          // OK button
      '',               // Cancel button (empty to show only OK)
      () => { },         // OK callback (empty)
      () => { }          // Cancel callback (empty)
    );
  }

  /**
   * Get validation error message for a specific field
   */
  getFieldErrorMessage(fieldName: string): string {
    const control = this.createDocumentForm?.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return this.translate.instant('COMMON.VALIDATION.REQUIRED');
    }

    if (errors['email']) {
      return this.translate.instant('INVALID_EMAIL');
    }

    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return this.translate.instant('PASSWORD_MIN_LENGTH', { minLength });
    }

    if (errors['passwordStrength']) {
      const strengthErrors = errors['passwordStrength'];
      if (!strengthErrors.hasNumber && !strengthErrors.hasLetter) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_LETTERS_AND_NUMBERS');
      } else if (!strengthErrors.hasNumber) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_NUMBERS');
      } else if (!strengthErrors.hasLetter) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_LETTERS');
      }
    }

    if (errors['invalidYoutube']) {
      return this.translate.instant('INVALID_YOUTUBE_LINK');
    }

    if (errors['invalidUrl']) {
      return this.translate.instant('INVALID_URL_FORMAT');
    }

    if (errors['invalidGeoLocation']) {
      return this.translate.instant('INVALID_COORDINATE_FORMAT');
    }

    if (errors['invalidTimestamp']) {
      return this.translate.instant('INVALID_TIMESTAMP');
    }

    if (errors['invalidUuid']) {
      return this.translate.instant('INVALID_UUID_FORMAT');
    }

    if (errors['invalidDate']) {
      return this.translate.instant('INVALID_DATE_FORMAT');
    }

    return this.translate.instant('COMMON.VALIDATION.INVALID');
  }

  /**
   * Check if field should show validation errors
   */
  shouldShowFieldError(fieldName: string): boolean {
    const control = this.createDocumentForm?.get(fieldName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }


  /**
   * Check if the form has any validation errors
   */
  hasFormErrors(): boolean {
    if (!this.formSubmitAttempted || !this.createDocumentForm) {
      return false;
    }
    return this.createDocumentForm.invalid;
  }

  /**
   * Get a summary of all form validation errors
   */
  getFormErrorSummary(): string[] {
    if (!this.createDocumentForm || this.createDocumentForm.valid) {
      return [];
    }

    const errors: string[] = [];
    const controls = this.createDocumentForm.controls;

    Object.keys(controls).forEach(fieldName => {
      const control = controls[fieldName];
      if (control.invalid && (control.touched || control.dirty)) {
        const errorMessage = this.getFieldErrorMessage(fieldName);
        if (errorMessage) {
          const fieldLabel = this.translate.instant(fieldName.toUpperCase());
          errors.push(`${fieldLabel}: ${errorMessage}`);
        }
      }
    });

    return errors;
  }

  onVideoLengthTextChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const videoLengthControl = this.createDocumentForm?.get('video_length');
    if (videoLengthControl) {
      videoLengthControl.setValue(target.value);
      videoLengthControl.markAsTouched();
      videoLengthControl.markAsDirty();
      videoLengthControl.updateValueAndValidity();
    }
  }

  getVideoLengthDisplayValue(): string {
    const videoLengthControl = this.createDocumentForm?.get('video_length');
    return videoLengthControl?.value || '';
  }
}