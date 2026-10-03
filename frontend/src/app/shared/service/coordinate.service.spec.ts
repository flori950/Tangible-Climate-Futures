import { TestBed } from '@angular/core/testing';
import { fromLonLat } from 'ol/proj';
import { CoordinateService } from './coordinate.service';

describe('CoordinateService', () => {
  let service: CoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CoordinateService] });
    service = TestBed.inject(CoordinateService);
  });

  it('transforms web-mercator map coordinates back to lon/lat', () => {
    const [lon, lat] = service.transformToLongLat(fromLonLat([13.404954, 52.520008]));
    expect(lon).toBeCloseTo(13.404954, 6);
    expect(lat).toBeCloseTo(52.520008, 6);
  });

  it('broadcasts selected coordinates', () => {
    const received: [number, number][] = [];
    service.coordinate$.subscribe((c) => received.push(c));
    service.setCoordinate([1, 2]);
    expect(received).toEqual([[1, 2]]);
  });
});
