import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoUploadComponent } from './logo-upload.component';

describe('LogoUploadComponent', () => {
  let component: LogoUploadComponent;
  let fixture: ComponentFixture<LogoUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoUploadComponent]
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
