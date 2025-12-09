import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BreadcrumbResolver implements Resolve<string> {
  constructor(private translate: TranslateService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<string> {
    const breadcrumbKey = route.data['breadcrumbKey'];
    if (breadcrumbKey) {
      return this.translate.get(breadcrumbKey);
    }
    return of(''); // Fallback if no key is provided
  }
}