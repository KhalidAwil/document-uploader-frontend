import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentNewsComponent } from './document-news.component';

describe('DocumentNewsComponent', () => {
  let component: DocumentNewsComponent;
  let fixture: ComponentFixture<DocumentNewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentNewsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentNewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
