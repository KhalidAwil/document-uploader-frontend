import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';

export interface RoleHierarchy {
  role_code: string;
  role_name: string;
  role_label: string;
  level: number;
  canAssign: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RoleHierarchyService {

  private roleHierarchy: { [key: string]: number } = {
    'root_super_admin': 100,
    'super_admin': 150,
    'guide_admin': 200,
    'bian_admin': 300,
    'release_admin': 400,
    'archive_c_admin': 500,
    'media_admin': 600,
    'news_admin': 700,
    'athar_admin': 800
  };

  private roleCodeToName: { [key: string]: string } = {
    '100': 'root_super_admin',
    '150': 'super_admin',
    '200': 'guide_admin',
    '300': 'bian_admin',
    '400': 'release_admin',
    '500': 'archive_c_admin',
    '600': 'media_admin',
    '700': 'news_admin',
    '800': 'athar_admin'
  };

  constructor(private authService: AuthService, private roleService: RoleService) {}

  /**
   * Check if the current user can assign a specific role
   * @param targetRoleCode The role code to be assigned
   * @returns boolean indicating if assignment is allowed
   */
  canAssignRole(targetRoleCode: string): boolean {
    const currentUser = this.authService.currentUserValue;
    
    if (!currentUser || !currentUser.roles || currentUser.roles.length === 0) {
      return false;
    }

    const currentUserRoles = currentUser.roles.map((role: any) => role.name || role);
    const targetRoleName = this.roleCodeToName[targetRoleCode];

    // If role code is not in predefined mapping, allow it but still apply security checks
    // This fixes the issue with letter-containing role codes not appearing in dropdown
    if (!targetRoleName) {
      // Still prevent creation of custom roles that might conflict with admin roles
      // Root super admin can assign any non-predefined role
      if (currentUserRoles.includes('root_super_admin')) {
        return true;
      }
      // Super admin can assign non-predefined roles (custom roles)
      if (currentUserRoles.includes('super_admin')) {
        return true;
      }
      // Other roles cannot assign custom/unknown roles
      return false;
    }

    // CRITICAL: Nobody can create root_super_admin - only one should exist
    if (targetRoleName === 'root_super_admin') {
      return false;
    }

    // Root super admin can assign any role EXCEPT root_super_admin
    if (currentUserRoles.includes('root_super_admin')) {
      return true;
    }

    // Super admin can assign all roles except root_super_admin
    if (currentUserRoles.includes('super_admin')) {
      return targetRoleName !== 'root_super_admin';
    }

    // Document admins cannot assign any admin roles
    const documentAdminRoles = [
      'guide_admin', 'bian_admin', 'release_admin', 
      'archive_c_admin', 'media_admin', 'news_admin', 'athar_admin'
    ];

    for (const adminRole of documentAdminRoles) {
      if (currentUserRoles.includes(adminRole)) {
        return false; // Document admins cannot create any users
      }
    }

    return false;
  }

  /**
   * Filter roles based on what the current user can assign
   * @param allRoles Array of all available roles
   * @returns Filtered array of roles the user can assign
   */
  filterAssignableRoles(allRoles: any[]): any[] {
    if (!allRoles || allRoles.length === 0) {
      return [];
    }

    return allRoles.filter(role => {
      const roleCode = role.role_code || role.code || role.id;
      return this.canAssignRole(roleCode.toString());
    });
  }

  /**
   * Get user-friendly error message for role assignment
   * @param targetRoleCode The role code that couldn't be assigned
   * @returns Error message explaining why assignment failed
   */
  getRoleAssignmentError(targetRoleCode: string): string {
    const currentUser = this.authService.currentUserValue;
    const targetRoleName = this.roleCodeToName[targetRoleCode];

    if (!currentUser || !currentUser.roles) {
      return 'غير مخول لإنشاء المستخدمين';
    }

    const currentUserRoles = currentUser.roles.map((role: any) => role.name || role);

    // Special message for root_super_admin creation attempt
    if (targetRoleName === 'root_super_admin') {
      return 'لا يمكن إنشاء مشرف جذري جديد - يُسمح بوجود مشرف جذري واحد فقط';
    }

    // Handle unknown/custom role codes
    if (!targetRoleName) {
      if (!currentUserRoles.includes('root_super_admin') && !currentUserRoles.includes('super_admin')) {
        return 'غير مخول لإنشاء أدوار مخصصة';
      }
    }

    const documentAdminRoles = [
      'guide_admin', 'bian_admin', 'release_admin', 
      'archive_c_admin', 'media_admin', 'news_admin', 'athar_admin'
    ];

    for (const adminRole of documentAdminRoles) {
      if (currentUserRoles.includes(adminRole)) {
        return 'مشرفو الأقسام لا يستطيعون إنشاء مستخدمين إداريين';
      }
    }

    return 'غير مخول لإنشاء هذا النوع من المستخدمين';
  }

  /**
   * Check if current user can create users at all
   * @returns boolean indicating if user creation is allowed
   */
  canCreateUsers(): boolean {
    const currentUser = this.authService.currentUserValue;
    
    if (!currentUser || !currentUser.roles || currentUser.roles.length === 0) {
      return false;
    }

    const currentUserRoles = currentUser.roles.map((role: any) => role.name || role);

    // Root super admin and super admin can create users
    return currentUserRoles.includes('root_super_admin') || 
           currentUserRoles.includes('super_admin');
  }

  /**
   * Get the current user's role level for comparison
   * @returns number representing the user's highest role level
   */
  getCurrentUserRoleLevel(): number {
    const currentUser = this.authService.currentUserValue;
    
    if (!currentUser || !currentUser.roles || currentUser.roles.length === 0) {
      return 999; // Lowest level for unauthorized users
    }

    const currentUserRoles = currentUser.roles.map((role: any) => role.name || role);
    let highestLevel = 999;

    for (const roleName of currentUserRoles) {
      const level = this.roleHierarchy[roleName];
      if (level && level < highestLevel) {
        highestLevel = level;
      }
    }

    return highestLevel;
  }

  /**
   * Get role label by role code
   * @param roleCode The role code
   * @returns Arabic label for the role from database or fallback
   */
  getRoleLabel(roleCode: string): string {
    const cachedRoles = this.roleService.getCachedRoles();
    const role = cachedRoles.find(r => r.role_code === roleCode);
    console.log('Roles:', cachedRoles);
    
    if (role && role.role_label) {
      return role.role_label;
    }
    
    // Fallback to hardcoded labels if role not found in cache
    const fallbackLabels: { [key: string]: string } = {
      '100': 'المشرف الجذري',
      '150': 'مشرف عام',
      '200': 'مشرف الدليل',
      '300': 'مشرف بيان',
      '400': 'مشرف الإصدار',
      '500': 'مشرف الأرشيف',
      '600': 'مشرف الإعلام',
      '700': 'مشرف الأخبار',
      '800': 'مشرف الآثار'
    };

    return fallbackLabels[roleCode] || 'دور غير معروف';
  }
}