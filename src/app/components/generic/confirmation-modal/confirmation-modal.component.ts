import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';

declare var bootstrap: any;

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule]
})
export class ConfirmationModalComponent implements OnInit, OnDestroy {
  @Input() modalId: string = 'confirmationModal';
  @Input() titleKey: string = 'MODAL.CONFIRMATION';
  @Input() messageKey: string = 'MODAL.CONFIRM_ACTION';
  @Input() cancelBtnKey: string = 'MODAL.CANCEL';
  @Input() confirmBtnKey: string = 'MODAL.CONFIRM';
  @Input() confirmBtnClass: string = 'btn-danger';
  @Input() titleParams: any = {};
  @Input() messageParams: any = {};
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  
  modalElement: HTMLElement;
  private bootstrapModal: any;
  private backdropElement: HTMLElement | null = null;
  private actionPerformed: boolean = false;

  constructor(
    private el: ElementRef,
    private translate: TranslateService,
    private sanitizer: DomSanitizer
  ) {
    console.log('[ConfirmationModal] Constructor called');
    // Create the modal element right away
    this.modalElement = document.createElement('div');
  }

  ngOnInit(): void {
    console.log('[ConfirmationModal] ngOnInit', {
      modalId: this.modalId,
      titleKey: this.titleKey,
      messageKey: this.messageKey
    });
    this.setupModal();
  }

  private setupModal(): void {
    console.log('[ConfirmationModal] Setting up modal');
    try {
      // Set up basic modal attributes
      this.modalElement.className = 'modal fade';
      this.modalElement.id = this.modalId;
      this.modalElement.setAttribute('tabindex', '-1');
      this.modalElement.setAttribute('aria-labelledby', `${this.modalId}Label`);
      this.modalElement.setAttribute('aria-hidden', 'true');
      
      // Set a high z-index to ensure it appears above other elements
      this.modalElement.style.zIndex = '1060'; // Higher than backdrop (1050)
      
      console.log('[ConfirmationModal] Modal element created:', this.modalElement);
      
      // Add modal content
      this.updateModalContent();
      
      // Add event listeners
      this.setupEventListeners();
      
      // Append to body
      document.body.appendChild(this.modalElement);
      console.log('[ConfirmationModal] Modal element appended to body');
      
      // Check Bootstrap availability
      console.log('[ConfirmationModal] Bootstrap available:', typeof bootstrap !== 'undefined');
      if (typeof bootstrap === 'undefined') {
        console.warn('[ConfirmationModal] Bootstrap is not defined! Using fallback implementation.');
        this.setupManualModal();
      } else {
        // Initialize Bootstrap modal
        this.initBootstrapModal();
      }
    } catch (error) {
      console.error('[ConfirmationModal] Error setting up modal:', error);
      this.setupManualModal();
    }
  }

  private setupManualModal(): void {
    console.log('[ConfirmationModal] Setting up manual modal implementation');
    
    // Apply styles to make it look like a Bootstrap modal
    this.modalElement.style.position = 'fixed';
    this.modalElement.style.top = '0';
    this.modalElement.style.left = '0';
    this.modalElement.style.zIndex = '1060';
    this.modalElement.style.width = '100%';
    this.modalElement.style.height = '100%';
    this.modalElement.style.overflow = 'hidden';
    this.modalElement.style.outline = '0';
    this.modalElement.style.display = 'none';
    
    // Make sure modal dialog is visible
    const dialogStyle = document.createElement('style');
    dialogStyle.textContent = `
      #${this.modalId} .modal-dialog {
        display: flex;
        align-items: center;
        min-height: calc(100% - 3.5rem);
        margin: 1.75rem auto;
        max-width: 500px;
        pointer-events: auto;
      }
      
      #${this.modalId}.show {
        display: block !important;
        opacity: 1 !important;
      }
      
      #${this.modalId} .modal-content {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        pointer-events: auto;
        background-color: #fff;
        border: 1px solid rgba(0,0,0,.2);
        border-radius: 0.3rem;
        outline: 0;
      }
    `;
    document.head.appendChild(dialogStyle);
  }

  private initBootstrapModal(): void {
    console.log('[ConfirmationModal] Initializing Bootstrap modal');
    try {
      // First try immediate initialization
      try {
        this.bootstrapModal = new bootstrap.Modal(this.modalElement, {
          backdrop: 'static',
          keyboard: false
        });
        console.log('[ConfirmationModal] Bootstrap modal initialized successfully:', this.bootstrapModal);
      } catch (error) {
        console.warn('[ConfirmationModal] Immediate initialization failed, trying with delay:', error);
        
        // Try with a delay to ensure DOM is ready
        setTimeout(() => {
          try {
            this.bootstrapModal = new bootstrap.Modal(this.modalElement, {
              backdrop: 'static',
              keyboard: false,
              focus: true // Ensure modal gets focus
            });
            console.log('[ConfirmationModal] Bootstrap modal initialized successfully with timeout:', this.bootstrapModal);
          } catch (error) {
            console.error('[ConfirmationModal] Error initializing Bootstrap modal with timeout:', error);
            this.setupManualModal();
          }
        }, 200);
      }
    } catch (error) {
      console.error('[ConfirmationModal] Error in initBootstrapModal:', error);
      this.setupManualModal();
    }
  }

