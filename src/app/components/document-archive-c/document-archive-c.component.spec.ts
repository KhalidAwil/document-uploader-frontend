import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentArchiveCComponent } from './document-archive-c.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DocumentArchiveCComponent', () => {
  let component: DocumentArchiveCComponent;
  let fixture: ComponentFixture<DocumentArchiveCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DocumentArchiveCComponent,
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

    fixture = TestBed.createComponent(DocumentArchiveCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
