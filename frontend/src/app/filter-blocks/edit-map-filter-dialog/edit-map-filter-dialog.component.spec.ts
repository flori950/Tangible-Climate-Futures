import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FilterOperations, RadiusFilter } from '@common/types';
import { commonTestProviders } from '../../../testing/test-helpers';
import { FilterBlocksModule } from '../filter-blocks.module';
import { EditMapFilterDialogComponent } from './edit-map-filter-dialog.component';

describe('EditMapFilterDialogComponent', () => {
  let component: EditMapFilterDialogComponent;
  let fixture: ComponentFixture<EditMapFilterDialogComponent>;
  const close = vi.fn();
  const data: RadiusFilter = {
    key: 'content.location',
    operation: FilterOperations.RADIUS,
    negate: false,
    value: { center: [13.4, 52.5], radius: 2 },
  };

  beforeEach(() => {
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [FilterBlocksModule],
      providers: [
        ...commonTestProviders(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(EditMapFilterDialogComponent);
    component = fixture.componentInstance;
  });

  it('works on a deep copy of the passed filter', () => {
    expect(component.filter).toEqual(data);
    expect(component.filter).not.toBe(data);
  });

  it('keeps the last drawn filter and returns it on confirm', () => {
    const drawn: RadiusFilter = { ...data, value: { center: [1, 2], radius: 3 } };
    component.onNewFilter([data, drawn]);
    component.confirm();
    expect(close).toHaveBeenCalledWith(drawn);
  });

  it('does not close on confirm when all filters were removed', () => {
    component.onNewFilter([]);
    expect(component.filter).toBeNull();
    component.confirm();
    expect(close).not.toHaveBeenCalled();
  });

  it('closes without result on cancel', () => {
    component.cancel();
    expect(close).toHaveBeenCalledWith();
  });
});
