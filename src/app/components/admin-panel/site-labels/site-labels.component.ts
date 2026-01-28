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

    // Grouped labels: { 'header': [label1, label2], 'footer': [...] }
    groupedLabels: Record<string, SiteLabel[]> = {};
    sections: string[] = [];

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
                this.groupLabels(data);
                this.isLoading = false;
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
            this.groupedLabels[section].push({ ...label }); // Clone to avoid direct mutation issues
        });
        this.sections = Object.keys(this.groupedLabels).sort();
    }

    saveLabels(): void {
        const allLabels: SiteLabel[] = [];
        let hasError = false;

        // Flatten and validate
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
            // We could highlight invalid fields, but for now simple message
            return;
        }

        this.isSaving = true;
        this.error = '';
        this.message = '';

        // Only send key and value (and id maybe? backend uses key)
        const updates = allLabels.map(l => ({ key: l.key, value: l.value, section: l.section }));

        this.labelService.updateLabels(updates).subscribe({
            next: () => {
                this.message = 'تم حفظ التغييرات بنجاح';
                this.isSaving = false;
                // Reload to ensure sync
                this.loadLabels();

                // Also update the current translations in memory!
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

    importDefaults(): void {
        if (!confirm('سيقوم هذا باستيراد جميع النصوص من ملف الترجمة الافتراضي وإضافتها إلى قاعدة البيانات. هل أنت متأكد؟')) {
            return;
        }

        this.isLoading = true;
        this.http.get('assets/i18n/ar.json').subscribe({
            next: (data: any) => {
                const flatLabels = this.flattenObject(data);
                const updates: Partial<SiteLabel>[] = [];

                Object.keys(flatLabels).forEach(key => {
                    // We use the top-level key as section, e.g. 'AUTH.LOGIN_FAILED' -> section 'AUTH'
                    const parts = key.split('.');
                    const section = parts.length > 1 ? parts[0] : 'General';

                    updates.push({
                        key: key,
                        value: flatLabels[key],
                        section: section
                    });
                });

                // Send to backend (backend should use updateOrCreate)
                // My controller index logic was simple update loop. 
                // I need to ensure controller supports updateOrCreate or I use a dedicated endpoint.
                // My controller uses `SiteLabel::where('key', ...)->update()`. It won't create new ones.
                // I should update LabelService to handle CREATE too?
                // Or update Controller to use updateOrCreate.

                // Let's assume controller needs update.
                // Actually, SiteLabel::updateOrCreate is better in controller.
                // I will check controller again.

                // Proceeding with logic assuming I fix controller.
                this.labelService.updateLabels(updates).subscribe({
                    next: () => {
                        this.message = 'تم استيراد النصوص بنجاح';
                        this.loadLabels();
                    },
                    error: err => {
                        console.error(err);
                        this.error = 'فشل في استيراد النصوص. تأكد من أن الخادم يدعم الإضافة.';
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
