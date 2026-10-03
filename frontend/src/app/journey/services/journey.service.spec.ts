import { TestBed } from '@angular/core/testing';
import {
  AreaFilter,
  Datafile,
  DataType,
  FilterOperations,
  Journey,
  RadiusFilter,
  Visibility,
} from '@common/types';
import { firstValueFrom, of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { DownloadService } from '../../download.service';
import { ApiService } from '../../shared/service/api.service';
import { JourneyService } from './journey.service';

function datafile(id: string): Datafile {
  return {
    _id: id,
    title: id,
    tags: [],
    dataSet: 'NONE',
    dataType: DataType.NOTREFERENCED,
    content: { data: {} },
  };
}

function journey(): Journey {
  return {
    _id: 'j1',
    title: 'Journey',
    tags: [],
    author: 'a@b.de',
    visibility: Visibility.PUBLIC,
    excludedIDs: ['f2'],
    collections: [
      {
        title: 'Collection #1',
        filterSet: [
          { key: 'tags', operation: FilterOperations.CONTAINS, negate: false, value: 'x' },
        ],
      },
    ],
  };
}

describe('JourneyService', () => {
  let service: JourneyService;
  let api: { getJourney: ReturnType<typeof vi.fn>; filterDatafiles: ReturnType<typeof vi.fn> };
  let downloadJourney: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = {
      getJourney: vi.fn(() => of(journey())),
      filterDatafiles: vi.fn(() =>
        of({ skip: 0, limit: 999999, totalCount: 2, results: [datafile('f1'), datafile('f2')] }),
      ),
    };
    downloadJourney = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider('a@b.de'),
        JourneyService,
        { provide: ApiService, useValue: api },
        { provide: DownloadService, useValue: { downloadJourney } },
      ],
    });
    service = TestBed.inject(JourneyService);
  });

  it('creates an empty journey when no id is given', async () => {
    const success = await firstValueFrom(service.loadJourney(null));
    const loaded = await firstValueFrom(service.journey$);

    expect(success).toBe(true);
    expect(loaded?.collections).toEqual([]);
    expect(api.getJourney).not.toHaveBeenCalled();
  });

  it('loads a journey, applies its excluded ids and selects the first collection', async () => {
    service.loadJourney('j1');

    const loaded = await firstValueFrom(service.journey$);
    expect(api.getJourney).toHaveBeenCalledWith('j1');
    expect(loaded?.title).toBe('Journey');
    expect(await firstValueFrom(service.excludedDataFiles$)).toEqual(new Set(['f2']));
    expect((await firstValueFrom(service.selectedCollection$))?.title).toBe('Collection #1');
  });

  it('enriches collections with files, a color and the selected file ids', async () => {
    service.loadJourney('j1');
    const [collectionData$] = await firstValueFrom(service.collectionsData$);
    const data = await firstValueFrom(collectionData$);

    expect(data.files.results.map((f) => f._id)).toEqual(['f1', 'f2']);
    expect(data.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect([...data.selectedFilesIds]).toEqual(['f1']);
  });

  it('names new collections with the first free number and selects them', async () => {
    service.loadJourney(null);
    service.addCollection();
    service.addCollection();

    const loaded = await firstValueFrom(service.journey$);
    expect(loaded?.collections.map((c) => c.title)).toEqual(['Collection #1', 'Collection #2']);
    expect((await firstValueFrom(service.selectedCollection$))?.title).toBe('Collection #2');

    service.deleteCollection(loaded!.collections[0]);
    service.addCollection();
    expect((await firstValueFrom(service.journey$))?.collections.map((c) => c.title)).toEqual([
      'Collection #2',
      'Collection #1',
    ]);
  });

  it('selects the first remaining collection after deleting the selected one', async () => {
    service.loadJourney(null);
    service.addCollection();
    service.addCollection();
    const loaded = await firstValueFrom(service.journey$);

    service.deleteCollection(loaded!.collections[1]);

    expect(await firstValueFrom(service.selectedCollection$)).toBe(loaded!.collections[0]);
  });

  it('refuses to select a collection of another journey', () => {
    service.loadJourney(null);
    expect(() => service.selectCollection({ title: 'foreign', filterSet: [] })).toThrow();
  });

  it('tracks selected and excluded data files', async () => {
    const [f1, f2] = [datafile('f1'), datafile('f2')];

    service.deselectDataFiles(f1, f2);
    expect(await firstValueFrom(service.allDataFilesSelected$('f1', 'f2'))).toBe(false);
    expect(await firstValueFrom(service.fewDataFileSelected$('f1', 'f2'))).toBe(false);

    service.selectDataFiles(f1);
    expect(await firstValueFrom(service.fewDataFileSelected$('f1', 'f2'))).toBe(true);

    service.selectDataFiles(f2);
    expect(await firstValueFrom(service.allDataFilesSelected$('f1', 'f2'))).toBe(true);
  });

  it('synchronises the map filters of the selected collection', async () => {
    service.loadJourney(null);
    service.addCollection();
    const collection = (await firstValueFrom(service.selectedCollection$))!;
    const radius: RadiusFilter = {
      key: 'content.location',
      operation: FilterOperations.RADIUS,
      negate: false,
      value: { center: [13.4, 52.5], radius: 1 },
    };
    const area: AreaFilter = {
      key: 'content.location',
      operation: FilterOperations.AREA,
      negate: false,
      value: { vertices: [] },
    };

    service.addMapFilters([radius, area]);
    expect(collection.filterSet).toEqual([radius, area]);

    service.addMapFilters([area]);
    expect(collection.filterSet).toEqual([area]);
  });

  it('does not query the backend for collections without filters', async () => {
    const result = await firstValueFrom(
      service.getCollectionDataFiles({ title: 'c', filterSet: [] }),
    );
    expect(result.results).toEqual([]);
    expect(api.filterDatafiles).not.toHaveBeenCalled();
  });

  it('downloads the journey with the currently excluded ids', async () => {
    service.loadJourney('j1');
    await firstValueFrom(service.journey$);

    await service.download();

    expect(downloadJourney).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'j1' }),
      new Set(['f2']),
    );
  });
});
