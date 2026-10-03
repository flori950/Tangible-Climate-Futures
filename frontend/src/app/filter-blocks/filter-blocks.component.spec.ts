import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatChipInputEvent } from '@angular/material/chips';
import {
  AnyFilter,
  BooleanOperation,
  ConcatenationFilter,
  Filter,
  FilterOperations,
} from '@common/types';
import { firstValueFrom } from 'rxjs';
import { commonTestProviders } from '../../testing/test-helpers';
import { FilterBlocksComponent } from './filter-blocks.component';
import { FilterBlocksModule } from './filter-blocks.module';

function tagFilter(tag: string): Filter {
  return { key: 'tags', operation: FilterOperations.CONTAINS, negate: false, value: tag };
}

describe('FilterBlocksComponent', () => {
  let component: FilterBlocksComponent;
  let fixture: ComponentFixture<FilterBlocksComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FilterBlocksModule],
      providers: commonTestProviders(),
    });
    fixture = TestBed.createComponent(FilterBlocksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('turns a chip input into a tag filter and clears the input', () => {
    const clear = vi.fn();
    const changes = vi.fn();
    component.onChange.subscribe(changes);

    component.addTag({ value: '  SimRa ', chipInput: { clear } } as unknown as MatChipInputEvent);

    expect(component.filterSetSubject.value).toEqual([tagFilter('SimRa')]);
    expect(clear).toHaveBeenCalled();
    expect(changes).toHaveBeenCalledOnce();
  });

  it('exposes only positive tag filters as tags', async () => {
    const negatedTag = { ...tagFilter('x'), negate: true };
    const other: Filter = { key: 'title', operation: FilterOperations.MATCHES, negate: false, value: 'a' };
    component.filterSet = [tagFilter('a'), negatedTag, other];

    expect(await firstValueFrom(component.tagFilters$)).toEqual([tagFilter('a')]);
    expect(component.isTag(negatedTag)).toBe(false);
  });

  it('reports advanced filters when non-tag, non-map filters are present', async () => {
    component.filterSet = [tagFilter('a')];
    expect(await firstValueFrom(component.hasAdvancedFilters$)).toBe(false);

    component.filterSet = [
      tagFilter('a'),
      {
        key: 'content.location',
        operation: FilterOperations.RADIUS,
        negate: false,
        value: { center: [13.4, 52.5], radius: 1 },
      },
    ];
    expect(await firstValueFrom(component.hasAdvancedFilters$)).toBe(false);

    component.filterSet = [{ key: 'title', operation: FilterOperations.CONTAINS, negate: false, value: 'x' }];
    expect(await firstValueFrom(component.hasAdvancedFilters$)).toBe(true);
  });

  it('removes tag filters by value', () => {
    component.filterSet = [tagFilter('a'), tagFilter('b')];
    component.removeTag('a');
    expect(component.filterSetSubject.value).toEqual([tagFilter('b')]);
  });

  it('wraps a filter into an OR concatenation and unwraps it again', () => {
    const first = tagFilter('a');
    component.filterSet = [first];

    component.addConcatenationFilter(first);
    const [concatenation] = component.filterSetSubject.value as ConcatenationFilter[];
    expect(concatenation.booleanOperation).toBe(BooleanOperation.OR);
    expect(concatenation.filters.length).toBe(2);
    expect(concatenation.filters[0]).toBe(first);

    component.addConcatenationFilter(concatenation);
    expect(concatenation.filters.length).toBe(3);

    component.removeConcatenationFilter(concatenation, concatenation.filters[2]);
    expect(concatenation.filters.length).toBe(2);

    // removing one of the last two filters replaces the concatenation by the remaining filter
    const remaining = concatenation.filters[0];
    component.removeConcatenationFilter(concatenation, concatenation.filters[1]);
    expect(component.filterSetSubject.value).toEqual([remaining]);
  });

  it('emits the current filter set on search', () => {
    const emitted: AnyFilter[][] = [];
    component.onSearch.subscribe((filters) => emitted.push(filters));
    component.filterSet = [tagFilter('a')];

    component.search();

    expect(emitted).toEqual([[tagFilter('a')]]);
  });

  it('creates empty CONTAINS filters for new advanced filters', () => {
    expect(component.newFilter()).toEqual({
      key: '',
      operation: FilterOperations.CONTAINS,
      negate: false,
      value: '',
    });
  });
});
