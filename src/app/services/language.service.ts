import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  constructor(private translate: TranslateService) {}

  getCurrentLanguage(): string {
    return this.translate.currentLang;
  }

  switchLanguage(lang: string): void {
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
  }
}
