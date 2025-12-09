import { Component } from '@angular/core';
import { ListDocumentsComponent } from '../generic/list-documents/list-documents.component';
import { CommonModule } from '@angular/common';
import { DocumentType } from '../../config/document.config';

@Component({
  selector: 'app-document-athar',
  templateUrl: './document-athar.component.html',
  styleUrls: ['./document-athar.component.scss'],
  standalone: true,
  imports: [ListDocumentsComponent, CommonModule]
})
export class DocumentAtharComponent {
  modelType: DocumentType = 'athar';
}