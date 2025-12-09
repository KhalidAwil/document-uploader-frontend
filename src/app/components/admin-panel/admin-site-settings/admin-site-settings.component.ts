import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SiteSettingsService, SiteSettings } from '../../../services/site-settings.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
import { FileUploadComponent, PendingFileOperation } from '../../generic/file-upload/file-upload.component'; // Import FileUploadComponent
import { LogoUploadComponent } from '../../generic/logo-upload/logo-upload.component'; // Import LogoUploadComponent
import { firstValueFrom, Subscription } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { map, filter } from 'rxjs/operators';
import { FileUploadService } from '../../../services/fileupload.service';
import { FilePreviewPipe } from '../../../pipes/file-preview.pipe';

// Define interface locally if not imported
interface PendingCarouselOperation {
  type: 'add' | 'delete';
  imageId?: number; // For delete
  fileUploadComponent?: FileUploadComponent; // For add
  optimisticUrl?: string; // For UI update during add
  file?: File; // For direct file upload
}

@Component({
  selector: 'app-admin-site-settings',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule,
      TranslateModule,
      FileUploadComponent, // Add FileUploadComponent
      LogoUploadComponent, // Add LogoUploadComponent
      FilePreviewPipe // Register the file preview pipe for use in the template
    ],
  templateUrl: './admin-site-settings.component.html',
  styleUrls: ['./admin-site-settings.component.scss']
})
export class AdminSiteSettingsComponent implements OnInit, OnDestroy {
  siteSettings: SiteSettings = { logos: { header_size: 'medium', footer_size: 'medium' }, carousel_images: [] };
  originalSiteSettings: SiteSettings = { logos: { header_size: 'medium', footer_size: 'medium' }, carousel_images: [] }; // To enable cancel
  carouselImageForm: FormGroup;
  isLoading: boolean = false;
  hasSiteSettingsChanges: boolean = false;
  saveSuccessMessage: string | null = null;
  saveErrorMessage: string | null = null;
  user: any | null = null; // For role checks

  // References to child components
  @ViewChild(LogoUploadComponent) logoUploadComponent!: LogoUploadComponent;
  @ViewChild('newCarouselImageUpload') newCarouselImageUpload!: FileUploadComponent;

