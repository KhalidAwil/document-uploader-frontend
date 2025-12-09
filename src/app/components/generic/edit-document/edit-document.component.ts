import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChildren, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { DocumentService } from '../../../services/document.service';
import { DocumentConfigurations } from '../../../config/document.config';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FileUploadComponent, PendingFileOperation } from '../file-upload/file-upload.component';
import { DropdownService } from '../../../services/dropdown.service';
import { NgbTimepickerModule, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { DropdownSelectComponent } from '../dropdown-select/dropdown-select.component';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { VideoService } from '../../../services/video.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ArabicNumeralsDirective } from '../../../directives/arabic-numerals.directive';
import { MapLocationPickerComponent } from '../map-location-picker/map-location-picker.component';
import {
  passwordStrengthValidator,
  youtubeUrlValidator,
  urlValidator,
  geoLocationValidator,
  timeValidator as objectTimeValidator,
  dateOrUnknownValidator,
  uuidValidator
} from '../../../validators/custom-validators';

interface MediaControls {
  image: FormControl;
  video: FormControl | null;
  videoLength: FormControl | null;
}

interface TimePickerValue {
  hour: number;
  minute: number;
  second: number;
}

function timeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    // For string values (form control), validate HH:MM:SS format
    if (typeof control.value === 'string') {
      const timeString = control.value.trim();

      // More flexible regex that accepts both single and double digits
      const timeRegex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
      const match = timeString.match(timeRegex);

      if (!match) {
        return { invalidTime: true };
      }

      const hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const second = parseInt(match[3]);

      // Validate ranges
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        return { invalidTime: true };
      }

      return null;
    }

    return { invalidTime: true };
  };
}

function formatTime(time: TimePickerValue | null): string {
  if (!time) return '';

  const hour = String(time.hour).padStart(2, '0');
  const minute = String(time.minute).padStart(2, '0');
  const second = String(time.second).padStart(2, '0');

  return `${hour}:${minute}:${second}`;
}

