import { Component } from '@angular/core';
import { ListDocumentsComponent } from '../generic/list-documents/list-documents.component';
import { CommonModule } from '@angular/common';
import { DocumentType } from '../../config/document.config';

@Component({
  selector: 'app-document-release',
  templateUrl: './document-release.component.html',
  styleUrls: ['./document-release.component.scss'],
  standalone: true,
  imports: [ListDocumentsComponent, CommonModule]
})
export class DocumentReleaseComponent {
  modelType: DocumentType = 'release';
}
