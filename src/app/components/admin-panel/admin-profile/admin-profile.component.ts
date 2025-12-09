import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { passwordStrengthValidator } from '../../../validators/custom-validators';


@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule // Add TranslateModule here
  ],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.scss']
})
export class AdminProfileComponent implements OnInit {
  userForm: FormGroup;
  user: any | null = null;
  editMode = {
    first_name: false,
    last_name: false,
    nickname: false,
    email: false,
    password: false
  };
  isLoading: boolean = false; // Optional: Add loading state for submit
  formSubmitAttempted: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private translate: TranslateService // For potential future messages
  ) {
    this.userForm = this.fb.group({
      // Initialize disabled, enable via toggleEditMode
      first_name: [{ value: '', disabled: true }, Validators.required],
      last_name: [{ value: '', disabled: true }, Validators.required],
      nickname: [{ value: '', disabled: true }, Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      // Password optional initially, only validate if editing
      password: [{ value: '', disabled: true }, [Validators.minLength(8), passwordStrengthValidator()]]
    });
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    // Subscribe to the user data
    this.authService.currentUser.subscribe((userObj: any) => {
      if (userObj && userObj.user) {
        this.user = userObj; // Store the whole user object from AuthService
        this.userForm.patchValue({
          first_name: userObj.user.first_name,
          last_name: userObj.user.last_name,
          nickname: userObj.user.nickname,
          email: userObj.user.email,
          password: '' // Don't pre-fill password
        });
        // Ensure all fields are initially disabled
        this.userForm.disable();
        this.editMode = { first_name: false, last_name: false, nickname: false, email: false, password: false };
      }
    });
  }

  toggleEditMode(field: keyof typeof this.editMode): void {
    // Ensure only root_super_admin can edit personal information fields
    if (field !== 'password' && !this.canEditPersonalInfo()) {
      console.warn(`User without root_super_admin role cannot edit ${field}`);
      // Show user-friendly message
      this.translate.get('ONLY_ROOT_CAN_EDIT_PERSONAL_INFO').subscribe(message => {
        alert(message);
      });
      return;
    }

    const control = this.userForm.get(field);
    if (!control) return;

    this.editMode[field] = !this.editMode[field];

    if (this.editMode[field]) {
      control.enable();
      // Add password validators only when editing password
      if (field === 'password') {
        control.setValidators([Validators.required, Validators.minLength(8), passwordStrengthValidator()]);
        control.updateValueAndValidity();
        console.log(`Password field enabled for editing. Current value: ${control.value}`);
      }
    } else {
      control.disable();
      // Reset to original value if canceling edit
      control.setValue(this.user.user[field] || (field === 'password' ? '' : ''));
      // Remove required validator from password if canceling edit
      if (field === 'password') {
        control.setValidators([Validators.minLength(8), passwordStrengthValidator()]); // Keep validators for when editing later
        control.updateValueAndValidity();
        control.reset(''); // Clear the field visually
      }
      control.markAsPristine();
      control.markAsUntouched();
    }
  }


  isAnyFieldInEditMode(): boolean {
    return Object.values(this.editMode).some((mode) => mode);
  }

  /**
   * Check if current user can edit personal information fields
   */
  canEditPersonalInfo(): boolean {
    return this.user?.roles?.some((role: any) => {
      const roleName = typeof role === 'string' ? role : role.name;
      return roleName === 'root_super_admin';
    }) || false;
  }

  /**
   * Get validation error message for a specific field
   */
  getFieldErrorMessage(fieldName: string): string {
    const control = this.userForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    
    if (errors['required']) {
      return this.translate.instant('COMMON.VALIDATION.REQUIRED');
    }
    
    if (errors['email']) {
      return this.translate.instant('INVALID_EMAIL');
    }
    
    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return this.translate.instant('PASSWORD_MIN_LENGTH', { minLength });
    }
    
    if (errors['passwordStrength']) {
      const strengthErrors = errors['passwordStrength'];
      if (!strengthErrors.hasNumber && !strengthErrors.hasLetter && !strengthErrors.hasSymbol) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_LETTERS_NUMBERS_SYMBOLS');
      } else if (!strengthErrors.hasNumber && !strengthErrors.hasLetter) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_LETTERS_AND_NUMBERS');
      } else if (!strengthErrors.hasNumber && !strengthErrors.hasSymbol) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_NUMBERS_AND_SYMBOLS');
      } else if (!strengthErrors.hasLetter && !strengthErrors.hasSymbol) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_LETTERS_AND_SYMBOLS');
      } else if (!strengthErrors.hasNumber) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_NUMBERS');
      } else if (!strengthErrors.hasLetter) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_LETTERS');
      } else if (!strengthErrors.hasSymbol) {
        return this.translate.instant('PASSWORD_MUST_CONTAIN_SYMBOLS');
      }
    }
    
    return this.translate.instant('COMMON.VALIDATION.INVALID');
  }

  /**
   * Check if field should show validation errors
   */
  shouldShowFieldError(fieldName: string): boolean {
    const control = this.userForm.get(fieldName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  onSubmit(): void {
    if (!this.isAnyFieldInEditMode()) {
      console.log('No fields in edit mode.');
      return;
    }

    // Mark that user has attempted to submit
    this.formSubmitAttempted = true;

    // Mark all edited fields as touched to show validation errors if necessary
     Object.keys(this.editMode).forEach(key => {
        if (this.editMode[key as keyof typeof this.editMode]) {
          this.userForm.get(key)?.markAsTouched();
        }
      });

    if (this.userForm.invalid) {
       console.log('Form is invalid:', this.userForm.errors);
       console.log('Form status:', this.userForm.status);
       console.log('Edit mode:', this.editMode);
       // Optionally iterate controls to find specific errors
        Object.keys(this.userForm.controls).forEach(key => {
          const control = this.userForm.get(key);
          const controlErrors = control?.errors;
          if (controlErrors != null) {
            console.log(`Control '${key}' errors:`, controlErrors);
            console.log(`Control '${key}' value:`, control?.value);
            console.log(`Control '${key}' enabled:`, control?.enabled);
          }
        });
      return;
    }

    this.isLoading = true;
    const updatedData: any = {};

    // Only include fields that are currently in edit mode
    Object.keys(this.editMode).forEach(key => {
       const typedKey = key as keyof typeof this.editMode;
        if (this.editMode[typedKey]) {
            const control = this.userForm.get(key);
            // Special handling for password: only include if it has a value
            if (key === 'password') {
                if (control?.value) {
                    updatedData[key] = control.value;
                }
            } else {
                updatedData[key] = control?.value;
            }
        }
    });

    if (Object.keys(updatedData).length === 0) {
        console.log("No changes to submit.");
        this.isLoading = false;
        return;
    }

    console.log("Submitting updated data:", updatedData);
    
    this.authService.updateUserDetails(updatedData).subscribe({
      next: (response) => {
        console.log('Update successful', response);
        this.isLoading = false;
        // Reset edit mode and disable form after successful update
        Object.keys(this.editMode).forEach(
          (key) => (this.editMode[key as keyof typeof this.editMode] = false)
        );
        this.userForm.disable();
        // Optionally show success message
      },
      error: (error) => {
        console.error('Update failed', error);
        this.isLoading = false;
        // Optionally show error message
      }
    });
  }
}
