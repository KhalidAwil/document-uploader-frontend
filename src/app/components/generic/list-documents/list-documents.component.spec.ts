import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListDocumentsComponent } from './list-documents.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ListDocumentsComponent', () => {
  let component: ListDocumentsComponent;
  let fixture: ComponentFixture<ListDocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ListDocumentsComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParamMap: of({ get: () => null }),
            snapshot: { queryParams: {} }
          }
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ListDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
