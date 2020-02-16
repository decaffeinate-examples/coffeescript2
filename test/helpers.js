/* eslint-disable
    guard-for-in,
    no-restricted-syntax,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Helpers
// -------

// pull the helpers from `CoffeeScript.helpers` into local variables
const {
  starts, ends, repeat, compact, count, merge, extend, flatten, del, baseFileName,
} = CoffeeScript.helpers;


// `starts`

test('the `starts` helper tests if a string starts with another string', () => {
  ok(starts('01234', '012'));
  return ok(!starts('01234', '123'));
});

test('the `starts` helper can take an optional offset', () => {
  ok(starts('01234', '34', 3));
  return ok(!starts('01234', '01', 1));
});


// `ends`

test('the `ends` helper tests if a string ends with another string', () => {
  ok(ends('01234', '234'));
  return ok(!ends('01234', '012'));
});

test('the `ends` helper can take an optional offset', () => {
  ok(ends('01234', '012', 2));
  return ok(!ends('01234', '234', 6));
});


// `repeat`

test('the `repeat` helper concatenates a given number of times', () => eq('asdasdasd', repeat('asd', 3)));

test('`repeat`ing a string 0 times always returns the empty string', () => eq('', repeat('whatever', 0)));


// `compact`

test('the `compact` helper removes falsey values from an array, preserves truthy ones', () => {
  let obj;
  const allValues = [1, 0, false, (obj = {}), [], '', ' ', -1, null, undefined, true];
  const truthyValues = [1, obj, [], ' ', -1, true];
  return arrayEq(truthyValues, compact(allValues));
});


// `count`

test('the `count` helper counts the number of occurrences of a string in another string', () => {
  eq(1 / 0, count('abc', ''));
  eq(0, count('abc', 'z'));
  eq(1, count('abc', 'a'));
  eq(1, count('abc', 'b'));
  eq(2, count('abcdc', 'c'));
  return eq(2, count('abcdabcd', 'abc'));
});


// `merge`

test('the `merge` helper makes a new object with all properties of the objects given as its arguments', () => {
  const ary = [0, 1, 2, 3, 4];
  const obj = {};
  const merged = merge(obj, ary);
  ok(merged !== obj);
  ok(merged !== ary);
  return (() => {
    const result = [];
    for (const key of Object.keys(ary || {})) {
      const val = ary[key];
      result.push(eq(val, merged[key]));
    }
    return result;
  })();
});


// `extend`

test('the `extend` helper performs a shallow copy', () => {
  const ary = [0, 1, 2, 3];
  const obj = {};
  // should return the object being extended
  eq(obj, extend(obj, ary));
  // should copy the other object's properties as well (obviously)
  return eq(2, obj[2]);
});


// `flatten`

test('the `flatten` helper flattens an array', () => {
  let success = true;
  for (const n of Array.from(flatten([0, [[[1]], 2], 3, [4]]))) { if (success) { success = typeof n === 'number'; } }
  return ok(success);
});


// `del`

test('the `del` helper deletes a property from an object and returns the deleted value', () => {
  const obj = [0, 1, 2];
  eq(1, del(obj, 1));
  return ok(!(1 in obj));
});


// `baseFileName`

test('the `baseFileName` helper returns the file name to write to', () => {
  const ext = '.js';
  const sourceToCompiled = {
    '.coffee': ext,
    'a.coffee': `a${ext}`,
    'b.coffee': `b${ext}`,
    'coffee.coffee': `coffee${ext}`,

    '.litcoffee': ext,
    'a.litcoffee': `a${ext}`,
    'b.litcoffee': `b${ext}`,
    'coffee.litcoffee': `coffee${ext}`,

    '.lit': ext,
    'a.lit': `a${ext}`,
    'b.lit': `b${ext}`,
    'coffee.lit': `coffee${ext}`,

    '.coffee.md': ext,
    'a.coffee.md': `a${ext}`,
    'b.coffee.md': `b${ext}`,
    'coffee.coffee.md': `coffee${ext}`,
  };

  return (() => {
    const result = [];
    for (const sourceFileName in sourceToCompiled) {
      const expectedFileName = sourceToCompiled[sourceFileName];
      const name = baseFileName(sourceFileName, true);
      const filename = name + ext;
      result.push(eq(filename, expectedFileName));
    }
    return result;
  })();
});
