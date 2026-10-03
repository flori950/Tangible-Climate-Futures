import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Datafile, DataType } from '@common/types';
import { firstValueFrom, of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../testing/test-helpers';
import { JourneyComponent } from './journey.component';
import { JourneyModule } from './journey.module';
import { CollectionData } from './services/journey.service';

describe('JourneyComponent', () => {
  let component: JourneyComponent;
  let fixture: ComponentFixture<JourneyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JourneyModule],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
      ],
    });
    fixture = TestBed.createComponent(JourneyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with a new, empty journey', async () => {
    const journey = await firstValueFrom(component.journey$!);
    expect(journey?.collections).toEqual([]);
    expect(await firstValueFrom(component.hasNoCollections$!)).toBe(true);
  });

  it('switches between the default and the no-map view', () => {
    expect(component.view).toBe('default');
    component.changeView('no-map');
    expect(component.view).toBe('no-map');
  });

  it('converts collection data into map display collections', async () => {
    const file = (id: string, coordinates: number[]): Datafile => ({
      _id: id,
      title: id,
      tags: [],
      dataSet: 'NONE',
      dataType: DataType.NOTREFERENCED,
      content: { data: {}, location: { type: 'Point', coordinates } },
    });
    const data: CollectionData = {
      collection: { title: 'A', filterSet: [] },
      color: '#123456',
      files: {
        skip: 0,
        limit: 10,
        totalCount: 2,
        results: [file('f1', [13.4, 52.5]), file('f2', [13.3, 52.4])],
      },
      selectedFilesIds: new Set(['f2']),
    };

    const display = await firstValueFrom(component.collectionDataToDisplayCollection([of(data)]));

    expect(display).toEqual([{ hexColor: '#123456', coordinates: [[13.3, 52.4]] }]);
  });
});
