import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { DataType, MediaType, NotRefDataFile, RefDataFile } from '@common/types';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { SharedModule } from '../shared.module';
import { DataDisplayComponent } from './data-display.component';

describe('DataDisplayComponent', () => {
  let component: DataDisplayComponent;
  let fixture: ComponentFixture<DataDisplayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
    fixture = TestBed.createComponent(DataDisplayComponent);
    component = fixture.componentInstance;
  });

  it('recognises YouTube links', () => {
    expect(component.isYoutubeVideo('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(component.isYoutubeVideo('https://youtu.be/abc')).toBe(true);
    expect(component.isYoutubeVideo('https://example.org/video.mp4')).toBe(false);
  });

  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=42', 'dQw4w9WgXcQ'],
  ])('extracts the video id from %s', (url, id) => {
    expect(component.getYoutubeVideoID(url)).toBe(id);
  });

  it('renders referenced photos as image', () => {
    const photo: RefDataFile = {
      _id: 'p',
      title: 'photo',
      tags: [],
      dataSet: 'NONE',
      dataType: DataType.REFERENCED,
      content: {
        url: 'https://example.org/a.jpg',
        mediaType: MediaType.PHOTO,
        location: { type: 'Point', coordinates: [13, 52] },
      },
    };
    fixture.componentRef.setInput('data', photo);
    fixture.detectChanges();
    const img = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.org/a.jpg');
  });

  it('loads the full content of metadata-only datafiles from the backend', () => {
    const metadataOnly = {
      _id: 'n1',
      title: 'json',
      tags: [],
      dataSet: 'NONE',
      dataType: DataType.NOTREFERENCED,
      content: {},
    } as unknown as NotRefDataFile;
    fixture.componentRef.setInput('data', metadataOnly);
    fixture.detectChanges();

    const req = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:40000/api/datafile/n1',
    );
    req.flush({ a: 1 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ngx-json-viewer')).not.toBeNull();
  });
});
