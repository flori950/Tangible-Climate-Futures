import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DataType, SupportedRawFileTypes } from '@common/types';
import { of, throwError } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { NotificationService } from '../../notification.service';
import { ApiService } from '../../shared/service/api.service';
import { UploadDataModule } from '../upload-data.module';
import { RawDatasetsUploadComponent } from './rawDatasets.component';

describe('RawDatasetsUploadComponent', () => {
  let component: RawDatasetsUploadComponent;
  let fixture: ComponentFixture<RawDatasetsUploadComponent>;
  let createDatafileWithFile: ReturnType<typeof vi.fn>;
  const showInfo = vi.fn();

  function create(url: string) {
    createDatafileWithFile = vi.fn(() => of({}));
    showInfo.mockReset();
    TestBed.configureTestingModule({
      imports: [UploadDataModule],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: ApiService, useValue: { createDatafileWithFile } },
        { provide: NotificationService, useValue: { showInfo } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(url);
    fixture = TestBed.createComponent(RawDatasetsUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it.each([
    ['/upload-data/json', SupportedRawFileTypes.JSON, '.json'],
    ['/upload-data/csv', SupportedRawFileTypes.CSV, '.csv'],
    ['/upload-data/txt', SupportedRawFileTypes.TXT, '.txt'],
  ])('derives the file type from the route %s', (url, type, accept) => {
    create(url);
    expect(component.rawDatasetType).toBe(type);
    expect(component.acceptFileFormat).toBe(accept);
  });

  it('uses the file name as default title', () => {
    create('/upload-data/csv');
    component.onFileSelect(new File(['a'], 'measurements.csv'));
    expect(component.title).toBe('measurements');
  });

  it('requires title, keywords and a file', () => {
    create('/upload-data/csv');
    expect(component.formIsValid()).toBe(false);
    component.title = 'x';
    component.selectedKeywords = ['k'];
    expect(component.formIsValid()).toBe(false);
    component.file = new File(['a'], 'a.csv');
    expect(component.formIsValid()).toBe(true);
  });

  it('builds a non-referenced datafile with an optional location', () => {
    create('/upload-data/csv');
    component.title = 'x';
    component.selectedKeywords = ['k'];
    expect(component.toDataFile().content.location).toBeUndefined();

    component.longitude = 13.4;
    component.latitude = 52.5;
    const datafile = component.toDataFile();
    expect(datafile.dataType).toBe(DataType.NOTREFERENCED);
    expect(datafile.content.location).toEqual({ type: 'Point', coordinates: [13.4, 52.5] });
  });

  it('uploads the file and resets the form', () => {
    create('/upload-data/csv');
    component.title = 'x';
    component.selectedKeywords = ['k'];
    component.file = new File(['a'], 'a.csv');

    component.uploadData();

    expect(createDatafileWithFile).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'x' }),
      expect.any(File),
      'CSV',
    );
    expect(component.title).toBeUndefined();
    expect(component.isLoading).toBe(false);
    expect(showInfo).toHaveBeenCalledOnce();
  });

  it('stops the spinner when the upload fails', () => {
    create('/upload-data/csv');
    createDatafileWithFile.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    component.title = 'x';
    component.selectedKeywords = ['k'];
    component.file = new File(['a'], 'a.csv');

    component.uploadData();

    expect(component.isLoading).toBe(false);
    expect(showInfo).toHaveBeenCalledOnce();
  });
});
