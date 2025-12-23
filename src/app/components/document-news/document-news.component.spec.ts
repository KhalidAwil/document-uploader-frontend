import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentNewsComponent } from './document-news.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DocumentNewsComponent', () => {
  let component: DocumentNewsComponent;
  let fixture: ComponentFixture<DocumentNewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DocumentNewsComponent,
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

    fixture = TestBed.createComponent(DocumentNewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