  // Track pending operations
  pendingCarouselOperations: PendingCarouselOperation[] = [];
  private settingsSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private siteSettingsService: SiteSettingsService,
    private confirmationModalService: ConfirmationModalService,
    private authService: AuthService,
    private translate: TranslateService,
    private uploadService: FileUploadService
  ) {
    this.carouselImageForm = this.fb.group({
      // This control is mainly for managing the FileUploadComponent state - no validation needed
      imageUrl: [null]
    });
  }

  ngOnInit(): void {
    this.loadCurrentUserData();
    this.subscribeToSettings(); // Subscribe to live updates
  }

  ngOnDestroy(): void {
     if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
     }
  }

   loadCurrentUserData(): void {
     this.authService.currentUser.subscribe((userObj: any) => {
        this.user = userObj;
    });
  }

  subscribeToSettings(): void {
     this.isLoading = true;
     this.settingsSubscription = this.siteSettingsService.siteSettings$.subscribe(settings => {
         if (settings) {
            this.siteSettings = JSON.parse(JSON.stringify(settings)); // Deep copy for local edits
            this.originalSiteSettings = JSON.parse(JSON.stringify(settings)); // Store original for cancel
            this.pendingCarouselOperations = []; // Reset pending ops on new data load
            this.hasSiteSettingsChanges = false; // Reset changes flag
         } else {
             // Handle case where settings are null initially or after an error
              this.siteSettings = { logos: { header_size: 'medium', footer_size: 'medium' }, carousel_images: [] };
              this.originalSiteSettings = { logos: { header_size: 'medium', footer_size: 'medium' }, carousel_images: [] };
         }
          this.isLoading = false; // Stop loading once settings are processed
     });
     // Initial fetch might still be needed if the BehaviorSubject isn't guaranteed to have a value
     // this.siteSettingsService.getSiteSettings().subscribe(); // Or trigger refresh if needed
  }


  get imageUrlControl(): FormControl {
    return this.carouselImageForm.get('imageUrl') as FormControl;
  }

  // Track pending images for UI feedback
  pendingImages: { id: number; file: File }[] = [];

  addCarouselImage(): void {
    if (!this.newCarouselImageUpload) {
      console.log("Upload component not found.");
      return;
    }
    
    // Check if there's a pending file operation instead of form validity
    if (!this.newCarouselImageUpload.hasPendingOperation() || this.newCarouselImageUpload.pendingOperation?.type !== 'upload') {
      console.log("No file selected or pending upload in the upload component.");
      this.imageUrlControl.markAsTouched();
      return;
    }
    const fileToUpload = this.newCarouselImageUpload.pendingOperation?.file;
    if (!fileToUpload) {
      this.saveErrorMessage = this.translate.instant('NO_FILE_SELECTED');
      console.error("No file found in pending operation");
      return;
    }
    // Generate a temporary negative ID for the pending image
    const tempId = -1 * Date.now();
    this.pendingCarouselOperations.push({
      type: 'add',
      file: fileToUpload
    });
    // Add to pendingImages for UI feedback
    this.pendingImages.push({ id: tempId, file: fileToUpload });
    this.updateSiteSettingsChanges();
    this.carouselImageForm.reset();
    this.newCarouselImageUpload.cancelPendingOperation();
  }

  deleteCarouselImage(id: number): void {
     if (!this.user?.roles?.includes('root_super_admin')) return;

    this.confirmationModalService
      .confirm({
        titleKey: 'MODAL.DELETE_CONFIRMATION',
        messageKey: 'MODAL.CONFIRM_DELETE_CAROUSEL_IMAGE',
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      })
      .then((confirmed) => {
        if (confirmed) {
          // If it's an already saved image (positive ID), add delete operation
          if (id > 0) {
            this.pendingCarouselOperations.push({
              type: 'delete',
              imageId: id
            });
          } else {
            // If it's a pending addition (negative ID), remove it from pending operations
            // and find the corresponding file upload component to potentially reset it
            const pendingIndex = this.pendingCarouselOperations.findIndex(op => op.type === 'add' && op.fileUploadComponent?.previewLink === this.siteSettings.carousel_images.find(img => img.id === id)?.image_url);
             if (pendingIndex > -1) {
                 const removedOp = this.pendingCarouselOperations.splice(pendingIndex, 1)[0];
                  // Optionally reset the specific file upload component if needed
                 // removedOp.fileUploadComponent?.reset();
             }
          }

          // Optimistically update UI by removing the image
          this.siteSettings.carousel_images = this.siteSettings.carousel_images.filter(img => img.id !== id);

          this.updateSiteSettingsChanges();
        }
      })
      .catch(() => console.log('Carousel image deletion cancelled.'));
  }

  // These handlers might not be strictly necessary if FileUploadComponent manages its own state
  // and we rely on the component reference in pending ops, but can be kept for validation linkage.
  onImageUploaded(controlName: string, filePath: string | null): void {
    const control = this.carouselImageForm.get(controlName);
    if (control) {
      control.setValue(filePath); // Update form control value (might be temporary URL)
      // Don't mark pending changes here directly, rely on addCarouselImage or deleteCarouselImage
    }
  }

  onImageDeleted(controlName: string): void {
     const control = this.carouselImageForm.get(controlName);
     if (control) {
         control.setValue(null);
         // Don't mark pending changes here directly
     }
  }


  onLogoPendingChange(): void {
    // This is called when the LogoUploadComponent signals it has pending changes
    this.updateSiteSettingsChanges();
  }

  updateSiteSettingsChanges(): void {
    // Check if there are any pending carousel operations OR if the logo component has changes
    const hasCarouselChanges = this.pendingCarouselOperations.length > 0;
    const hasLogoChanges = this.logoUploadComponent?.hasPendingChanges() ?? false;
    this.hasSiteSettingsChanges = hasCarouselChanges || hasLogoChanges;
     console.log("Update Site Settings Changes:", this.hasSiteSettingsChanges, "Carousel Ops:", this.pendingCarouselOperations.length, "Logo Ops:", hasLogoChanges);
  }

  async saveSiteSettings(): Promise<void> {
    this.saveSuccessMessage = null;
    this.saveErrorMessage = null;
    this.isLoading = true;
    try {
      const settingsUpdatePayload: { logos?: any; carousel_additions?: string[]; carousel_deletions?: number[] } = {};
      let requiresServerUpdate = false;

      // --- 1. Always include logos from siteSettings (even if no pending logo changes) ---
    // Always map to snake_case keys for backend compatibility
    // Instead of defaulting to previous values, always use the values from logoUploadComponent (even if null)
    settingsUpdatePayload.logos = {
      header_url: null,
      footer_url: null,
      pdf_url: null,
      header_size: 'medium',
      footer_size: 'medium',
    };
    // Always get the latest logo and size values from the logoUploadComponent, even if only size changed or logo is deleted
    if (this.logoUploadComponent) {
      const logoValues = await this.logoUploadComponent.executePendingOperations();
      const prev = this.siteSettings.logos || {};
      const sizeChanged = logoValues.headerSize !== (prev.header_size || 'medium') || logoValues.footerSize !== (prev.footer_size || 'medium');
      const logoChanged = logoValues.headerLogo !== prev.header_url || logoValues.footerLogo !== prev.footer_url || logoValues.pdfLogo !== prev.pdf_url;
      if (sizeChanged || logoChanged) {
        requiresServerUpdate = true;
        console.log('Logo or size changed, will trigger API update:', {sizeChanged, logoChanged, logoValues, prev});
      }
      settingsUpdatePayload.logos = {
        header_url: logoValues.headerLogo,
        footer_url: logoValues.footerLogo,
        pdf_url: logoValues.pdfLogo,
        header_size: logoValues.headerSize,
        footer_size: logoValues.footerSize
      };
      console.log('Outgoing logo payload:', settingsUpdatePayload.logos);
    }

    // If only logo size changed, still trigger API request
    if (!requiresServerUpdate) {
      // Check if the logo size in the form is different from the current settings
      const logoForm = this.logoUploadComponent.logoForm;
      if (logoForm) {
        const headerSize = logoForm.get('headerSize')?.value || 'medium';
        const footerSize = logoForm.get('footerSize')?.value || 'medium';
        if (headerSize !== (this.siteSettings.logos.header_size || 'medium') || footerSize !== (this.siteSettings.logos.footer_size || 'medium')) {
          requiresServerUpdate = true;
          settingsUpdatePayload.logos.header_size = headerSize;
          settingsUpdatePayload.logos.footer_size = footerSize;
          console.log('Logo size changed (fallback check), will trigger API update:', {headerSize, footerSize});
        }
      }
    }

      // --- 2. Process Carousel Additions ---
      const imagesToAdd: string[] = [];
      for (const operation of this.pendingCarouselOperations.filter(op => op.type === 'add')) {
        try {
          let uploadedUrl: string | null = null;
          if (operation.fileUploadComponent) {
            uploadedUrl = await operation.fileUploadComponent.executePendingOperation();
          } else if (operation.file) {
            uploadedUrl = await this.uploadFile(operation.file);
          }
          if (uploadedUrl) {
            imagesToAdd.push(uploadedUrl);
          }
        } catch (error) {
          console.error('Error during carousel image upload:', error);
          // Remove all pending images from UI
          this.pendingImages = [];
          throw new Error(this.translate.instant('CAROUSEL_IMAGE_UPLOAD_FAILED'));
        }
      }
      if (imagesToAdd.length > 0) {
        settingsUpdatePayload.carousel_additions = imagesToAdd;
        requiresServerUpdate = true;
      }

      // --- 3. Process Carousel Deletions ---
      const imagesToDelete = this.pendingCarouselOperations
        .filter(op => op.type === 'delete' && op.imageId && op.imageId > 0)
        .map(op => op.imageId as number);
      if (imagesToDelete.length > 0) {
        settingsUpdatePayload.carousel_deletions = imagesToDelete;
        requiresServerUpdate = true;
        console.log('Carousel image deletions detected, will trigger API update:', imagesToDelete);
        this.pendingImages = [];
      }

      // --- API CALL: Actually update settings if needed ---
      if (requiresServerUpdate) {
        try {
          await firstValueFrom(
        this.siteSettingsService.updateSiteSettings(settingsUpdatePayload)
      );
      // Force a settings refresh after saving to guarantee all subscribers get the new sizes
      this.siteSettingsService.refreshSettings();
      this.saveSuccessMessage = this.translate.instant('SITE_SETTINGS_SAVED');
        } catch (err) {
          this.saveErrorMessage = this.translate.instant('SITE_SETTINGS_SAVE_FAILED');
          console.error('Error during site settings save:', err);
        }
        this.pendingImages = [];
        this.pendingCarouselOperations = [];
        this.hasSiteSettingsChanges = false;
      } else {
        this.saveErrorMessage = this.translate.instant('NO_SITE_SETTINGS_CHANGE_DETECTED');
        console.log("No changes detected requiring server update.", {requiresServerUpdate, settingsUpdatePayload});
        this.pendingImages = [];
        this.pendingCarouselOperations = [];
        this.hasSiteSettingsChanges = false;
      }
    } finally {
      this.isLoading = false;
    }
  }

  // Helper method to upload a file directly
  private async uploadFile(file: File): Promise<string | null> {
    try {
      return await firstValueFrom(
        this.uploadService.uploadFile(file, 'carousel').pipe(
          map(event => {
            if (event.type === HttpEventType.Response) {
              const response = event.body as { filePath: string; fileUrl: string };
              return response.fileUrl;
            }
            return null;
          }),
          filter((url): url is string => url !== null)
        )
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  cancelPendingOperations(): void {
    // Reset carousel operations
    this.pendingCarouselOperations = [];

    // Reset logo operations via child component
    if (this.logoUploadComponent) {
      this.logoUploadComponent.cancelPendingOperations();
    }

    // Reset the add image form
    if (this.carouselImageForm) {
       this.carouselImageForm.reset();
    }
     // Explicitly reset the file input component state if needed
     if (this.newCarouselImageUpload) { 
        this.newCarouselImageUpload.cancelPendingOperation();
    }

    // Revert settings to the original state fetched
    this.siteSettings = JSON.parse(JSON.stringify(this.originalSiteSettings));

    // Reset UI state
    this.hasSiteSettingsChanges = false;
    this.saveSuccessMessage = null;
    this.saveErrorMessage = null;
    console.log("Pending operations cancelled.");
  }

   // Helper to check user role for template *ngIf
   canManageSettings(): boolean {
       return this.user?.roles?.includes('root_super_admin') ?? false;
   }

  // --- Image Error Handling ---
  failedCarouselImageIds: number[] = [];
  handleImageError(event: Event, imageId: number): void {
    if (!this.failedCarouselImageIds.includes(imageId)) {
      this.failedCarouselImageIds.push(imageId);
    }
  }
}