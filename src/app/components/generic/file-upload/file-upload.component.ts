import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Subscription, lastValueFrom } from 'rxjs';
import { FileUploadService, UploadResponse } from '../../../services/fileupload.service';
import { CommonModule } from '@angular/common';
import { environment } from '../environments/environment';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

export interface UploadProgress {
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'compressing';
  uploadSpeed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  uploadedBytes?: number;
  totalBytes?: number;
}

export interface PendingFileOperation {
  controlName?: string;
  type: 'upload' | 'delete';
  file?: File;
  filePath?: string;
  tempUrl?: string;
}

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  imports: [CommonModule, TranslatePipe],
  standalone: true
})
export class FileUploadComponent implements OnInit, OnDestroy, OnChanges {
  @Input() label: string = '';
  @Input() placeholder: string = 'FILE_UPLOAD.CHOOSE_FILE';
  @Input() acceptedFileTypes: string = '';
  @Input() existingFileUrl: string | null = null;
  @Input() maxFileSize: number = 500 * 1024 * 1024; // 500 MB
  @Input() control!: FormControl;
  @Input() controlName: string = '';
  @Input() context: string = 'default';
  @Input() deferOperations: boolean = false;
  @Input() disabled: boolean = false;

  @Output() fileDeleted = new EventEmitter<string>();
  @Output() fileUploaded = new EventEmitter<string>();
  @Output() uploadCancelled = new EventEmitter<void>();
  @Output() uploadProgress = new EventEmitter<UploadProgress>();
  @Output() pendingOperationChange = new EventEmitter<PendingFileOperation | null>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  uploadedFileName: string | null = null;
  isUploading: boolean = false;
  errorMessage: string | null = null;
  currentUploadSub?: Subscription;
  pendingOperation: PendingFileOperation | null = null;
  tempFileUrl: string | null = null;
  private originalUrl: string | null = null;
  private uploadStartTime: number = 0;

  currentProgress: UploadProgress = {
    percentage: 0,
    status: 'pending',
    uploadSpeed: 0,
    estimatedTimeRemaining: 0,
    uploadedBytes: 0,
    totalBytes: 0
  };

