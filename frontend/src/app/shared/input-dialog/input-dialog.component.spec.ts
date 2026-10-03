import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { SharedModule } from '../shared.module';
import { InputDialogComponent, InputDialogData } from './input-dialog.component';

describe('InputDialogComponent', () => {
  let component: InputDialogComponent;
  let fixture: ComponentFixture<InputDialogComponent>;
  const close = vi.fn();
  let data: InputDialogData;

  beforeEach(() => {
    close.mockReset();
    data = { label: 'label', value: 'old title', placeholder: 'placeholder' };
    TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [
        ...commonTestProviders(),
        mockAuthServiceProvider(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(InputDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('closes with the edited value on confirm', () => {
    component.data.value = 'new title';
    component.confirm();
    expect(close).toHaveBeenCalledWith('new title');
  });

  it('closes without a value on cancel', () => {
    component.cancel();
    expect(close).toHaveBeenCalledWith();
  });
});
