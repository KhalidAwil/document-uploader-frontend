import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DocumentService } from '../services/document.service';

/**
 * Custom validator for password strength - requires at least one letter, one number, and one symbol
 */
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Don't validate empty value here (handled by required)
    }

    // Check if password contains at least one letter, one number, and one symbol
    const hasNumber = /[0-9]/.test(value);
    const hasLetter = /[a-zA-Z]/.test(value);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value);
    
    const valid = hasNumber && hasLetter && hasSymbol;
    
    if (!valid) {
      return { passwordStrength: { hasNumber, hasLetter, hasSymbol } };
    }
    
    return null;
  };
}

/**
 * Custom validator for YouTube URLs
 * Supports regular YouTube videos, YouTube Shorts, and other YouTube URL formats
 */
export function youtubeUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const url = control.value;
    if (!url) return null; // Don't validate empty value here (handled by required)

    // Updated regex to support YouTube Shorts URLs (youtube.com/shorts/VIDEO_ID)
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    return videoId ? null : { invalidYoutube: true };
  };
}

/**
 * Custom validator for URL format
 */
export function urlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const url = control.value;
    if (!url) return null; // Don't validate empty value here (handled by required)
    
    try {
      // Use URL constructor for comprehensive validation
      const urlObj = new URL(url);
      
      // Ensure it has a valid protocol (http or https)
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return { invalidUrl: true };
      }
      
      // Ensure it has a valid hostname
      if (!urlObj.hostname || urlObj.hostname.length === 0 || urlObj.hostname.startsWith('.') || urlObj.hostname.endsWith('.')) {
        return { invalidUrl: true };
      }
      
      // Additional check with regex for common URL patterns
      const urlPattern = /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w/_.-])*(?:\?(?:[\w&=%.-])*)?(?:\#(?:[\w.-])*)?)?$/;
      if (!urlPattern.test(url)) {
        return { invalidUrl: true };
      }
      
      return null;
    } catch (error) {
      // URL constructor throws error for invalid URLs
      return { invalidUrl: true };
    }
  };
}

/**
 * Custom validator for geographic coordinates (latitude,longitude)
 */
export function geoLocationValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Don't validate empty value here (handled by required)
    
    const pattern = /^-?([1-8]?[0-9](\.[0-9]+)?|90(\.0+)?),\s*-?(180(\.0+)?|((1[0-7][0-9])|([1-9]?[0-9]))(\.[0-9]+)?)$/;
    return pattern.test(value) ? null : { invalidGeoLocation: true };
  };
}

/**
 * Custom validator for time format (HH:MM:SS)
 */
export function timeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const time = control.value;
    
    // Check if we have a valid time object
    if (!time || typeof time !== 'object') {
      return { invalidTime: true };
    }

    // Validate hour, minute, and second values
    const isValidHour = time.hour >= 0 && time.hour <= 23;
    const isValidMinute = time.minute >= 0 && time.minute <= 59;
    const isValidSecond = time.second >= 0 && time.second <= 59;

    if (!isValidHour || !isValidMinute || !isValidSecond) {
      return { invalidTime: true };
    }

    return null;
  };
}

/**
 * Custom validator for date or "unknown" value
 */
export function dateOrUnknownValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Don't validate empty value here (handled by required)
    
    // Allow "unknown" as valid value
    if (value === 'unknown') {
      return null;
    }
    
    // Check if it's a valid date
    const date = new Date(value);
    return !isNaN(date.getTime()) ? null : { invalidDate: true };
  };
}

/**
 * Custom validator for UUID format
 */
export function uuidValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Don't validate empty value here (handled by required)
    
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(value) ? null : { invalidUuid: true };
  };
}

/**
 * Custom validator for athar ID format (allows any characters with no restrictions)
 */
export function atharIdFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Don't validate empty value here (handled by required)
    
    // Accept any string value - no format restrictions
    return null;
  };
}

/**
 * Async validator for athar ID uniqueness
 */
export function atharIdUniquenessValidator(documentService: DocumentService, currentId?: string): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = control.value;
    
    // Don't validate empty values, "unknown", or if it's the same as current ID (for edit mode)
    if (!value || value === 'unknown' || value === currentId) {
      return of(null);
    }
    
    return documentService.checkAtharIdUniqueness(value, currentId).pipe(
      map((isUnique: boolean) => {
        return isUnique ? null : { atharIdNotUnique: true };
      }),
      catchError(() => {
        // In case of error, assume it's unique to avoid blocking the form
        return of(null);
      })
    );
  };
}