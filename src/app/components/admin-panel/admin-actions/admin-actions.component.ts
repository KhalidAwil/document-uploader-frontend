import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RoleHierarchyService } from '../../../services/role-hierarchy.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-actions',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './admin-actions.component.html',
  styleUrls: ['./admin-actions.component.scss']
})
export class AdminActionsComponent implements OnInit {
  creatableTypes: { label: string; type: string; icon: string }[] = [];
  user: any | null = null; // For role checks (*ngIf)

  constructor(
    private router: Router,
    private authService: AuthService,
    private roleHierarchyService: RoleHierarchyService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadUserData(); // Load user for role checks
    this.setCreatableTypes();
  }

   loadUserData(): void {
    // Subscribe to user data needed for *ngIf directives
    this.authService.currentUser.subscribe((userObj: any) => {
      this.user = userObj;
    });
  }

  setCreatableTypes(): void {
    // Define the keys for translation
    const translationKeys = [
      'ADMIN_PANEL_CREATE_USER',
      'ADMIN_PANEL_CREATE_NEWS',
      'ADMIN_PANEL_CREATE_GUIDE',
      'ADMIN_PANEL_CREATE_ARCHIVE_C',
      'ADMIN_PANEL_CREATE_RELEASE',
      'ADMIN_PANEL_CREATE_MEDIA',
      'ADMIN_PANEL_CREATE_BIAN',
      'ADMIN_PANEL_CREATE_ATHAR'
    ];

    this.translate.get(translationKeys).subscribe((translations) => {
        // Define the potential types and their icons
        const potentialTypes = [
          { labelKey: 'ADMIN_PANEL_CREATE_USER', type: 'user', icon: 'bi bi-person-fill' },
          { labelKey: 'ADMIN_PANEL_CREATE_NEWS', type: 'news', icon: 'bi bi-newspaper' },
          { labelKey: 'ADMIN_PANEL_CREATE_GUIDE', type: 'guide', icon: 'bi bi-book' },
          { labelKey: 'ADMIN_PANEL_CREATE_ARCHIVE_C', type: 'archive_c', icon: 'bi bi-archive' },
          { labelKey: 'ADMIN_PANEL_CREATE_RELEASE', type: 'release', icon: 'bi bi-megaphone' },
          { labelKey: 'ADMIN_PANEL_CREATE_MEDIA', type: 'media', icon: 'bi bi-collection-play-fill' },
          { labelKey: 'ADMIN_PANEL_CREATE_BIAN', type: 'bian', icon: 'bi bi-body-text' },
          { labelKey: 'ADMIN_PANEL_CREATE_ATHAR', type: 'athar', icon: 'bi bi-radar' }
        ];

        // Filter types based on permissions and map to final structure
        this.creatableTypes = potentialTypes
          .filter(docType => {
            // For user creation, also check role hierarchy permissions
            if (docType.type === 'user') {
              return this.authService.hasPermission(`create ${docType.type}`) && 
                     this.roleHierarchyService.canCreateUsers();
            }
            // For other document types, use regular permission check
            return this.authService.hasPermission(`create ${docType.type}`);
          })
          .map(docType => ({
            label: translations[docType.labelKey], // Use translated label
            type: docType.type,
            icon: docType.icon
          }));
      });
  }

  createDocument(type: string): void {
    // Navigate to the generic create route, passing the type
    this.router.navigate(['/documents', type, 'create']);
  }

  createDropdown(): void {
    // Navigate to the dropdown management route
    this.router.navigate(['/admin/dropdown_management']);
  }
}