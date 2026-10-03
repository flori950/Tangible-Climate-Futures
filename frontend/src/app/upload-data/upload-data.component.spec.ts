import { ComponentFixture, TestBed } from '@angular/core/testing';
import { commonTestProviders, mockAuthServiceProvider } from '../../testing/test-helpers';
import { UploadDataComponent } from './upload-data.component';
import { UploadDataModule } from './upload-data.module';

describe('UploadDataComponent', () => {
  let component: UploadDataComponent;
  let fixture: ComponentFixture<UploadDataComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UploadDataModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
    fixture = TestBed.createComponent(UploadDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('offers tiles for raw data uploads', () => {
    expect(component.rawTiles.map((tile) => tile.url)).toEqual([
      'upload-data/no-file',
      'upload-data/json',
      'upload-data/csv',
      'upload-data/txt',
      'upload-data/netcdf',
    ]);
  });

  it('offers tiles for supported dataset uploads', () => {
    expect(component.supportedTiles.map((tile) => tile.url)).toEqual([
      'upload-dataset/simra',
      'upload-dataset/cerv2',
      'upload-dataset/csv',
    ]);
    const tiles = (fixture.nativeElement as HTMLElement).querySelectorAll('app-dashboard-tile');
    expect(tiles.length).toBe(8);
  });
});
