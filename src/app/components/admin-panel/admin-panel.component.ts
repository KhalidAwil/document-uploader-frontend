import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ArabicDatePipe } from '../../pipes/arabic-date.pipe';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';
import { DocumentService } from '../../services/document.service';
import { StatisticsComponent } from '../statistics/statistics.component';
import { ContactMessagesService } from '../../services/contact-messages.service';
import { FileUploadComponent } from '../generic/file-upload/file-upload.component';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { LogoUploadComponent } from '../generic/logo-upload/logo-upload.component';
import { ReportsComponent } from '../reports/reports.component';
import { ConfirmationModalService } from '../../services/confirmation-modal.service';
import { SiteSettingsService, SiteSettings } from '../../services/site-settings.service';
import { PendingFileOperation } from '../generic/file-upload/file-upload.component';
import { firstValueFrom } from 'rxjs';
import { RouterModule } from '@angular/router';

interface PendingCarouselOperation {
  type: 'add' | 'delete';
  imageId?: number;
  imageUrl?: string;
  fileUploadComponent?: FileUploadComponent;
}

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    StatisticsComponent,
    FileUploadComponent,
    TruncatePipe,
    ArabicDatePipe,
    LogoUploadComponent,
    ReportsComponent,
    RouterModule
  ],
  standalone: true
})
export class AdminPanelComponent implements OnInit {
  selectedLanguage: string;
  creatableTypes: { label: string; type: string; icon: string }[] = [];
  userForm: FormGroup;
  user: any | null = null;
  users: any[] | null = null;
  editMode = {
    first_name: false,
    last_name: false,
    nickname: false,
    email: false,
    password: false
  };
  siteSettings: SiteSettings = { logos: { header_size: 'medium', footer_size: 'medium' }, carousel_images: [] };
  originalSiteSettings: SiteSettings = { logos: { header_size: 'medium', footer_size: 'medium' }, carousel_images: [] };
  carouselImageForm: FormGroup;
  isLoading: boolean = false;
  hasSiteSettingsChanges: boolean = false;
  saveSuccessMessage: string | null = null;
  saveErrorMessage: string | null = null;

  contactMessages: any[] = [];
  selectedMessage: any | null = null;

  @ViewChild(LogoUploadComponent) logoUploadComponent!: LogoUploadComponent;
  @ViewChild('newCarouselImageUpload') newCarouselImageUpload?: FileUploadComponent;
  
  pendingCarouselOperations: PendingCarouselOperation[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private langService: LanguageService,
    private translate: TranslateService,
    private docsService: DocumentService,
    private contactMessagesService: ContactMessagesService,
    private confirmationModalService: ConfirmationModalService,
    private siteSettingsService: SiteSettingsService
  ) {
    this.userForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      nickname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.selectedLanguage = this.langService.getCurrentLanguage();

    this.carouselImageForm = this.fb.group({
      imageUrl: [null, [Validators.required]]
    });
  }

  get imageUrlControl(): FormControl {
    return this.carouselImageForm?.get('imageUrl') as FormControl;
  }

  ngOnInit(): void {
    this.setCreatableTypes();
    this.loadUserData();
    this.loadUsers();
    this.loadSiteSettings();
    this.fetchContactMessages();

    this.translate.get(['CONTACT_PHONE', 'CONTACT_RESIDENCE']).subscribe();
  }

  loadUserData(): void {
    this.authService.currentUser.subscribe((user: any) => {
      this.user = user;
      this.userForm.patchValue({
        first_name: user.user.first_name,
        last_name: user.user.last_name,
        nickname: user.user.nickname,
        email: user.user.email,
        password: ''
      });
    });
  }

  toggleEditMode(field: keyof typeof this.editMode): void {
    if (field !== 'password' && !this.user?.roles?.includes('root_super_admin')) {
      return;
    }

    this.editMode[field] = !this.editMode[field];
    if (this.editMode[field]) {
      this.userForm.get(field)?.enable();
    } else {
      this.userForm.get(field)?.disable();
      this.userForm.get(field)?.setValue(this.user.user[field] || '');
    }
  }

