import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MapModule } from '../map/map.module';
import { MaterialModule } from '../material.module';
import { SharedModule } from '../shared/shared.module';
import { NoFileUploadComponent } from './no-file/no-file.component';
import { RawDatasetsUploadComponent } from './rawDatasets/rawDatasets.component';
import { SupportedDatasetsUploadComponent } from './supportedDatasets/supportedDatasets.component';
import { UploadDataComponent } from './upload-data.component';

@NgModule({
  declarations: [
    UploadDataComponent,
    NoFileUploadComponent,
    RawDatasetsUploadComponent,
    SupportedDatasetsUploadComponent,
  ],
  imports: [
    MaterialModule,
    CommonModule,
    SharedModule,
    MapModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
})
export class UploadDataModule {}
