import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownManagementComponent } from './dropdown-management.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('DropdownManagementComponent', () => {
  let component: DropdownManagementComponent;
  let fixture: ComponentFixture<DropdownManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DropdownManagementComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DropdownManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
