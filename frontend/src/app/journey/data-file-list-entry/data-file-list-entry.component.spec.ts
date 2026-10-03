import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Datafile, DataType } from '@common/types';
import { firstValueFrom } from 'rxjs';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { DialogService } from '../../shared/service/dialog.service';
import { JourneyModule } from '../journey.module';
import { JourneyService } from '../services/journey.service';
import { DataFileListEntryComponent } from './data-file-list-entry.component';

describe('DataFileListEntryComponent', () => {
  let component: DataFileListEntryComponent;
  let fixture: ComponentFixture<DataFileListEntryComponent>;
  const file: Datafile = {
    _id: 'f1',
    title: 'Measurement',
    description: 'Some description',
    tags: ['x'],
    dataSet: 'NONE',
    dataType: DataType.NOTREFERENCED,
    content: { data: { a: 1 } },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JourneyModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider(), JourneyService],
    });
    fixture = TestBed.createComponent(DataFileListEntryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('file', file);
    fixture.detectChanges();
  });

  it('shows title and description', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Measurement');
    expect(text).toContain('Some description');
  });

  it('(de)selects the file in the journey', async () => {
    component.select({ checked: false } as MatCheckboxChange);
    expect(await firstValueFrom(component.isSelected$!)).toBe(false);
    component.select({ checked: true } as MatCheckboxChange);
    expect(await firstValueFrom(component.isSelected$!)).toBe(true);
  });

  it('opens the file in the data display dialog', () => {
    const open = vi
      .spyOn(TestBed.inject(DialogService), 'openDisplayDataDialog')
      .mockImplementation(() => undefined);
    component.viewFile();
    expect(open).toHaveBeenCalledWith(file);
  });
});
