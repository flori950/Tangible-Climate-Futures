import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatChipInputEvent } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Journey, Visibility } from '@common/types';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { JourneyModule } from '../journey.module';
import { ContinueJourneyDialogComponent } from './continue-journey-dialog.component';

describe('ContinueJourneyDialogComponent', () => {
  let component: ContinueJourneyDialogComponent;
  let fixture: ComponentFixture<ContinueJourneyDialogComponent>;
  const close = vi.fn();
  const journey: Journey = {
    title: 'My journey',
    description: 'desc',
    tags: ['a'],
    author: 'me',
    collections: [],
    visibility: Visibility.PUBLIC,
    excludedIDs: [],
  };

  beforeEach(() => {
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [JourneyModule],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { ...journey, tags: [...journey.tags] } },
      ],
    });
    fixture = TestBed.createComponent(ContinueJourneyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('prefills the form from the journey', () => {
    expect(component.titleControl.value).toBe('My journey');
    expect(component.descriptionControl.value).toBe('desc');
    expect(component.tags).toEqual(['a']);
  });

  it('validates the title', () => {
    component.titleControl.setValue('');
    expect(component.getControlErrorMessage(component.titleControl)).toBe(
      'continueJourneyDialog.requiredError',
    );
    component.titleControl.setValue('ab');
    expect(component.getControlErrorMessage(component.titleControl)).toBe(
      'continueJourneyDialog.minLengthError',
    );
    component.titleControl.setValue('abc');
    expect(component.titleControl.valid).toBe(true);
  });

  it('adds and removes tags', () => {
    const clear = vi.fn();
    component.addTag({ value: ' b ', chipInput: { clear } } as unknown as MatChipInputEvent);
    expect(component.tags).toEqual(['a', 'b']);
    expect(clear).toHaveBeenCalled();

    component.removeTag('a');
    expect(component.tags).toEqual(['b']);
  });

  it('returns the edited values on confirm', () => {
    component.titleControl.setValue('Continued');
    component.confirm();
    expect(close).toHaveBeenCalledWith({ title: 'Continued', description: 'desc', tags: ['a'] });
  });
});
