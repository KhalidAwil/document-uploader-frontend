import { Component, OnInit } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StatisticsService } from '../../services/statistics.service';

@Component({
  selector: 'app-join-us',
  templateUrl: './join-us.component.html',
  styleUrls: ['./join-us.component.scss'],
  imports: [TranslatePipe],
  standalone: true
})
export class JoinUsComponent implements OnInit {
  name: string = '';
  email: string = '';
  documentType: string = '';

  constructor(
    private translate: TranslateService,
    private statisticsService: StatisticsService
  ) { }

  ngOnInit(): void {
    this.trackPageView();
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
}
