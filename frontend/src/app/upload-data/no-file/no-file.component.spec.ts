import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatChipInputEvent } from '@angular/material/chips';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { DataType, MediaType, Ref } from '@common/types';
import { of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { NotificationService } from '../../notification.service';
import { ApiService } from '../../shared/service/api.service';
import { UploadDataModule } from '../upload-data.module';
import { NoFileUploadComponent } from './no-file.component';

describe('NoFileUploadComponent', () => {
  let component: NoFileUploadComponent;
  let fixture: ComponentFixture<NoFileUploadComponent>;
  let api: Record<string, ReturnType<typeof vi.fn>>;

  function create(url: string) {
    api = {
      createDatafile: vi.fn(() => of({})),
      updateDatafile: vi.fn(() => of({})),
      getDatafile: vi.fn(() =>
        of({
          _id: 'd1',
          title: 'Existing',
          tags: ['t'],
          dataSet: 'NONE',
          dataType: DataType.REFERENCED,
          content: { url: 'https://x/y.jpg', mediaType: MediaType.PHOTO, location: { type: 'Point', coordinates: [13, 52] } },
        }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [UploadDataModule],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: ApiService, useValue: api },
        { provide: NotificationService, useValue: { showInfo: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ 'data-set-id': 'd1' }) } } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(url);
    fixture = TestBed.createComponent(NoFileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('starts in create mode on the upload route', () => {
    create('/upload-data/no-file');
    expect(component.isCreatingDataFile).toBe(true);
    expect(api['getDatafile']).not.toHaveBeenCalled();
  });

  it('loads the datafile to edit on /data-sets/:id', () => {
    create('/data-sets/d1');
    expect(component.isCreatingDataFile).toBe(false);
    expect(api['getDatafile']).toHaveBeenCalledWith('d1');
    expect(component.title).toBe('Existing');
    expect(component.url).toBe('https://x/y.jpg');
    expect([component.longitude, component.latitude]).toEqual([13, 52]);
  });

  it('validates referenced data (media type, url and location required)', () => {
    create('/upload-data/no-file');
    component.title = 't';
    component.selectedKeywords = ['k'];
    component.longitude = 13;
    component.latitude = 52;
    expect(component.formIsValid()).toBe(false);
    component.mediaType = MediaType.VIDEO;
    component.url = 'https://youtu.be/x';
    expect(component.formIsValid()).toBe(true);
  });

  it('wraps free text into a non-referenced datafile', () => {
    create('/upload-data/no-file');
    component.isReferencedData = false;
    component.title = 't';
    component.text = 'hello';
    component.selectedKeywords = ['k'];
    const datafile = component.toDataFile();
    expect(datafile.dataType).toBe(DataType.NOTREFERENCED);
    expect(datafile.content).toEqual({ data: { text: 'hello' }, location: undefined });
  });

  it('builds referenced datafiles with url, media type and location', () => {
    create('/upload-data/no-file');
    Object.assign(component, { title: 't', selectedKeywords: ['k'], url: 'u', mediaType: MediaType.PHOTO, longitude: 1, latitude: 2 });
    const content = component.toDataFile().content as Ref;
    expect(content).toEqual({ url: 'u', mediaType: MediaType.PHOTO, location: { type: 'Point', coordinates: [1, 2] } });
  });

  it('manages keywords from the chip input', () => {
    create('/upload-data/no-file');
    const clear = vi.fn();
    component.add({ value: ' UdK ', chipInput: { clear } } as unknown as MatChipInputEvent);
    component.add({ value: '  ', chipInput: { clear } } as unknown as MatChipInputEvent);
    expect(component.selectedKeywords).toEqual(['UdK']);
    component.remove('UdK');
    expect(component.selectedKeywords).toEqual([]);
  });

  it('creates new and updates existing datafiles', () => {
    create('/data-sets/d1');
    component.updateData();
    expect(api['updateDatafile']).toHaveBeenCalledWith('d1', expect.objectContaining({ title: 'Existing' }));
  });
});
