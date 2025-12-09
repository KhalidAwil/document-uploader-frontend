import { Component } from '@angular/core';
import { ListDocumentsComponent } from '../generic/list-documents/list-documents.component';
import { CommonModule } from '@angular/common';
import { DocumentType } from '../../config/document.config';

@Component({
  selector: 'app-document-archive-c',
  templateUrl: './document-archive-c.component.html',
  styleUrls: ['./document-archive-c.component.scss'],
  standalone: true,
  imports: [ListDocumentsComponent, CommonModule]
})
export class DocumentArchiveCComponent {
  modelType: DocumentType = 'archive_c';
}
