import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentGuideComponent } from './document-guide.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DocumentGuideComponent', () => {
  let component: DocumentGuideComponent;
  let fixture: ComponentFixture<DocumentGuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DocumentGuideComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParamMap: of({ get: () => null })
          }
        }
      ]
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
