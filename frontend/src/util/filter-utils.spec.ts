import { AnyFilter, BooleanOperation, Filter, FilterOperations } from '@common/types';
import {
  isAreaFilter,
  isBooleanFilter,
  isConcatenationFilter,
  isFilter,
  isMapFilter,
  isNumberFilter,
  isRadiusFilter,
  isStringFilter,
} from './filter-utils';

function filter(operation: FilterOperations, value: unknown): Filter {
  return { key: 'k', operation, negate: false, value } as Filter;
}

describe('filter-utils', () => {
  const radius = filter(FilterOperations.RADIUS, { center: [13.4, 52.5], radius: 1 });
  const area = filter(FilterOperations.AREA, { vertices: [] });
  const contains = filter(FilterOperations.CONTAINS, 'a');
  const matches = filter(FilterOperations.MATCHES, 'a');
  const is = filter(FilterOperations.IS, true);
  const numberOps = [
    FilterOperations.EQ,
    FilterOperations.GT,
    FilterOperations.GTE,
    FilterOperations.LT,
    FilterOperations.LTE,
  ].map((op) => filter(op, 1));
  const concatenation: AnyFilter = {
    booleanOperation: BooleanOperation.OR,
    filters: [contains, matches],
  };

  it('distinguishes plain filters from concatenation filters', () => {
    expect(isFilter(contains)).toBe(true);
    expect(isFilter(concatenation)).toBe(false);
    expect(isConcatenationFilter(concatenation)).toBe(true);
    expect(isConcatenationFilter(contains)).toBe(false);
  });

  it('classifies geo filters', () => {
    expect(isRadiusFilter(radius)).toBe(true);
    expect(isRadiusFilter(area)).toBe(false);
    expect(isAreaFilter(area)).toBe(true);
    expect(isAreaFilter(radius)).toBe(false);
    expect(isMapFilter(radius)).toBe(true);
    expect(isMapFilter(area)).toBe(true);
    expect(isMapFilter(contains)).toBe(false);
    expect(isMapFilter(concatenation)).toBe(false);
  });

  it('classifies string, boolean and number filters', () => {
    expect(isStringFilter(contains)).toBe(true);
    expect(isStringFilter(matches)).toBe(true);
    expect(isStringFilter(is)).toBe(false);
    expect(isBooleanFilter(is)).toBe(true);
    expect(isBooleanFilter(contains)).toBe(false);
    for (const numberFilter of numberOps) {
      expect(isNumberFilter(numberFilter)).toBe(true);
      expect(isStringFilter(numberFilter)).toBe(false);
    }
    expect(isNumberFilter(radius)).toBe(false);
  });
});
