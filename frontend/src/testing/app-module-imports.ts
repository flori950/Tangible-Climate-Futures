import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FilterBlocksModule } from '../app/filter-blocks/filter-blocks.module';
import { MaterialModule } from '../app/material.module';
import { SharedModule } from '../app/shared/shared.module';

/**
 * The NgModule imports AppModule gives to the components it declares
 * (ViewDatasetsComponent, BrowseJourneyComponent), without AppModule's
 * Firebase/HTTP root providers.
 */
export const AppModuleTestingImports = [
  FormsModule,
  ReactiveFormsModule,
  RouterModule,
  MaterialModule,
  SharedModule,
  FilterBlocksModule,
  TranslatePipe,
];
