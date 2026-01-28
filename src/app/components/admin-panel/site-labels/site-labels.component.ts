import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabelService, SiteLabel } from '../../../services/label.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-site-labels',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './site-labels.component.html',
    styleUrls: ['./site-labels.component.scss']
})
export class SiteLabelsComponent implements OnInit {
    isLoading = false;
    isSaving = false;
    message = '';
    error = '';

    groupedLabels: Record<string, SiteLabel[]> = {};
    sections: string[] = [];

    // Config
    private readonly blocklist = [
        'ABOUT_SECTION', 'MISSION', 'VALUES', 'GOAL_', 'VISUAL_SLOGAN', 'READABLE_SLOGAN',
        'A_SECTION', 'B_SECTION', 'C_SECTION', 'JOIN_US_SECTION', 'LATEST_BIAN_IMAGE_ALT'
    ];

    private readonly categoryMap: Record<string, string> = {
        'AUTH': 'التسجيل والدخول',
        'LOGIN': 'التسجيل والدخول',
        'REGISTER': 'التسجيل والدخول',
        'PASSWORD': 'التسجيل والدخول',
        'EMAIL': 'التسجيل والدخول',
        'CONTACT': 'صفحة اتصل بنا',
        'FOOTER': 'تذييل الصفحة',
        'COPYRIGHT': 'تذييل الصفحة',
        'SOCIAL': 'تذييل الصفحة',
        'NAV': 'القائمة العلوية',
        'HOME': 'القائمة العلوية',
        'DOCUMENTS': 'المستندات',
        'ADMIN_PANEL': 'لوحة التحكم',
        'MANAGE_USERS': 'لوحة التحكم',
        'USERS': 'لوحة التحكم',
        'ROLE': 'لوحة التحكم',
        'DROPDOWN_MANAGEMENT': 'إدارة القوائم المنسدلة',
        'STATISTICS': 'الإحصائيات',
        'FILE_UPLOAD': 'رفع الملفات',
        'MODAL': 'النوافذ المنبثقة والتنبيهات',
        'VALIDATION': 'رسائل التحقق',
        'IS_REQUIRED': 'رسائل التحقق',
        'REPORT': 'التقارير',
        'FILTERS': 'فلاتر البحث',
        'IMAGE': 'الوسائط والصور',
        'VIDEO': 'الوسائط والصور',
        'ATHAR': 'الآثار',
        'ABOUT': 'صفحة عن الوزارة (قديم)',
        'JOIN_US': 'صفحة انضم إلينا',
        'GUIDE': 'أنواع المستندات',
        'RELEASE': 'أنواع المستندات',
        'NEWS': 'أنواع المستندات',
        'BIAN': 'أنواع المستندات',
        'ARCHIVE_C': 'أنواع المستندات',
        'MEDIA': 'أنواع المستندات',
        'Common': 'عام'
    };

