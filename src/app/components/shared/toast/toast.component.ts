import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService, ToastMessage } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1055;">
      <div 
        *ngFor="let toast of toasts; trackBy: trackByToastId"
        class="toast show fade-in" 
        [ngClass]="getToastClass(toast.type)"
        role="alert" 
        aria-live="assertive" 
        aria-atomic="true"
      >
        <div class="toast-header border-0" [ngClass]="getHeaderClass(toast.type)">
          <i class="me-2" [ngClass]="toast.icon" [ngStyle]="getIconStyle(toast.type)"></i>
          <p class="me-auto">{{ toast.title }}</p>
          <button 
            type="button" 
            class="btn-close btn-close-white me-2" 
            aria-label="Close"
            (click)="removeToast(toast.id)"
          ></button>
        </div>
        <div class="toast-body text-white">
          {{ toast.message }}
        </div>
        <!-- Progress bar -->
        <div class="progress" style="height: 3px;">
          <div 
            class="progress-bar bg-white opacity-75" 
            [style.animation-duration.ms]="toast.duration"
            style="animation: shrink linear forwards; width: 100%;"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      max-width: 400px;
      z-index: 1055;
    }

    .toast {
      border: none;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin-bottom: 0.75rem;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    .toast-success {
      background: linear-gradient(135deg, var(--app-secondary), var(--app-secondary-600));
    }

    .toast-error {
      background: linear-gradient(135deg, #dc3545,rgb(156, 25, 38));
    }

    .toast-warning {
      background: linear-gradient(135deg, #fd7e14, #ffc107);
    }

    .toast-info {
      background: linear-gradient(135deg, #0dcaf0, #6f42c1);
    }

    .toast-header {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);

    }

    .toast-body {
      font-size: 1.2rem;
      line-height: 1.4;
      font-weight: 500;
    }

    .btn-close-white {
      filter: invert(1) grayscale(100%) brightness(200%);
      font-size: 0.9rem;
    }

    .fade-in {
      animation: slideInRight 0.3s ease-out;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes shrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .progress {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .toast {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
    }

    /* RTL support for Arabic */
    [dir="rtl"] .toast-container {
      left: 0;
      right: auto;
    }

    [dir="rtl"] .fade-in {
      animation: slideInLeft 0.3s ease-out;
    }

    @keyframes slideInLeft {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe((toast) => {
      this.addToast(toast);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  trackByToastId(index: number, toast: ToastMessage): string {
    return toast.id;
  }

  getToastClass(type: string): string {
    return `toast-${type}`;
  }

  getHeaderClass(type: string): string {
    return `text-white`;
  }

  getIconStyle(type: string): { [key: string]: string } {
    return {
      'color': 'white',
      'font-size': '1.1rem'
    };
  }

  addToast(toast: ToastMessage): void {
    this.toasts.unshift(toast); // Add to beginning for newest on top

    // Auto-remove after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, toast.duration);
    }

    // Limit max toasts displayed
    if (this.toasts.length > 5) {
      this.toasts = this.toasts.slice(0, 5);
    }
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }
}