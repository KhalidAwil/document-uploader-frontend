import { Component } from '@angular/core';
import { ListDocumentsComponent } from '../generic/list-documents/list-documents.component';
import { CommonModule } from '@angular/common';
import { DocumentType } from '../../config/document.config';

@Component({
  selector: 'app-document-bian',
  templateUrl: './document-bian.component.html',
  styleUrls: ['./document-bian.component.scss'],
  standalone: true,
  imports: [ListDocumentsComponent, CommonModule]
})
export class DocumentBianComponent {
  modelType: DocumentType = 'bian';
}
