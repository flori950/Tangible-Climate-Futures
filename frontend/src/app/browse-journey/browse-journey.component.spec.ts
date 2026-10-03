import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterOperations, Journey, Visibility } from '@common/types';
import { of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../testing/test-helpers';
import { AppModuleTestingImports } from '../../testing/app-module-imports';
import { DownloadService } from '../download.service';
import { NotificationService } from '../notification.service';
import { ApiService } from '../shared/service/api.service';
import { BrowseJourneyComponent } from './browse-journey.component';

const journey: Journey = {
  _id: 'j1',
  title: 'Journey',
  tags: ['t'],
  author: 'me',
  collections: [],
  visibility: Visibility.PUBLIC,
  excludedIDs: [],
};

describe('BrowseJourneyComponent', () => {
  let component: BrowseJourneyComponent;
  let fixture: ComponentFixture<BrowseJourneyComponent>;
  let api: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    api = {
      getJourneys: vi.fn(() => of({ skip: 0, limit: 10, totalCount: 1, results: [journey] })),
      filterJourneys: vi.fn(() => of({ skip: 0, limit: 10, totalCount: 0, results: [] })),
      deleteJourney: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      imports: AppModuleTestingImports,
      declarations: [BrowseJourneyComponent],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: ApiService, useValue: api },
        { provide: NotificationService, useValue: { showInfo: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(BrowseJourneyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lists journeys and renders them as table rows', () => {
    expect(api['getJourneys']).toHaveBeenCalledWith(10, 0);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tr.mat-mdc-row').length).toBe(1);
  });

  it('offers the journey fields as filter keys', () => {
    expect(component.dropdownOptions.map((o) => o.value)).toEqual(['title', 'description', 'tags', 'author']);
  });

  it('only calls the filter endpoint for non-empty filter sets', () => {
    component.loadData([]);
    expect(api['filterJourneys']).not.toHaveBeenCalled();

    const filterSet = [{ key: 'author', operation: FilterOperations.MATCHES, negate: false, value: 'me' } as const];
    component.loadData([...filterSet]);
    expect(api['filterJourneys']).toHaveBeenCalledWith({ filterSet }, 10, 0);
    expect(component.dataSource).toEqual([]);
  });

  it('downloads the data of a journey', () => {
    const downloadJourney = vi.spyOn(TestBed.inject(DownloadService), 'downloadJourney').mockImplementation(() => undefined);
    component.download(journey);
    expect(downloadJourney).toHaveBeenCalledWith(journey);
  });

  it('deletes a journey and reloads the list', () => {
    component.delete('j1');
    expect(api['deleteJourney']).toHaveBeenCalledWith('j1');
    expect(TestBed.inject(NotificationService).showInfo).toHaveBeenCalledOnce();
    expect(api['getJourneys']).toHaveBeenCalledTimes(2);
  });
});
