import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { Collection, Datafile, DataType } from '@common/types';
import { firstValueFrom, of } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { JourneyModule } from '../journey.module';
import { JourneyService } from '../services/journey.service';
import { CollectionComponent } from './collection.component';

const files: Datafile[] = ['f1', 'f2'].map((id) => ({
  _id: id,
  title: id,
  tags: [],
  dataSet: 'NONE',
  dataType: DataType.NOTREFERENCED,
  content: { data: {} },
}));

describe('CollectionComponent', () => {
  let component: CollectionComponent;
  let fixture: ComponentFixture<CollectionComponent>;
  let journeyService: JourneyService;
  let collection: Collection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JourneyModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider(), JourneyService],
    });
    journeyService = TestBed.inject(JourneyService);
    journeyService.loadJourney(null);
    journeyService.addCollection();
    collection = journeyService['journeySubject'].value!.collections[0];

    fixture = TestBed.createComponent(CollectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', collection);
    fixture.componentRef.setInput('dataFiles', { skip: 0, limit: 10, totalCount: 2, results: files });
    fixture.componentRef.setInput('color', '#7ae4e9');
    fixture.detectChanges();
  });

  it('renders one entry per data file', () => {
    const entries = (fixture.nativeElement as HTMLElement).querySelectorAll('app-data-file-list-entry');
    expect(entries.length).toBe(2);
  });

  it('knows whether it is the selected collection', async () => {
    expect(await firstValueFrom(component.isSelected$!)).toBe(true);
  });

  it('(de)selects all of its files via the header checkbox', async () => {
    component.selectCollectionFiles({ checked: false } as MatCheckboxChange);
    expect(await firstValueFrom(component.isAllSelected$!)).toBe(false);

    component.selectCollectionFiles({ checked: true } as MatCheckboxChange);
    expect(await firstValueFrom(component.isAllSelected$!)).toBe(true);
  });

  it('renames itself with the value from the input dialog', () => {
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => of('Renamed'),
    } as never);
    const trigger = vi.spyOn(journeyService, 'triggerCollectionChange');

    component.editTitle();

    expect(collection.title).toBe('Renamed');
    expect(trigger).toHaveBeenCalledWith(collection);
  });

  it('deletes itself from the journey', () => {
    component.deleteCollection();
    expect(journeyService['journeySubject'].value!.collections).toEqual([]);
  });
});
