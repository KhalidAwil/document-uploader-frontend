import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentReleaseComponent } from './document-release.component';

describe('DocumentReleaseComponent', () => {
  let component: DocumentReleaseComponent;
  let fixture: ComponentFixture<DocumentReleaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentReleaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentReleaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
