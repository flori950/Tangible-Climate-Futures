import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Datafile, DataType, FilterOperations } from '@common/types';
import { of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../testing/test-helpers';
import { AppModuleTestingImports } from '../../testing/app-module-imports';
import { DownloadService } from '../download.service';
import { NotificationService } from '../notification.service';
import { ApiService } from '../shared/service/api.service';
import { ViewDatasetsComponent } from './view-datasets.component';

function datafile(id: string): Datafile {
  return { _id: id, title: id, tags: [], dataSet: 'NONE', dataType: DataType.NOTREFERENCED, content: { data: {} } };
}

describe('ViewDatasetsComponent', () => {
  let component: ViewDatasetsComponent;
  let fixture: ComponentFixture<ViewDatasetsComponent>;
  let api: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    api = {
      getDatafiles: vi.fn(() => of({ skip: 0, limit: 10, totalCount: 2, results: [datafile('a'), datafile('b')] })),
      filterDatafiles: vi.fn(() => of({ skip: 0, limit: 10, totalCount: 1, results: [datafile('a')] })),
      deleteDatafile: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      imports: AppModuleTestingImports,
      declarations: [ViewDatasetsComponent],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: ApiService, useValue: api },
        { provide: NotificationService, useValue: { showInfo: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(ViewDatasetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the first page of datafiles (metadata only)', () => {
    expect(api['getDatafiles']).toHaveBeenCalledWith(10, 0, true);
    expect(component.dataSource.length).toBe(2);
    expect(component.totalCount).toBe(2);
  });

  it('uses the filter endpoint when filters are given', () => {
    const filterSet = [{ key: 'title', operation: FilterOperations.CONTAINS, negate: false, value: 'a' } as const];
    component.loadData({ filterSet: [...filterSet] });
    expect(api['filterDatafiles']).toHaveBeenCalledWith({ filterSet }, 10, 0, true);
    expect(component.dataSource.map((d) => d._id)).toEqual(['a']);
  });

  it('computes skip from the paginator', () => {
    component.onPageChange({ pageIndex: 2, pageSize: 25, length: 100 });
    expect(component.skip).toBe(50);
    expect(api['getDatafiles']).toHaveBeenLastCalledWith(25, 50, true);
  });

  it('truncates long content previews', () => {
    expect(component.getContentAsString({ a: 1 })).toBe('{"a":1}');
    const preview = component.getContentAsString({ text: 'x'.repeat(200) });
    expect(preview.length).toBe(79);
    expect(preview.endsWith(' ...')).toBe(true);
  });

  it('deletes a datafile, notifies once and reloads', () => {
    const showInfo = TestBed.inject(NotificationService).showInfo as ReturnType<typeof vi.fn>;
    component.delete('a');
    expect(api['deleteDatafile']).toHaveBeenCalledWith('a');
    expect(showInfo).toHaveBeenCalledOnce();
    expect(api['getDatafiles']).toHaveBeenCalledTimes(2);
  });

  it('downloads a single datafile by id', () => {
    const downloadAsJSON = vi.spyOn(TestBed.inject(DownloadService), 'downloadAsJSON').mockImplementation(() => undefined);
    component.downloadByID('b');
    expect(downloadAsJSON).toHaveBeenCalledWith(datafile('b'), 'b.json');
  });
});
