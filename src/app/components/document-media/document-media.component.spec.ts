import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentMediaComponent } from './document-media.component';

describe('DocumentMediaComponent', () => {
  let component: DocumentMediaComponent;
  let fixture: ComponentFixture<DocumentMediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentMediaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentMediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