function parseTimeToStruct(time: string): NgbTimeStruct | null {
  if (!time) return null;

  // Handle different time formats: HH:MM:SS, HH:MM, or raw seconds
  let timeString = time.toString().trim();

  // If it's just numbers (seconds), convert to HH:MM:SS
  if (/^\d+$/.test(timeString)) {
    const totalSeconds = parseInt(timeString);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Handle HH:MM format (add :00 for seconds)
  if (/^(\d{1,2}):([0-5]?\d)$/.test(timeString)) {
    timeString = timeString + ':00';
  }

  // Validate final HH:MM:SS format
  const timeRegex = /^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/;
  const match = timeString.match(timeRegex);

  if (!match) return null;

  const hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  const second = parseInt(match[3]);

  // Validate ranges
  if (hour > 23 || minute > 59 || second > 59) return null;

  return { hour, minute, second };
}

@Component({
  selector: 'app-edit-document',
  templateUrl: './edit-document.component.html',
  styleUrls: ['./edit-document.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    TranslatePipe,
    FileUploadComponent,
    NgbTimepickerModule,
    DropdownSelectComponent,
    BsDatepickerModule,
    ArabicNumeralsDirective,
    MapLocationPickerComponent
  ]
})
export class EditDocumentComponent implements OnInit, AfterViewInit, OnDestroy {
  getImageLabelKey(field: string): string {
    const parts = field.split('_');
    return 'IMAGE_URL_' + parts.slice(2).join('_').toUpperCase();
  }

  @ViewChildren(FileUploadComponent) fileUploadComponents!: QueryList<FileUploadComponent>;
  pendingFileOperations: Map<string, PendingFileOperation> = new Map();
  editDocumentForm: FormGroup | null = null;
  documentId: string = '';
  documentType: string = '';
  editableFields: string[] = [];
  imageFields: string[] = [];
  archiveCDropdown: any | undefined | null = null;
  releaseTypeDropdown: any | undefined | null = null;
  archiveCDropdownOptions: any[] = [];
  releaseTypeDropdownOptions: any[] = [];
  public videoLengthParsed: NgbTimeStruct | null = null;
  availableRoles: { name: string; role_code: string }[] = [];
  private videoUrlChangeSubject = new Subject<string>();
  private videoUrlSubscription: Subscription | null = null;
  formSubmitAttempted: boolean = false;
  isLoadingDocument: boolean = true;

  private fileUploadControls: Map<string, FormControl> = new Map();

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private router: Router,
    private dropdownService: DropdownService,
    private translate: TranslateService,
    private location: Location,
    private el: ElementRef,
    private confirmationModalService: ConfirmationModalService,
    private authService: AuthService,
    private toastService: ToastService,
    private videoService: VideoService,
    private cdr: ChangeDetectorRef
  ) { }

  getFileUploadControl(fieldName: string): FormControl {
    if (!this.fileUploadControls.has(fieldName)) {
      const config = DocumentConfigurations[this.documentType as keyof typeof DocumentConfigurations];
      const isRequired = config?.required.includes(fieldName) || false;
      this.fileUploadControls.set(fieldName, new FormControl(null, isRequired ? Validators.required : null));
    }
    return this.fileUploadControls.get(fieldName)!;
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

  ngOnInit(): void {
    this.initializeRouteParams();
    this.initializeForm();
    this.loadDocumentData();
    this.fetchRoles();
    this.setupVideoUrlDebounce();
  }

  private initializeRouteParams(): void {
    this.documentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.documentType = this.route.snapshot.data['modelType'] ?? '';
  }

  ngAfterViewInit(): void {
    if (this.documentType === 'media') {
      this.setupMediaTypeValidation();
      const invalid = [];
      const controls = this.editDocumentForm?.controls;
      if (controls) {
        for (const name in controls) {
          if (controls[name].invalid) {
            invalid.push(name);
          }
        }
      }
    }
  }

  ngOnDestroy(): void {
    if (this.videoUrlSubscription) {
      this.videoUrlSubscription.unsubscribe();
    }
  }

  private disableAllMediaControls(controls: MediaControls): void {
    controls.image.disable();
    controls.video?.disable();
    controls.videoLength?.disable();
  }

  getRoleTranslationKey(roleName: string): string {
    return `ROLE_${roleName.toUpperCase()}`;
  }

  // Method to handle map location updates
  onLocationChanged(fieldName: string, location: string): void {
    if (this.editDocumentForm) {
      this.editDocumentForm.get(fieldName)?.setValue(location);
    }
  }

  private initializeForm(): void {
    const config = DocumentConfigurations[this.documentType as keyof typeof DocumentConfigurations];
    if (config) {
      this.editableFields = config.editableFields;
      this.imageFields = this.editableFields.filter(field => /^image_url_\d$|^image_url_(en|ar|fr|de|ru|zh_cn|msd)$/.test(field));

      const eventLocationIndex = this.editableFields.indexOf('event_location');
      if (eventLocationIndex > -1) {
        const eventLocationField = this.editableFields.splice(eventLocationIndex, 1)[0];
        const firstImageIndex = this.editableFields.findIndex(field => field.startsWith('image_url'));
        if (firstImageIndex > -1) {
          this.editableFields.splice(firstImageIndex, 0, eventLocationField);
        } else {
          this.editableFields.push(eventLocationField);
        }
      }
    }

    const formControls: { [key: string]: any } = {};

    this.editableFields.forEach(field => {
      const isRequired = config.required.includes(field);
      if (this.isFileUploadField(field)) {
        this.fileUploadControls.set(field, new FormControl(null, isRequired ? Validators.required : null));
        formControls[field] = this.fileUploadControls.get(field);
      } else if (field === 'video_length') {
        formControls[field] = ['', isRequired ? [Validators.required, timeValidator()] : [timeValidator()]];
      } else if (field === 'video_url') {
        formControls[field] = ['', [
          ...(isRequired ? [Validators.required] : []),
          youtubeUrlValidator()
        ]];
      } else if (field === 'password' || field === 'password_confirmation') {
        const validators = field === 'password'
          ? [Validators.minLength(8), passwordStrengthValidator()]
          : [Validators.minLength(8)];
        formControls[field] = ['', validators];
      } else if (field === 'athar_id') {
        // athar_id should allow letters, numbers, and dashes
        const validators = isRequired ? [Validators.required, Validators.pattern(/^[a-zA-Z0-9\-]+$/)] : [Validators.pattern(/^[a-zA-Z0-9\-]+$/)];
        formControls[field] = ['', validators];
      } else if (field === 'athar_page_link') {
        // URL validation for athar_page_link
        const validators = isRequired ? [Validators.required, urlValidator()] : [urlValidator()];
        formControls[field] = ['', validators];
      } else if (field === 'athar_geo_location') {
        // Special handling for geo-location (will be latitude,longitude format)
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
      if (formControls['password']) {
        formControls['password'] = ['', [Validators.minLength(8), passwordStrengthValidator()]];
      }
      this.editDocumentForm = this.fb.group(formControls, { validators: this.createPasswordMatchValidator() });
    } else {
      this.editDocumentForm = this.fb.group(formControls);
    }

    if (this.documentType === 'media') {
      this.setupMediaTypeValidation();
    }
  }

  loadDocumentData(): void {
    if (!this.editDocumentForm) return;

    this.isLoadingDocument = true;

    this.documentService.getDocument(this.documentType, this.documentId).subscribe({
      next: (document) => {
        const patchData: { [key: string]: any } = {};
        this.editableFields.forEach(field => {
          if (!this.isFileUploadField(field) && document.hasOwnProperty(field)) {
            if (field === 'video_length' && document[field]) {
              const parsedTime = parseTimeToStruct(document[field]);
              if (parsedTime) {
                this.videoLengthParsed = parsedTime;
                const formattedTime = formatTime(parsedTime);
                patchData[field] = formattedTime; // Store formatted string for validation
              } else {
                console.warn('Invalid video length format from backend:', document[field]);
                this.videoLengthParsed = null;
                patchData[field] = '';
              }
            } else if (field === 'role_code') {
              patchData['role_code'] = String(document['role_code']);
            } else if (field !== 'password' && field !== 'password_confirmation') {
              patchData[field] = document[field];
            }
          }
        });
        patchData['password'] = '';
        patchData['password_confirmation'] = '';

        this.editDocumentForm?.patchValue(patchData);

        // Ensure video length sync after patching
        if (this.documentType === 'media' && this.videoLengthParsed) {
          const videoLengthControl = this.editDocumentForm?.get('video_length');
          if (videoLengthControl) {
            const formattedTime = formatTime(this.videoLengthParsed);
            videoLengthControl.setValue(formattedTime);
            videoLengthControl.updateValueAndValidity();
          }
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

        if (this.documentType === 'media') {
          this.setupMediaTypeValidation();
          const mediaTypeValue = this.editDocumentForm?.get('media_type')?.value;
          if (mediaTypeValue) {
            const controls: MediaControls = {
              image: this.getFileUploadControl('image_url'),
              video: this.editDocumentForm?.get('video_url') as FormControl,
              videoLength: this.editDocumentForm?.get('video_length') as FormControl
            };
            this.updateMediaValidators(controls, mediaTypeValue === 'image');
          }
        }
        this.isLoadingDocument = false;
        this.cdr.detectChanges(); // Ensure UI updates after loading
      },
      error: (error) => {
        console.error('Error loading document:', error);
        this.isLoadingDocument = false;
        this.cdr.detectChanges();
      }
    });
  }

  fetchRoles(): void {
    this.documentService.getRoles().subscribe(
      (roles: any) => {
        this.availableRoles = roles;
      },
      error => {
        console.error('Failed to fetch roles:', error);
      }
    );
  }

  private setupMediaTypeValidation(): void {
    this.editDocumentForm?.get('media_type')?.valueChanges.subscribe(value => {
      if (!this.editDocumentForm) return;

      const controls: MediaControls = {
        image: this.getFileUploadControl('image_url'),
        video: this.editDocumentForm?.get('video_url') as FormControl,
        videoLength: this.editDocumentForm?.get('video_length') as FormControl
      };

      if (value === 'image') {
        this.updateMediaValidators(controls, true);
      } else if (value === 'video') {
        this.updateMediaValidators(controls, false);
      } else {
        this.disableAllMediaControls(controls);
      }
      this.cdr.detectChanges(); // Ensure UI updates after media type change
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
          youtubeUrlValidator()
        ]);
        controls.videoLength.setValidators([
          Validators.required,
          timeValidator()
        ]);
        controls.image.enable(); // Enable for thumbnail
        controls.video.enable();
        controls.videoLength.enable();
      }
    }

    controls.image.updateValueAndValidity();
    controls.video?.updateValueAndValidity();
    controls.videoLength?.updateValueAndValidity();
  }

  hasPendingFileOperation(fieldName: string): boolean {
    const pendingOp = this.pendingFileOperations.get(fieldName);
    return !!pendingOp && pendingOp.type === 'upload';
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
    const mediaType = this.editDocumentForm?.get('media_type')?.value;
    const videoUrlControl = this.editDocumentForm?.get('video_url');
    const imageUrlControl = this.getFileUploadControl('image_url');
    const videoLengthControl = this.editDocumentForm?.get('video_length');

    console.log('Media type:', mediaType);
    console.log('Controls available:', {
      videoUrlControl: !!videoUrlControl,
      imageUrlControl: !!imageUrlControl,
      videoLengthControl: !!videoLengthControl
    });

    if (mediaType === 'video' && videoUrlControl && imageUrlControl && videoLengthControl) {
      const thumbnailUrl = this.generateThumbnail(videoUrl);
      imageUrlControl.setValue(thumbnailUrl);
      console.log('Set image_url to thumbnail:', thumbnailUrl);

      const videoId = this.extractYouTubeId(videoUrl);
      console.log('Extracted video ID:', videoId);
      if (videoId) {
        console.log('Making API call to get video duration for ID:', videoId);
        this.videoService.getVideoDuration(videoId).subscribe({
          next: (duration: NgbTimeStruct | null) => {
            if (duration) {
              const formattedDuration = formatTime(duration);
              videoLengthControl.setValue(formattedDuration);
              this.videoLengthParsed = duration;
              videoLengthControl.markAsDirty();
              videoLengthControl.updateValueAndValidity();
              console.log('Set video_length:', formattedDuration, 'Parsed:', this.videoLengthParsed);
            } else {
              console.warn('No valid duration returned for video:', videoUrl);
              videoLengthControl.setValue('');
              this.videoLengthParsed = null;
              videoLengthControl.markAsTouched();
            }
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Failed to fetch video duration:', error);
            if (error.message && error.message.includes('YouTube API key is not configured')) {
              console.warn('YouTube API key is not configured. Video duration auto-population is disabled.');
              // You can add a toast notification here if desired
              // this.toastService.warning('YouTube API key not configured', 'Video duration auto-population disabled');
            }
            videoLengthControl.setValue('');
            this.videoLengthParsed = null;
            videoLengthControl.markAsTouched();
            this.cdr.detectChanges();
          }
        });
      } else {
        console.warn('Invalid YouTube URL:', videoUrl);
        videoLengthControl.setValue('');
        this.videoLengthParsed = null;
        videoLengthControl.markAsTouched();
        this.cdr.detectChanges();
      }
    }
  }

  onVideoLengthChange(time: NgbTimeStruct | null): void {
    const videoLengthControl = this.editDocumentForm?.get('video_length');
    if (videoLengthControl) {
      if (time) {
        const formattedTime = formatTime(time);
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

  async onSubmit(): Promise<void> {
    // Mark that user has attempted to submit
    this.formSubmitAttempted = true;

    const invalidControls = Object.keys(this.editDocumentForm?.controls || {})
      .filter(key => this.editDocumentForm?.controls[key].invalid)
      .map(key => ({ key, errors: this.editDocumentForm?.controls[key].errors }));

    if (this.documentType === 'user') {
      const password = this.editDocumentForm?.get('password')?.value;
      const confirmationControl = this.editDocumentForm?.get('password_confirmation');
      if (password) {
        confirmationControl?.setValidators([Validators.required]);
        confirmationControl?.updateValueAndValidity();
        confirmationControl?.setValue(this.editDocumentForm?.get('password')?.value);
      } else {
        confirmationControl?.clearValidators();
        confirmationControl?.setValue('');
        confirmationControl?.updateValueAndValidity();
      }
    }

    console.log('Form validation state:', {
      isValid: this.editDocumentForm?.valid,
      invalidControls
    });

    const hasPendingFileOperations = this.pendingFileOperations.size > 0;
    const allControlsValid = this.areAllFileControlsValid();

    console.log('File upload state:', {
      hasPendingOperations: hasPendingFileOperations,
      allControlsValid
    });

    if (hasPendingFileOperations && allControlsValid) {
      console.log('Form has pending operations but all controls are valid, proceeding with direct submission');
      await this.directSubmit();
      return;
    }

    if (this.editDocumentForm && this.editDocumentForm.valid) {
      try {
        console.log('Form is valid, proceeding with normal submission');
        const payload = { ...this.editDocumentForm.getRawValue() };

        // Handle athar-specific processing with new boolean flag structure
        if (this.documentType === 'athar') {
          // Handle unknown date flags for athar_date_of_loss
          if (payload.athar_date_of_loss === '' || payload.athar_date_of_loss === null) {
            payload.athar_date_of_loss = null;
            payload.athar_date_of_loss_unknown = true;
          } else {
            payload.athar_date_of_loss_unknown = false;
          }

          // Handle unknown date flags for athar_date_of_presentation
          if (payload.athar_date_of_presentation === '' || payload.athar_date_of_presentation === null) {
            payload.athar_date_of_presentation = null;
            payload.athar_date_of_presentation_unknown = true;
          } else {
            payload.athar_date_of_presentation_unknown = false;
          }

          // Handle unknown date flags for date_of_publication
          if (payload.date_of_publication === '' || payload.date_of_publication === null) {
            payload.date_of_publication = null;
            payload.date_of_publication_unknown = true;
          } else {
            payload.date_of_publication_unknown = false;
          }

          // Handle country unknown values (still using 'unknown' string for these)
          if (payload.athar_origin_country === '' || payload.athar_origin_country === null) {
            payload.athar_origin_country = 'unknown';
          }
          if (payload.athar_present_location_country === '' || payload.athar_present_location_country === null) {
            payload.athar_present_location_country = 'unknown';
          }
        }

        if (payload.date_of_publication instanceof Date) {
          payload.date_of_publication = payload.date_of_publication.toISOString().slice(0, 10);
        }
        if (payload.date_of_event instanceof Date) {
          payload.date_of_event = payload.date_of_event.toISOString().slice(0, 10);
        }
        // Format athar date fields - only format actual dates, not when unknown flags are set
        if (payload.athar_date_of_loss && !payload.athar_date_of_loss_unknown) {
          const date = new Date(payload.athar_date_of_loss);
          if (!isNaN(date.getTime())) {
            payload.athar_date_of_loss = date.toISOString().slice(0, 10);
          }
        }
        if (payload.athar_date_of_presentation && !payload.athar_date_of_presentation_unknown) {
          const date = new Date(payload.athar_date_of_presentation);
          if (!isNaN(date.getTime())) {
            payload.athar_date_of_presentation = date.toISOString().slice(0, 10);
          }
        }

        if (this.documentType === 'media') {
          if (payload.media_type === 'video') {
            if (payload.video_length && typeof payload.video_length === 'string') {
              payload.video_length = payload.video_length;
            } else {
              delete payload.video_length;
            }
            const thumbnailUrl = this.generateThumbnail(payload.video_url);
            if (thumbnailUrl) {
              payload.image_url = thumbnailUrl;
            }
          } else if (payload.media_type === 'image') {
            delete payload.video_url;
            delete payload.video_length;
          }
        }

        if (this.documentType === 'user') {
          if (payload.password) {
            payload.password_confirmation = payload.password;
          } else {
            delete payload.password;
            delete payload.password_confirmation;
          }
          if (payload.role_code !== undefined && payload.role_code !== null) {
            payload.role_code = String(payload.role_code);
          }
        }

        console.log('Submitting payload:', payload);

        this.documentService.updateDocument(this.documentType, this.documentId, payload).subscribe({
          next: () => {
            const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
            this.toastService.documentUpdated(documentTypeLabel);
            if (this.documentType === 'user') {
              this.router.navigate(['/admin']);
            } else {
              this.router.navigate(['/documents/' + this.documentType]);
            }
          },
          error: (error) => {
            console.error('Error updating document:', error);
            const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
            this.toastService.documentError('update', documentTypeLabel);
          }
        });
      } catch (error) {
        console.error('Error updating document:', error);
      }
    } else {
      if (this.editDocumentForm) {
        this.markFormGroupTouched(this.editDocumentForm);
      }
    }
  }

  private areAllFileControlsValid(): boolean {
    if (!this.editDocumentForm) return false;

    const config = DocumentConfigurations[this.documentType as keyof typeof DocumentConfigurations];
    if (!config) return false;

    const requiredFields = config.required.filter(field => this.isFileUploadField(field));

    for (const fieldName of requiredFields) {
      const control = this.editDocumentForm.get(fieldName) || this.getFileUploadControl(fieldName);
      const component = this.findFileUploadComponent(fieldName);

      if (!control) continue;

      const hasPendingOp = this.pendingFileOperations.has(fieldName);
      const pendingOpType = this.pendingFileOperations.get(fieldName)?.type;

      const isValidValue = !!control.value;

      if (hasPendingOp && pendingOpType === 'delete') {
        console.log(`Field ${fieldName} is invalid: has pending deletion`);
        return false;
      }

      if (!isValidValue && !(hasPendingOp && pendingOpType === 'upload')) {
        console.log(`Field ${fieldName} is invalid: value=${control.value}, pendingOp=${pendingOpType}`);
        return false;
      }
    }

    return true;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private async executeAllPendingFileOperations(): Promise<void> {
    const fileUploadComponents = this.fileUploadComponents.toArray();
    const results = [];

    console.log(`Executing ${fileUploadComponents.length} file upload components with ${this.pendingFileOperations.size} pending operations`);

    for (const component of fileUploadComponents) {
      if (component.pendingOperation) {
        console.log(`Executing pending operation for ${component.controlName}: ${component.pendingOperation.type}`);

        try {
          const result = await component.executePendingOperation();
          results.push({ controlName: component.controlName, result, success: true });
          console.log(`Successfully executed operation for ${component.controlName}, result:`, result);
        } catch (error) {
          console.error(`Error executing operation for ${component.controlName}:`, error);
          results.push({ controlName: component.controlName, result: null, success: false, error });
        }
      }
    }

    console.log('File operation results:', results);

    results.forEach(({ controlName, result, success }) => {
      if (success && controlName) {
        const control = this.getFileUploadControl(controlName);
        control.setValue(result);
        console.log(`Updated control ${controlName} with value:`, result);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private restoreValidators(tempValidators: { control: AbstractControl, validator: ValidatorFn | null }[]): void {
    tempValidators.forEach(({ control, validator }) => {
      if (validator) {
        control.setValidators(validator);
        control.updateValueAndValidity();
      }
    });
  }

  private getInvalidRequiredFields(): string[] {
    if (!this.editDocumentForm) return [];

    const config = DocumentConfigurations[this.documentType as keyof typeof DocumentConfigurations];
    if (!config) return [];

    return config.required.filter(fieldName => {
      const control = this.editDocumentForm?.get(fieldName) || this.getFileUploadControl(fieldName);
      return control && control.invalid;
    });
  }

  private isRequiredField(fieldName: string): boolean {
    const config = DocumentConfigurations[this.documentType as keyof typeof DocumentConfigurations];
    return config?.required.includes(fieldName) || false;
  }

  onPendingOperationChange(controlName: string, operation: PendingFileOperation | null): void {
    console.log('Pending Operation Change:', controlName, operation);

    if (operation) {
      const updatedOperation: PendingFileOperation = {
        ...operation,
        controlName
      };
      this.pendingFileOperations.set(controlName, updatedOperation);
    } else {
      this.pendingFileOperations.delete(controlName);
    }
  }

  private createPasswordMatchValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const password = formGroup.get('password');
      const confirmPassword = formGroup.get('password_confirmation');
      if (!password || !confirmPassword) return null;
      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    };
  }

  onDelete(): void {
    const documentTypeTranslation = this.translate.instant('ADMIN_PANEL_CREATE_' + this.documentType.toUpperCase());

    this.confirmationModalService.confirm({
      titleKey: 'MODAL.DELETE_CONFIRMATION',
      messageKey: 'MODAL.CONFIRM_DELETE_DOCUMENT',
      messageParams: { documentType: documentTypeTranslation },
      confirmBtnKey: 'MODAL.DELETE',
      confirmBtnClass: 'btn-danger'
    }).then(confirmed => {
      if (confirmed) {
        this.performDelete();
      }
    });
  }

  private performDelete(): void {
    this.documentService.deleteDocument(this.documentType, this.documentId).subscribe({
      next: () => {
        const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
        this.toastService.documentDeleted(documentTypeLabel);
        setTimeout(() => {
          this.router.navigate(['/documents/' + this.documentType]);
        }, 300);
      },
      error: (error) => {
        console.error('Error deleting document:', error);
        const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
        this.toastService.documentError('delete', documentTypeLabel);
      }
    });
  }

  onFileUploaded(controlName: string, filePath: string): void {
    const fileControl = this.getFileUploadControl(controlName);
    console.log(`File uploaded for ${controlName}:`, filePath);
    fileControl.setValue(filePath);
  }

  onFileDeleted(controlName: string): void {
    const fileControl = this.getFileUploadControl(controlName);
    console.log(`File deleted for ${controlName}`);
    fileControl.setValue(null);
  }

  private findFileUploadComponent(controlName: string): FileUploadComponent | undefined {
    if (!this.fileUploadComponents) return undefined;
    return this.fileUploadComponents.find(comp => comp.controlName === controlName);
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
    return null;
  }

  extractYouTubeId(url: string): string | null {
    // Updated regex to support YouTube Shorts URLs (youtube.com/shorts/VIDEO_ID)
    const regExp = /(?:youtube\.com\/(?:shorts\/|[^\/]+\/.*\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regExp);
    if (!match || match[1].length !== 11) {
      console.log('Failed to extract YouTube ID from URL:', url, 'Match:', match);
      return null;
    }
    console.log('Extracted YouTube ID:', match[1], 'from URL:', url);
    return match[1];
  }

  onVideoUrlChange(): void {
    const videoUrl = this.editDocumentForm?.get('video_url')?.value;
    const mediaType = this.editDocumentForm?.get('media_type')?.value;
    console.log('=== VIDEO URL CHANGE EVENT ===');
    console.log('Video URL changed:', videoUrl);
    console.log('Current media type:', mediaType);
    console.log('Form exists:', !!this.editDocumentForm);
    console.log('Video URL control exists:', !!this.editDocumentForm?.get('video_url'));

    if (videoUrl) {
      console.log('Sending to videoUrlChangeSubject:', videoUrl);
      this.videoUrlChangeSubject.next(videoUrl);
    } else {
      console.log('Video URL is empty, not processing');
    }
  }

  timestampValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const timestampRegex = /^(?:[0-9]+(?::[0-5][0-9]){0,2})$/;
      return timestampRegex.test(control.value) ? null : { 'invalidTimestamp': true };
    };
  }

  goBack(): void {
    if (this.pendingFileOperations.size > 0) {
      this.confirmationModalService.confirm({
        titleKey: 'MODAL.UNSAVED_CHANGES_CONFIRMATION',
        messageKey: 'FILE_UPLOAD.PENDING_OPERATIONS',
        confirmBtnKey: 'MODAL.DISCARD_CHANGES_CONFIRMATION',
        confirmBtnClass: 'btn-warning'
      }).then(confirmed => {
        if (confirmed) {
          this.cancelAllPendingOperations();
          this.location.back();
        }
      });
    } else {
      this.location.back();
    }
  }

  private cancelAllPendingOperations(): void {
    const fileUploadComponents = this.fileUploadComponents.toArray();
    fileUploadComponents.forEach(component => {
      if (component.pendingOperation) {
        component.cancelPendingOperation();
      }
    });
    this.pendingFileOperations.clear();
  }

  get videoLengthJson(): NgbTimeStruct | null {
    return this.videoLengthParsed;
  }

  private parseVideoLength(videoLength: string | undefined): NgbTimeStruct | null {
    return parseTimeToStruct(videoLength || '');
  }

  async directSubmit(): Promise<void> {
    try {
      await this.executeAllPendingFileOperations();
      await new Promise(resolve => setTimeout(resolve, 500));

      const formData: any = {};

      if (this.editDocumentForm) {
        Object.keys(this.editDocumentForm.controls).forEach(key => {
          if (!this.isFileUploadField(key)) {
            const control = this.editDocumentForm?.get(key);
            if (control) {
              formData[key] = control.value;
            }
          }
        });

        if (formData.date_of_publication) {
          const date = new Date(formData.date_of_publication);
          formData.date_of_publication = date.toISOString().slice(0, 10);
        }
        if (formData.date_of_event) {
          const date = new Date(formData.date_of_event);
          formData.date_of_event = date.toISOString().slice(0, 10);
        }
        // Handle athar-specific processing with new boolean flag structure in directSubmit
        if (this.documentType === 'athar') {
          // Handle unknown date flags for athar_date_of_loss
          if (formData.athar_date_of_loss === '' || formData.athar_date_of_loss === null) {
            formData.athar_date_of_loss = null;
            formData.athar_date_of_loss_unknown = true;
          } else {
            formData.athar_date_of_loss_unknown = false;
            // Format valid date
            const date = new Date(formData.athar_date_of_loss);
            if (!isNaN(date.getTime())) {
              formData.athar_date_of_loss = date.toISOString().slice(0, 10);
            }
          }

          // Handle unknown date flags for athar_date_of_presentation
          if (formData.athar_date_of_presentation === '' || formData.athar_date_of_presentation === null) {
            formData.athar_date_of_presentation = null;
            formData.athar_date_of_presentation_unknown = true;
          } else {
            formData.athar_date_of_presentation_unknown = false;
            // Format valid date
            const date = new Date(formData.athar_date_of_presentation);
            if (!isNaN(date.getTime())) {
              formData.athar_date_of_presentation = date.toISOString().slice(0, 10);
            }
          }

          // Handle unknown date flags for date_of_publication
          if (formData.date_of_publication === '' || formData.date_of_publication === null) {
            formData.date_of_publication = null;
            formData.date_of_publication_unknown = true;
          } else {
            formData.date_of_publication_unknown = false;
            // Format valid date
            const date = new Date(formData.date_of_publication);
            if (!isNaN(date.getTime())) {
              formData.date_of_publication = date.toISOString().slice(0, 10);
            }
          }

          // Handle country unknown values (still using 'unknown' string for these)
          if (formData.athar_origin_country === '' || formData.athar_origin_country === null) {
            formData.athar_origin_country = 'unknown';
          }
          if (formData.athar_present_location_country === '' || formData.athar_present_location_country === null) {
            formData.athar_present_location_country = 'unknown';
          }
        }

        if (this.documentType === 'media') {
          if (formData.media_type === 'video') {
            if (formData.video_length && typeof formData.video_length === 'string') {
              formData.video_length = formData.video_length;
            } else {
              delete formData.video_length;
            }
            const thumbnailUrl = this.generateThumbnail(formData.video_url);
            if (thumbnailUrl) {
              formData.image_url = thumbnailUrl;
            }
          } else if (formData.media_type === 'image') {
            delete formData.video_url;
            delete formData.video_length;
          }
        }
      }

      this.fileUploadComponents.forEach(component => {
        const { name, value } = component.getValue();
        if (name === 'image_url' && formData.media_type === 'video') {
          const thumbnailUrl = this.generateThumbnail(formData.video_url);
          formData[name] = thumbnailUrl || value;
        } else {
          formData[name] = value;
        }
      });

      console.log('Submitting data directly:', formData);

      this.documentService.updateDocument(this.documentType, this.documentId, formData)
        .subscribe({
          next: () => {
            console.log('Document updated successfully via direct submission');
            const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
            this.toastService.documentUpdated(documentTypeLabel);
            this.router.navigate(['/documents/' + this.documentType]);
          },
          error: (err) => {
            console.error('Error in direct submission:', err);
            const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
            this.toastService.documentError('update', documentTypeLabel);
          }
        });
    } catch (error) {
      console.error('Error during direct submission:', error);
      const documentTypeLabel = this.translate.instant(`ADMIN_PANEL_CREATE_${this.documentType.toUpperCase()}`);
      this.toastService.documentError('update', documentTypeLabel);
    }
  }

  isRootSuperAdmin(): boolean {
    return this.authService.isRootSuperAdmin();
  }

  // Validation helper methods
  getFieldErrorMessage(fieldName: string): string {
    const control = this.editDocumentForm?.get(fieldName) || this.getFileUploadControl(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;

    if (errors['required']) {
      return this.translate.instant('COMMON.VALIDATION.REQUIRED');
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

    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      if (fieldName === 'password') {
        return this.translate.instant('PASSWORD_MIN_LENGTH');
      }
      return this.translate.instant('VALIDATION.TOO_SHORT');
    }

    if (errors['email']) {
      return this.translate.instant('INVALID_EMAIL_FORMAT');
    }

    if (errors['invalidUrl']) {
      return this.translate.instant('INVALID_URL');
    }

    if (errors['invalidYoutube']) {
      return this.translate.instant('INVALID_YOUTUBE_LINK');
    }

    if (errors['invalidTime']) {
      return this.translate.instant('INVALID_TIME_FORMAT');
    }

    if (errors['invalidGeoLocation']) {
      return this.translate.instant('INVALID_COORDINATE_FORMAT');
    }

    if (errors['invalidUuid']) {
      return this.translate.instant('INVALID_UUID_FORMAT');
    }

    if (errors['invalidDate']) {
      return this.translate.instant('INVALID_DATE_FORMAT');
    }

    if (errors['pattern']) {
      if (fieldName === 'athar_page_link') {
        return this.translate.instant('INVALID_URL_FORMAT');
      }
      if (fieldName === 'athar_geo_location') {
        return this.translate.instant('INVALID_COORDINATE_FORMAT');
      }
      return this.translate.instant('COMMON.VALIDATION.INVALID');
    }

    return this.translate.instant('COMMON.VALIDATION.INVALID');
  }

  shouldShowFieldError(fieldName: string): boolean {
    const control = this.editDocumentForm?.get(fieldName) || this.getFileUploadControl(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  hasFormErrors(): boolean {
    if (!this.formSubmitAttempted || !this.editDocumentForm) {
      return false;
    }
    return this.editDocumentForm.invalid;
  }

  getFormErrorSummary(): string[] {
    const errors: string[] = [];

    if (!this.editDocumentForm) return errors;

    // Check form controls
    Object.keys(this.editDocumentForm.controls).forEach(fieldName => {
      const control = this.editDocumentForm?.get(fieldName);
      if (control && control.invalid && control.touched) {
        const fieldLabel = this.getFieldLabel(fieldName);
        const errorMessage = this.getFieldErrorMessage(fieldName);
        errors.push(`${fieldLabel}: ${errorMessage}`);
      }
    });



    // Check form-level errors (like password mismatch)
    if (this.editDocumentForm.errors) {
      if (this.editDocumentForm.errors['passwordMismatch']) {
        errors.push(this.translate.instant('PASSWORD_CONFIRMATION_REQUIRED'));
      }
    }

    return errors;
  }

  private getFieldLabel(fieldName: string): string {
    // Map field names to their translation keys
    const fieldLabelMap: { [key: string]: string } = {
      'first_name': 'FIRST_NAME',
      'last_name': 'LAST_NAME',
      'nickname': 'NICKNAME',
      'email': 'EMAIL',
      'password': 'PASSWORD',
      'password_confirmation': 'PASSWORD_CONFIRMATION',
      'role_code': 'ROLE_CODE',
      'title': 'TITLE',
      'description': 'DESCRIPTION',
      'date_of_publication': 'DATE_OF_PUBLICATION',
      'date_of_event': 'DATE_OF_EVENT',
      'event_location': 'EVENT_LOCATION',
      'author': 'AUTHOR',
      'image_url': 'IMAGE_URL',
      'pdf_url': 'PDF_URL',
      'video_url': 'VIDEO_URL',
      'video_length': 'VIDEO_LENGTH',
      'media_type': 'MEDIA_TYPE',
      'release_type': 'RELEASE_TYPE',
      'type_c': 'TYPE_C',
      'athar_id': 'ATHAR_ID',
      'athar_name': 'ATHAR_NAME',
      'athar_legal_status': 'ATHAR_LEGAL_STATUS',
      'athar_date_of_loss': 'ATHAR_DATE_OF_LOSS',
      'athar_present_location': 'ATHAR_PRESENT_LOCATION',
      'athar_present_location_name': 'ATHAR_PRESENT_LOCATION_NAME',
      'athar_present_location_country': 'ATHAR_PRESENT_LOCATION_COUNTRY',
      'athar_date_of_presentation': 'ATHAR_DATE_OF_PRESENTATION',
      'athar_type': 'ATHAR_TYPE',
      'athar_material': 'ATHAR_MATERIAL',
      'athar_period': 'ATHAR_PERIOD',
      'athar_geo_location': 'ATHAR_GEO_LOCATION',
      'athar_original_area': 'ATHAR_ORIGINAL_AREA',
      'athar_origin_country': 'ATHAR_ORIGIN_COUNTRY',
      'athar_preservation_status': 'ATHAR_PRESERVATION_STATUS',
      'athar_arch_original_area': 'ATHAR_ARCH_ORIGINAL_AREA',
      'athar_case_number': 'ATHAR_CASE_NUMBER',
      'athar_required_procedure': 'ATHAR_REQUIRED_PROCEDURE',
      'athar_page_link': 'ATHAR_PAGE_LINK'
    };

    // Handle numbered image fields
    if (/^image_url_\d+$/.test(fieldName)) {
      const number = fieldName.split('_')[2];
      return this.translate.instant(`IMAGE_URL_${number.toUpperCase()}`);
    }

    // Handle language-specific image fields
    if (/^image_url_(en|ar|fr|de|ru|zh_cn|msd)$/.test(fieldName)) {
      const lang = fieldName.split('_')[2];
      return this.translate.instant(`IMAGE_URL_${lang.toUpperCase()}`);
    }

    const translationKey = fieldLabelMap[fieldName] || fieldName.toUpperCase();
    return this.translate.instant(translationKey);
  }
}