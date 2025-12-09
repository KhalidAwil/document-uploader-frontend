import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-documents',
  template: `
    <div class="container py-5" *ngIf="showGrid$ | async">
      <h1 class="text-center mb-5">{{ 'DOCUMENTS_TITLE' | translate }}</h1>
      <div class="row row-cols-1 row-cols-md-3 g-4">
        <div class="col" *ngFor="let doc of documentTypes">
          <div class="card text-center shadow-sm">
            <div class="card-body">
              <i [class]="doc.icon" style="font-size: 3rem;"></i>
              <h5 class="card-title mt-3">{{ doc.translationKey | translate }}</h5>
              <a [routerLink]="['/documents', doc.type]" class="btn btn-primary mt-3">
                {{ 'VIEW' | translate }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <router-outlet></router-outlet>
  `,
  imports: [TranslatePipe, RouterModule, CommonModule],
  standalone: true
})
export class DocumentsComponent {
  private router: Router;
  showGrid$;
  
  documentTypes = [
    { type: 'guide', icon: 'bi bi-book', translationKey: 'GUIDES' },
    { type: 'release', icon: 'bi bi-file-earmark-text', translationKey: 'RELEASES' },
    { type: 'bian', icon: 'bi bi-file-earmark', translationKey: 'BIANS' },
    { type: 'news', icon: 'bi bi-newspaper', translationKey: 'NEWS' },
    { type: 'archive_c', icon: 'bi bi-archive', translationKey: 'ARCHIVE_C' },
    { type: 'athar', icon: 'bi bi-radar', translationKey: 'ATHAR' },
    { type: 'media', icon: 'bi bi-collection', translationKey: 'LIBRARY' }
  ];

  constructor(router: Router) {
    this.router = router;
    this.showGrid$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url === '/documents')
    );
  }
}