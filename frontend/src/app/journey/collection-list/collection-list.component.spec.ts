import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { JourneyModule } from '../journey.module';
import { CollectionData, JourneyService } from '../services/journey.service';
import { CollectionListComponent } from './collection-list.component';

describe('CollectionListComponent', () => {
  let fixture: ComponentFixture<CollectionListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JourneyModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider(), JourneyService],
    });
    fixture = TestBed.createComponent(CollectionListComponent);
  });

  it('renders one collection per collection data stream', () => {
    const data = (title: string): CollectionData => ({
      collection: { title, filterSet: [] },
      files: { skip: 0, limit: 0, totalCount: 0, results: [] },
      color: '#000000',
      selectedFilesIds: new Set(),
    });
    fixture.componentRef.setInput('collectionsData', [of(data('A')), of(data('B'))]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-collection').length).toBe(2);
    expect(element.textContent).toContain('A');
    expect(element.textContent).toContain('B');
  });
});
