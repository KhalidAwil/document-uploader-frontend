import { Directive, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: 'ngb-timepicker',
  standalone: true
})
export class ArabicNumeralsDirective implements AfterViewInit, OnDestroy {
  private westernToArabicMap: { [key: string]: string } = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩'
  };

  private arabicToWesternMap: { [key: string]: string } = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9'
  };

  private conversionInterval: any;
  private isConverting = false;

  constructor(private el: ElementRef) { }

  ngAfterViewInit(): void {
    // Use a short interval to continuously convert numbers to Arabic
    // This ensures we catch dynamically added/updated content
    this.conversionInterval = setInterval(() => {
      if (!this.isConverting) {
        this.isConverting = true;
        this.convertAllNumbers();
        this.isConverting = false;
      }
    }, 100);

    // Initial conversion
    setTimeout(() => this.convertAllNumbers(), 0);
  }

  ngOnDestroy(): void {
    if (this.conversionInterval) {
      clearInterval(this.conversionInterval);
    }
  }

  private convertAllNumbers(): void {
    const inputs = this.el.nativeElement.querySelectorAll('input');

    inputs.forEach((input: HTMLInputElement) => {
      // Only convert if the value contains Western numerals
      if (input.value && /[0-9]/.test(input.value)) {
        const cursorPosition = input.selectionStart;
        const arabicValue = this.toArabicNumerals(input.value);

        if (arabicValue !== input.value) {
          // Use a custom attribute to track if we've converted this value
          const lastConverted = input.getAttribute('data-last-converted');
          if (lastConverted !== input.value) {
            input.value = arabicValue;
            input.setAttribute('data-last-converted', input.value);

            // Restore cursor position if input is focused
            if (document.activeElement === input && cursorPosition !== null) {
              input.setSelectionRange(cursorPosition, cursorPosition);
            }
          }
        }
      }
    });

    // Convert button text content (for increment/decrement buttons)
    const buttons = this.el.nativeElement.querySelectorAll('button');
    buttons.forEach((button: HTMLElement) => {
      const text = button.textContent || '';
      if (/[0-9]/.test(text)) {
        button.textContent = this.toArabicNumerals(text);
      }
    });
  }

  private toArabicNumerals(value: string): string {
    return value.replace(/[0-9]/g, (match) => this.westernToArabicMap[match] || match);
  }

  private toWesternNumerals(value: string): string {
    return value.replace(/[٠-٩]/g, (match) => this.arabicToWesternMap[match] || match);
  }
}