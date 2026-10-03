import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AreaFilter, FilterOperations, RadiusFilter } from '@common/types';
import Feature from 'ol/Feature';
import { Circle, Point, Polygon } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { commonTestProviders } from '../../testing/test-helpers';
import { MapComponent } from './map.component';
import { MapModule } from './map.module';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;

  const radiusFilter: RadiusFilter = {
    key: 'content.location',
    operation: FilterOperations.RADIUS,
    negate: false,
    value: { center: [13.4, 52.5], radius: 1.5 },
  };
  const areaFilter: AreaFilter = {
    key: 'content.location',
    operation: FilterOperations.AREA,
    negate: false,
    value: { vertices: [[13.3, 52.5], [13.4, 52.5], [13.4, 52.6], [13.3, 52.5]] },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MapModule],
      providers: commonTestProviders(),
    });
    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  it('creates the OpenLayers map centred on Berlin', () => {
    fixture.detectChanges();
    const [lon, lat] = fromLonLat([13.404954, 52.520008]);
    const center = component.map.getView().getCenter()!;
    expect(center[0]).toBeCloseTo(lon);
    expect(center[1]).toBeCloseTo(lat);
  });

  it('turns preset filters into named map features', () => {
    fixture.componentRef.setInput('presetFilters', [radiusFilter, areaFilter]);
    fixture.detectChanges();

    expect(component.searchAreas.map((a) => a.name)).toEqual(['Radius 1 (1.5km)', 'Polygon 1']);
    expect(component.source.getFeatures().length).toBe(2);
  });

  it('creates a RADIUS filter from a drawn circle (OpenLayers radius = 2x km radius)', () => {
    fixture.detectChanges();
    const circle = new Feature(new Circle(fromLonLat([13.4, 52.5]), 2000));

    const filter = component.createFilterFromGeometry(circle) as RadiusFilter;

    expect(filter.operation).toBe(FilterOperations.RADIUS);
    expect(filter.key).toBe('content.location');
    expect(filter.value.radius).toBeCloseTo(1);
    expect(filter.value.center[0]).toBeCloseTo(13.4);
    expect(filter.value.center[1]).toBeCloseTo(52.5);
  });

  it('creates an AREA filter from a drawn polygon in lon/lat', () => {
    fixture.detectChanges();
    const ring = areaFilter.value.vertices.map((c) => fromLonLat(c));
    const filter = component.createFilterFromGeometry(new Feature(new Polygon([ring]))) as AreaFilter;

    expect(filter.operation).toBe(FilterOperations.AREA);
    filter.value.vertices.forEach((vertex, i) => {
      expect(vertex[0]).toBeCloseTo(areaFilter.value.vertices[i][0]);
      expect(vertex[1]).toBeCloseTo(areaFilter.value.vertices[i][1]);
    });
  });

  it('ignores unsupported geometries', () => {
    fixture.detectChanges();
    expect(component.createFilterFromGeometry(new Feature(new Point([0, 0])))).toBeUndefined();
    expect(component.createFilterFromGeometry(undefined)).toBeUndefined();
  });

  it('removes a filter chip and emits the remaining filters', () => {
    fixture.componentRef.setInput('presetFilters', [radiusFilter, areaFilter]);
    fixture.detectChanges();
    const emitted: unknown[] = [];
    component.filterUpdated.subscribe((filters) => emitted.push(filters));

    component.removeChip(component.searchAreas[0].id);

    expect(component.searchAreas.map((a) => a.filter)).toEqual([areaFilter]);
    expect(emitted).toEqual([[areaFilter]]);
  });

  it('draws one multi-point feature per displayed collection', () => {
    fixture.componentRef.setInput('collections', [
      { hexColor: '#ff0000', coordinates: [[13.4, 52.5], [13.41, 52.51]] },
      { hexColor: '#00ff00', coordinates: [[13.3, 52.4]] },
    ]);
    fixture.detectChanges();
    component.drawPoints();
    expect(component.pointSource.getFeatures().length).toBe(2);
  });
});
