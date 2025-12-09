import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform, Inject, LOCALE_ID } from '@angular/core';

@Pipe({
  name: 'arabicDate',
  standalone: true,
  pure: true,
})
export class ArabicDatePipe implements PipeTransform {
  // Arabic digits for conversion
  private arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  // Arabic month names
  private arabicMonths = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  
  // Arabic weekdays
  private arabicWeekdays = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ];

  constructor(@Inject(LOCALE_ID) private locale: string) {}

  transform(value: any, format: string = 'mediumDate'): string | null {
    if (!value) return null;
    
    // Ensure we're working with a valid Date object
    const date = this.ensureDate(value);
    if (!date) return null;
    
    let formattedDate: string;

    // Format based on requested format type
    switch (format) {
      case 'mediumDate':
        // Format: "DD MMMM YYYY" (e.g., ٢٧ أبريل ٢٠٢٥)
        formattedDate = this.formatMediumDate(date);
        break;
        
      case 'short':
        // Format: "DD/MM/YYYY" (e.g., ٢٧/٠٤/٢٠٢٥)
        formattedDate = this.formatShortDate(date);
        break;
        
      case 'year':
        // Format: "YYYY" (e.g., ٢٠٢٥)
        formattedDate = date.getFullYear().toString();
        break;
        
      case 'fullDate':
        // Format: "اليوم DD MMMM YYYY" (e.g., الأربعاء ٢٧ أبريل ٢٠٢٥)
        formattedDate = this.formatFullDate(date);
        break;
        
      default:
        // Fallback to DatePipe with Arabic locale
        const datePipe = new DatePipe('ar');
        formattedDate = datePipe.transform(date, format, undefined, 'ar') || '';
        break;
    }

    // Convert all numbers to Arabic digits
    return this.toArabicDigits(formattedDate);
  }

  /**
   * Formats date as "DD MMMM YYYY"
   */
  private formatMediumDate(date: Date): string {
    const day = date.getDate();
    const month = this.arabicMonths[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  }

  /**
   * Formats date as "DD/MM/YYYY"
   */
  private formatShortDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  /**
   * Formats date as "اليوم DD MMMM YYYY"
   */
  private formatFullDate(date: Date): string {
    const weekday = this.arabicWeekdays[date.getDay()];
    const day = date.getDate();
    const month = this.arabicMonths[date.getMonth()];
    const year = date.getFullYear();
    
    return `${weekday} ${day} ${month} ${year}`;
  }

  /**
   * Converts all digits in a string to Arabic digits
   */
  private toArabicDigits(text: string): string {
    return text.replace(/\d/g, digit => this.arabicDigits[parseInt(digit, 10)]);
  }

  /**
   * Ensures the input is converted to a valid Date object
   */
  private ensureDate(value: any): Date | null {
    let date: Date;
    
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      // Try parsing the string date
      date = new Date(value);
      
      // If invalid, try different formats
      if (isNaN(date.getTime())) {
        // Try ISO format
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          date = new Date(value);
        } else if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          // YYYY-MM-DD format
          const [year, month, day] = value.split('-').map(n => parseInt(n, 10));
          date = new Date(year, month - 1, day);
        } else {
          // Try locale-specific parsing as last resort
          date = new Date(value);
        }
      }
    } else if (typeof value === 'number') {
      // Timestamp
      date = new Date(value);
    } else {
      return null;
    }
    
    // Final validation check
    return !isNaN(date.getTime()) ? date : null;
  }
}