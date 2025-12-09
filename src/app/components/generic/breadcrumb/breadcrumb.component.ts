import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { filter, takeUntil } from "rxjs/operators";

interface Breadcrumb {
  label: string;
  url: string;
  params?: Record<string, any>;
}

@Component({
  selector: 'app-breadcrumb',
  template: `
    <div class="container px-5">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item" *ngFor="let breadcrumb of breadcrumbs; let isLast = last">
            <ng-container *ngIf="!isLast; else lastItem">
              <a [routerLink]="breadcrumb.url" class="breadcrumb-link">
                {{ breadcrumb.label | translate:breadcrumb.params }}
              </a>
            </ng-container>
            <ng-template #lastItem>
              <span class="breadcrumb-current">
                {{ breadcrumb.label | translate:breadcrumb.params }}
              </span>
            </ng-template>
          </li>
        </ol>
      </nav>
    </div>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      flex-wrap: wrap;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      list-style: none;
      background-color: transparent;
      font-size:1.2rem;
    }

    .breadcrumb.rtl {
      flex-direction: row-reverse;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      padding: 0;
    }

    .rtl .breadcrumb-item {
      flex-direction: row-reverse;
    }

    .breadcrumb-link {
      color:rgb(163, 114, 40);
      text-decoration: none;
      transition: color 0.2s ease-in-out;
    }

    .breadcrumb-link:hover {
      color:rgb(131, 87, 21);
      text-decoration: underline;
    }

    .breadcrumb-item::before {
      padding-left: 10px;
      padding-right: 10px;
    }

    .breadcrumb-current {
      color:rgb(90, 87, 83);
    }
  `],
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: Breadcrumb[] = [];
  isRTL: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const breadcrumbs: Breadcrumb[] = [];
        let fullUrl = '';

        const addBreadcrumb = (route: ActivatedRoute, url: string) => {
          const snapshot = route.snapshot;
          if (snapshot.data['breadcrumb']) {
            const breadcrumbData = snapshot.data['breadcrumb'];
            let label: string;
            let params: Record<string, any> = {};

            if (typeof breadcrumbData === 'function') {
              const result = breadcrumbData(snapshot);
              if (typeof result === 'object' && result.label) {
                label = result.label;
                params = result.params || {};
              } else {
                label = result;
              }
            } else {
              label = breadcrumbData;
            }

            if (snapshot.data['modelType']) {
              params['modelType'] = snapshot.data['modelType'];
            }

            if (label && !breadcrumbs.find(b => b.label === label)) {
              // Special case: route DOCUMENT_USER breadcrumb to admin users page
              let finalUrl = url;
              if (label === 'DOCUMENT_USER') {
                finalUrl = '/admin/users';
              }
              
              breadcrumbs.push({
                label,
                url: finalUrl,
                params
              });
            }
          }
        };

        // Start from root route
        let currentRoute = this.activatedRoute.root;
        addBreadcrumb(currentRoute, '/');

        // Process each child route
        while (currentRoute.children.length > 0) {
          const child = currentRoute.firstChild;
          if (!child) break;

          if (child.snapshot.url.length > 0) {
            const segmentPath = child.snapshot.url.map(segment => segment.path).join('/');
            fullUrl = fullUrl === '/' ? `/${segmentPath}` : `${fullUrl}/${segmentPath}`;
          }

          addBreadcrumb(child, fullUrl || '/');
          currentRoute = child;
        }

        this.breadcrumbs = breadcrumbs;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}