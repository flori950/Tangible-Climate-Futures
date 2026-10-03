import { TestBed } from '@angular/core/testing';
import { Datafile, DataType, Journey, Visibility } from '@common/types';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { commonTestProviders } from '../testing/test-helpers';
import { DownloadService } from './download.service';
import { NotificationService } from './notification.service';
import { ApiService } from './shared/service/api.service';

function datafile(id: string): Datafile {
  return { _id: id, title: id, tags: [], dataSet: 'NONE', dataType: DataType.NOTREFERENCED, content: { data: {} } };
}

describe('DownloadService', () => {
  let service: DownloadService;
  let filterDatafiles: ReturnType<typeof vi.fn>;
  let showInfo: ReturnType<typeof vi.fn>;
  const journey: Journey = {
    title: 'my-journey',
    tags: [],
    author: 'me',
    visibility: Visibility.PUBLIC,
    excludedIDs: ['b'],
    collections: [
      { title: 'c1', filterSet: [] },
      { title: 'c2', filterSet: [] },
    ],
  };

  beforeEach(() => {
    filterDatafiles = vi.fn();
    showInfo = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...commonTestProviders(),
        { provide: ApiService, useValue: { filterDatafiles } },
        { provide: NotificationService, useValue: { showInfo } },
      ],
    });
    TestBed.inject(TranslateService).setTranslation('en', {
      browseJourney: { downloadFailed: 'Download failed' },
    });
    service = TestBed.inject(DownloadService);
  });

  it('downloads JSON through a temporary link with a blob url', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

    service.downloadAsJSON({ a: 1 }, 'file.json');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.href).toBe('blob:test');
    expect(anchor.download).toBe('file.json');
  });

  it('downloads all collections of a journey without its excluded files', () => {
    filterDatafiles.mockReturnValue(of({ skip: 0, limit: 0, totalCount: 2, results: [datafile('a'), datafile('b')] }));
    const downloadAsJSON = vi.spyOn(service, 'downloadAsJSON').mockImplementation(() => undefined);

    service.downloadJourney(journey);

    expect(filterDatafiles).toHaveBeenCalledTimes(2);
    expect(filterDatafiles).toHaveBeenCalledWith({ filterSet: [] }, 10_000_000, 0);
    expect(downloadAsJSON).toHaveBeenCalledWith([[datafile('a')], [datafile('a')]], 'my-journey');
  });

  it('prefers explicitly passed excluded ids over the journey ones', () => {
    filterDatafiles.mockReturnValue(of({ skip: 0, limit: 0, totalCount: 2, results: [datafile('a'), datafile('b')] }));
    const downloadAsJSON = vi.spyOn(service, 'downloadAsJSON').mockImplementation(() => undefined);

    service.downloadJourney(journey, new Set(['a']));

    expect(downloadAsJSON).toHaveBeenCalledWith([[datafile('b')], [datafile('b')]], 'my-journey');
  });

  it('notifies the user when the download fails', () => {
    filterDatafiles.mockReturnValue(throwError(() => new Error('offline')));
    service.downloadJourney(journey);
    expect(showInfo).toHaveBeenCalledWith('Download failed');
  });
});
