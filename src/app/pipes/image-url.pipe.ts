import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    // If the URL is already absolute (starts with http:// or https://), return as is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // Remove leading slash if present to avoid double slashes
    const cleanPath = value.startsWith('/') ? value.substring(1) : value;

    // Prepend the fileUploadUrl from environment
    return `${environment.fileUploadUrl}/${cleanPath}`;
  }
}
