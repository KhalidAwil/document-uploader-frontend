import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { StatisticsService } from '../../services/statistics.service';
import { Chart, ChartType } from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DropdownSelectComponent } from '../generic/dropdown-select/dropdown-select.component';
import { convertToArabicNumerals } from '../../utils/localization.utils'; // Import the utility function
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker'; // Import BsDatepickerModule

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    TranslatePipe, 
    DropdownSelectComponent,
    BsDatepickerModule // Add BsDatepickerModule here
  ],
  standalone: true
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  @ViewChild('statisticsChart', { static: false }) chartRef!: ElementRef; // Reference to the canvas
  statisticsForm: FormGroup;
  chart: any;
  statisticsData: any[] = [];
  isLoading: boolean = false;
  hasSearched: boolean = false;
  startDate: string = '';
  endDate: string = '';
  months: any[] = [];
  years: number[] = [];
  isCanvasReady: boolean = false; // To track when canvas is available
  selectedChartType: ChartType = 'bar'; // Track selected chart type, default to 'bar'

  constructor(
    private fb: FormBuilder,
    private statisticsService: StatisticsService,
    private translate: TranslateService
  ) {
    this.statisticsForm = this.fb.group({
      document_type: [''], // Optional: Filter by document type
      page_type: [''], // Optional: Filter by page type
      period: ['month', Validators.required], // Default to 'day'
      start_date: [''], // Custom start date
      end_date: [''], // Custom end date
      month: [new Date().getMonth() + 1], // Month (for 'month' period)
      year: [new Date().getFullYear()], // Year (for 'month' or 'year' period)
    });

    this.months = [
      { value: 1, label: this.translate.instant('MONTH.JANUARY') },
      { value: 2, label: this.translate.instant('MONTH.FEBRUARY') },
      { value: 3, label: this.translate.instant('MONTH.MARCH') },
      { value: 4, label: this.translate.instant('MONTH.APRIL') },
      { value: 5, label: this.translate.instant('MONTH.MAY') },
      { value: 6, label: this.translate.instant('MONTH.JUNE') },
      { value: 7, label: this.translate.instant('MONTH.JULY') },
      { value: 8, label: this.translate.instant('MONTH.AUGUST') },
      { value: 9, label: this.translate.instant('MONTH.SEPTEMBER') },
      { value: 10, label: this.translate.instant('MONTH.OCTOBER') },
      { value: 11, label: this.translate.instant('MONTH.NOVEMBER') },
      { value: 12, label: this.translate.instant('MONTH.DECEMBER') },
    ];
  }

  ngOnInit(): void {
    this.initializeYears();
    // Don't load statistics automatically on init
    // this.loadStatistics();

    this.translate.onLangChange.subscribe(() => {
      this.renderChart(); // Re-render the chart with the new translations
    });
  }

  ngAfterViewInit(): void {
    this.isCanvasReady = true; // Canvas is now available
    this.renderChart(); // Render the chart if data is already available
  }

  initializeYears(): void {
    const currentYear = new Date().getFullYear();
    this.years = Array.from({ length: 20 }, (_, i) => currentYear - i);
  }

  loadStatistics(): void {
    this.isLoading = true;
    this.hasSearched = true;
    const params = this.statisticsForm.value;

    if(params.document_type === 'video' || params.document_type === 'image') {
      const mediaType = params.document_type
      params.document_type = 'media';
      params.media_type = mediaType;
    }

    this.statisticsService.getStatistics(params).subscribe({
      next: (response) => {
        this.statisticsData = response.statistics;
        this.startDate = response.start_date;
        this.endDate = response.end_date;
        this.isLoading = false;
        // Use setTimeout to ensure DOM is updated before rendering
        setTimeout(() => {
          this.renderChart();
        }, 0);
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.isLoading = false;
      },
    });
  }
  
  /**
   * Convert a number to Arabic numerals
   */
  convertToArabicNumerals = convertToArabicNumerals; // Assign imported function

  renderChart(): void {
    if (this.chart) {
      this.chart.destroy(); // Clear the previous chart
    }

    const canvas = this.chartRef?.nativeElement;
    if (!canvas) {
      console.log('Canvas not available for chart rendering.');
      return;
    }
    
    if (!this.statisticsData || this.statisticsData.length === 0) {
      console.log('No data available for chart rendering.');
      return;
    }

    const labels = this.statisticsData.map((item: any) => {
      // Handle page type statistics
      if (item?.page_type) {
        return this.translate.instant(`STATISTICS.${item.page_type.toUpperCase().replace('-', '_')}`);
      }
      // Handle media type or document type
      const typeKey = item?.media_type?.toUpperCase() ?? item?.document_type?.toUpperCase();
      return this.translate.instant(`DOCUMENT_TYPE.${typeKey}`);
    });

    const documentViews = this.statisticsData.map((item: any) => item.total_views);
    const imageViews = this.statisticsData.map((item: any) => item.total_image_views);
    const pdfViews = this.statisticsData.map((item: any) => item.total_pdf_views);
    const videoViews = this.statisticsData.map((item: any) => item.total_video_views);
    const pageViews = this.statisticsData.map((item: any) => item.total_page_views);

    Chart.defaults.font.size = 16;
    const self = this;

    // Base dataset configurations
    const datasetsConfig = [
      {
        label: this.translate.instant('CHART.DOCUMENT_VIEWS'),
        data: documentViews,
        backgroundColor: '#664433', // Used for bar, border for line
        borderColor: '#664433',
        fill: false, // Relevant for line chart
      },
      {
        label: this.translate.instant('CHART.IMAGE_VIEWS'),
        data: imageViews,
        backgroundColor: '#29304B',
        borderColor: '#29304B',
        fill: false,
      },
      {
        label: this.translate.instant('CHART.PDF_VIEWS'),
        data: pdfViews,
        backgroundColor: '#D1985D',
        borderColor: '#D1985D',
        fill: false,
      },
      {
        label: this.translate.instant('CHART.VIDEO_VIEWS'),
        data: videoViews,
        backgroundColor: '#C3C3C3',
        borderColor: '#C3C3C3',
        fill: false,
      },
      {
        label: this.translate.instant('CHART.PAGE_VIEWS'),
        data: pageViews,
        backgroundColor: '#8E44AD',
        borderColor: '#8E44AD',
        fill: false,
      },
    ];

    this.chart = new Chart(canvas, {
      type: this.selectedChartType, // Use the selected chart type
      data: {
        labels,
        datasets: datasetsConfig,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 40,
            bottom: 20,
            left: 20,
            right: 20
          }
        },
        plugins: {
          legend: { 
            position: 'top',
            labels: {
              padding: 20,
              font: {
                size: 14
              }
            }
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  // Convert to Arabic numerals for tooltips - Use the imported function via this
                  label += self.convertToArabicNumerals(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              font: {
                size: 12
              },
              maxRotation: 45,
              minRotation: 0
            },
            grid: {
              display: false
            }
          },
          y: { 
            beginAtZero: true,
            grace: '10%',
            ticks: {
              font: {
                size: 12
              },
              padding: 10,
              // Convert y-axis labels to Arabic numerals - Use the imported function via this
              callback: function(value: any) {
                return self.convertToArabicNumerals(value as number);
              }
            },
            grid: {
              color: '#e0e0e0',
              lineWidth: 1
            }
          },
        },
        animation: {
          duration: 1000,
          onComplete: () => {
            this.addDataLabelsToChart();
          }
        }
      },
    });
  }

  // Method to add data labels to chart
  addDataLabelsToChart(): void {
    if (!this.chart || !this.chart.ctx) return;
    
    const ctx = this.chart.ctx;
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    this.chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = this.chart.getDatasetMeta(i);
      if (meta.hidden) return; // Skip hidden datasets
      
      meta.data.forEach((element: any, index: number) => {
        const data = dataset.data[index];
        if (data > 0) {
          // Convert to Arabic numerals for display
          const displayValue = this.convertToArabicNumerals(data);
          const position = element.tooltipPosition();
          
          // Adjust position based on chart type
          const yPos = position.y - 8;
          
          ctx.fillText(displayValue, position.x, yPos);
        }
      });
    });
  }

  // Method to change the chart type
  changeChartType(type: ChartType): void {
    if (this.selectedChartType !== type) {
      this.selectedChartType = type;
      this.renderChart(); // Re-render the chart with the new type
    }
  }

  onPeriodChange(): void {
    const period = this.statisticsForm.value.period;
    const today = new Date();

    if (period === 'day') {
        // Set start_date and end_date to today's date
        const formattedDate = today.toISOString().split('T')[0];
        this.statisticsForm.patchValue({
            start_date: formattedDate,
            end_date: formattedDate,
            month: '',
            year: ''
        });
    } else if (period === 'month') {
        // Set month to the current month and year to the current year
        this.statisticsForm.patchValue({
            start_date: '',
            end_date: '',
            month: today.getMonth() + 1,
            year: today.getFullYear()
        });
    } else if (period === 'year') {
        // Set year to the current year
        this.statisticsForm.patchValue({
            start_date: '',
            end_date: '',
            month: '',
            year: today.getFullYear()
        });
    }
  }

  onFilter(): void {
    this.loadStatistics();
  }

  get showWelcomeMessage(): boolean {
    return !this.hasSearched && !this.isLoading;
  }

  get showNoDataMessage(): boolean {
    return this.hasSearched && !this.statisticsData.length && !this.isLoading;
  }

  onDocumentTypeChange(): void {
    // Clear page_type when document_type is selected
    if (this.statisticsForm.get('document_type')?.value) {
      this.statisticsForm.patchValue({ page_type: '' });
    }
  }

  onPageTypeChange(): void {
    // Clear document_type when page_type is selected
    if (this.statisticsForm.get('page_type')?.value) {
      this.statisticsForm.patchValue({ document_type: '' });
    }
  }
}