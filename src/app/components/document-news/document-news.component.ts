import { Component } from '@angular/core';
import { ListDocumentsComponent } from '../generic/list-documents/list-documents.component';
import { CommonModule } from '@angular/common';
import { DocumentType } from '../../config/document.config';

@Component({
  selector: 'app-document-news',
  templateUrl: './document-news.component.html',
  styleUrls: ['./document-news.component.scss'],
  standalone: true,
  imports: [ListDocumentsComponent, CommonModule]
})
export class DocumentNewsComponent {
  modelType: DocumentType = 'news';
}
