// arabic-numerals.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'arabicNumerals',
  standalone: true
})
export class ArabicNumeralsPipe implements PipeTransform {
  private arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  transform(value: number | string): string {
    if (value === null || value === undefined) return '';
    
    return value.toString().replace(/[0-9]/g, digit => this.arabicNumerals[parseInt(digit)]);
  }
}