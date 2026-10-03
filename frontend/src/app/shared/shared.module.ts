import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { TranslatePipe } from '@ngx-translate/core';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { MaterialModule } from '../material.module';
import { DashboardTileComponent } from './dashboard-tile/dashboard-tile.component';
import { DataDisplayDialogComponent } from './data-display/data-display-dialog/data-display-dialog.component';
import { DataDisplayComponent } from './data-display/data-display.component';
import { FileDropComponent } from './file-drop/file-drop.component';
import { TopMenuComponent } from './header/top-menu.component';
import { InputDialogComponent } from './input-dialog/input-dialog.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ApiService } from './service/api.service';
import { CoordinateService } from './service/coordinate.service';
import { DialogService } from './service/dialog.service';

@NgModule({
  declarations: [
    TopMenuComponent,
    InputDialogComponent,
    DataDisplayComponent,
    DataDisplayDialogComponent,
    DashboardTileComponent,
    FileDropComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    YouTubePlayerModule,
    MaterialModule,
    TranslatePipe,
    NgxJsonViewerModule,
  ],
  exports: [
    TopMenuComponent,
    DataDisplayComponent,
    DataDisplayDialogComponent,
    DashboardTileComponent,
    FileDropComponent,
  ],
  providers: [
    CoordinateService,
    ApiService,
    DialogService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
})
export class SharedModule {}
