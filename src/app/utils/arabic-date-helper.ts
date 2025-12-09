/**
 * Arabic Date Helper - Provides utilities for formatting dates in Arabic
 */

export class ArabicDateHelper {
  // Arabic day names
  private static arabicDays = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت'
  ];

  // Arabic month names
  private static arabicMonths = [
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
    'ديسمبر'
  ];

  // Arabic numerals
  private static arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  /**
   * Formats a date in full Arabic format (day of week, day, month, year)
   * @param date Date to format
   * @returns Formatted date string in Arabic
   */
  public static formatFullDate(date: Date | string): string {
    if (!date) return '';
    
    try {
      const dateObj = (typeof date === 'string') ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date provided to formatFullDate:', date);
        return '';
      }
      
      const day = dateObj.getDate();
      const month = dateObj.getMonth();
      const year = dateObj.getFullYear();
      const dayOfWeek = dateObj.getDay();
      
      const arabicDay = this.convertToArabicNumerals(day);
      const arabicYear = this.convertToArabicNumerals(year);
      const arabicDayOfWeek = this.arabicDays[dayOfWeek];
      const arabicMonth = this.arabicMonths[month];
      
      console.log(`Formatting Arabic full date: ${arabicDayOfWeek}، ${arabicDay} ${arabicMonth} ${arabicYear}`);
      return `${arabicDayOfWeek}، ${arabicDay} ${arabicMonth} ${arabicYear}`;
    } catch (err) {
      console.error('Error formatting date in Arabic:', err);
      return '';
    }
  }

  /**
   * Formats a date in short Arabic format (day/month/year)
   * @param date Date to format
   * @returns Formatted date string in Arabic
   */
  public static formatShortDate(date: Date | string): string {
    if (!date) return '';
    
    try {
      const dateObj = (typeof date === 'string') ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date provided to formatShortDate:', date);
        return '';
      }
      
      const day = dateObj.getDate();
      const month = dateObj.getMonth() + 1; // Month is 0-indexed in JS
      const year = dateObj.getFullYear();
      
      const arabicDay = this.convertToArabicNumerals(day);
      const arabicMonth = this.convertToArabicNumerals(month);
      const arabicYear = this.convertToArabicNumerals(year);
      
      console.log(`Formatting Arabic short date: ${arabicDay}/${arabicMonth}/${arabicYear}`);
      return `${arabicDay}/${arabicMonth}/${arabicYear}`;
    } catch (err) {
      console.error('Error formatting short date in Arabic:', err);
      return '';
    }
  }

  /**
   * Converts Western (European) numerals to Arabic numerals
   * @param num Number to convert
   * @returns String with Arabic numerals
   */
  public static convertToArabicNumerals(num: number): string {
    if (num === undefined || num === null) return '';
    return num.toString().split('').map(digit => {
      const parsed = parseInt(digit, 10);
      return isNaN(parsed) ? digit : this.arabicNumerals[parsed];
    }).join('');
  }
  
  /**
   * Converts any string containing Western numerals to a string with Arabic numerals
   * @param input Input string that may contain digits
   * @returns String with all digits converted to Arabic numerals
   */
  public static convertStringToArabicNumerals(input: string): string {
    if (!input) return '';
    return input.replace(/\d/g, (digit) => this.arabicNumerals[parseInt(digit, 10)]);
  }
  
  /**
   * Create a date formatter for Arabic dates that works like toLocaleDateString
   * but ensures proper Arabic formatting
   * @param date The date to format
   * @param options Formatting options similar to toLocaleDateString
   * @returns Formatted date string in Arabic
   */
  public static toArabicDateString(date: Date | string, options?: { 
    weekday?: 'long' | 'short' | 'narrow',
    year?: 'numeric' | '2-digit',
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow',
    day?: 'numeric' | '2-digit'
  }): string {
    if (!date) return '';
    
    try {
      const dateObj = (typeof date === 'string') ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date provided to toArabicDateString:', date);
        return '';
      }
      
      const day = dateObj.getDate();
      const month = dateObj.getMonth();
      const year = dateObj.getFullYear();
      const dayOfWeek = dateObj.getDay();
      
      // For simplified approach, always format dates in the full Arabic pattern
      // regardless of options (to ensure consistency)
      const arabicDayOfWeek = this.arabicDays[dayOfWeek];
      const arabicDay = this.convertToArabicNumerals(day);
      const arabicMonth = this.arabicMonths[month];
      const arabicYear = this.convertToArabicNumerals(year);
      
      // Full format: dayOfWeek, day month year
      if (options?.weekday) {
        return `${arabicDayOfWeek}، ${arabicDay} ${arabicMonth} ${arabicYear}`;
      } 
      // Short format: day/month/year
      else {
        return `${arabicDay}/${this.convertToArabicNumerals(month + 1)}/${arabicYear}`;
      }
    } catch (err) {
      console.error('Error in toArabicDateString:', err);
      return '';
    }
  }
} 