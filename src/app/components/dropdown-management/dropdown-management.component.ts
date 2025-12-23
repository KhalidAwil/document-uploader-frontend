import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DropdownService } from '../../services/dropdown.service';
import { ConfirmationModalService } from '../../services/confirmation-modal.service';
import { RoleService, Role, RoleUpdateResponse } from '../../services/role.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';

interface DropdownOption {
  label: string;
  value: string;
}

interface Dropdown {
  id: number;
  name: string;
  label?: string;
  options: DropdownOption[];
}

@Component({
  selector: 'app-dropdown-management',
  templateUrl: './dropdown-management.component.html',
  styleUrls: ['./dropdown-management.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  standalone: true
})
export class DropdownManagementComponent implements OnInit {
  dropdownForm!: FormGroup;
  dropdowns: Dropdown[] = [];
  selectedDropdown: Dropdown | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  backendErrors: { [key: string]: string[] } = {};
  frontendErrors: { [key: string]: string[] } = {};
  isRolesDropdown: boolean = false;
  isRestrictedDropdown: boolean = false;
  originalRoles: Role[] = [];
  noDropdownSelected: boolean = true;

  showSuccessToast: boolean = false;
  successMessage: string = '';

  private toastTimeout: any;
  // Dropdowns that cannot be edited at all
  private restrictedDropdowns: string[] = ['document_type', 'media_type', 'report_document_type'];
  // Dropdowns where options can be edited but not added or deleted
  private noAddDeleteDropdowns: string[] = ['role_code'];
  // Dropdowns where options can be fully edited
  private editableDropdowns: string[] = [
    'type_c', 
    'release_type',
    'athar_material',
    'athar_period',
    'athar_origin_country',
    'athar_preservation_status',
    'athar_legal_status',
    'athar_present_location',
    'athar_present_location_country',
    'athar_required_procedure',
    'athar_type'
  ];

  constructor(
    private dropdownService: DropdownService,
    private fb: FormBuilder,
    private translate: TranslateService,
    private confirmationModalService: ConfirmationModalService,
    private roleService: RoleService,
    private http: HttpClient
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadDropdowns();
  }

  private initForm(): void {
    this.dropdownForm = this.fb.group({
      name: [{ value: '', disabled: true }],
      label: [''],
      options: this.fb.array([this.createOptionFormGroup()])
    });
  }

  get nameControl() {
    return this.dropdownForm.get('name');
  }

  get optionsArray(): FormArray {
    return this.dropdownForm.get('options') as FormArray;
  }

  createOptionFormGroup(label: string = '', value: string = '', name: string = ''): FormGroup {
    return this.fb.group({
      label: [label, [Validators.required, Validators.minLength(1)]],
      value: [value, [Validators.required, Validators.minLength(1)]],
      name: [name]
    });
  }

  loadDropdowns(): void {
    console.log('Loading dropdowns into component...');
    this.isLoading = true;

    this.dropdownService.getDropdowns(true)
      .subscribe({
        next: (data) => {
          console.log('Dropdown data received:', data);
          this.dropdowns = data.map(dropdown => ({
            ...dropdown,
            options: typeof dropdown.options === 'string' ? JSON.parse(dropdown.options) : dropdown.options
          }));
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = this.translate.instant('DROPDOWN_MANAGEMENT.ERRORS.DROPDOWN_LOAD_FAILED');
          this.isLoading = false;
          console.error('Error loading dropdowns:', error);
        }
      });
  }

  addOption(): void {
    if (this.isRolesDropdown) {
      this.showRolesAdditionWarning();
      return;
    }
    
    if (this.isRestrictedDropdown) {
      this.showRestrictedDropdownWarning();
      return;
    }
    
    this.optionsArray.push(this.createOptionFormGroup());
  }

  private showRestrictedDropdownWarning(): void {
    this.confirmationModalService.confirm({
      titleKey: 'MODAL.DROPDOWN_MODIFICATION_RESTRICTED',
      messageKey: 'MODAL.DROPDOWN_MODIFICATION_RESTRICTED_MESSAGE',
      confirmBtnKey: 'MODAL.OK',
      confirmBtnClass: 'btn-primary',
      cancelBtnKey: undefined
    });
  }

  private showRolesAdditionWarning(): void {
    this.confirmationModalService.confirm({
      titleKey: 'MODAL.ROLE_ADDITION_RESTRICTED',
      messageKey: 'MODAL.ROLE_ADDITION_RESTRICTED_MESSAGE',
      confirmBtnKey: 'MODAL.OK',
      confirmBtnClass: 'btn-primary',
      cancelBtnKey: undefined
    });
  }

  removeOption(index: number): void {
    if (this.isRolesDropdown) {
      this.showOptionRemovalWarning();
      return;
    }
    
    if (this.isRestrictedDropdown) {
      this.showRestrictedDropdownWarning();
      return;
    }
    
    const option = (this.optionsArray.at(index) as FormGroup).value;
    if ((option.label || option.value) && this.optionsArray.length > 1) {
      this.confirmationModalService.confirm({
        titleKey: 'MODAL.DELETE_OPTION_CONFIRMATION',
        messageKey: 'MODAL.CONFIRM_DELETE_OPTION',
        messageParams: { value: option.label || option.value },
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      }).then(confirmed => {
        if (confirmed && this.optionsArray.length > 1) {
          this.optionsArray.removeAt(index);
        }
      });
    } else if (this.optionsArray.length > 1) {
      this.optionsArray.removeAt(index);
    }
  }

  private showOptionRemovalWarning(): void {
    this.confirmationModalService.confirm({
      titleKey: 'MODAL.OPTION_REMOVAL_RESTRICTED',
      messageKey: 'MODAL.OPTION_REMOVAL_RESTRICTED_MESSAGE',
      confirmBtnKey: 'MODAL.OK',
      confirmBtnClass: 'btn-primary',
      cancelBtnKey: undefined
    });
  }

  saveDropdown(): void {
    const nameControl = this.dropdownForm.get('name');
    const name = nameControl?.value || '';
    
    const options = this.optionsArray.value.map((option: { label: any; value: any; name: any; }) => ({
      label: option.label,
      value: option.value,
      name: option.name
    }));
  
    // Check for duplicate labels
    const labels = options.map((option: { label: any; }) => option.label);
    if (new Set(labels).size !== labels.length) {
      this.frontendErrors['general'] = [this.translate.instant('DROPDOWN_MANAGEMENT.ERRORS.DUPLICATE_LABELS')];
      return;
    }
  
    // Check for duplicate values
    const values = options.map((option: { value: any; }) => option.value);
    if (new Set(values).size !== values.length) {
      this.frontendErrors['general'] = [this.translate.instant('DROPDOWN_MANAGEMENT.ERRORS.DUPLICATE_VALUES')];
      return;
    }
  
    // Check for empty labels or values
    if (options.some((option: { label: any; value: any; }) => !option.label || !option.value)) {
      this.frontendErrors['general'] = [this.translate.instant('DROPDOWN_MANAGEMENT.ERRORS.EMPTY_FIELDS')];
      return;
    }
  
    // Check for duplicate role codes if this is the roles dropdown
    if (this.isRolesDropdown) {
      const roleCodes = options.map((option: { value: any; }) => option.value);
      if (new Set(roleCodes).size !== roleCodes.length) {
        this.frontendErrors['general'] = [this.translate.instant('DROPDOWN_MANAGEMENT.ERRORS.DUPLICATE_ROLE_CODES')];
        return;
      }
    }
  
    // Check for invalid role codes if this is the roles dropdown
    if (this.isRolesDropdown) {
      for (let i = 0; i < options.length; i++) {
        const newRoleCode = options[i].value;
        const originalRoleCode = this.originalRoles[i]?.role_code;
        const allRoles = this.roleService.getCachedRoles();
        
        if (newRoleCode !== originalRoleCode && allRoles.some((role: { role_code: string; }) => role.role_code === newRoleCode && role.role_code !== originalRoleCode)) {
          const errorMessage = this.translate.instant('VALIDATION.ALREADY_IN_USE', { value: String(newRoleCode) });
          this.frontendErrors[`options.${i}.value`] = [errorMessage];
          return;
        }
      }
    }
  
    this.confirmationModalService.confirm({
      titleKey: this.isRolesDropdown ? 'MODAL.UPDATE_ROLES_CONFIRMATION' : 'MODAL.UPDATE_DROPDOWN_CONFIRMATION',
      messageKey: this.isRolesDropdown ? 'MODAL.CONFIRM_UPDATE_ROLES' : 'MODAL.CONFIRM_UPDATE_DROPDOWN',
      messageParams: { name: name },
      confirmBtnKey: 'MODAL.UPDATE',
      confirmBtnClass: 'btn-warning'
    }).then(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        console.log(name, options);
        this.performUpdateDropdown(name, options);
      }
    });
  }

  private performCreateDropdown(name: string, options: DropdownOption[]): void {
    const stringifiedOptions = options.map(option => ({
      label: option.label,
      value: String(option.value)
    }));

    this.dropdownService.addDropdown(name, stringifiedOptions)
      .subscribe({
        next: () => {
          this.handleSaveSuccess(this.translate.instant('DROPDOWN_MANAGEMENT.MESSAGES.CREATE_SUCCESS'));
        },
        error: (error) => {
          this.handleSaveError(this.translate.instant('DROPDOWN_MANAGEMENT.ERRORS.CREATE_FAILED'), error.error);
        }
      });
  }

  private performUpdateDropdown(name: string, options: DropdownOption[]): void {
    if (!this.selectedDropdown) {
      console.error('No selected dropdown to update');
      this.handleSaveError('No selected dropdown', null);
      return;
    }

    const stringifiedOptions = options.map(option => ({
      label: option.label,
      value: String(option.value)
    }));

    const labelValue = this.dropdownForm.get('label')?.value || '';
    const payload = { name, label: labelValue, options: stringifiedOptions };
    console.log('Updating dropdown with payload:', payload);

    if (this.isRolesDropdown || name === 'role_code') {
      this.updateRolesAndDropdown(name, stringifiedOptions);
    } else {
      this.updateRegularDropdown(payload);
    }
  }

  private updateRegularDropdown(payload: { name: string; label: string; options: DropdownOption[] }): void {
    if (!this.selectedDropdown) return;
    this.dropdownService.updateDropdown(this.selectedDropdown.id, payload)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.handleSaveSuccess(this.translate.instant('DROPDOWN_MANAGEMENT.MESSAGES.UPDATE_SUCCESS'));
        },
        error: (error) => {
          this.isLoading = false;
          this.handleSaveError(this.translate.instant('DROPDOWN_MANAGEMENT.MESSAGES.UPDATE_FAILED'), error.error);
        }
      });
  }

  private updateRolesAndDropdown(name: string, options: DropdownOption[]): void {
    if (!this.selectedDropdown) return;

    console.log('Starting role update with options:', options);
    const updatedRoles = this.roleService.convertDropdownOptionsToRoles(options, this.originalRoles);
    console.log('Updated roles:', updatedRoles);

    if (updatedRoles.length !== this.originalRoles.length) {
      this.handleSaveError(this.translate.instant('DROPDOWN_MANAGEMENT.ERRORS.ROLES_COUNT_MISMATCH'), null);
      return;
    }

    const changedRoles = updatedRoles
      .map(updatedRole => {
        const originalRole = this.originalRoles.find(or => or.name === updatedRole.name);
        if (!originalRole) {
          console.warn(`No original role found for ${updatedRole.name}`);
          return null;
        }
        if (updatedRole.role_code !== originalRole.role_code || updatedRole.role_label !== originalRole.role_label) {
          return { original: originalRole, updated: updatedRole };
        }
        return null;
      })
      .filter((change): change is { original: Role; updated: Role } => change !== null);

    console.log('Changed roles:', changedRoles);

    if (changedRoles.length === 0) {
      console.log('No changes detected, updating dropdown only');
      const labelValue = this.dropdownForm.get('label')?.value || '';
      this.updateRegularDropdown({ name, label: labelValue, options });
      return;
    }

    const roleUpdateObservables = changedRoles.map(change =>
      this.roleService.updateRole(change.original.role_code, change.updated).pipe(
        catchError(error => {
          console.error(`Error updating ${change.original.role_code}:`, error);
          return of({ success: false, errors: error.errors || { general: ['Failed to update role'] } });
        })
      )
    );

    forkJoin(roleUpdateObservables).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (results) => {
        console.log('Role update results:', results);
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
          const combinedErrors = failed.reduce((acc, r) => ({ ...acc, ...r.errors }), {});
          this.handleSaveError('Role update failed', { errors: combinedErrors });
        } else {
          // Only update roles - the backend handles dropdown synchronization automatically
          this.handleSaveSuccess(this.translate.instant('DROPDOWN_MANAGEMENT.MESSAGES.ROLES_UPDATE_WITH_BACKGROUND'));
        }
      },
      error: (error) => {
        this.handleSaveError(error.message || 'Update failed', error);
      }
    });
  }

  private handleSaveSuccess(message: string): void {
    console.log('Save successful:', message);
    this.isLoading = true;
    this.roleService.getRoles(true).subscribe({
      next: (roles) => {
        this.originalRoles = roles;
        this.loadDropdowns();
        this.resetFormWithoutConfirmation(true);
        this.selectedDropdown = null;
        this.isLoading = false;
        this.showSuccessToast = true;
        this.successMessage = message;
        this.noDropdownSelected = true;
        this.backendErrors = {};
        this.frontendErrors = {};
      },
      error: (error) => {
        console.error('Error refreshing roles:', error);
        this.isLoading = false;
        this.errorMessage = 'Failed to refresh data';
      }
    });
  }

  private handleSaveError(message: string, error: any): void {
    this.isLoading = false;
    this.errorMessage = message;
    if (error && error.errors) {
      this.backendErrors = error.errors;
    } else {
      this.backendErrors = { general: [message] };
    }
    console.error('Error saving dropdown:', error);
  }

  editDropdown(dropdown: Dropdown): void {
    console.log('Edit dropdown called with:', dropdown);
    this.noDropdownSelected = false;

    if (this.dropdownForm.dirty) {
      this.confirmationModalService.confirm({
        titleKey: 'MODAL.UNSAVED_CHANGES_CONFIRMATION',
        messageKey: 'MODAL.CONFIRM_UNSAVED_CHANGES',
        confirmBtnKey: 'MODAL.CONTINUE',
        confirmBtnClass: 'btn-warning'
      }).then(confirmed => {
        if (confirmed) {
          this.prepareFormForEditing(dropdown);
        }
      });
    } else {
      this.prepareFormForEditing(dropdown);
    }
  }

  private prepareFormForEditing(dropdown: Dropdown): void {
    this.isRolesDropdown = dropdown.name === 'role_code';
    this.isRestrictedDropdown = this.restrictedDropdowns.includes(dropdown.name);
    this.selectedDropdown = dropdown;

    this.dropdownForm.reset({ name: dropdown.name, label: dropdown.label || '' }, { emitEvent: false });
    while (this.optionsArray.length) {
      this.optionsArray.removeAt(0);
    }

    if (this.isRolesDropdown) {
      this.isLoading = true;
      this.roleService.clearCache();
      this.roleService.getRoles(true).subscribe({
        next: (roles) => {
          console.log('Roles loaded for editing with forced refresh:', roles);
          this.originalRoles = [...roles];
          roles.forEach(role => {
            this.optionsArray.push(this.createOptionFormGroup(role.role_label, String(role.role_code), role.name));
          });
          this.isLoading = false;
          this.dropdownForm.markAsPristine();
        },
        error: (error) => {
          console.error('Error loading roles:', error);
          this.isLoading = false;
        }
      });
    } else {
      const options = typeof dropdown.options === 'string' ? JSON.parse(dropdown.options) : dropdown.options;
      options.forEach((opt: any) => {
        this.optionsArray.push(this.createOptionFormGroup(opt.label, String(opt.value)));
      });
      this.dropdownForm.markAsPristine();
    }
  }

  resetForm(): void {
    if (this.dropdownForm.dirty) {
      this.confirmationModalService.confirm({
        titleKey: 'MODAL.DISCARD_CHANGES_CONFIRMATION',
        messageKey: 'MODAL.CONFIRM_DISCARD_CHANGES',
        confirmBtnKey: 'MODAL.DISCARD',
        confirmBtnClass: 'btn-warning'
      }).then(confirmed => {
        if (confirmed) {
          this.resetFormWithoutConfirmation(true);
          this.selectedDropdown = null;
          this.noDropdownSelected = true;
        }
      });
    } else {
      this.resetFormWithoutConfirmation(true);
      this.selectedDropdown = null;
      this.noDropdownSelected = true;
    }
  }

  private resetFormWithoutConfirmation(addEmptyOption: boolean = true): void {
    while (this.optionsArray.length > 0) {
      this.optionsArray.removeAt(0);
    }
    this.dropdownForm.reset();
    if (addEmptyOption) {
      this.optionsArray.push(this.createOptionFormGroup());
    }
    this.isRolesDropdown = false;
    this.isRestrictedDropdown = false;
    this.originalRoles = [];
    this.errorMessage = '';
    this.backendErrors = {};
    this.frontendErrors = {};
    this.dropdownForm.markAsPristine();
    this.showSuccessToast = false;
    clearTimeout(this.toastTimeout);
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.dropdownForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  getFieldError(fieldName: string): string {
    const control = this.dropdownForm.get(fieldName);
    if (control && control.errors) {
      if (control.errors['required']) {
        return this.translate.instant('VALIDATION.REQUIRED');
      }
      if (control.errors['minlength']) {
        return this.translate.instant('VALIDATION.TOO_SHORT');
      }
    }
    return '';
  }

  getOptionErrors(index: number, field: 'label' | 'value'): string[] {
    const backendError = this.backendErrors[`options.${index}.${field}`] || [];
    const frontendError = this.frontendErrors[`options.${index}.${field}`] || [];
    return [...backendError, ...frontendError];
  }

  hasError(control: AbstractControl | null, errorName: string): boolean {
    return control ? !!control.errors?.[errorName] : false;
  }

  private ensureFreshRoleData(): Observable<Role[]> {
    this.roleService.clearCache();
    this.dropdownService.clearCache();

    const timestamp = new Date().getTime();
    const params = new HttpParams().set('_', timestamp.toString());
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return this.http.get<Role[]>(`${environment.apiUrl}/roles`, {
      withCredentials: true,
      headers: headers,
      params: params
    }).pipe(
      catchError(error => {
        console.error('Error getting fresh role data:', error);
        return this.roleService.getRoles(true);
      })
    );
  }

  /**
   * Checks if a dropdown is editable
   * @param dropdownName The name of the dropdown to check
   * @returns true if the dropdown is editable, false otherwise
   */
  isEditable(dropdownName: string | undefined): boolean {
    if (!dropdownName) return false;
    
    // Restricted dropdowns cannot be edited at all
    if (this.restrictedDropdowns.includes(dropdownName)) {
      return false;
    }
    
    // Role code dropdown and other specified dropdowns can be edited
    return this.editableDropdowns.includes(dropdownName) || this.noAddDeleteDropdowns.includes(dropdownName);
  }

  /**
   * Checks if options can be added to a dropdown
   * @param dropdownName The name of the dropdown to check
   * @returns true if options can be added, false otherwise
   */
  canAddOptions(dropdownName: string | undefined): boolean {
    if (!dropdownName) return false;
    
    // Cannot add options to restricted dropdowns or no-add-delete dropdowns
    return !this.restrictedDropdowns.includes(dropdownName) && 
           !this.noAddDeleteDropdowns.includes(dropdownName);
  }

  /**
   * Checks if options can be deleted from a dropdown
   * @param dropdownName The name of the dropdown to check
   * @returns true if options can be deleted, false otherwise
   */
  canDeleteOptions(dropdownName: string | undefined): boolean {
    if (!dropdownName) return false;
    
    // Cannot delete options from restricted dropdowns or no-add-delete dropdowns
    return !this.restrictedDropdowns.includes(dropdownName) && 
           !this.noAddDeleteDropdowns.includes(dropdownName);
  }
}