  isAnyFieldInEditMode(): boolean {
    return Object.values(this.editMode).some((mode) => mode);
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const updatedData = this.userForm.getRawValue();
      if (updatedData.password) {
        updatedData.password_confirmation = updatedData.password;
      } else {
        delete updatedData.password;
        delete updatedData.password_confirmation;
      }
      this.authService.updateUserDetails(updatedData).subscribe(() => {
        Object.keys(this.editMode).forEach(
          (key) => (this.editMode[key as keyof typeof this.editMode] = false)
        );
        this.userForm.disable();
      });
    }
  }

  setCreatableTypes(): void {
    this.translate
      .get([
        'ADMIN_PANEL_CREATE_USER',
        'ADMIN_PANEL_CREATE_NEWS',
        'ADMIN_PANEL_CREATE_GUIDE',
        'ADMIN_PANEL_CREATE_ARCHIVE_C',
        'ADMIN_PANEL_CREATE_RELEASE',
        'ADMIN_PANEL_CREATE_MEDIA',
        'ADMIN_PANEL_CREATE_BIAN'
      ])
      .subscribe((translations) => {
        this.creatableTypes = [
          { label: translations['ADMIN_PANEL_CREATE_USER'], type: 'user', icon: 'bi bi-person-fill' },
          { label: translations['ADMIN_PANEL_CREATE_NEWS'], type: 'news', icon: 'bi bi-newspaper' },
          { label: translations['ADMIN_PANEL_CREATE_GUIDE'], type: 'guide', icon: 'bi bi-book' },
          {
            label: translations['ADMIN_PANEL_CREATE_ARCHIVE_C'],
            type: 'archive_c',
            icon: 'bi bi-archive'
          },
          { label: translations['ADMIN_PANEL_CREATE_RELEASE'], type: 'release', icon: 'bi bi-megaphone' },
          { label: translations['ADMIN_PANEL_CREATE_MEDIA'], type: 'media', icon: 'bi bi-collection-play-fill' },
          { label: translations['ADMIN_PANEL_CREATE_BIAN'], type: 'bian', icon: 'bi bi-body-text' }
        ].filter((docType) => this.authService.hasPermission(`create ${docType.type || 'user'}`));
      });
  }

  createDocument(type: string): void {
    this.router.navigate(['/documents', `${type}`, 'create']);
  }

  updateLanguage(): void {
    this.langService.switchLanguage(this.selectedLanguage);
  }

  loadUsers(): void {
    this.docsService.getUsers().subscribe((data: any) => {
      const currentUserId = this.authService.currentUserValue?.user?.id;
      this.users = data.filter((user: any) => user.id !== currentUserId);
    });
  }

  editUser(userId: string): void {
    this.router.navigate(['/documents', 'user', 'edit', userId]);
  }

  canEditUser(user: any): boolean {
    if (this.user?.roles?.includes('root_super_admin')) {
      return true;
    }
    if (this.user?.roles?.includes('super_admin')) {
      return !user?.roles?.some((role: any) => role.name === 'root_super_admin');
    }
    return false;
  }

  canDeleteUser(user: any): boolean {
    if (this.user?.roles?.includes('root_super_admin')) {
      return true;
    }
    return false;
  }

  createDropdown(): void {
    this.router.navigate(['/admin/dropdown_management']);
  }

  deleteUser(userId: string): void {
    this.confirmationModalService
      .confirm({
        titleKey: 'MODAL.DELETE_CONFIRMATION',
        messageKey: 'CONFIRM_DELETE_USER',
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      })
      .then((confirmed) => {
        if (confirmed) {
          this.docsService.deleteUser(userId).subscribe(() => {
            this.loadUsers();
          });
        }
      });
  }

  printUserRoles(roles?: any[]) {
    return roles?.map((role) => this.translate.instant(`ROLE_${role.name.toUpperCase()}`)).join(', ');
  }

  loadSiteSettings(): void {
    this.isLoading = true;
    this.siteSettingsService.getSiteSettings().subscribe({
      next: (settings) => {
        this.siteSettings = settings;
        // Deep clone the settings to keep a clean original copy
        this.originalSiteSettings = JSON.parse(JSON.stringify(settings));
        this.isLoading = false;
        this.hasSiteSettingsChanges = false;
        this.pendingCarouselOperations = [];
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  addCarouselImage(): void {
    if (this.carouselImageForm.valid && this.newCarouselImageUpload) {
      // Store the reference to the component for later execution
      this.pendingCarouselOperations.push({
        type: 'add',
        fileUploadComponent: this.newCarouselImageUpload
      });
      
      // Show optimistic UI update
      const tempId = -1 * this.pendingCarouselOperations.length; // Negative ID for new items
      const tempUrl = this.carouselImageForm.value.imageUrl;
      
      if (tempUrl && tempUrl.startsWith('valid-temp-')) {
        // For temporary URLs, show a placeholder or the preview from the FileUploadComponent
        this.siteSettings.carousel_images.push({
          id: tempId,
          image_url: this.newCarouselImageUpload.previewLink || tempUrl
        });
      }
      
      this.updateSiteSettingsChanges();
      this.carouselImageForm.reset();
    }
  }

  deleteCarouselImage(id: number): void {
    this.confirmationModalService
      .confirm({
        titleKey: 'MODAL.DELETE_CONFIRMATION',
        messageKey: 'MODAL.CONFIRM_DELETE_CAROUSEL_IMAGE',
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      })
      .then((confirmed) => {
        if (confirmed) {
          // Add to pending operations
          this.pendingCarouselOperations.push({
            type: 'delete',
            imageId: id
          });
          
          // Optimistically update UI
          this.siteSettings.carousel_images = this.siteSettings.carousel_images.filter(img => img.id !== id);
          
          this.updateSiteSettingsChanges();
        }
      });
  }

  onImageUploaded(controlName: string, filePath: string): void {
    const fileControl = this.carouselImageForm?.get(controlName);
    if (fileControl instanceof FormControl) {
      fileControl.setValue(filePath);
      this.updateSiteSettingsChanges();
    }
  }

  onImageDeleted(controlName: string): void {
    const fileControl = this.carouselImageForm?.get(controlName);
    if (fileControl instanceof FormControl) {
      fileControl.setValue(null);
      this.updateSiteSettingsChanges();
    }
  }

  onLogoPendingChange(): void {
    this.updateSiteSettingsChanges();
  }

  updateSiteSettingsChanges(): void {
    const hasCarouselChanges = this.pendingCarouselOperations.length > 0;
    const hasLogoChanges = this.logoUploadComponent?.hasPendingChanges() || false;
    this.hasSiteSettingsChanges = hasCarouselChanges || hasLogoChanges;
  }

  async saveSiteSettings(): Promise<void> {
    this.saveSuccessMessage = null;
    this.saveErrorMessage = null;
    this.isLoading = true;
  
    try {
      const settingsUpdate: Partial<SiteSettings> = {};
      
      // 1. Process carousel additions - execute pending uploads first
      for (const operation of this.pendingCarouselOperations) {
        if (operation.type === 'add' && operation.fileUploadComponent) {
          try {
            // Execute the file upload operation
            const uploadedUrl = await operation.fileUploadComponent.executePendingOperation();
            if (uploadedUrl) {
              // Add the new image with the real URL to the carousel_images array
              if (!settingsUpdate.carousel_images) {
                settingsUpdate.carousel_images = [];
              }
              settingsUpdate.carousel_images.push({ id: 0, image_url: uploadedUrl });
            }
          } catch (error) {
            console.error('Error uploading carousel image:', error);
          }
        }
      }
  
      // 2. Process carousel deletions
      for (const operation of this.pendingCarouselOperations) {
        if (operation.type === 'delete' && operation.imageId && operation.imageId > 0) {
          try {
            // Execute the delete operation on the server
            await firstValueFrom(this.siteSettingsService.deleteCarouselImage(operation.imageId));
          } catch (error) {
            console.error('Error deleting carousel image:', error);
            this.saveErrorMessage = this.translate.instant('CAROUSEL_IMAGE_DELETE_FAILED');
          }
        }
      }
  
      // 3. Process logo operations
      if (this.logoUploadComponent && this.logoUploadComponent.hasPendingChanges()) {
        console.log('Logo component has pending changes, executing operations...');
        const logoValues = await this.logoUploadComponent.executePendingOperations();
        console.log('Logo operations executed with values:', logoValues);
        
        // Map camelCase keys to backend-expected snake_case keys
        settingsUpdate.logos = {
          header_url: logoValues.headerLogo,
          footer_url: logoValues.footerLogo,
          pdf_url: logoValues.pdfLogo,
          header_size: logoValues.headerSize,
          footer_size: logoValues.footerSize
        };
      }
  
      // 4. Send the update to the server if there are changes
      if (Object.keys(settingsUpdate).length > 0 || (settingsUpdate.carousel_images && settingsUpdate.carousel_images.length > 0)) {
        console.log('Sending settings update to server:', settingsUpdate);
        await firstValueFrom(this.siteSettingsService.updateSiteSettings(settingsUpdate));
        
        // The SiteSettingsService will now internally refresh the settings and update the BehaviorSubject
        // No need to manually reload settings here
      }
  
      // 5. Clear all pending operations
      this.pendingCarouselOperations = [];
      this.hasSiteSettingsChanges = false;
      this.saveSuccessMessage = this.translate.instant('SITE_SETTINGS_SAVED');
      setTimeout(() => { this.saveSuccessMessage = null; }, 3000);
      
    } catch (error) {
      console.error('Error saving site settings:', error);
      this.saveErrorMessage = this.translate.instant('SITE_SETTINGS_SAVE_FAILED');
    } finally {
      this.isLoading = false;
    }
  }


  cancelPendingOperations(): void {
    // Reset carousel operations and UI
    this.pendingCarouselOperations = [];
    
    // Reset logo operations
    if (this.logoUploadComponent) {
      this.logoUploadComponent.cancelPendingOperations();
    }
    
    // Reset form
    if (this.carouselImageForm) {
      this.carouselImageForm.reset();
    }
    
    // Reset carousel images to original state
    this.siteSettings.carousel_images = JSON.parse(JSON.stringify(this.originalSiteSettings.carousel_images));
    
    // Reset UI state
    this.hasSiteSettingsChanges = false;
    this.saveSuccessMessage = null;
    this.saveErrorMessage = null;
  }

  fetchContactMessages(): void {
    this.isLoading = true;
    this.contactMessagesService.getMessages().subscribe({
      next: (data: any) => {
        this.contactMessages = data.messages || [];
        this.contactMessages = this.contactMessages.map((message) => ({
          ...message,
          phone: message.phone || '',
          current_residence: message.current_residence || ''
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching messages:', error);
        this.isLoading = false;
      }
    });
  }

  deleteMessage(id: number): void {
    this.confirmationModalService
      .confirm({
        titleKey: 'MODAL.DELETE_CONFIRMATION',
        messageKey: 'MODAL.CONFIRM_DELETE_CONTACT_MESSAGE',
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      })
      .then((confirmed) => {
        if (confirmed) {
          this.contactMessagesService.deleteMessage(id).subscribe({
            next: () => {
              this.contactMessages = this.contactMessages.filter((message) => message.id !== id);
              if (this.selectedMessage && this.selectedMessage.id === id) {
                this.selectedMessage = null;
              }
            },
            error: (error) => {
              console.error('Error deleting message:', error);
            }
          });
        }
      });
  }

  openMessage(message: any): void {
    this.selectedMessage = message;
  }

  clearSelectedMessage(): void {
    this.selectedMessage = null;
  }
}