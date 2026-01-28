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
        'AUTH': 'Authentication',
        'LOGIN': 'Authentication',
        'REGISTER': 'Authentication',
        'PASSWORD': 'Authentication',
        'EMAIL': 'Authentication',
        'CONTACT': 'Contact Page',
        'FOOTER': 'Footer / Common',
        'COPYRIGHT': 'Footer / Common',
        'SOCIAL': 'Footer / Common',
        'NAV': 'Navigation',
        'HOME': 'Navigation',
        'DOCUMENTS': 'Documents',
        'ADMIN_PANEL': 'Admin Panel',
        'MANAGE_USERS': 'Admin Panel',
        'USERS': 'Admin Panel',
        'ROLE': 'Admin Panel',
        'DROPDOWN_MANAGEMENT': 'Admin Dropdowns',
        'STATISTICS': 'Admin Statistics',
        'FILE_UPLOAD': 'File Uploads',
        'MODAL': 'Modals & Alerts',
        'VALIDATION': 'Validation',
        'IS_REQUIRED': 'Validation',
        'REPORT': 'Reports',
        'FILTERS': 'Search Filters',
        'IMAGE': 'Media & Images',
        'VIDEO': 'Media & Images',
        'ATHAR': 'Athar Module',
        'ABOUT': 'About Page (Legacy)',
        'JOIN_US': 'Join Us Page',
        'GUIDE': 'Document Types',
        'RELEASE': 'Document Types',
        'NEWS': 'Document Types',
        'BIAN': 'Document Types',
        'ARCHIVE_C': 'Document Types',
        'MEDIA': 'Document Types',
        'Common': 'General'
    };

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
