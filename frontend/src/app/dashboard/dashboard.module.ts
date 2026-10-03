import { NgModule } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { MaterialModule } from '../material.module';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard.routing-module';
import { SharedModule } from '../shared/shared.module';
import { TranslatePipe } from '@ngx-translate/core';

@NgModule({
  declarations: [DashboardComponent],
  imports: [MaterialModule, CommonModule, DashboardRoutingModule, SharedModule, TranslatePipe],
})
export class DashboardModule {}
