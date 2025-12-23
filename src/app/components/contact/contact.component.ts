import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { StatisticsService } from '../../services/statistics.service';

interface ContactResponse {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  imports: [TranslatePipe, FormsModule, ReactiveFormsModule, CommonModule],
  standalone: true
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup;
  isSubmitting = false;
  submitStatus: { success?: boolean; message?: string } = {};
  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private translateService: TranslateService,
    private statisticsService: StatisticsService
  ) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,}$/)]],
      current_residence: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Add any additional initialization logic here
    this.initTranslations();
    this.trackPageView();
  }

  private trackPageView(): void {
    this.statisticsService.incrementPageView('contact-us').subscribe({
      next: () => {
        // Page view tracked successfully
      },
      error: (error) => {
        // Silently handle tracking errors to not affect user experience
        console.debug('Contact Us page view tracking failed:', error);
      }
    });
  }

  /**
   * Initialize translations for new fields if not already defined
   */
  initTranslations(): void {
    // Check if needed translations exist and set defaults if not
    const translations = {
      'CONTACT_PHONE': 'رقم الهاتف',
      'CONTACT_PHONE_PLACEHOLDER': 'أدخل رقم هاتفك',
      'CONTACT_PHONE_REQUIRED': 'رقم الهاتف مطلوب',
      'CONTACT_PHONE_INVALID': 'يرجى إدخال رقم هاتف صالح (10-15 رقم، مع بادئة + اختيارية)',
      'CONTACT_RESIDENCE': 'مكان الإقامة الحالي',
      'CONTACT_RESIDENCE_PLACEHOLDER': 'أدخل مكان إقامتك الحالي',
      'CONTACT_RESIDENCE_REQUIRED': 'مكان الإقامة الحالي مطلوب'
    };

    // Add any missing translations
    Object.entries(translations).forEach(([key, value]) => {
      this.translateService.get(key).subscribe((translation: string) => {
        if (translation === key) {
          this.translateService.set(key, value);
        }
      });
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.submitStatus = {};

      this.http.post<ContactResponse>(`${this.apiUrl}/contact-message`, this.contactForm.value, { withCredentials: true })
        .subscribe({
          next: (response) => {
            this.submitStatus.success = true;
            this.translateService.get('CONTACT_SUBMIT_SUCCESS').subscribe(
              (msg: string) => this.submitStatus.message = msg
            );
            this.contactForm.reset();
          },
          error: (error) => {
            this.submitStatus.success = false;
            this.translateService.get('CONTACT_SUBMIT_ERROR').subscribe(
              (msg: string) => this.submitStatus.message = msg
            );
            console.error('Contact form submission error:', error);
          },
          complete: () => {
            this.isSubmitting = false;
          }
        });
    }
  }
}
