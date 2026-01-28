import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { DocumentGuideComponent } from './components/document-guide/document-guide.component';
import { DocumentNewsComponent } from './components/document-news/document-news.component';
import { DocumentBianComponent } from './components/document-bian/document-bian.component';
import { DocumentArchiveCComponent } from './components/document-archive-c/document-archive-c.component';
import { DocumentAtharComponent } from './components/document-athar/document-athar.component';
import { DocumentReleaseComponent } from './components/document-release/document-release.component';
import { ViewDocumentComponent } from './components/generic/view-document/view-document.component';
import { EditDocumentComponent } from './components/generic/edit-document/edit-document.component';
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { RoleGuard } from './guards/role.guard';
import { AuthGuard } from './guards/auth.guard';
import { HomepageComponent } from './components/homepage/homepage.component';
import { DocumentMediaComponent } from './components/document-media/document-media.component';
import { CreateDocumentComponent } from './components/generic/create-document/create-document.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { ContactComponent } from './components/contact/contact.component';
import { DropdownManagementComponent } from './components/dropdown-management/dropdown-management.component';
import { DocumentsComponent } from './components/documents/documents.component';
import { JoinUsComponent } from './components/join-us/join-us.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { ReportsComponent } from './components/reports/reports.component';
import { AdminProfileComponent } from './components/admin-panel/admin-profile/admin-profile.component';
import { AdminActionsComponent } from './components/admin-panel/admin-actions/admin-actions.component';
import { AdminUsersComponent } from './components/admin-panel/admin-users/admin-users.component';
import { AdminContactMessagesComponent } from './components/admin-panel/admin-contact-messages/admin-contact-messages.component';
import { AdminSiteSettingsComponent } from './components/admin-panel/admin-site-settings/admin-site-settings.component';
import { SiteAnalyticsComponent } from './components/admin-panel/site-analytics/site-analytics.component';
import { SiteLabelsComponent } from './components/admin-panel/site-labels/site-labels.component';
import { ContentManagerComponent } from './components/admin-panel/content-manager/content-manager.component';
import { EditAtharDocumentComponent } from './components/athar/edit-athar-document/edit-athar-document.component';
import { CreateAtharDocumentComponent } from './components/athar/create-athar-document/create-athar-document.component';

// Helper function to convert numbers to Arabic numerals
const toArabicNumerals = (num: string): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
};

