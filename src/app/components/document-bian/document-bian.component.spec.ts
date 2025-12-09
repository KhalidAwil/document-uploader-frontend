import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentBianComponent } from './document-bian.component';

describe('DocumentBianComponent', () => {
  let component: DocumentBianComponent;
  let fixture: ComponentFixture<DocumentBianComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentBianComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentBianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
