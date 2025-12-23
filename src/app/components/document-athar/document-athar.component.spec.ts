import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentAtharComponent } from './document-athar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DocumentAtharComponent', () => {
  let component: DocumentAtharComponent;
  let fixture: ComponentFixture<DocumentAtharComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DocumentAtharComponent,
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

    fixture = TestBed.createComponent(DocumentAtharComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});