import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { DocumentService } from '../../../services/document.service'; // Service to get/delete users
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: any[] | null = null;
  currentUserForPermissions: any | null = null; // Currently logged-in user for permission checks
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private docsService: DocumentService,
    private authService: AuthService,
    private translate: TranslateService,
    private confirmationModalService: ConfirmationModalService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUserData();
    this.loadUsers();
  }

  loadCurrentUserData(): void {
    // Get the current user once for permission checks
     this.authService.currentUser.subscribe((userObj: any) => {
        this.currentUserForPermissions = userObj;
    });
    // Or use a synchronous method if available in AuthService
    // this.currentUserForPermissions = this.authService.currentUserValue;
  }


  loadUsers(): void {
    this.isLoading = true;
    this.docsService.getUsers().subscribe({
        next: (data: any[]) => { // Expecting an array
            const currentUserId = this.currentUserForPermissions?.user?.id;
            // Filter out the current user from the list
            this.users = data ? data.filter((user: any) => user.id !== currentUserId) : [];
            this.isLoading = false;
        },
        error: (error) => {
            console.error("Error loading users:", error);
            this.isLoading = false;
            this.users = []; // Ensure users is an empty array on error
        }
    });
  }

  editUser(userId: string): void {
    // Navigate to the generic edit component for users
    this.router.navigate(['/documents', 'user', 'edit', userId]);
  }

  canEditUser(userToList: any): boolean {
    const loggedInRoles = this.currentUserForPermissions?.roles;
    if (!loggedInRoles || !userToList?.roles) return false;

    if (loggedInRoles.includes('root_super_admin')) {
      return true; // Root can edit anyone
    }
    if (loggedInRoles.includes('super_admin')) {
      // Super admin can edit anyone except root
      return !userToList.roles.some((role: any) => role.name === 'root_super_admin');
    }
    return false; // Regular users cannot edit others here
  }

  canDeleteUser(userToList: any): boolean {
     const loggedInRoles = this.currentUserForPermissions?.roles;
     if (!loggedInRoles) return false;
     // Only root can delete users (adjust logic if needed)
     return loggedInRoles.includes('root_super_admin');
  }


  deleteUser(userId: string): void {
    this.confirmationModalService
      .confirm({
        titleKey: 'MODAL.DELETE_CONFIRMATION',
        messageKey: 'CONFIRM_DELETE_USER', // Make sure this key exists in translation files
        confirmBtnKey: 'MODAL.DELETE',
        confirmBtnClass: 'btn-danger'
      })
      .then((confirmed) => {
        if (confirmed) {
          this.isLoading = true; // Indicate loading during delete
          this.docsService.deleteUser(userId).subscribe({
             next: () => {
                this.isLoading = false;
                this.loadUsers(); // Refresh the list after successful deletion
                // Optionally show success message
             },
             error: (error) => {
                 console.error("Error deleting user:", error);
                 this.isLoading = false;
                 // Optionally show error message
             }
          });
        }
      })
      .catch(() => {
        // Handle modal dismissal if necessary
         console.log('User deletion cancelled.');
      });
  }

  printUserRoles(roles?: any[]): string {
    if (!roles || roles.length === 0) {
        return this.translate.instant('ROLE_UNKNOWN'); // Handle case where roles might be empty/undefined
    }
    // Map role names to translated keys and join them
    return roles.map(role => {
      console.log(role)
        return role.role_label;
    }).join(', ');
  }

}