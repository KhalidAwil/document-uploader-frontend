// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom, LOCALE_ID, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpXsrfInterceptor } from './interceptors/http-xsrf.interceptor';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpLoaderFactory } from './factories/translation-loader.factory';
import { appInitializerFactory } from './factories/app-initializer.factory';
import { DatePipe } from '@angular/common';
import { ArabicDatePipe } from './pipes/arabic-date.pipe';
import { authInterceptor } from './interceptors/auth.interceptor';
import { LabelService } from './services/label.service';
import { NgbCarouselConfig, NgbModule } from '@ng-bootstrap/ng-bootstrap';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), // Provide routes directly
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([httpXsrfInterceptor, authInterceptor])),
    { provide: LOCALE_ID, useValue: 'ar' }, // Set the locale to Arabic
    { provide: DatePipe, useClass: ArabicDatePipe },
    NgbCarouselConfig,
    importProvidersFrom(
      NgbModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        },
        defaultLanguage: 'ar'
      })
    ),
    // Preload translations before app initialization
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [TranslateService, LabelService],
      multi: true
    }
  ]
};
