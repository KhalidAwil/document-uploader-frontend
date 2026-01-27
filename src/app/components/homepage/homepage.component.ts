import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DocumentService, Document, PaginatedResponse } from '../../services/document.service';
import { HomepageService, CarouselImage } from '../../services/homepage.service';
import { PageSectionService } from '../../services/page-section.service';
import { PageSection } from '../../models/page-section.model';
import { Observable, Subject, forkJoin } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { NgbCarouselModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { ArabicDatePipe } from '../../pipes/arabic-date.pipe';
import { ImageUrlPipe } from '../../pipes/image-url.pipe';
import { ArabicDateHelper } from '../../utils/arabic-date-helper';
import { SiteSettings, SiteSettingsService } from '../../services/site-settings.service';
import { StatisticsService } from '../../services/statistics.service';

@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss'],
  imports: [CommonModule, NgbCarouselModule, RouterModule, TruncatePipe, TranslatePipe, ArabicDatePipe, ImageUrlPipe],
  standalone: true
})
export class HomepageComponent implements OnInit {
  private destroy$ = new Subject<void>();
  isLoading: boolean = true;

  showSidebar: boolean = true;
  showFeaturedSection: boolean = true;
  featuredGuidesColClass: string = 'col-12 col-md-6';
  featuredReleasesColClass: string = 'col-12 col-md-6';
  latestGuides: Document[] = [];
  latestReleases: Document[] = [];
  latestBians: Document[] = [];
  latestNews: Document[] = [];
  latestArchiveCs: Document[] = [];
  latestAthars: Document[] = [];
  latestMedias: Document[] = [];
  carouselImages: CarouselImage[] = [];

  // Dynamic sections from CMS
  sections: PageSection[] = [];
  goalsSection: PageSection | null = null;
  standardSections: PageSection[] = [];

  headerLogoPath: string | null = null;
  headerLogoSize: string = 'medium';
  footerLogoPath: string | null = null;
  footerLogoSize: string = 'medium';


  constructor(
    public translate: TranslateService,
    private documentService: DocumentService,
    private homepageService: HomepageService,
    private pageSectionService: PageSectionService,
    private cdr: ChangeDetectorRef,
    private siteSettingsService: SiteSettingsService,
    private statisticsService: StatisticsService
  ) { }

  ngOnInit(): void {
    this.fetchData();
    this.fetchSections();
    this.setupSiteSettingsSubscription();
    this.trackPageView();
  }

