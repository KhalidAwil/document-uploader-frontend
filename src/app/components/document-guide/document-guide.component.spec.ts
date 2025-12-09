import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentGuideComponent } from './document-guide.component';

describe('DocumentGuideComponent', () => {
  let component: DocumentGuideComponent;
  let fixture: ComponentFixture<DocumentGuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentGuideComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
