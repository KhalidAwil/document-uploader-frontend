import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, TranslateModule, TranslatePipe]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  errorMessage: string | null = null;
  showPassword = false;
  authErrors: { [key: string]: string } = {
    email: '',
    password: '',
    role_code: ''
  };

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8)
      ]],
      role_code: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    // Clear any previous errors on initialization
    this.clearError();
    
    // Set up form validation watchers
    this.setupFormValidationWatchers();
  }

  /**
   * Setup real-time validation watchers for form fields
   */
  setupFormValidationWatchers(): void {
    // Watch email field for changes and validate in real-time
    this.loginForm.get('email')?.valueChanges.subscribe(() => {
      if (this.authErrors['email'] && this.loginForm.get('email')?.valid) {
        this.authErrors['email'] = '';
      }
    });

    // Watch password field for changes and validate in real-time
    this.loginForm.get('password')?.valueChanges.subscribe(() => {
      if (this.authErrors['password'] && this.loginForm.get('password')?.valid) {
        this.authErrors['password'] = '';
      }
    });

    // Watch role_code field for changes and validate in real-time
    this.loginForm.get('role_code')?.valueChanges.subscribe(() => {
      if (this.authErrors['role_code'] && this.loginForm.get('role_code')?.valid) {
        this.authErrors['role_code'] = '';
      }
    });
  }

  // Convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = null;
    this.authErrors = { email: '', password: '', role_code: '' };
  }

  /**
   * Check if a specific form field has errors and should show validation
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!((field?.invalid && (field?.dirty || field?.touched || this.submitted)) || 
               this.authErrors[fieldName]);
  }

  /**
   * Get validation error message for a specific field
   */
  getFieldErrorMessage(fieldName: string): string {
    // If there's a server-side error for this field, return it
    if (this.authErrors[fieldName]) {
      return this.authErrors[fieldName];
    }

    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors) {
      return '';
    }

    // Email validation errors
    if (fieldName === 'email') {
      if (field.errors['required']) {
        return this.translate.instant('EMAIL_REQUIRED');
      }
      if (field.errors['email'] || field.errors['pattern']) {
        return this.translate.instant('INVALID_EMAIL_FORMAT');
      }
    }

    // Password validation errors
    if (fieldName === 'password') {
      if (field.errors['required']) {
        return this.translate.instant('PASSWORD_REQUIRED');
      }
      if (field.errors['minlength']) {
        return this.translate.instant('PASSWORD_TOO_SHORT');
      }
      if (field.errors['pattern']) {
        return this.translate.instant('PASSWORD_COMPLEXITY_ERROR');
      }
    }


    return this.translate.instant('FIELD_INVALID');
  }

  /**
   * Handle login form submission
   */
  onSubmit() {
    console.log('=== LOGIN FORM SUBMITTED ===');
    console.log('Form valid:', this.loginForm.valid);
    console.log('Form values:', this.loginForm.value);
    
    this.submitted = true;
    this.clearError();

    // Validate the form again to ensure it's valid
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });

    // Stop if the form is invalid
    if (this.loginForm.invalid) {
      // Set focus to the first invalid field
      const firstInvalidField = Object.keys(this.loginForm.controls)
        .find(key => this.loginForm.get(key)?.invalid);
      
      if (firstInvalidField) {
        const element = document.getElementById(firstInvalidField);
        if (element) {
          element.focus();
        }
      }
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: (user) => {
        console.log('Login successful, user data:', user);
        console.log('Current user value:', this.authService.currentUserValue);
        console.log('Is authenticated:', this.authService.isAuthenticated());
        console.log('localStorage currentUser:', localStorage.getItem('currentUser'));
        console.log('localStorage authToken:', localStorage.getItem('authToken'));
        
        this.loading = false;
        
        // Add a small delay to ensure auth state is fully updated
        setTimeout(() => {
          console.log('Attempting to navigate to home page...');
          this.router.navigate(['/']).then(
            (success) => {
              console.log('Navigation result:', success);
              console.log('Current URL after navigation:', this.router.url);
            },
            (error) => console.error('Navigation failed:', error)
          );
        }, 100);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.handleLoginError(err);
        this.loading = false;
      }
    });
  }

  /**
   * Handle different types of login errors
   */
  private handleLoginError(err: any): void {
    // Clear previous errors
    this.clearError();
    
    // Check if error has specific field validation errors
    if (err.error && err.error.errors) {
      const errors = err.error.errors;
      
      // Map backend errors to form fields with Arabic translations
      if (errors.email) {
        const backendError = Array.isArray(errors.email) ? errors.email[0] : errors.email;
        // Translate common backend validation messages
        if (backendError.toLowerCase().includes('required')) {
          this.authErrors['email'] = this.translate.instant('EMAIL_REQUIRED');
        } else if (backendError.toLowerCase().includes('email') || backendError.toLowerCase().includes('format')) {
          this.authErrors['email'] = this.translate.instant('INVALID_EMAIL_FORMAT');
        } else {
          this.authErrors['email'] = this.translate.instant('AUTH.EMAIL_NOT_FOUND');
        }
      }
      
      if (errors.password) {
        const backendError = Array.isArray(errors.password) ? errors.password[0] : errors.password;
        if (backendError.toLowerCase().includes('required')) {
          this.authErrors['password'] = this.translate.instant('PASSWORD_REQUIRED');
        } else if (backendError.toLowerCase().includes('min')) {
          this.authErrors['password'] = this.translate.instant('PASSWORD_TOO_SHORT');
        } else {
          this.authErrors['password'] = this.translate.instant('AUTH.INVALID_PASSWORD');
        }
      }
      

      // Focus on the first field with an error
      const firstErrorField = Object.keys(this.authErrors).find(key => this.authErrors[key]);
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.focus();
        }
      }
    }
    // Check for specific authentication errors
    else if (err.error && err.error.message) {
      const errorMessage = err.error.message.toLowerCase();
      
      if (errorMessage.includes('email')) {
        this.authErrors['email'] = this.translate.instant('AUTH.EMAIL_NOT_FOUND');
      } else if (errorMessage.includes('password')) {
        this.authErrors['password'] = this.translate.instant('AUTH.INVALID_PASSWORD');
      } else {
        // Generic error message
        this.errorMessage = err.error.message || this.translate.instant('AUTH.LOGIN_FAILED');
      }
    } else {
      // Fallback error message
      this.errorMessage = this.translate.instant('AUTH.LOGIN_FAILED');
    }
  }
}