  private updateModalContent(): void {
    console.log('[ConfirmationModal] Updating modal content with translation keys', {
      titleKey: this.titleKey,
      messageKey: this.messageKey
    });

    try {
      const title = this.translate.instant(this.titleKey, this.titleParams);
      const message = this.translate.instant(this.messageKey, this.messageParams);
      const cancelBtn = this.translate.instant(this.cancelBtnKey);
      const confirmBtn = this.translate.instant(this.confirmBtnKey);

      console.log('[ConfirmationModal] Translated content:', { title, message, cancelBtn, confirmBtn });

      // Create DOM elements programmatically to avoid XSS via innerHTML
      // This ensures all text content is properly escaped
      const modalDialog = document.createElement('div');
      modalDialog.className = 'modal-dialog modal-dialog-centered';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';

      // Modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';

      const modalTitle = document.createElement('h5');
      modalTitle.className = 'modal-title';
      modalTitle.id = `${this.modalId}Label`;
      modalTitle.textContent = title; // Use textContent to prevent XSS

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'btn-close close-btn';
      closeBtn.setAttribute('aria-label', 'Close');

      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeBtn);

      // Modal body
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      modalBody.textContent = message; // Use textContent to prevent XSS

      // Modal footer
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn-secondary cancel-btn';
      cancelButton.textContent = cancelBtn; // Use textContent to prevent XSS

      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = `btn ${this.escapeHtml(this.confirmBtnClass)} confirm-btn`;
      confirmButton.textContent = confirmBtn; // Use textContent to prevent XSS

      modalFooter.appendChild(cancelButton);
      modalFooter.appendChild(confirmButton);

      // Assemble the modal
      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      modalContent.appendChild(modalFooter);

      modalDialog.appendChild(modalContent);

      // Clear and set new content
      this.modalElement.innerHTML = '';
      this.modalElement.appendChild(modalDialog);

      console.log('[ConfirmationModal] Modal content updated successfully (XSS-safe)');
    } catch (error) {
      console.error('[ConfirmationModal] Error updating modal content:', error);
    }
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param text Text to escape
   * @returns Escaped text safe for use in HTML attributes
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupEventListeners(): void {
    console.log('[ConfirmationModal] Setting up event listeners');
    
    try {
      // Use event delegation for button clicks
      this.modalElement.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        console.log('[ConfirmationModal] Click event on modal, target:', target);
        
        // Prevent handling if action already performed
        if (this.actionPerformed) {
          return;
        }

        if (target.classList.contains('confirm-btn') || target.closest('.confirm-btn')) {
          console.log('[ConfirmationModal] Confirm button clicked');
          event.preventDefault();
          event.stopPropagation();
          this.actionPerformed = true;
          this.onConfirm();
        } else if (
          target.classList.contains('cancel-btn') || 
          target.closest('.cancel-btn') ||
          target.classList.contains('close-btn') || 
          target.closest('.close-btn')
        ) {
          console.log('[ConfirmationModal] Cancel/Close button clicked');
          event.preventDefault();
          event.stopPropagation();
          this.actionPerformed = true;
          this.onCancel();
        }
      });

      // Handle modal hidden event to ensure cancellation is processed
      this.modalElement.addEventListener('hidden.bs.modal', () => {
        console.log('[ConfirmationModal] Modal hidden event triggered');
        
        // If no action was performed (e.g., clicked outside modal), treat as cancel
        if (!this.actionPerformed) {
          console.log('[ConfirmationModal] Modal closed without explicit action, treating as cancel');
          this.cancelled.emit();
        }
        
        // Reset action flag
        this.actionPerformed = false;
      });
      
