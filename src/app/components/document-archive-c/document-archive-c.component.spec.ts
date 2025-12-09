import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentArchiveCComponent } from './document-archive-c.component';

describe('DocumentArchiveCComponent', () => {
  let component: DocumentArchiveCComponent;
  let fixture: ComponentFixture<DocumentArchiveCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentArchiveCComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentArchiveCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
