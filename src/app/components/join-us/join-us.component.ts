import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StatisticsService } from '../../services/statistics.service';
import { PageSectionService } from '../../services/page-section.service';
import { PageSection } from '../../models/page-section.model';

@Component({
  selector: 'app-join-us',
  templateUrl: './join-us.component.html',
  styleUrls: ['./join-us.component.scss'],
  imports: [CommonModule, TranslatePipe],
  standalone: true
})
export class JoinUsComponent implements OnInit {
  name: string = '';
  email: string = '';
  documentType: string = '';

  // Dynamic sections from CMS
  sections: PageSection[] = [];
  isLoading: boolean = false;

  constructor(
    private translate: TranslateService,
    private statisticsService: StatisticsService,
    private pageSectionService: PageSectionService
  ) { }

  ngOnInit(): void {
    this.trackPageView();
    this.fetchSections();
  }

  private trackPageView(): void {
    this.statisticsService.incrementPageView('join-us').subscribe({
      next: () => {
        // Page view tracked successfully
      },
      error: (error) => {
        // Silently handle tracking errors to not affect user experience
        console.debug('Join Us page view tracking failed:', error);
      }
    });
  }

  /**
   * Fetch dynamic sections from CMS API
   */
  fetchSections(): void {
    this.isLoading = true;
    this.pageSectionService.getSections('join_us').subscribe({
      next: (response) => {
        this.sections = response.data || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching join-us sections:', error);
        this.sections = [];
        this.isLoading = false;
      }
    });
  }
}