export const routes: Routes = [
  {
    path: 'login-yemnat-aqy',
    component: LoginComponent
  },
  {
    path: '',
    component: HomepageComponent,
    data: { breadcrumb: 'HOME' }
  },
  {
    path: 'documents',
    component: DocumentsComponent,
    data: { breadcrumb: 'DOCUMENTS_TITLE' },
    children: [
      {
        path: 'guide',
        data: { breadcrumb: 'DOCUMENT_GUIDES' },
        children: [
          {
            path: '',
            component: DocumentGuideComponent,
            data: {
              modelType: 'guide'
            }
          },
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.GUIDE',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'guide'
            }
          },
          {
            path: 'edit/:id',
            component: EditDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.GUIDE',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'guide',
              getRequiredPermission: () => 'edit guide'
            }
          },
          {
            path: 'create',
            component: CreateDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.GUIDE',
              modelType: 'guide',
              getRequiredPermission: () => 'create guide'
            }
          }
        ]
      },
      {
        path: 'news',
        data: { breadcrumb: 'DOCUMENT_NEWS' },
        children: [
          {
            path: '',
            component: DocumentNewsComponent,
            data: {
              modelType: 'news'
            }
          },
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.NEWS',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'news'
            }
          },
          {
            path: 'edit/:id',
            component: EditDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.NEWS',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'news',
              getRequiredPermission: () => 'edit news'
            }
          },
          {
            path: 'create',
            component: CreateDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.NEWS',
              modelType: 'news',
              getRequiredPermission: () => 'create news'
            }
          }
        ]
      },
      {
        path: 'bian',
        data: { breadcrumb: 'DOCUMENT_BIANS' },
        children: [
          {
            path: '',
            component: DocumentBianComponent,
            data: {
              modelType: 'bian'
            }
          },
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.BIAN',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'bian'
            }
          },
          {
            path: 'edit/:id',
            component: EditDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.BIAN',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'bian',
              getRequiredPermission: () => 'edit bian'
            }
          },
          {
            path: 'create',
            component: CreateDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.BIAN',
              modelType: 'bian',
              getRequiredPermission: () => 'create bian'
            }
          }
        ]
      },
      {
        path: 'archive_c',
        data: { breadcrumb: 'DOCUMENT_ARCHIVE_C' },
        children: [
          {
            path: '',
            component: DocumentArchiveCComponent,
            data: {
              modelType: 'archive_c'
            }
          },
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.ARCHIVE',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'archive_c'
            }
          },
          {
            path: 'edit/:id',
            component: EditDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.ARCHIVE',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'archive_c',
              getRequiredPermission: () => 'edit archive_c'
            }
          },
          {
            path: 'create',
            component: CreateDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.ARCHIVE',
              modelType: 'archive_c',
              getRequiredPermission: () => 'create archive_c'
            }
          }
        ]
      },
      {
        path: 'athar',
        data: { breadcrumb: 'DOCUMENT_ATHAR' },
        children: [
          {
            path: '',
            component: DocumentAtharComponent,
            data: {
              modelType: 'athar'
            }
          },
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.ATHAR',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'athar'
            }
          },
          {
            path: 'edit/:id',
            component: EditAtharDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.ATHAR',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'athar',
              getRequiredPermission: () => 'edit athar'
            }
          },
          {
            path: 'create',
            component: CreateAtharDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.ATHAR',
              modelType: 'athar',
              getRequiredPermission: () => 'create athar'
            }
          }
        ]
      },
      {
        path: 'release',
        data: { breadcrumb: 'DOCUMENT_RELEASES' },
        children: [
          {
            path: '',
            component: DocumentReleaseComponent,
            data: {
              modelType: 'release'
            }
          },
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.RELEASE',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'release'
            }
          },
          {
            path: 'edit/:id',
            component: EditDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.RELEASE',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'release',
              getRequiredPermission: () => 'edit release'
            }
          },
          {
            path: 'create',
            component: CreateDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.RELEASE',
              modelType: 'release',
              getRequiredPermission: () => 'create release'
            }
          }
        ]
      },
      {
        path: 'media',
        data: { breadcrumb: 'DOCUMENT_MEDIA' },
        children: [
          {
            path: '',
            component: DocumentMediaComponent,
            data: {
              modelType: 'media'
            }
          },
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.MEDIA',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'media'
            }
          },
          {
            path: 'edit/:id',
            component: EditDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.MEDIA',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'media',
              getRequiredPermission: () => 'edit media'
            }
          },
          {
            path: 'create',
            component: CreateDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.MEDIA',
              modelType: 'media',
              getRequiredPermission: () => 'create media'
            }
          }
        ]
      },
      {
        path: 'user',
        data: { breadcrumb: 'DOCUMENT_USER' },
        children: [
          {
            path: 'view/:id',
            component: ViewDocumentComponent,
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'VIEW_ROUTE.USER',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'user'
            }
          },
          {
            path: 'edit/:id',
            component: EditDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: (route: ActivatedRouteSnapshot) => ({
                label: 'EDIT_ROUTE.USER',
                params: { id: toArabicNumerals(route.params['id']) }
              }),
              modelType: 'user',
              getRequiredPermission: () => 'edit user'
            }
          },
          {
            path: 'create',
            component: CreateDocumentComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: {
              breadcrumb: 'CREATE_ROUTE.USER',
              modelType: 'user',
              getRequiredPermission: () => 'create user'
            }
          }
        ]
      },
    ]
  },
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: 'ADMIN_PANEL' },
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        component: AdminProfileComponent,
        data: { breadcrumb: 'PROFILE' }
      },
      {
        path: 'site-analytics',
        component: SiteAnalyticsComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'تحليلات الموقع',
          getRequiredPermission: () => ['root_super_admin']
        }
      },
      {
        path: 'actions',
        component: AdminActionsComponent,
        data: { breadcrumb: 'USER_ACTIONS' }
      },
      {
        path: 'dashboard',
        component: StatisticsComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'DASHBOARD',
          getRequiredPermission: () => ['super_admin', 'root_super_admin']
        }
      },
      {
        path: 'reports',
        component: ReportsComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'REPORTS',
          getRequiredPermission: () => ['root_super_admin']
        }
      },
      {
        path: 'users',
        component: AdminUsersComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'USERS',
          getRequiredPermission: () => ['super_admin', 'root_super_admin']
        }
      },
      {
        path: 'messages',
        component: AdminContactMessagesComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'CONTACT_MESSAGES',
          getRequiredPermission: () => ['super_admin', 'root_super_admin']
        }
      },
      {
        path: 'settings',
        component: AdminSiteSettingsComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'SITE_SETTINGS',
          getRequiredPermission: () => ['root_super_admin']
        }
      },
      {
        path: 'labels',
        component: SiteLabelsComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'نصوص الموقع',
          getRequiredPermission: () => ['root_super_admin']
        }
      },
      {
        path: 'dropdown_management',
        component: DropdownManagementComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'DROPDOWN_MANAGEMENT.TITLE',
          getRequiredPermission: () => ['root_super_admin']
        }
      },
      {
        path: 'content-manager',
        component: ContentManagerComponent,
        canActivate: [RoleGuard],
        data: {
          breadcrumb: 'إدارة المحتوى',
          getRequiredPermission: () => ['super_admin', 'root_super_admin']
        }
      }
    ]
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: { breadcrumb: 'CONTACT' },
  },
  {
    path: 'join-us',
    component: JoinUsComponent,
    data: { breadcrumb: 'JOIN_US.NAV_TITLE' },
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
    data: { breadcrumb: 'NOT_FOUND.TITLE' },
  },
  {
    path: '**',
    redirectTo: 'not-found'
  }
];