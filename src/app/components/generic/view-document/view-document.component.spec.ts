import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewDocumentComponent } from './view-document.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

describe('ViewDocumentComponent', () => {
  let component: ViewDocumentComponent;
  let fixture: ComponentFixture<ViewDocumentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ViewDocumentComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => '1' },
              data: { modelType: 'news' }
            },
            params: of({ id: '1' })
          }
        },
        {
          provide: NgbModal,
          useValue: {
            open: () => ({ result: Promise.resolve() }),
            dismissAll: () => { }
          }
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ViewDocumentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
