import { Injectable, Injector, ComponentRef, createComponent, ApplicationRef, EnvironmentInjector } from '@angular/core';
import { ConfirmationModalComponent } from '../components/generic/confirmation-modal/confirmation-modal.component';

export interface ConfirmationOptions {
  titleKey?: string;
  messageKey?: string;
  cancelBtnKey?: string;
  confirmBtnKey?: string;
  confirmBtnClass?: string;
  titleParams?: any;
  messageParams?: any;
  modalId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationModalService {
  private modalComponent: ComponentRef<ConfirmationModalComponent> | null = null;
  private modalHostElement: HTMLElement | null = null;

  constructor(
    private injector: Injector,
    private appRef: ApplicationRef,
    private environmentInjector: EnvironmentInjector
  ) {}

  confirm(options: ConfirmationOptions = {}): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Clean up any existing modals
      this.cleanupExistingModal();

      console.log('ConfirmationModalService.confirm() called with options:', options);
      
      // Generate a unique ID for this modal instance
      const modalId = options.modalId || `confirmation-modal-${Date.now()}`;
      
      // Create a host element
      this.modalHostElement = document.createElement('div');
      document.body.appendChild(this.modalHostElement);
      
      // Create component dynamically
      this.modalComponent = createComponent(ConfirmationModalComponent, {
        environmentInjector: this.environmentInjector,
        hostElement: this.modalHostElement
      });
      
      // Set inputs
      const instance = this.modalComponent.instance;
      instance.modalId = modalId;
      
      if (options.titleKey) instance.titleKey = options.titleKey;
      if (options.messageKey) instance.messageKey = options.messageKey;
      if (options.cancelBtnKey) instance.cancelBtnKey = options.cancelBtnKey;
      if (options.confirmBtnKey) instance.confirmBtnKey = options.confirmBtnKey;
      if (options.confirmBtnClass) instance.confirmBtnClass = options.confirmBtnClass;
      if (options.titleParams) instance.titleParams = options.titleParams;
      if (options.messageParams) instance.messageParams = options.messageParams;
      
      // Subscribe to events
      const confirmSubscription = instance.confirmed.subscribe(() => {
        resolve(true);
        this.cleanupExistingModal();
      });
      
      const cancelSubscription = instance.cancelled.subscribe(() => {
        resolve(false);
        this.cleanupExistingModal();
      });
      
      // Attach change detection
      this.appRef.attachView(this.modalComponent.hostView);
      
      // Show the modal
      instance.show();
    });
  }

  /**
   * Show a simple confirmation dialog with OK button only
   * @param title Title for the modal
   * @param message Message to display
   * @param okButton OK button text
   * @param cancelButton Cancel button text (empty for OK-only modal)
   * @param onOk OK callback
   * @param onCancel Cancel callback
   */
  showConfirmation(
    title: string,
    message: string,
    okButton: string = 'حسناً',
    cancelButton: string = '',
    onOk: () => void = () => {},
    onCancel: () => void = () => {}
  ): void {
    const options: ConfirmationOptions = {
      titleKey: title,
      messageKey: message,
      confirmBtnKey: okButton,
      cancelBtnKey: cancelButton
    };

    this.confirm(options).then((confirmed) => {
      if (confirmed) {
        onOk();
      } else {
        onCancel();
      }
    });
  }
  
  private cleanupExistingModal(): void {
    if (this.modalComponent) {
      this.appRef.detachView(this.modalComponent.hostView);
      this.modalComponent.destroy();
      this.modalComponent = null;
    }
    
    if (this.modalHostElement && document.body.contains(this.modalHostElement)) {
      document.body.removeChild(this.modalHostElement);
      this.modalHostElement = null;
    }
  }
}