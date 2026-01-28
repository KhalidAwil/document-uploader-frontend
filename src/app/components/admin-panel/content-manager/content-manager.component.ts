import { Component, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PageSectionService } from '../../../services/page-section.service';
import { PageSection, GoalItem, SectionBullet } from '../../../models/page-section.model';
import { ArabicNumeralsPipe } from '../../../pipes/arabic-numerals.pipe';

@Component({
    selector: 'app-content-manager',
    standalone: true,
    imports: [CommonModule, FormsModule, DragDropModule, SlicePipe, ArabicNumeralsPipe],
    templateUrl: './content-manager.component.html',
    styleUrls: ['./content-manager.component.scss']
})
export class ContentManagerComponent implements OnInit {
    activeTab: 'homepage' | 'join_us' = 'homepage';
    sections: PageSection[] = [];
    isLoading = false;
    isSaving = false;
    errorMessage = '';
    successMessage = '';

    // Edit modal state
    editingSection: PageSection | null = null;
    editingGoalItem: GoalItem | null = null;
    editingBullet: SectionBullet | null = null;
    showEditModal = false;
    showGoalEditModal = false;
    showBulletEditModal = false;
    showAddSectionModal = false;
    showAddBulletModal = false;

    // Form data
    editForm = { heading: '', body_text: '', theme: 'primary' };
    goalForm = { heading: '', body_text: '' };
    bulletForm = { text: '' };
    newSectionForm = { heading: '', body_text: '', theme: 'primary' };
    newBulletForm = { text: '' };

    themes = [
        { value: 'tertiary', label: 'بني / ذهبي' },
        { value: 'secondary', label: 'أزرق (حدود)' },
        { value: 'secondary-bg', label: 'أزرق (خلفية)' },
        { value: 'primary', label: 'بني داكن' }
    ];

    constructor(private pageSectionService: PageSectionService) { }

    ngOnInit(): void {
        this.loadSections();
    }

    switchTab(tab: 'homepage' | 'join_us'): void {
        this.activeTab = tab;
        this.loadSections();
    }

    loadSections(): void {
        this.isLoading = true;
        this.errorMessage = '';

        this.pageSectionService.getAdminSections(this.activeTab).subscribe({
            next: (response) => {
                this.sections = response.data || [];
                this.isLoading = false;
            },
            error: (error) => {
                this.errorMessage = 'فشل في تحميل الأقسام';
                this.isLoading = false;
                console.error('Error loading sections:', error);
            }
        });
    }

    // Drag and drop reordering
    drop(event: CdkDragDrop<PageSection[]>): void {
        moveItemInArray(this.sections, event.previousIndex, event.currentIndex);

        // Update order numbers
        const reorderData = this.sections.map((section, index) => ({
            id: section.id,
            order: index + 1
        }));

        this.pageSectionService.reorderSections({ sections: reorderData }).subscribe({
            next: () => {
                this.showSuccess('تم إعادة ترتيب الأقسام بنجاح');
            },
            error: (error) => {
                this.showError('فشل في إعادة ترتيب الأقسام');
                this.loadSections(); // Reload to get original order
            }
        });
    }

    // Section editing
    openEditModal(section: PageSection): void {
        this.editingSection = section;
        this.editForm = {
            heading: section.heading,
            body_text: section.body_text || '',
            theme: section.theme
        };
        this.showEditModal = true;
    }

    saveSection(): void {
        if (!this.editingSection) return;

        if (!this.editForm.heading?.trim()) {
            this.showError('العنوان مطلوب');
            return;
        }

        if (!this.editForm.body_text?.trim()) {
            this.showError('النص مطلوب');
            return;
        }

        this.isSaving = true;
        this.pageSectionService.updateSection(this.editingSection.id, this.editForm).subscribe({
            next: (response) => {
                const index = this.sections.findIndex(s => s.id === this.editingSection!.id);
                if (index !== -1) {
                    this.sections[index] = response.data;
                }
                this.showEditModal = false;
                this.editingSection = null;
                this.isSaving = false;
                this.showSuccess('تم حفظ القسم بنجاح');
            },
            error: (error) => {
                this.isSaving = false;
                this.showError('فشل في حفظ القسم');
            }
        });
    }

    deleteSection(section: PageSection): void {
        if (section.section_type === 'goals') {
            this.showError('لا يمكن حذف قسم الأهداف');
            return;
        }

        if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;

        this.pageSectionService.deleteSection(section.id).subscribe({
            next: () => {
                this.sections = this.sections.filter(s => s.id !== section.id);
                this.showSuccess('تم حذف القسم بنجاح');
            },
            error: (error) => {
                this.showError(error.error?.message || 'فشل في حذف القسم');
            }
        });
    }

    // Goal item editing
    openGoalEditModal(goalItem: GoalItem): void {
        this.editingGoalItem = goalItem;
        this.goalForm = {
            heading: goalItem.heading,
            body_text: goalItem.body_text
        };
        this.showGoalEditModal = true;
    }