      console.log('[ConfirmationModal] Event listeners set up successfully');
    } catch (error) {
      console.error('[ConfirmationModal] Error setting up event listeners:', error);
    }
  }

  onConfirm(): void {
    console.log('[ConfirmationModal] onConfirm() called');
    this.hide();
    // Emit after modal is hidden to avoid UI issues
    setTimeout(() => {
      this.confirmed.emit();
    }, 100);
  }

  onCancel(): void {
    console.log('[ConfirmationModal] onCancel() called');
    this.hide();
    // Emit after modal is hidden to avoid UI issues
    setTimeout(() => {
      this.cancelled.emit();
    }, 100);
  }

  show(): void {
    console.log('[ConfirmationModal] show() called');
    
    // Reset action flag when showing the modal
    this.actionPerformed = false;
    
    // Update content with latest translations before showing
    this.updateModalContent();
    
    try {
      if (this.bootstrapModal) {
        console.log('[ConfirmationModal] Using Bootstrap modal show()');
        // Bootstrap 5 way
        this.bootstrapModal.show();
        console.log('[ConfirmationModal] Bootstrap modal show() called');
      } else {
        console.log('[ConfirmationModal] Bootstrap modal not available, using manual show');
        this.showManualModal();
      }
      
      // Extra check: ensure modal is visible
      setTimeout(() => {
        if (!this.modalElement.classList.contains('show')) {
          console.warn('[ConfirmationModal] Modal not showing after show() call, forcing visibility');
          this.forceModalVisibility();
        }
      }, 300);
    } catch (error) {
      console.error('[ConfirmationModal] Error showing modal:', error);
      this.showManualModal();
    }
  }
  
  // Method to force modal visibility if Bootstrap's show() fails
  private forceModalVisibility(): void {
    console.log('[ConfirmationModal] Forcing modal visibility');
    
    // Force the modal to be visible
    this.modalElement.classList.add('show');
    this.modalElement.style.display = 'block';
    this.modalElement.setAttribute('aria-modal', 'true');
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.removeAttribute('aria-hidden');
    document.body.classList.add('modal-open');
    
    // Create backdrop if it doesn't exist
    if (!this.backdropElement) {
      this.backdropElement = document.createElement('div');
      this.backdropElement.className = 'modal-backdrop fade show';
      document.body.appendChild(this.backdropElement);
    }
  }
  
  private showManualModal(): void {
    console.log('[ConfirmationModal] Showing modal manually');
    try {
      // Use manual DOM manipulation as fallback
      this.modalElement.style.display = 'block';
      this.modalElement.classList.add('show');
      this.modalElement.setAttribute('aria-modal', 'true');
      this.modalElement.removeAttribute('aria-hidden');
      document.body.classList.add('modal-open');
      
      // Create backdrop if needed
      if (!this.backdropElement) {
        this.backdropElement = document.createElement('div');
        this.backdropElement.className = 'modal-backdrop fade show';
        document.body.appendChild(this.backdropElement);
        console.log('[ConfirmationModal] Backdrop created and added to DOM');
      }
      
      console.log('[ConfirmationModal] Modal shown manually');
    } catch (error) {
      console.error('[ConfirmationModal] Error in showManualModal:', error);
    }
  }

  hide(): void {
    console.log('[ConfirmationModal] hide() called');
    
    try {
      if (this.bootstrapModal) {
        console.log('[ConfirmationModal] Using Bootstrap modal hide()');
        this.bootstrapModal.hide();
      } else {
        console.log('[ConfirmationModal] Bootstrap modal not available, using manual hide');
        this.hideManualModal();
      }
    } catch (error) {
      console.error('[ConfirmationModal] Error hiding modal:', error);
      this.hideManualModal();
    }
  }
  
  private hideManualModal(): void {
    console.log('[ConfirmationModal] Hiding modal manually');
    try {
      this.modalElement.style.display = 'none';
      this.modalElement.classList.remove('show');
      this.modalElement.setAttribute('aria-hidden', 'true');
      this.modalElement.removeAttribute('aria-modal');
      this.modalElement.removeAttribute('role');
      document.body.classList.remove('modal-open');
      
      // Remove backdrop if it exists
      if (this.backdropElement && document.body.contains(this.backdropElement)) {
        document.body.removeChild(this.backdropElement);
        this.backdropElement = null;
        console.log('[ConfirmationModal] Backdrop removed from DOM');
      }
      
      console.log('[ConfirmationModal] Modal hidden manually');
    } catch (error) {
      console.error('[ConfirmationModal] Error in hideManualModal:', error);
    }
  }

  ngOnDestroy(): void {
    console.log('[ConfirmationModal] ngOnDestroy() called');
    
    try {
      // Clean up - remove modal from DOM
      if (document.body.contains(this.modalElement)) {
        document.body.removeChild(this.modalElement);
        console.log('[ConfirmationModal] Modal element removed from DOM');
      }
      
      // Remove backdrop if it exists
      if (this.backdropElement && document.body.contains(this.backdropElement)) {
        document.body.removeChild(this.backdropElement);
        console.log('[ConfirmationModal] Backdrop removed from DOM during cleanup');
      }
      
      console.log('[ConfirmationModal] Cleanup completed');
    } catch (error) {
      console.error('[ConfirmationModal] Error during component destruction:', error);
    }
  }
}