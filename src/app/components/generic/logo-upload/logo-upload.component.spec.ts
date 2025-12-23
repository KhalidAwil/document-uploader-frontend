import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogoUploadComponent } from './logo-upload.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('LogoUploadComponent', () => {
  let component: LogoUploadComponent;
  let fixture: ComponentFixture<LogoUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LogoUploadComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LogoUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
