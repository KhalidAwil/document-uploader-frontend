import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapLocationPickerComponent } from './map-location-picker.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('MapLocationPickerComponent', () => {
  let component: MapLocationPickerComponent;
  let fixture: ComponentFixture<MapLocationPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MapLocationPickerComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MapLocationPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit location when location changes', () => {
    spyOn(component.locationChanged, 'emit');

    component.selectedLocation = '31.7683, 35.2137';
    component.confirmLocation();

    expect(component.locationChanged.emit).toHaveBeenCalledWith('31.7683, 35.2137');
  });

  it('should validate coordinate format', () => {
    component.manualInput = '31.7683, 35.2137';
    component.onManualInputChange();

    expect(component.selectedLocation).toBe('31.7683, 35.2137');
  });

  it('should reject invalid coordinate format', () => {
    component.manualInput = 'invalid coordinates';
    component.onManualInputChange();

    expect(component.selectedLocation).toBe('');
  });

  it('should clear location', () => {
    component.selectedLocation = '31.7683, 35.2137';
    component.clearLocation();

    expect(component.selectedLocation).toBe('');
    expect(component.manualInput).toBe('');
  });

  it('should format display value', () => {
    component.selectedLocation = '31.768300, 35.213700';
    const displayValue = component.getDisplayValue();

    expect(displayValue).toBe('31.7683, 35.2137');
  });
});