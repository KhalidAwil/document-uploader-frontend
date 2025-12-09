import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { SiteSettingsService, SiteSettings } from '../../services/site-settings.service';
import { Subject, takeUntil } from 'rxjs';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslatePipe],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  @ViewChild('navigationContainer', { static: true }) navigationContainer!: ElementRef;
  logoPath: string | null = null;
  logoSize: string = 'medium';
  currentLanguage: string;
  isMenuOpen = false;
  private destroy$ = new Subject<void>();
  private isToggling = false;
  private _mobileMenuOpen = false;
  private readonly _mobileMenuState = new BehaviorSubject<boolean>(false);
  readonly mobileMenuState$ = this._mobileMenuState.asObservable();

  constructor(
    private authService: AuthService,
    private langService: LanguageService,
    private siteSettingsService: SiteSettingsService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.currentLanguage = this.langService.getCurrentLanguage();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeMobileMenu();
    });
  }

  public get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  public logOut() {
    return this.authService.logout();
  }

  public get authUser(): any {
    return this.authService.currentUserValue?.user;
  }

  ngOnInit(): void {
    this.langService.switchLanguage(this.currentLanguage);
    this.setupSiteSettingsSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setLanguage(lang: string): void {
    this.langService.switchLanguage(lang);
    this.currentLanguage = lang;
  }

  toggleMenu(event: Event): void {
    if (this.isToggling) {
      console.log('Toggle debounced, ignoring click');
      return;
    }

    this.isToggling = true;
    event.preventDefault();
    event.stopPropagation();

    console.log('Toggle clicked, current isMenuOpen:', this.isMenuOpen);

    this.isMenuOpen = !this.isMenuOpen;
    this._mobileMenuOpen = this.isMenuOpen;
    this._mobileMenuState.next(this._mobileMenuOpen);
    this.cdr.detectChanges();

    setTimeout(() => {
      this.isToggling = false;
    }, 350);
  }

  toggleMobileMenu(): void {
    this.toggleMenu(new Event('click'));
  }

  closeMobileMenu(): void {
    if (this.isMenuOpen) {
      this.toggleMenu(new Event('click'));
    }
  }

  setupSiteSettingsSubscription(): void {
    this.siteSettingsService.siteSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings: SiteSettings) => {
          console.log('Navigation received new settings:', settings);
          this.logoPath = settings.logos.header_url || null;
          this.logoSize = settings.logos.header_size || 'medium';
        },
        error: (error) => {
          console.error('Error in navigation settings subscription:', error);
          this.logoPath = null;
          this.logoSize = 'medium';
        }
      });
  }

  getLogoHeight(): number | null {
    if (this.logoSize === 'original') {
      return null;
    }
    switch (this.logoSize) {
      case 'small':
        return 80;
      case 'medium':
        return 120;
      case 'large':
        return 160;
      case 'xlarge':
        return 200;
      default:
        return 120;
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || window.pageYOffset;
    const navHeight = this.navigationContainer.nativeElement.offsetHeight;

    if (scrollTop + windowHeight + navHeight >= documentHeight) {
      this.navigationContainer.nativeElement.style.position = 'fixed';
      this.navigationContainer.nativeElement.style.bottom = '0';
      this.navigationContainer.nativeElement.style.top = 'auto';
    } else {
      this.navigationContainer.nativeElement.style.position = 'sticky';
      this.navigationContainer.nativeElement.style.top = '0';
      this.navigationContainer.nativeElement.style.bottom = 'auto';
    }
  }
}