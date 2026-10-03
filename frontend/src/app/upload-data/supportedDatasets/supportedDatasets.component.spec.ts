import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SupportedDatasetFileTypes } from '@common/types';
import { of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { NotificationService } from '../../notification.service';
import { ApiService } from '../../shared/service/api.service';
import { UploadDataModule } from '../upload-data.module';
import { SupportedDatasetsUploadComponent } from './supportedDatasets.component';

describe('SupportedDatasetsUploadComponent', () => {
  let component: SupportedDatasetsUploadComponent;
  let fixture: ComponentFixture<SupportedDatasetsUploadComponent>;
  let createDatasetFromFile: ReturnType<typeof vi.fn>;

  function create(url: string) {
    createDatasetFromFile = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      imports: [UploadDataModule],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: ApiService, useValue: { createDatasetFromFile } },
        { provide: NotificationService, useValue: { showInfo: vi.fn() } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(url);
    fixture = TestBed.createComponent(SupportedDatasetsUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it.each([
    ['/upload-dataset/simra', SupportedDatasetFileTypes.SIMRA, ''],
    ['/upload-dataset/cerv2', SupportedDatasetFileTypes.CERV2, '.nc'],
    ['/upload-dataset/csv', SupportedDatasetFileTypes.CSV, '.csv'],
  ])('derives the dataset type from the route %s', (url, type, accept) => {
    create(url);
    expect(component.datasetType).toBe(type);
    expect(component.acceptFileFormat).toBe(accept);
  });

  it('accepts SimRa files only as plain text, csv or without type', () => {
    create('/upload-dataset/simra');
    component.file = new File(['x'], 'simra', { type: 'application/pdf' });
    expect(component.formIsValid()).toBe(false);
    expect(component.uploadError).toBe(true);

    component.file = new File(['x'], 'simra.csv', { type: 'text/csv' });
    expect(component.formIsValid()).toBe(true);
  });

  it('uploads the dataset with tags, description and CERV2 steps', () => {
    create('/upload-dataset/cerv2');
    const file = new File(['x'], 'data.nc');
    component.onFileSelect(file);
    component.selectedKeywords = ['a'];
    component.description = 'd';
    component.steps = 4;

    component.uploadData();

    expect(createDatasetFromFile).toHaveBeenCalledWith(
      file,
      SupportedDatasetFileTypes.CERV2,
      ['a'],
      'd',
      4,
    );
    expect(component.file).toBeUndefined();
  });
});
