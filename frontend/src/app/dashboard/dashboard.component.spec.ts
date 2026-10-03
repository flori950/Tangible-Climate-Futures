import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { commonTestProviders } from '../../testing/test-helpers';
import { DashboardComponent } from './dashboard.component';
import { DashboardModule } from './dashboard.module';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardModule],
      providers: commonTestProviders(),
    });
    TestBed.inject(TranslateService).setTranslation('en', {
      title: {
        upload: 'Upload',
        journey: 'Journey',
        viewDatasets: 'Datasets',
        browseJourney: 'Browse',
      },
    });
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows one tile per main feature with its route', () => {
    expect(component.tiles.map((tile) => tile.url)).toEqual([
      'upload-data',
      'data-sets',
      'journey',
      'browse-journeys',
    ]);
    const tiles = (fixture.nativeElement as HTMLElement).querySelectorAll('app-dashboard-tile');
    expect(tiles.length).toBe(4);
  });

  it('uses translated tile titles and refreshes them on language change', async () => {
    expect(component.tiles[0].title).toBe('Upload');

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', { title: { upload: 'Hochladen' } });
    await new Promise<void>((resolve) => translate.use('de').subscribe(() => resolve()));

    expect(component.tiles[0].title).toBe('Hochladen');
  });
});
