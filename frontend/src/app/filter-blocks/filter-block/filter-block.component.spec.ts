import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Filter, FilterOperations } from '@common/types';
import { of } from 'rxjs';
import { commonTestProviders } from '../../../testing/test-helpers';
import { FilterBlocksModule } from '../filter-blocks.module';
import { FilterBlockComponent } from './filter-block.component';

describe('FilterBlockComponent', () => {
  let component: FilterBlockComponent;
  let fixture: ComponentFixture<FilterBlockComponent>;
  let filter: Filter;
  let changes: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FilterBlocksModule],
      providers: commonTestProviders(),
    });
    filter = { key: 'title', operation: FilterOperations.CONTAINS, negate: false, value: 'abc' };
    fixture = TestBed.createComponent(FilterBlockComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('filter', filter);
    changes = vi.fn();
    component.onChange.subscribe(changes);
    fixture.detectChanges();
  });

  it.each([
    ['RADIUS', { center: [13.394096404307541, 52.51601329720293], radius: 10 }],
    ['AREA', { vertices: [] }],
    ['MATCHES', ''],
    ['GTE', 0],
    ['IS', true],
  ])('resets the value to a sensible default when switching to %s', (operation, expected) => {
    component.onOperationSelectionChange(operation as never);

    expect(filter.operation).toBe(operation);
    expect(filter.value).toEqual(expected);
    expect(changes).toHaveBeenCalledOnce();
  });

  it('initialises the inputs from the filter and writes edits back', () => {
    expect(component.keyControl.value).toBe('title');
    expect(component.valueControl.value).toBe('abc');

    component.keyControl.setValue('description');
    component.valueControl.setValue('xyz');

    expect(filter.key).toBe('description');
    expect(filter.value).toBe('xyz');
  });

  it('stores numbers for number filters', () => {
    component.onOperationSelectionChange('GT' as never);
    component.valueControl.setValue('42');
    expect(filter.value).toBe(42);
  });

  it('toggles negation and notifies the parent', () => {
    component.toggleNegate();
    expect(filter.negate).toBe(true);
    component.toggleNegate();
    expect(filter.negate).toBe(false);
    expect(changes).toHaveBeenCalledTimes(2);
  });

  it('describes validation errors', () => {
    component.keyControl.setValue('');
    expect(component.getControlErrorMessage(component.keyControl)).toBe('input needed');
    component.keyControl.setValue('key');
    expect(component.getControlErrorMessage(component.keyControl)).toBe('');
  });

  it('applies the result of the map filter dialog', () => {
    const result = {
      key: 'content.location',
      operation: FilterOperations.AREA,
      negate: false,
      value: { vertices: [[13, 52]] },
    };
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => of(result),
    } as never);

    component.editMapFilter();

    expect(filter.operation).toBe(FilterOperations.AREA);
    expect(filter.value).toEqual({ vertices: [[13, 52]] });
    expect(changes).toHaveBeenCalledOnce();
  });

  it('classifies its filter for the template', () => {
    expect(component.isStringFilter()).toBe(true);
    expect(component.isInputFilter()).toBe(true);
    expect(component.isMapFilter()).toBe(false);
    expect(component.isBooleanFilter()).toBe(false);
  });
});
