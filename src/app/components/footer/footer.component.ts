import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SiteSettingsService, SiteSettings } from '../../services/site-settings.service';
import { Subject, takeUntil } from 'rxjs';
import { ArabicDatePipe } from '../../pipes/arabic-date.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslatePipe, ArabicDatePipe],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  logoPath: string | null = null;
  logoSize: string = 'medium';
  private destroy$ = new Subject<void>();

  constructor(private siteSettingsService: SiteSettingsService) {}

  ngOnInit(): void {
    this.setupSiteSettingsSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSiteSettingsSubscription(): void {
    this.siteSettingsService.siteSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings: SiteSettings) => {
          console.log('Footer received new settings:', settings);
          this.logoPath = settings.logos.footer_url || null;
          this.logoSize = settings.logos.footer_size || 'medium';
        },
        error: (error) => {
          console.error('Error in footer settings subscription:', error);
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

  getCurrentDate(): string {
    const year = new Date().getFullYear();
    console.log('Current year in getCurrentDate:', year); // Debugging
    return year.toString();
  }
}