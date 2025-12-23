import { Component, LOCALE_ID, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { BreadcrumbComponent } from './components/generic/breadcrumb/breadcrumb.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastComponent } from './components/shared/toast/toast.component';
import { registerLocaleData } from '@angular/common';
import localeArSA from '@angular/common/locales/ar-SA';
import localeEn from '@angular/common/locales/en';
import localeAr from '@angular/common/locales/ar';
import { BsLocaleService } from 'ngx-bootstrap/datepicker';
import { defineLocale } from 'ngx-bootstrap/chronos';
import { arLocale, enGbLocale } from 'ngx-bootstrap/chronos';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../environments/environment';

declare const plausible: any;

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <app-navigation></app-navigation>
    <app-breadcrumb></app-breadcrumb>
    <router-outlet></router-outlet>
    <app-footer></app-footer>
    <app-toast></app-toast>
  `,
  imports: [RouterOutlet, NavigationComponent, BreadcrumbComponent, FooterComponent, ToastComponent],
})

export class AppComponent implements OnInit {
  currentDate = new Date();

  constructor(
    private translate: TranslateService,
    private localeService: BsLocaleService,
    private router: Router,
  ) {
    defineLocale('ar', arLocale);
    defineLocale('en', enGbLocale);

    // Translations are already loaded by APP_INITIALIZER
    // Just switch the Bootstrap locale
    this.switchBsLocale('ar');

    this.translate.onLangChange.subscribe((event) => {
      this.switchBsLocale(event.lang);
      document.documentElement.lang = event.lang;
      document.documentElement.dir = event.lang === 'ar' ? 'rtl' : 'ltr';
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log('Route changed:', event.url); // Debug
      }
    });
  }

  ngOnInit(): void {
    console.log('🚀 APP VERSION: v1.0.1 - ENV FIX DEPLOYED');
    console.log('Environment API URL:', environment.apiUrl);

    registerLocaleData(localeArSA);
    registerLocaleData(localeEn);
    registerLocaleData(localeAr);

    const initialLang = this.translate.currentLang || this.translate.defaultLang;
    document.documentElement.lang = initialLang;
    document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';

    // Initialize copy protection
    this.initializeCopyProtection();
  }

  /**
   * Check if current route should have copy protection disabled
   */
  private shouldDisableCopyProtection(): boolean {
    const currentUrl = this.router.url;

    // Disable copy protection for document create/edit pages
    const exemptRoutes = [
      '/create',      // Any create route
      '/edit/',       // Any edit route
    ];

    return exemptRoutes.some(route => currentUrl.includes(route));
  }

  /**
   * Initialize copy protection to prevent content copying
   */
  private initializeCopyProtection(): void {
    // Prevent copy events
    document.addEventListener('copy', (e) => {
      if (this.shouldDisableCopyProtection()) {
        return true;
      }
      e.preventDefault();
      console.log('Copy operation blocked');
      return false;
    });

    // Prevent cut events
    document.addEventListener('cut', (e) => {
      if (this.shouldDisableCopyProtection()) {
        return true;
      }
      e.preventDefault();
      console.log('Cut operation blocked');
      return false;
    });

    // Prevent context menu (right-click)
    document.addEventListener('contextmenu', (e) => {
      if (this.shouldDisableCopyProtection()) {
        return true;
      }
      e.preventDefault();
      console.log('Right-click blocked');
      return false;
    });

    // Prevent keyboard shortcuts for copy/cut/paste
    document.addEventListener('keydown', (e) => {
      if (this.shouldDisableCopyProtection()) {
        return true;
      }

      // Check for Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+U, Ctrl+A (Windows/Linux)
      // Check for Cmd+C, Cmd+X, Cmd+V, Cmd+U, Cmd+A (Mac)
      if ((e.ctrlKey || e.metaKey) &&
        (e.key === 'c' || e.key === 'C' ||
          e.key === 'x' || e.key === 'X' ||
          e.key === 'v' || e.key === 'V' ||
          e.key === 'u' || e.key === 'U' ||
          e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        console.log('Keyboard shortcut blocked:', e.key);
        return false;
      }

      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Developer tools)
      if (e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey &&
          (e.key === 'I' || e.key === 'i' ||
            e.key === 'J' || e.key === 'j' ||
            e.key === 'C' || e.key === 'c'))) {
        e.preventDefault();
        console.log('Developer tools shortcut blocked');
        return false;
      }

      return true;
    });

    // Prevent text selection via keyboard (Shift + Arrow keys)
    document.addEventListener('selectstart', (e) => {
      if (this.shouldDisableCopyProtection()) {
        return true;
      }

      // Allow selection in input fields and textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true') {
        return true;
      }
      e.preventDefault();
      return false;
    });

    console.log('✓ Copy protection initialized');
  }

  switchBsLocale(lang: string): void {
    this.localeService.use(lang);
    console.log(`ngx-bootstrap locale switched to: ${lang}`);
  }
}