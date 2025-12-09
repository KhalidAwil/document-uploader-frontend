import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  public toasts$ = this.toastSubject.asObservable();

  constructor(private translate: TranslateService) {}

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getDefaultIcon(type: string): string {
    const iconMap = {
      'success': 'bi-check-circle-fill',
      'error': 'bi-x-circle-fill',
      'warning': 'bi-exclamation-triangle-fill',
      'info': 'bi-info-circle-fill'
    };
    return iconMap[type as keyof typeof iconMap] || 'bi-info-circle-fill';
  }

  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration: number = 5000, icon?: string): void {
    const toast: ToastMessage = {
      id: this.generateId(),
      type,
      title,
      message,
      duration,
      icon: icon || this.getDefaultIcon(type)
    };
    this.toastSubject.next(toast);
  }

  success(title: string, message: string, duration?: number): void {
    this.showToast('success', title, message, duration);
  }

  error(title: string, message: string, duration?: number): void {
    this.showToast('error', title, message, duration || 7000);
  }

  warning(title: string, message: string, duration?: number): void {
    this.showToast('warning', title, message, duration);
  }

  info(title: string, message: string, duration?: number): void {
    this.showToast('info', title, message, duration);
  }

  // Convenience methods for document operations
  documentCreated(documentType: string): void {
    const title = this.translate.instant('TOAST.DOCUMENT_CREATED');
    const message = this.translate.instant('TOAST.DOCUMENT_CREATED_SUCCESS', { documentType });
    this.success(title, message, 4000);
  }

  documentUpdated(documentType: string): void {
    const title = this.translate.instant('TOAST.DOCUMENT_UPDATED');
    const message = this.translate.instant('TOAST.DOCUMENT_UPDATED_SUCCESS', { documentType });
    this.success(title, message, 4000);
  }

  documentDeleted(documentType: string): void {
    const title = this.translate.instant('TOAST.DOCUMENT_DELETED');
    const message = this.translate.instant('TOAST.DOCUMENT_DELETED_SUCCESS', { documentType });
    this.success(title, message, 4000);
  }

  documentError(operation: 'create' | 'update' | 'delete', documentType?: string, error?: string): void {
    let title: string;
    let message: string;
    
    if (documentType) {
      switch (operation) {
        case 'create':
          title = this.translate.instant('TOAST.OPERATION_FAILED');
          message = this.translate.instant('TOAST.CREATE_FAILED', { documentType });
          break;
        case 'update':
          title = this.translate.instant('TOAST.OPERATION_FAILED');
          message = this.translate.instant('TOAST.UPDATE_FAILED', { documentType });
          break;
        case 'delete':
          title = this.translate.instant('TOAST.OPERATION_FAILED');
          message = this.translate.instant('TOAST.DELETE_FAILED', { documentType });
          break;
        default:
          title = this.translate.instant('TOAST.ERROR');
          message = error || this.translate.instant('TOAST.GENERIC_ERROR');
      }
    } else {
      title = this.translate.instant('TOAST.ERROR');
      message = error || this.translate.instant('TOAST.GENERIC_ERROR');
    }
    
    this.error(title, message, 6000);
  }
}