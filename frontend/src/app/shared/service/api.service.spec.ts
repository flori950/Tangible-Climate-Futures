import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import {
  Datafile,
  DataType,
  Journey,
  SupportedDatasetFileTypes,
  SupportedRawFileTypes,
  Visibility,
} from '@common/types';
import { commonTestProviders } from '../../../testing/test-helpers';
import { ApiService } from './api.service';

const API = 'http://localhost:40000/api';

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;
  const datafile: Datafile = {
    title: 't',
    tags: ['a'],
    dataSet: 'NONE',
    dataType: DataType.NOTREFERENCED,
    content: { data: {} },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: commonTestProviders() });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists datafiles with paging parameters in the path', () => {
    service.getDatafiles(10, 20, true).subscribe();
    const req = http.expectOne(`${API}/datafile/limit=10&skip=20&onlyMetadata=true`);
    expect(req.request.method).toBe('GET');
    req.flush({ skip: 20, limit: 10, totalCount: 0, results: [] });
  });

  it('posts filter sets to the filter endpoints', () => {
    const filter = { filterSet: [] };
    service.filterDatafiles(filter, 5, 0).subscribe();
    const datafileReq = http.expectOne(`${API}/datafile/filter/limit=5&skip=0&onlyMetadata=false`);
    expect(datafileReq.request.method).toBe('POST');
    expect(datafileReq.request.body).toBe(filter);
    datafileReq.flush({});

    service.filterJourneys(filter, 5, 10).subscribe();
    const journeyReq = http.expectOne(`${API}/journey/filter/limit=5&skip=10`);
    expect(journeyReq.request.method).toBe('POST');
    journeyReq.flush({});
  });

  it('creates a datafile and attaches the file to the created document', () => {
    const file = new File(['a,b'], 'data.csv', { type: 'text/csv' });
    let result: unknown;
    service
      .createDatafileWithFile(datafile, file, SupportedRawFileTypes.CSV)
      .subscribe((r) => (result = r));

    const create = http.expectOne(`${API}/datafile`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toBe(datafile);
    create.flush({ ...datafile, _id: 'abc' });

    const attach = http.expectOne(`${API}/datafile/abc/attach`);
    const body = attach.request.body as FormData;
    expect(body.get('file')).toBeInstanceOf(File);
    expect(body.get('fileType')).toBe('CSV');
    attach.flush({ _id: 'abc' });
    expect(result).toEqual({ _id: 'abc' });
  });

  it('uploads datasets as multipart form data', () => {
    const file = new File(['x'], 'cerv2.nc');
    service
      .createDatasetFromFile(file, SupportedDatasetFileTypes.CERV2, ['a', 'b'], 'desc', 3)
      .subscribe();

    const req = http.expectOne(`${API}/datafile/fromFile`);
    const body = req.request.body as FormData;
    expect(body.get('dataset')).toBe('CERV2');
    expect(body.get('tags')).toBe('a,b');
    expect(body.get('description')).toBe('desc');
    expect(body.get('steps')).toBe('3');
    req.flush({});
  });

  it('only sends "steps" for CERV2 datasets and omits empty tags', () => {
    service
      .createDatasetFromFile(
        new File(['x'], 'simra'),
        SupportedDatasetFileTypes.SIMRA,
        [],
        undefined,
        3,
      )
      .subscribe();

    const body = http.expectOne(`${API}/datafile/fromFile`).request.body as FormData;
    expect(body.has('steps')).toBe(false);
    expect(body.has('tags')).toBe(false);
    expect(body.has('description')).toBe(false);
  });

  it('strips server-managed fields when updating a journey', () => {
    const journey = {
      _id: 'j1',
      title: 'J',
      tags: [],
      author: 'me',
      collections: [],
      visibility: Visibility.PUBLIC,
      excludedIDs: [],
      createdAt: 'x',
      updatedAt: 'y',
      __v: 0,
    } as Journey;
    service.updateJourney(journey).subscribe();

    const req = http.expectOne(`${API}/journey/j1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      title: 'J',
      tags: [],
      author: 'me',
      collections: [],
      visibility: 'PUBLIC',
      excludedIDs: [],
    });
    req.flush({});
  });

  it('geocodes an address via Nominatim', () => {
    let coordinates: [number, number] | null | undefined;
    service.geocodeAddress('Straße des 17. Juni').subscribe((c) => (coordinates = c));

    const req = http.expectOne((r) =>
      r.url.startsWith('https://nominatim.openstreetmap.org/search'),
    );
    expect(req.request.url).toContain(encodeURIComponent('Straße des 17. Juni'));
    req.flush([{ lon: '13.32', lat: '52.51' }]);
    expect(coordinates).toEqual([13.32, 52.51]);
  });

  it('returns null when no address matches', () => {
    let coordinates: [number, number] | null | undefined;
    service.geocodeAddress('nowhere').subscribe((c) => (coordinates = c));
    http.expectOne(() => true).flush([]);
    expect(coordinates).toBeNull();

    let address: string | null | undefined;
    service.getAddress('52.5, 13.4').subscribe((a) => (address = a));
    http.expectOne(() => true).flush([{ display_name: 'Berlin' }]);
    expect(address).toBe('Berlin');
  });
});
