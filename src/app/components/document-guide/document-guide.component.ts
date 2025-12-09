import { Component } from '@angular/core';
import { ListDocumentsComponent } from '../generic/list-documents/list-documents.component';
import { CommonModule } from '@angular/common';
import { DocumentType } from '../../config/document.config';

@Component({
  selector: 'app-document-guide',
  templateUrl: './document-guide.component.html',
  styleUrls: ['./document-guide.component.scss'],
  standalone: true,
  imports: [ListDocumentsComponent, CommonModule]
})
export class DocumentGuideComponent {
  modelType: DocumentType = 'guide';
}
