import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DropdownService, DropdownOption } from '../../../services/dropdown.service';
import { RoleHierarchyService } from '../../../services/role-hierarchy.service';
import { RoleService } from '../../../services/role.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dropdown-select',
  templateUrl: './dropdown-select.component.html',
  styleUrls: ['./dropdown-select.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule]
})
export class DropdownSelectComponent implements OnInit, OnDestroy {
  @Input() id: string = '';
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() dropdownName: string = '';
  @Input() control: AbstractControl | null = null;
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() initialValue: string | number | null = null;
  @Input() excludeValues: string[] = []; // New input for filtering out specific values

  options: DropdownOption[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  selectedOption: DropdownOption | null = null;
  
  // Subject to handle component destruction
  private destroy$ = new Subject<void>();

  constructor(
    private dropdownService: DropdownService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private roleHierarchyService: RoleHierarchyService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    // Set up placeholder
    this.placeholder = this.placeholder || this.translate.instant('COMMON.SELECT_OPTION');

    // Apply disabled state
    if (this.disabled && this.control) {
      this.control.disable();
    }

    if (this.dropdownName) {
      this.loadDropdownOptions();
      
      // Subscribe to dropdown changes to automatically update options
      this.dropdownService.dropdownsChanged()
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          // Only reload if we've already successfully loaded once
          if (this.options.length > 0 || this.errorMessage) {
            this.loadDropdownOptions(false);
          }
        });
    }

    // Subscribe to value changes to update selected option
    if (this.control) {
      this.control.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          this.updateSelectedOption(value);
        });
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  get formControl(): FormControl {
    if (!this.control) {
      console.warn(`Control is null or undefined for dropdown ${this.id || this.dropdownName}. Using a default FormControl instead.`);
      return new FormControl(this.initialValue);
    }
    
    if (!(this.control instanceof FormControl)) {
      console.warn(`Control is not a FormControl instance for dropdown ${this.id || this.dropdownName}. Using default FormControl.`);
      return new FormControl(this.initialValue);
    }
    
    return this.control as FormControl;
  }

  private loadDropdownOptions(showLoading: boolean = true): void {
    if (showLoading) {
      this.isLoading = true;
    }
    this.errorMessage = '';

    // Handle role_code dropdown specially - fetch from roles table
    if (this.dropdownName === 'role_code') {
      this.loadRoleOptions();
      return;
    }

    // Force refresh for role_code dropdown to ensure we have latest data
    const forceRefresh = this.dropdownName === 'role_code';
    
    this.dropdownService.getDropdownByName(this.dropdownName, forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dropdown) => {
          if (dropdown) {
            let options = dropdown.options;
            
            // Apply exclusion filter if excludeValues is provided
            if (this.excludeValues && this.excludeValues.length > 0) {
              options = options.filter(option => !this.excludeValues.includes(option.value));
            }
            
            this.options = options;
            
            // Check for initial value or control value after options are loaded
            const currentValue = this.control?.value ?? this.initialValue;
            if (currentValue) {
              this.updateSelectedOption(currentValue);
            }
          } else {
            this.errorMessage = this.translate.instant('COMMON.DROPDOWN_NOT_FOUND');
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`Error loading dropdown "${this.dropdownName}":`, error);
          this.errorMessage = this.translate.instant('COMMON.ERROR_LOADING_DROPDOWN');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Load role options from roles table for role_code dropdown
   */
  private loadRoleOptions(): void {
    this.roleService.getRoles(true) // Force refresh to get latest roles
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          // Filter out root_super_admin - only one should exist and is created during initial seeding
          const filteredRoles = roles.filter(role => role.name !== 'root_super_admin');
          
          // Convert roles to dropdown options with format "role_label - role_code"
          let options: DropdownOption[] = filteredRoles.map(role => ({
            label: `${role.role_label} - ${role.role_code}`,
            value: role.role_code
          }));

          // Apply role hierarchy filtering
          options = this.filterRoleOptions(options);

          // Apply exclusion filter if excludeValues is provided
          if (this.excludeValues && this.excludeValues.length > 0) {
            options = options.filter(option => !this.excludeValues.includes(option.value));
          }

          this.options = options;

          // Check for initial value or control value after options are loaded
          const currentValue = this.control?.value ?? this.initialValue;
          if (currentValue) {
            this.updateSelectedOption(currentValue);
          }

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading roles for role_code dropdown:', error);
          this.errorMessage = this.translate.instant('COMMON.ERROR_LOADING_DROPDOWN');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Find and set the selected option based on value
   */
  private updateSelectedOption(value: any): void {
    if (value === null || value === undefined) {
      this.selectedOption = null;
      return;
    }
    
    // Convert to string for comparison if needed
    const valueStr = String(value);
    this.selectedOption = this.options.find(option => option.value === valueStr || option.value === value) || null;
    this.cdr.detectChanges();
  }

  /**
   * Check if the control is invalid
   */
  isInvalid(): boolean {
    return !!this.control && this.control.invalid && (this.control.dirty || this.control.touched);
  }

  /**
   * Get appropriate error message
   */
  getErrorMessage(): string {
    if (!this.control || !this.control.errors) return '';

    if (this.control.errors['required']) {
      return this.translate.instant('COMMON.VALIDATION.REQUIRED');
    }

    return this.translate.instant('COMMON.VALIDATION.INVALID');
  }
  
  /**
   * Filter role options based on current user's permissions
   */
  private filterRoleOptions(options: DropdownOption[]): DropdownOption[] {
    if (!options || options.length === 0) {
      return options;
    }

    // Check if current user can create users at all
    if (!this.roleHierarchyService.canCreateUsers()) {
      return [];
    }
    console.log('Roles', options);
    // Filter roles based on what the current user can assign
    return options.filter(option => {
      const roleCode = option.value;
      return this.roleHierarchyService.canAssignRole(roleCode.toString());
    });
  }

  /**
   * Check if current user can create users (for external components to check)
   */
  canCreateUsers(): boolean {
    return this.roleHierarchyService.canCreateUsers();
  }

  /**
   * Get error message for role assignment
   */
  getRoleAssignmentError(): string {
    if (!this.roleHierarchyService.canCreateUsers()) {
      return 'غير مخول لإنشاء المستخدمين';
    }
    return '';
  }

  /**
   * Manually refresh the dropdown options
   */
  refreshOptions(): void {
    this.loadDropdownOptions(true);
  }
}