import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MaterialModule } from '../material.module';
import { FilterBlockComponent } from './filter-block/filter-block.component';
import { FilterBlocksComponent } from './filter-blocks.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditMapFilterDialogComponent } from './edit-map-filter-dialog/edit-map-filter-dialog.component';
import { MapModule } from '../map/map.module';

@NgModule({
  declarations: [FilterBlockComponent, FilterBlocksComponent, EditMapFilterDialogComponent],
  imports: [
    MaterialModule,
    MapModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslatePipe,
  ],
  exports: [FilterBlocksComponent],
})
export class FilterBlocksModule {}
