import { TranslateService } from '@ngx-translate/core';
import { LabelService } from '../services/label.service';
import { take, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Factory function to preload translations before app initialization
 * This ensures translations are loaded before any component tries to use them
 */
export function appInitializerFactory(translate: TranslateService, labelService: LabelService) {
  return () => {
    // Set default language
    translate.setDefaultLang('ar');

    // Return a promise that resolves when translations AND db labels are loaded
    return new Promise<void>((resolve) => {
      translate.use('ar').pipe(
        take(1),
        switchMap(() => {
          // Load labels from DB
          return labelService.loadLabels().pipe(
            catchError(err => {
              console.error('Failed to load DB labels', err);
              return of({ data: [] });
            })
          );
        })
      ).subscribe({
        next: (response: any) => {
          if (response && response.data) {
            const dbLabels: Record<string, string> = {};
            response.data.forEach((item: any) => {
              if (item.key && item.value) {
                dbLabels[item.key] = item.value;
              }
            });

            // Merge DB labels into existing translations (true = merge)
            translate.setTranslation('ar', dbLabels, true);
            console.log(`✓ Loaded and merged ${response.data.length} site labels from DB`);
          }
          resolve();
        },
        error: (err) => {
          console.error('✗ General error in app initializer:', err);
          resolve();
        }
      });
    });
  };
}
