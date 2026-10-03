import {
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr
} from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardModule } from './dashboard/dashboard.module';
import { JourneyModule } from './journey/journey.module';
import { MaterialModule } from './material.module';
import { SharedModule } from './shared/shared.module';
import { ViewDatasetsComponent } from './view-datasets/view-datasets.component';
import { BrowseJourneyComponent } from './browse-journey/browse-journey.component';
import { MapModule } from './map/map.module';
import { FilterBlocksModule } from './filter-blocks/filter-blocks.module';
import { UploadDataModule } from './upload-data/upload-data.module';
import { YouTubePlayerModule } from '@angular/youtube-player';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent, ViewDatasetsComponent, BrowseJourneyComponent],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    YouTubePlayerModule,
    MapModule,
    RouterOutlet,
    DashboardModule,
    JourneyModule,
    SharedModule,
    UploadDataModule,
    FilterBlocksModule,
    TranslatePipe,
  ],
  providers: [
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    // Translations are loaded from src/assets/i18n/<lang>.json; German is the fallback language.
    provideTranslateService({
      fallbackLang: 'de',
      loader: provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
    }),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