    saveGoalItem(): void {
        if (!this.editingGoalItem) return;

        const section = this.sections.find(s => s.section_type === 'goals');
        if (!section) return;

        this.isSaving = true;
        this.pageSectionService.updateGoalItem(section.id, this.editingGoalItem.id, this.goalForm).subscribe({
            next: (response) => {
                const goalIndex = section.goal_items?.findIndex(g => g.id === this.editingGoalItem!.id);
                if (goalIndex !== undefined && goalIndex !== -1 && section.goal_items) {
                    section.goal_items[goalIndex] = response.data;
                }
                this.showGoalEditModal = false;
                this.editingGoalItem = null;
                this.isSaving = false;
                this.showSuccess('تم حفظ الهدف بنجاح');
            },
            error: (error) => {
                this.isSaving = false;
                this.showError('فشل في حفظ الهدف');
            }
        });
    }

    // Bullet editing (Join Us)
    openBulletEditModal(section: PageSection, bullet: SectionBullet): void {
        this.editingSection = section;
        this.editingBullet = bullet;
        this.bulletForm = { text: bullet.text };
        this.showBulletEditModal = true;
    }

    saveBullet(): void {
        if (!this.editingSection || !this.editingBullet) return;

        this.isSaving = true;
        this.pageSectionService.updateBullet(
            this.editingSection.id,
            this.editingBullet.id,
            this.bulletForm.text
        ).subscribe({
            next: (response) => {
                const bulletIndex = this.editingSection!.bullets?.findIndex(b => b.id === this.editingBullet!.id);
                if (bulletIndex !== undefined && bulletIndex !== -1 && this.editingSection!.bullets) {
                    this.editingSection!.bullets[bulletIndex] = response.data;
                }
                this.showBulletEditModal = false;
                this.editingBullet = null;
                this.isSaving = false;
                this.showSuccess('تم حفظ النقطة بنجاح');
            },
            error: (error) => {
                this.isSaving = false;
                this.showError('فشل في حفظ النقطة');
            }
        });
    }

    deleteBullet(section: PageSection, bullet: SectionBullet): void {
        if (!confirm('هل أنت متأكد من حذف هذه النقطة؟')) return;

        this.pageSectionService.deleteBullet(section.id, bullet.id).subscribe({
            next: () => {
                section.bullets = section.bullets?.filter(b => b.id !== bullet.id);
                this.showSuccess('تم حذف النقطة بنجاح');
            },
            error: (error) => {
                this.showError(error.error?.message || 'فشل في حذف النقطة');
            }
        });
    }

    // Add new section
    openAddSectionModal(): void {
        this.newSectionForm = { heading: '', body_text: '', theme: 'primary' };
        this.showAddSectionModal = true;
    }

    addSection(): void {
        if (!this.newSectionForm.heading?.trim()) {
            this.showError('العنوان مطلوب');
            return;
        }

        if (!this.newSectionForm.body_text?.trim()) {
            this.showError('النص مطلوب');
            return;
        }

        this.isSaving = true;
        const request = {
            page_type: this.activeTab,
            heading: this.newSectionForm.heading,
            body_text: this.newSectionForm.body_text || undefined,
            theme: this.newSectionForm.theme,
            bullets: this.activeTab === 'join_us' ? [{ text: 'نقطة جديدة' }] : undefined
        };

        this.pageSectionService.createSection(request).subscribe({
            next: (response) => {
                this.sections.push(response.data);
                this.showAddSectionModal = false;
                this.isSaving = false;
                this.showSuccess('تم إضافة القسم بنجاح');
            },
            error: (error) => {
                this.isSaving = false;
                this.showError('فشل في إضافة القسم');
            }
        });
    }

    // Add new bullet
    openAddBulletModal(section: PageSection): void {
        this.editingSection = section;
        this.newBulletForm = { text: '' };
        this.showAddBulletModal = true;
    }

    addBullet(): void {
        if (!this.editingSection) return;

        this.isSaving = true;
        this.pageSectionService.addBullet(this.editingSection.id, this.newBulletForm.text).subscribe({
            next: (response) => {
                if (!this.editingSection!.bullets) {
                    this.editingSection!.bullets = [];
                }
                this.editingSection!.bullets.push(response.data);
                this.showAddBulletModal = false;
                this.isSaving = false;
                this.showSuccess('تم إضافة النقطة بنجاح');
            },
            error: (error) => {
                this.isSaving = false;
                this.showError('فشل في إضافة النقطة');
            }
        });
    }

    // Helper methods
    closeAllModals(): void {
        this.showEditModal = false;
        this.showGoalEditModal = false;
        this.showBulletEditModal = false;
        this.showAddSectionModal = false;
        this.showAddBulletModal = false;
        this.editingSection = null;
        this.editingGoalItem = null;
        this.editingBullet = null;
    }

    showSuccess(message: string): void {
        this.successMessage = message;
        setTimeout(() => this.successMessage = '', 3000);
    }

    showError(message: string): void {
        this.errorMessage = message;
        setTimeout(() => this.errorMessage = '', 5000);
    }

    getThemeLabel(theme: string): string {
        return this.themes.find(t => t.value === theme)?.label || theme;
    }

    getThemeClass(theme: string): string {
        switch (theme) {
            case 'primary': return 'badge bg-primary';
            case 'secondary': return 'badge bg-secondary';
            case 'tertiary': return 'badge bg-warning text-dark';
            case 'gradient-primary': return 'badge bg-gradient-primary';
            case 'gradient-secondary': return 'badge bg-gradient-secondary';
            default: return 'badge bg-light text-dark';
        }
    }
}