  private trackPageView(): void {
    this.statisticsService.incrementPageView('homepage').subscribe({
      next: () => {
        // Page view tracked successfully
      },
      error: (error) => {
        // Silently handle tracking errors to not affect user experience
        console.debug('Homepage page view tracking failed:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchData(): void {
    this.isLoading = true;
    const filters = {
      sort_field: 'date_of_publication',
      sort_order: 'desc'
    }

    const documentRequests: Observable<Document[]>[] = [
      this.documentService.getDocuments('guide', 1, 1, filters).pipe(map((res: PaginatedResponse<Document>) => res.data)),
      this.documentService.getDocuments('release', 1, 1, filters).pipe(map((res: PaginatedResponse<Document>) => res.data)),
      this.documentService.getDocuments('bian', 1, 1, filters).pipe(map((res: PaginatedResponse<Document>) => res.data)),
      this.documentService.getDocuments('news', 1, 1, filters).pipe(map((res: PaginatedResponse<Document>) => res.data)),
      this.documentService.getDocuments('archive_c', 1, 1, filters).pipe(map((res: PaginatedResponse<Document>) => res.data)),
      this.documentService.getDocuments('athar', 1, 1, filters).pipe(map((res: PaginatedResponse<Document>) => res.data)),
      this.documentService.getDocuments('media', 1, 1, filters).pipe(map((res: PaginatedResponse<Document>) => res.data)),
    ];
    const carouselRequest: Observable<CarouselImage[]> = this.homepageService.getCarouselImages();

    forkJoin([...documentRequests, carouselRequest]).subscribe({
      next: (results) => {
        const guides = results[0] as Document[];
        const releases = results[1] as Document[];
        const bians = results[2] as Document[];
        const news = results[3] as Document[];
        const archiveCs = results[4] as Document[];
        const athars = results[5] as Document[];
        const medias = results[6] as Document[];
        this.latestGuides = guides || [];
        this.latestReleases = releases || [];
        this.latestBians = bians || [];
        this.latestNews = news || [];
        this.latestArchiveCs = archiveCs || [];
        this.latestAthars = athars || [];
        this.latestMedias = medias || [];
        this.carouselImages = results[7] || [];
        this.isLoading = false;
        this.computeLayout();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching documents:', err);
        this.latestGuides = [];
        this.latestReleases = [];
        this.latestBians = [];
        this.latestNews = [];
        this.latestArchiveCs = [];
        this.latestAthars = [];
        this.latestMedias = [];
        this.carouselImages = [];
        this.isLoading = false;
        this.computeLayout();
        this.cdr.detectChanges();
      }
    });
  }

  computeLayout(): void {
    // Featured section logic
    const hasGuides = this.latestGuides.length > 0;
    const hasReleases = this.latestReleases.length > 0;
    this.showFeaturedSection = this.isLoading || hasGuides || hasReleases;

    if (this.isLoading) {
      this.featuredGuidesColClass = 'col-12 col-md-6';
      this.featuredReleasesColClass = 'col-12 col-md-6';
    } else if (hasGuides && hasReleases) {
      this.featuredGuidesColClass = 'col-12 col-md-6';
      this.featuredReleasesColClass = 'col-12 col-md-6';
    } else if (hasGuides) {
      this.featuredGuidesColClass = 'col-12';
      this.featuredReleasesColClass = 'd-none';
    } else if (hasReleases) {
      this.featuredGuidesColClass = 'd-none';
      this.featuredReleasesColClass = 'col-12';
    } else {
      this.featuredGuidesColClass = 'd-none';
      this.featuredReleasesColClass = 'd-none';
    }

    // Sidebar logic
    const hasBians = this.latestBians.length > 0;
    const hasNews = this.latestNews.length > 0;
    const hasArchiveCs = this.latestArchiveCs.length > 0;
    const hasAthars = this.latestAthars.length > 0;
    const hasMedias = this.latestMedias.length > 0;
    this.showSidebar = this.isLoading || hasBians || hasNews || hasArchiveCs || hasAthars || hasMedias;
  }

  /**
   * Format a date according to the current language
   * @param date The date to format
   * @param fullFormat Whether to use full date format (true) or short date format (false)
   * @returns Formatted date string
   */
  formatDate(date: string | Date, fullFormat: boolean = true): string {
    if (!date) return '';

    // Force Arabic date formatting since Arabic is the default language
    if (fullFormat) {
      // For full date format, use the complete options
      return ArabicDateHelper.toArabicDateString(date, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } else {
      // For short date format, use numeric day, month, year
      return ArabicDateHelper.toArabicDateString(date, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
    }
  }

  setupSiteSettingsSubscription(): void {
    this.siteSettingsService.siteSettings$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings: SiteSettings) => {
          console.log('Navigation received new settings:', settings);
          this.headerLogoPath = settings.logos.header_url || null;
          this.headerLogoSize = settings.logos.header_size || 'medium';
          this.footerLogoPath = settings.logos.footer_url || null;
          this.footerLogoSize = settings.logos.footer_size || 'medium';
        },
        error: (error) => {
          console.error('Error in navigation settings subscription:', error);
          this.headerLogoPath = null;
          this.headerLogoSize = 'medium';
          this.footerLogoPath = null;
          this.footerLogoSize = 'medium';
        }
      });
  }

  getLogoHeight(type: 'header' | 'footer'): number | null {
    switch (type) {
      case 'header':
        if (this.headerLogoSize === 'original') {
          return null;
        }
        switch (this.headerLogoSize) {
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

      case 'footer':
        if (this.footerLogoSize === 'original') {
          return null;
        }
        switch (this.footerLogoSize) {
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
      default:
        return null;
    }
  }

  /**
   * Fetch dynamic sections from CMS API
   */
  fetchSections(): void {
    this.pageSectionService.getSections('homepage').subscribe({
      next: (response) => {
        this.sections = response.data || [];
        // Separate goals section from standard sections
        this.goalsSection = this.sections.find(s => s.section_type === 'goals') || null;
        this.standardSections = this.sections.filter(s => s.section_type !== 'goals');
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching homepage sections:', error);
        this.sections = [];
        this.goalsSection = null;
        this.standardSections = [];
      }
    });
  }

  /**
   * Get CSS class for section theme
   */
  getThemeClass(theme: string): string {
    switch (theme) {
      case 'secondary':
        return 'modern-section mt-4 border border-secondary section-secondary';
      case 'secondary-bg':
        return 'modern-section mt-4 section-secondary-bg';
      case 'tertiary':
        return 'modern-section mt-4 border border-tertiary section-tertiary';
      case 'gradient-secondary':
        return 'modern-section bg-gradient-secondary mt-4';
      case 'gradient-primary':
        return 'modern-section bg-gradient-primary mt-4';
      case 'primary':
      default:
        return 'modern-section mt-4 border border-primary section-primary';
    }
  }

  /**
   * Get text color class for section theme
   */
  getTextClass(theme: string): string {
    switch (theme) {
      case 'secondary':
        return 'text-secondary';
      case 'secondary-bg':
        return 'text-white';
      case 'tertiary':
        return 'text-tertiary';
      case 'gradient-secondary':
      case 'gradient-primary':
        return 'text-white';
      case 'primary':
      default:
        return 'text-primary';
    }
  }
}