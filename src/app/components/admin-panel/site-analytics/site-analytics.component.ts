import { Component } from '@angular/core';
import { environment } from '../../../../environment';

@Component({
  selector: 'app-site-analytics',
  templateUrl: './site-analytics.component.html',
  styleUrls: ['./site-analytics.component.scss']
})
export class SiteAnalyticsComponent {
  plausibleUrl = environment.plausibleUrl;
}
