import { Pipe, PipeTransform } from '@angular/core';
import { LabelService } from '../services/label.service';

@Pipe({
    name: 'label',
    pure: false // Allows the pipe to update if labels change or load late
})
export class LabelPipe implements PipeTransform {

    constructor(private labelService: LabelService) { }

    transform(key: string, defaultText?: string): string {
        const value = this.labelService.get(key);
        // If the service returns the key itself (meaning not found), 
        // and we provided a defaultText default, use that instead? 
        // Or just let service handle it. The service returns key if not found.

        if (value === key && defaultText) {
            return defaultText;
        }

        return value;
    }
}
