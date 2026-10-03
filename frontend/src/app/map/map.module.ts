import { NgModule } from '@angular/core';
import { MapComponent } from './map.component';
import { MaterialModule } from '../material.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CoordinateService } from '../shared/service/coordinate.service';

@NgModule({
  declarations: [MapComponent],
  imports: [MaterialModule, FormsModule, CommonModule, TranslatePipe],
  providers: [CoordinateService],
  exports: [MapComponent],
})
export class MapModule {}
