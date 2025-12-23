import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule, TranslateLoader, TranslateFakeLoader } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

/**
 * Common test imports for components that use HttpClient
 */
export const HTTP_TESTING_IMPORTS = [
    HttpClientTestingModule
];

/**
 * Common test imports for components that use TranslateService
 */
export const TRANSLATE_TESTING_IMPORTS = [
    TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: TranslateFakeLoader }
    })
];

/**
 * Common test imports for components that use Router
 */
export const ROUTER_TESTING_IMPORTS = [
    RouterTestingModule
];

/**
 * Mock ActivatedRoute provider
 */
export const MOCK_ACTIVATED_ROUTE = {
    provide: ActivatedRoute,
    useValue: {
        params: of({ id: '1' }),
        snapshot: {
            params: { id: '1' },
            queryParams: {},
            data: {}
        }
    }
};

/**
 * All common testing imports combined
 */
export const COMMON_TESTING_IMPORTS = [
    ...HTTP_TESTING_IMPORTS,
    ...TRANSLATE_TESTING_IMPORTS,
    ...ROUTER_TESTING_IMPORTS
];

/**
 * All common testing providers
 */
export const COMMON_TESTING_PROVIDERS = [
    MOCK_ACTIVATED_ROUTE
];