    scrollToSection(section: string): void {
        const element = document.getElementById(section);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            // Add offset for sticky header if needed by scrolling the window up by header height 
            // (Assuming ~100px header)
            setTimeout(() => {
                window.scrollBy(0, -80);
            }, 500);
        }
    }
    // Fallback map for displaying English sections in Arabic (if user hasn't reset DB)
    private readonly sectionDisplayMap: Record<string, string> = {
        'Authentication': 'التسجيل والدخول',
        'Contact Page': 'صفحة اتصل بنا',
        'Footer': 'تذييل الصفحة',
        'Footer / Common': 'تذييل الصفحة',
        'Navigation': 'القائمة العلوية',
        'Documents': 'المستندات',
        'Admin Panel': 'لوحة التحكم',
        'Admin Dropdowns': 'إدارة القوائم المنسدلة',
        'Admin Statistics': 'الإحصائيات',
        'File Uploads': 'رفع الملفات',
        'Modals & Alerts': 'النوافذ المنبثقة والتنبيهات',
        'Validation': 'رسائل التحقق',
        'Reports': 'التقارير',
        'Search Filters': 'فلاتر البحث',
        'Media & Images': 'الوسائط والصور',
        'Athar Module': 'الآثار',
        'About Page (Legacy)': 'صفحة عن الوزارة (قديم)',
        'Join Us Page': 'صفحة انضم إلينا',
        'Document Types': 'أنواع المستندات',
        'General': 'عام'
    };

    getSectionLabel(section: string): string {
        return this.sectionDisplayMap[section] || section;
    }
    constructor(
        private labelService: LabelService,
        private translate: TranslateService,
        private http: HttpClient
    ) { }

    ngOnInit(): void {
        this.loadLabels();
    }

    loadLabels(): void {
        this.isLoading = true;
        this.labelService.getAllLabels().subscribe({
            next: (data) => {
                if (!data || data.length === 0) {
                    this.message = 'جاري تهيئة نصوص الموقع لأول مرة...';
                    this.importDefaults(false);
                } else {
                    this.groupLabels(data);
                    this.isLoading = false;
                }
            },
            error: (err) => {
                console.error('Failed to load labels', err);
                this.error = 'فشل في تحميل النصوص';
                this.isLoading = false;
            }
        });
    }

    private groupLabels(labels: SiteLabel[]): void {
        this.groupedLabels = {};
        labels.forEach(label => {
            const section = label.section || 'General';
            if (!this.groupedLabels[section]) {
                this.groupedLabels[section] = [];
            }
            this.groupedLabels[section].push({ ...label });
        });
        this.sections = Object.keys(this.groupedLabels).sort();
    }

    saveLabels(): void {
        const allLabels: SiteLabel[] = [];
        let hasError = false;

        this.sections.forEach(section => {
            this.groupedLabels[section].forEach(label => {
                if (!label.value || label.value.trim() === '') {
                    hasError = true;
                }
                allLabels.push(label);
            });
        });

        if (hasError) {
            this.error = 'جميع الحقول مطلوبة. يرجى التأكد من عدم وجود حقول فارغة.';
            return;
        }

        this.isSaving = true;
        this.error = '';
        this.message = '';

        const updates = allLabels.map(l => ({ key: l.key, value: l.value, section: l.section }));

        this.labelService.updateLabels(updates).subscribe({
            next: () => {
                this.message = 'تم حفظ التغييرات بنجاح';
                this.isSaving = false;
                this.loadLabels();

                const newTranslations: Record<string, string> = {};
                allLabels.forEach(l => newTranslations[l.key] = l.value);
                this.translate.setTranslation('ar', newTranslations, true);
            },
            error: (err) => {
                this.error = 'فشل في حفظ التغييرات';
                this.isSaving = false;
                console.error(err);
            }
        });
    }

    importDefaults(shouldConfirm: boolean = true): void {
        if (shouldConfirm && !confirm('سيقوم هذا باستيراد جميع النصوص من ملف الترجمة الافتراضي وإضافتها إلى قاعدة البيانات. هل أنت متأكد؟')) {
            return;
        }
        this.performImport(false);
    }

    resetAndImport(): void {
        if (!confirm('تحذير: سيقوم هذا بحذف جميع التعديلات الحالية وإعادة استيراد النصوص الافتراضية "النظيفة" فقط. هل أنت متأكد؟')) {
            return;
        }
        this.performImport(true);
    }

    private performImport(resetFirst: boolean): void {
        this.isLoading = true;
        this.message = 'جاري المعالجة...';

        const action$ = resetFirst ? this.labelService.resetLabels() : new Promise(resolve => resolve(true)); // dummy promise just to chain

        // If resetLabels checks observable, we need to convert logic.
        // resetLabels returns observable.

        const start = resetFirst ? this.labelService.resetLabels() : this.http.get('assets/i18n/ar.json'); // wait, if not reset, start immediately? 
        // Actually simpler:

        if (resetFirst) {
            this.labelService.resetLabels().subscribe({
                next: () => this.fetchAndUploadDefaults(),
                error: (err) => {
                    this.error = 'فشل في إعادة تعيين البيانات';
                    this.isLoading = false;
                }
            });
        } else {
            this.fetchAndUploadDefaults();
        }
    }

    private fetchAndUploadDefaults(): void {
        this.http.get('assets/i18n/ar.json').subscribe({
            next: (data: any) => {
                const flatLabels = this.flattenObject(data);
                const updates: Partial<SiteLabel>[] = [];

                Object.keys(flatLabels).forEach(key => {
                    // BLOCKLIST FILTER
                    if (this.blocklist.some(term => key.includes(term))) {
                        return; // Skip this key
                    }

                    // CATEGORY MAPPING
                    let section = 'General';
                    const parts = key.split('.');
                    const prefix = parts[0]; // e.g. AUTH, CONTACT

                    // Check map by prefix
                    for (const mapKey in this.categoryMap) {
                        if (key.startsWith(mapKey)) {
                            section = this.categoryMap[mapKey];
                            break;
                        }
                    }

                    updates.push({
                        key: key,
                        value: flatLabels[key],
                        section: section
                    });
                });

                this.labelService.updateLabels(updates).subscribe({
                    next: () => {
                        this.message = 'تم استيراد وتنظيم النصوص بنجاح';
                        this.loadLabels();
                    },
                    error: (err) => {
                        console.error(err);
                        this.error = 'فشل في استيراد النصوص.';
                        this.isLoading = false;
                    }
                });
            },
            error: (err: any) => {
                this.error = 'فشل في قراءة ملف الترجمة.';
                this.isLoading = false;
            }
        });
    }

    private flattenObject(ob: any, prefix = '', result: any = {}): any {
        for (const i in ob) {
            if (Object.prototype.hasOwnProperty.call(ob, i)) {
                if ((typeof ob[i]) === 'object' && ob[i] !== null) {
                    this.flattenObject(ob[i], prefix + i + '.', result);
                } else {
                    result[prefix + i] = ob[i];
                }
            }
        }
        return result;
    }
}