  constructor(
    private translate: TranslateService,
    private uploadService: FileUploadService,
    private confirmationModalService: ConfirmationModalService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['existingFileUrl'] && !changes['existingFileUrl'].firstChange) {
      const currentExistingFileUrl = changes['existingFileUrl'].currentValue;
      if (currentExistingFileUrl) {
        this.uploadedFileName = this.extractFileName(currentExistingFileUrl);
        this.control.setValue(currentExistingFileUrl);
        this.originalUrl = currentExistingFileUrl;
        this.log(`FileUpload (${this.controlName}): Updated from changes to ${currentExistingFileUrl}`);
      } else if (currentExistingFileUrl === null) {
        this.uploadedFileName = null;
        this.control.setValue(null);
        this.originalUrl = null;
        this.log(`FileUpload (${this.controlName}): Cleared from changes`);
      }
    }
  }

  ngOnInit(): void {
    if (this.existingFileUrl) {
      this.uploadedFileName = this.extractFileName(this.existingFileUrl);
      this.control.setValue(this.existingFileUrl);
      this.originalUrl = this.existingFileUrl;
      this.log(`FileUpload (${this.controlName}): Initialized with ${this.existingFileUrl}`);
    } else {
      this.log(`FileUpload (${this.controlName}): Initialized with no existing file`);
      this.originalUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelUpload();
    if (this.tempFileUrl) {
      URL.revokeObjectURL(this.tempFileUrl);
      this.tempFileUrl = null;
    }
  }

  onFileSelected(event: Event): void {
    if (this.disabled) {
      this.log(`FileUpload (${this.controlName}): Disabled, ignoring file selection`);
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.log(`FileUpload (${this.controlName}): No file selected`);
      return;
    }

    if (file.size > this.maxFileSize) {
      this.errorMessage = this.translate.instant('FILE_UPLOAD.ERROR.FILE_TOO_LARGE', {
        maxSize: this.formatBytes(this.maxFileSize)
      });
      this.resetFileInput();
      this.log(`FileUpload (${this.controlName}): File too large: ${file.size} > ${this.maxFileSize}`);
      return;
    }

    if (this.acceptedFileTypes && !this.isFileTypeAccepted(file)) {
      this.errorMessage = this.translate.instant('FILE_UPLOAD.ERROR.INVALID_FILE_TYPE', {
        fileName: file.name
      });
      this.resetFileInput();
      this.log(`FileUpload (${this.controlName}): Invalid file type: ${file.name}`);
      return;
    }

    this.errorMessage = null;

    if (this.deferOperations) {
      if (this.tempFileUrl) {
        URL.revokeObjectURL(this.tempFileUrl);
      }
      this.tempFileUrl = URL.createObjectURL(file);
      this.pendingOperation = {
        type: 'upload',
        file,
        controlName: this.controlName,
        tempUrl: this.tempFileUrl
      };
      this.uploadedFileName = file.name;
      // Set control to a temp valid value to satisfy required validators and prevent UI reset
      this.control.setValue('valid-temp-' + file.name);
      this.control.markAsDirty();
      this.log(`FileUpload (${this.controlName}): Deferring upload of ${file.name}`);
      this.pendingOperationChange.emit(this.pendingOperation);
    } else {
      this.uploadFile(file);
    }
  }

  uploadFile(file: File): void {
    if (this.disabled) {
      this.log(`FileUpload (${this.controlName}): Disabled, ignoring upload`);
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;
    this.uploadStartTime = Date.now();

    // Check if image compression will happen
    const willCompress = file.type.startsWith('image/') && file.size > 5 * 1024 * 1024;

    this.currentProgress = {
      percentage: 0,
      status: willCompress ? 'compressing' : 'uploading',
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
      uploadedBytes: 0,
      totalBytes: file.size
    };

    this.uploadProgress.emit(this.currentProgress);
    this.log(`FileUpload (${this.controlName}): Starting upload of ${file.name} (${this.formatBytes(file.size)})`);

    this.currentUploadSub = this.uploadService.uploadFile(file, this.context).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const elapsedTime = (Date.now() - this.uploadStartTime) / 1000; // seconds
          const uploadSpeed = elapsedTime > 0 ? event.loaded / elapsedTime : 0;
          const remainingBytes = event.total - event.loaded;
          const estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

          this.currentProgress = {
            percentage: Math.round((100 * event.loaded) / event.total),
            status: 'uploading',
            uploadSpeed,
            estimatedTimeRemaining,
            uploadedBytes: event.loaded,
            totalBytes: event.total
          };
          this.uploadProgress.emit(this.currentProgress);
          this.log(`FileUpload (${this.controlName}): Upload progress: ${this.currentProgress.percentage}% (${this.formatBytes(uploadSpeed)}/s)`);
        }

        if (event.type === HttpEventType.Response) {
          const response = event.body as UploadResponse;
          this.uploadSuccess(response.filePath, response.fileUrl);
        }
      },
      error: (error) => {
        this.handleUploadError(error, file);
      }
    });
  }

  private handleUploadError(error: any, file: File): void {
    this.currentProgress = {
      percentage: 0,
      status: 'error',
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
      uploadedBytes: 0,
      totalBytes: file.size
    };

    // Provide specific error messages based on error type
    let errorKey = 'FILE_UPLOAD.ERROR.UPLOAD_FAILED';

    if (error.status === 413) {
      errorKey = 'FILE_UPLOAD.ERROR.FILE_TOO_LARGE_SERVER';
    } else if (error.status === 415) {
      errorKey = 'FILE_UPLOAD.ERROR.UNSUPPORTED_FILE_TYPE';
    } else if (error.status === 0) {
      errorKey = 'FILE_UPLOAD.ERROR.NETWORK_ERROR';
    } else if (error.status >= 500) {
      errorKey = 'FILE_UPLOAD.ERROR.SERVER_ERROR';
    }

    this.errorMessage = this.translate.instant(errorKey, {
      fileName: file.name,
      fileSize: this.formatBytes(file.size),
      maxSize: this.formatBytes(this.maxFileSize)
    });

    this.isUploading = false;
    this.resetFileInput();
    this.uploadProgress.emit(this.currentProgress);
    this.logError(`FileUpload (${this.controlName}): Upload failed:`, error);
  }

  cancelUpload(): void {
    if (this.disabled) {
      this.log(`FileUpload (${this.controlName}): Disabled, ignoring cancel`);
      return;
    }

    if (this.currentUploadSub) {
      this.currentUploadSub.unsubscribe();
      this.currentUploadSub = undefined;
    }

    this.isUploading = false;
    this.currentProgress = { percentage: 0, status: 'pending' };

    if (this.pendingOperation?.type === 'upload') {
      this.cancelPendingOperation();
      return;
    }

    this.resetFileInput();

    if (this.existingFileUrl) {
      this.uploadedFileName = this.extractFileName(this.existingFileUrl);
      this.control.setValue(this.existingFileUrl);
    } else {
      this.control.setValue(null);
    }

    this.uploadCancelled.emit();
  }

  deleteFile(): void {
    if (this.disabled) {
      this.log(`FileUpload (${this.controlName}): Disabled, ignoring delete`);
      return;
    }

    let filePath: string | null;
    let fileName: string;

    if (this.pendingOperation?.type === 'upload') {
      fileName = this.uploadedFileName || 'Selected file';
      this.confirmationModalService
        .confirm({
          titleKey: 'MODAL.DELETE_CONFIRMATION',
          messageKey: 'FILE_UPLOAD.CONFIRM_DELETE_FILE',
          messageParams: { fileName },
          confirmBtnKey: 'MODAL.DELETE',
          confirmBtnClass: 'btn-danger'
        })
        .then((confirmed) => {
          if (confirmed) {
            this.cancelPendingOperation();
          }
        });
      return;
    }

    filePath = this.control.value;
    if (!filePath) {
      this.log(`FileUpload (${this.controlName}): No file to delete`);
      return;
    }

    fileName = this.extractFileName(filePath) || 'File';
    this.confirmationModalService
      .confirm({
        titleKey: 'MODAL.DELETE_CONFIRMATION',
        messageKey: 'FILE_UPLOAD.CONFIRM_DELETE_FILE',
        messageParams: { fileName },
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      })
      .then((confirmed) => {
        if (confirmed) {
          this.performDeleteFile(filePath!);
        }
      });
  }

  private performDeleteFile(filePath: string): void {
    if (this.deferOperations) {
      if (this.tempFileUrl) {
        URL.revokeObjectURL(this.tempFileUrl);
        this.tempFileUrl = null;
      }
      this.pendingOperation = {
        type: 'delete',
        filePath: filePath.replace(environment.fileUploadUrl + '/', ''),
        controlName: this.controlName
      };
      this.resetFileInput();
      this.control.setValue(null);
      this.log(`FileUpload (${this.controlName}): Deferring deletion of ${filePath}`);
      this.fileDeleted.emit(this.controlName);
      this.pendingOperationChange.emit(this.pendingOperation);
    } else {
      this.uploadService
        .deleteFile(filePath.replace(environment.fileUploadUrl + '/', ''))
        .subscribe({
          next: () => {
            this.log(`FileUpload (${this.controlName}): File deleted: ${filePath}`);
            this.resetFileInput();
            this.control.setValue(null);
            this.fileDeleted.emit(this.controlName);
            this.originalUrl = null;
          },
          error: (error) => {
            this.logError(`FileUpload (${this.controlName}): Delete failed:`, error);
            this.errorMessage = this.translate.instant('FILE_UPLOAD.ERROR.DELETE_FAILED');
          }
        });
    }
  }

  uploadSuccess(filePath: string, fileUrl: string): void {
    this.currentProgress = { percentage: 100, status: 'completed' };
    this.uploadProgress.emit(this.currentProgress);
    this.isUploading = false;

    if (this.tempFileUrl) {
      URL.revokeObjectURL(this.tempFileUrl);
      this.tempFileUrl = null;
    }

    this.control.setValue(fileUrl);
    this.uploadedFileName = this.extractFileName(fileUrl);
    this.originalUrl = fileUrl;
    this.log(`FileUpload (${this.controlName}): Upload successful, path: ${fileUrl}`);
    this.fileUploaded.emit(fileUrl);

    if (this.pendingOperation?.type === 'upload') {
      this.pendingOperation = null;
      this.pendingOperationChange.emit(null);
    }
  }

  async executePendingOperation(): Promise<string | null> {
    if (this.disabled) {
      this.log(`FileUpload (${this.controlName}): Disabled, returning final value`);
      return this.getFinalValue();
    }

    this.log(`FileUpload (${this.controlName}): Executing pending operation`, this.pendingOperation);

    if (!this.pendingOperation) {
      this.log(`FileUpload (${this.controlName}): No pending operation`);
      return this.getFinalValue();
    }

    try {
      if (this.pendingOperation.type === 'upload' && this.pendingOperation.file) {
        this.log(`FileUpload (${this.controlName}): Uploading ${this.pendingOperation.file.name}`);
        this.isUploading = true;
        this.uploadStartTime = Date.now();

        const willCompress = this.pendingOperation.file.type.startsWith('image/') && this.pendingOperation.file.size > 5 * 1024 * 1024;

        this.currentProgress = {
          percentage: 0,
          status: willCompress ? 'compressing' : 'uploading',
          uploadSpeed: 0,
          estimatedTimeRemaining: 0,
          uploadedBytes: 0,
          totalBytes: this.pendingOperation.file.size
        };

        return new Promise((resolve, reject) => {
          this.currentUploadSub = this.uploadService.uploadFile(this.pendingOperation!.file!, this.context).subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress && event.total) {
                const elapsedTime = (Date.now() - this.uploadStartTime) / 1000;
                const uploadSpeed = elapsedTime > 0 ? event.loaded / elapsedTime : 0;
                const remainingBytes = event.total - event.loaded;
                const estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

                this.currentProgress = {
                  percentage: Math.round((100 * event.loaded) / event.total),
                  status: 'uploading',
                  uploadSpeed,
                  estimatedTimeRemaining,
                  uploadedBytes: event.loaded,
                  totalBytes: event.total
                };
              }

              if (event.type === HttpEventType.Response) {
                const response = event.body as UploadResponse;
                this.uploadSuccess(response.filePath, response.fileUrl);
                this.log(`FileUpload (${this.controlName}): Upload completed, path: ${response.fileUrl}`);

                this.pendingOperation = null;
                this.pendingOperationChange.emit(null);
                this.isUploading = false;

                resolve(response.fileUrl);
              }
            },
            error: (error) => {
              this.handleUploadError(error, this.pendingOperation!.file!);
              this.isUploading = false;
              reject(error);
            }
          });
        });
      } else if (this.pendingOperation.type === 'delete' && this.pendingOperation.filePath) {
        this.log(`FileUpload (${this.controlName}): Deleting ${this.pendingOperation.filePath}`);
        await lastValueFrom(
          this.uploadService.deleteFile(this.pendingOperation.filePath)
        );
        this.control.setValue(null);
        this.uploadedFileName = null;
        this.originalUrl = null;
        this.fileDeleted.emit(this.controlName);
        this.pendingOperation = null;
        this.pendingOperationChange.emit(null);
        this.log(`FileUpload (${this.controlName}): Delete completed`);
        return null;
      }
    } catch (error) {
      this.logError(`FileUpload (${this.controlName}): Operation failed`, error);
      this.errorMessage = this.translate.instant('FILE_UPLOAD.ERROR.OPERATION_FAILED');
      if (this.tempFileUrl) {
        URL.revokeObjectURL(this.tempFileUrl);
        this.tempFileUrl = null;
      }
      if (this.originalUrl) {
        this.control.setValue(this.originalUrl);
        this.uploadedFileName = this.extractFileName(this.originalUrl);
      } else {
        this.control.setValue(null);
        this.uploadedFileName = null;
      }
      this.pendingOperation = null;
      this.pendingOperationChange.emit(null);
      throw error; // Re-throw to allow error handling in the parent component
    }

    this.log(`FileUpload (${this.controlName}): No operation executed or incomplete operation`);
    return this.getFinalValue();
  }

  cancelPendingOperation(): void {
    if (this.disabled) {
      this.log(`FileUpload (${this.controlName}): Disabled, ignoring cancel`);
      return;
    }

    this.log(`FileUpload (${this.controlName}): Canceling pending operation`);
    if (this.tempFileUrl) {
      URL.revokeObjectURL(this.tempFileUrl);
      this.tempFileUrl = null;
    }
    if (this.originalUrl) {
      this.uploadedFileName = this.extractFileName(this.originalUrl);
      this.control.setValue(this.originalUrl);
    } else {
      this.resetFileInput();
      this.control.setValue(null);
    }
    this.pendingOperation = null;
    this.pendingOperationChange.emit(null);
  }

  private resetFileInput(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private getFinalValue(): string | null {
    const controlValue = this.control.value;
    if (
      controlValue &&
      (controlValue.startsWith('valid-temp-') || controlValue.startsWith('pending-delete-'))
    ) {
      return this.originalUrl;
    }
    return controlValue;
  }

  getValue(): { name: string; value: string | null } {
    const controlValue = this.control.value;
    let finalValue = controlValue;

    // If there's a pending delete operation, return null
    if (this.pendingOperation?.type === 'delete') {
      finalValue = null;
    }
    // If there's a pending upload operation, return null to prevent temp URLs
    else if (this.pendingOperation?.type === 'upload') {
      finalValue = null;
    }
    // If the control has a temp value, use original URL
    else if (controlValue && typeof controlValue === 'string' && controlValue.startsWith('valid-temp-')) {
      finalValue = this.originalUrl;
    }
    // If control is null but we have an original URL, use it
    else if (!controlValue && this.originalUrl) {
      finalValue = this.originalUrl;
    }

    this.log(`FileUpload (${this.controlName}): Getting value: ${finalValue}`);
    return {
      name: this.controlName,
      value: finalValue
    };
  }

  get previewLink(): string | null {
    return this.tempFileUrl || this.control.value;
  }

  get safePreviewUrl(): SafeUrl | null {
    const url = this.previewLink;
    return url ? this.sanitizer.bypassSecurityTrustUrl(url) : null;
  }

  get previewLinkLabel(): string {
    return this.translate.instant('FILE_UPLOAD.PREVIEW');
  }

  get isImage(): boolean {
    // Check if we have a pending file operation with an image
    if (this.pendingOperation?.file) {
      const isImg = this.pendingOperation.file.type.startsWith('image/');
      this.log(`FileUpload (${this.controlName}): isImage check - pending file type: ${this.pendingOperation.file.type}, isImage: ${isImg}`);
      return isImg;
    }

    // Check the preview URL
    const url = this.previewLink;
    if (!url) {
      this.log(`FileUpload (${this.controlName}): isImage check - no preview link`);
      return false;
    }

    // Check for blob URLs (temporary local previews)
    if (url.startsWith('blob:')) {
      this.log(`FileUpload (${this.controlName}): isImage check - blob URL detected, assuming image`);
      return true; // Assume blob URLs created by this component are images
    }

    // Check for data URLs
    if (url.startsWith('data:image/')) {
      this.log(`FileUpload (${this.controlName}): isImage check - data:image URL detected`);
      return true;
    }

    // Check for common image extensions in the URL
    const hasImageExtension = url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp|ico)(\?|#|$)/i) !== null;
    this.log(`FileUpload (${this.controlName}): isImage check - URL: ${url}, hasImageExtension: ${hasImageExtension}`);
    return hasImageExtension;
  }

  hasPendingOperation(): boolean {
    return this.pendingOperation !== null;
  }

  isValid(): boolean {
    const value = this.control.value;
    return !!value || this.pendingOperation?.type === 'upload';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  get progressStatusText(): string {
    switch (this.currentProgress.status) {
      case 'compressing':
        return this.translate.instant('FILE_UPLOAD.STATUS.COMPRESSING');
      case 'uploading':
        const speed = this.currentProgress.uploadSpeed || 0;
        const timeRemaining = this.currentProgress.estimatedTimeRemaining || 0;
        if (speed > 0 && timeRemaining > 0) {
          return `${this.formatBytes(speed)}/s - ${this.formatTime(timeRemaining)} remaining`;
        }
        return this.translate.instant('FILE_UPLOAD.STATUS.UPLOADING');
      case 'completed':
        return this.translate.instant('FILE_UPLOAD.STATUS.COMPLETED');
      case 'error':
        return this.translate.instant('FILE_UPLOAD.STATUS.ERROR');
      default:
        return '';
    }
  }

  private isFileTypeAccepted(file: File): boolean {
    if (!this.acceptedFileTypes) return true;
    const acceptedTypes = this.acceptedFileTypes.split(',').map(type => type.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type.toLowerCase();

    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return type === fileExtension;
      }
      if (type.endsWith('/*')) {
        const baseType = type.replace('/*', '');
        return fileType.startsWith(baseType);
      }
      return type === fileType;
    });
  }

  private extractFileName(filePath: string | null): string | null {
    if (!filePath) return null;
    if (filePath.startsWith('valid-temp-')) return filePath.replace('valid-temp-', '');
    if (filePath.startsWith('pending-delete-')) return 'Pending deletion';
    return filePath.split('/').pop() || filePath;
  }

  private log(message: string, data?: any): void {
    if (!environment.production) {
      if (data !== undefined) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }

  private logError(message: string, error?: any): void {
    if (!environment.production) {
      if (error) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
  }
}
