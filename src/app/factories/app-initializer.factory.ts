import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

/**
 * Factory function to preload translations before app initialization
 * This ensures translations are loaded before any component tries to use them
 */
export function appInitializerFactory(translate: TranslateService) {
  return () => {
    // Set default language
    translate.setDefaultLang('ar');

    // Return a promise that resolves when translations are loaded
    return new Promise<void>((resolve) => {
      translate.use('ar').pipe(take(1)).subscribe({
        next: () => {
          console.log('✓ Arabic translations loaded successfully');
          resolve();
        },
        error: (err) => {
          console.error('✗ Failed to load Arabic translations:', err);
          // Resolve anyway to not block app startup
          resolve();
        }
      });
    });
  };
}
