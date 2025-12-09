import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentAtharComponent } from './document-athar.component';

describe('DocumentAtharComponent', () => {
  let component: DocumentAtharComponent;
  let fixture: ComponentFixture<DocumentAtharComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentAtharComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentAtharComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});