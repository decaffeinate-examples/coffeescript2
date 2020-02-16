/* eslint-disable
    func-names,
    max-len,
    no-mixed-operators,
    no-nested-ternary,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-undef,
    no-underscore-dangle,
    no-use-before-define,
    prefer-const,
    prefer-rest-params,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Range Literals
// --------------

// TODO: add indexing and method invocation tests: [1..4][0] is 1, [0...3].toString()

// shared array
const shared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

test('basic inclusive ranges', () => {
  arrayEq([1, 2, 3], [1, 2, 3]);
  arrayEq([0, 1, 2], [0, 1, 2]);
  arrayEq([0, 1], [0, 1]);
  arrayEq([0], [0]);
  arrayEq([-1], __range__(-1, -1, true));
  arrayEq([-1, 0], __range__(-1, 0, true));
  return arrayEq([-1, 0, 1], __range__(-1, 1, true));
});

test('basic exclusive ranges', () => {
  arrayEq([1, 2, 3], [1, 2, 3]);
  arrayEq([0, 1, 2], [0, 1, 2]);
  arrayEq([0, 1], [0, 1]);
  arrayEq([0], [0]);
  arrayEq([-1], __range__(-1, 0, false));
  arrayEq([-1, 0], __range__(-1, 1, false));
  arrayEq([-1, 0, 1], __range__(-1, 2, false));

  arrayEq([], []);
  arrayEq([], []);
  arrayEq([], __range__(-1, -1, false));

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  arrayEq([1, 2, 3], [1, 2, 3]);
  arrayEq([0, 1, 2], [0, 1, 2]);
  arrayEq([0, 1], [0, 1]);
  arrayEq([0], [0]);
  arrayEq([-1], __range__(-1, 0, false));
  arrayEq([-1, 0], __range__(-1, 1, false));
  arrayEq([-1, 0, 1], __range__(-1, 2, false));

  arrayEq([], []);
  arrayEq([], []);
  return arrayEq([], __range__(-1, -1, false));
});

test('downward ranges', () => {
  arrayEq(shared, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].reverse());
  arrayEq([5, 4, 3, 2], [5, 4, 3, 2]);
  arrayEq([2, 1, 0, -1], __range__(2, -1, true));

  arrayEq([3, 2, 1], [3, 2, 1]);
  arrayEq([2, 1, 0], [2, 1, 0]);
  arrayEq([1, 0], [1, 0]);
  arrayEq([0], [0]);
  arrayEq([-1], __range__(-1, -1, true));
  arrayEq([0, -1], __range__(0, -1, true));
  arrayEq([1, 0, -1], __range__(1, -1, true));
  arrayEq([0, -1, -2], __range__(0, -2, true));

  arrayEq([4, 3, 2], [4, 3, 2]);
  arrayEq([3, 2, 1], [3, 2, 1]);
  arrayEq([2, 1], [2, 1]);
  arrayEq([1], [1]);
  arrayEq([], []);
  arrayEq([], __range__(-1, -1, false));
  arrayEq([0], __range__(0, -1, false));
  arrayEq([0, -1], __range__(0, -2, false));
  arrayEq([1, 0], __range__(1, -1, false));
  return arrayEq([2, 1, 0], __range__(2, -1, false));
});

test('ranges with variables as enpoints', () => {
  let [a, b] = [1, 3];
  arrayEq([1, 2, 3], __range__(a, b, true));
  arrayEq([1, 2], __range__(a, b, false));
  b = -2;
  arrayEq([1, 0, -1, -2], __range__(a, b, true));
  return arrayEq([1, 0, -1], __range__(a, b, false));
});

test('ranges with expressions as endpoints', () => {
  const [a, b] = [1, 3];
  arrayEq([2, 3, 4, 5, 6], __range__((a + 1), 2 * b, true));
  arrayEq([2, 3, 4, 5], __range__((a + 1), 2 * b, false));

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  return arrayEq([2, 3, 4, 5], __range__((a + 1), 2 * b, false));
});

test('large ranges are generated with looping constructs', () => {
  let len;
  const down = __range__(99, 0, true);
  eq(100, (len = down.length));
  eq(0, down[len - 1]);

  const up = __range__(0, 100, false);
  eq(100, (len = up.length));
  return eq(99, up[len - 1]);
});

test('for-from loops over ranges', () => {
  const array1 = [];
  for (const x of [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]) {
    array1.push(x);
    if (x === 25) { break; }
  }
  return arrayEq(array1, [20, 21, 22, 23, 24, 25]);
});

test('for-from comprehensions over ranges', () => {
  let x;
  const array1 = ((() => {
    const result = [];
    for (x of [20, 21, 22, 23, 24, 25]) {
      result.push(x + 10);
    }
    return result;
  })());
  ok(array1.join(' ') === '30 31 32 33 34 35');

  const array2 = ((() => {
    const result1 = [];
    for (x of [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]) {
      if (__mod__(x, 2) === 0) {
        result1.push(x);
      }
    }
    return result1;
  })());
  return ok(array2.join(' ') === '20 22 24 26 28 30');
});

test('#1012 slices with arguments object', () => {
  const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const argsAtStart = (function () { return __range__(arguments[0], 9, true); }(0));
  arrayEq(expected, argsAtStart);
  const argsAtEnd = (function () { return __range__(0, arguments[0], true); }(9));
  arrayEq(expected, argsAtEnd);
  const argsAtBoth = (function () { return __range__(arguments[0], arguments[1], true); }(0, 9));
  return arrayEq(expected, argsAtBoth);
});

test('#1409: creating large ranges outside of a function body', () => CoffeeScript.eval('[0..100]'));

test('#2047: Infinite loop possible when `for` loop with `range` uses variables', () => {
  const up = 1;
  const down = -1;
  const a = 1;
  const b = 5;

  const testRange = function (arg) {
    const [from, to, step, expectedResult] = arg;
    const r = ((() => {
      const result = [];
      for (let x = from, end = to, step1 = step, asc = step1 > 0; asc ? x <= end : x >= end; x += step1) {
        result.push(x);
      }
      return result;
    })());
    return arrayEq(r, expectedResult);
  };

  const testData = [
    [1, 5, 1, [1, 2, 3, 4, 5]],
    [1, 5, -1, [1]],
    [1, 5, up, [1, 2, 3, 4, 5]],
    [1, 5, down, [1]],

    [a, 5, 1, [1, 2, 3, 4, 5]],
    [a, 5, -1, [1]],
    [a, 5, up, [1, 2, 3, 4, 5]],
    [a, 5, down, [1]],

    [1, b, 1, [1, 2, 3, 4, 5]],
    [1, b, -1, [1]],
    [1, b, up, [1, 2, 3, 4, 5]],
    [1, b, down, [1]],

    [a, b, 1, [1, 2, 3, 4, 5]],
    [a, b, -1, [1]],
    [a, b, up, [1, 2, 3, 4, 5]],
    [a, b, down, [1]],

    [5, 1, 1, [5]],
    [5, 1, -1, [5, 4, 3, 2, 1]],
    [5, 1, up, [5]],
    [5, 1, down, [5, 4, 3, 2, 1]],

    [5, a, 1, [5]],
    [5, a, -1, [5, 4, 3, 2, 1]],
    [5, a, up, [5]],
    [5, a, down, [5, 4, 3, 2, 1]],

    [b, 1, 1, [5]],
    [b, 1, -1, [5, 4, 3, 2, 1]],
    [b, 1, up, [5]],
    [b, 1, down, [5, 4, 3, 2, 1]],

    [b, a, 1, [5]],
    [b, a, -1, [5, 4, 3, 2, 1]],
    [b, a, up, [5]],
    [b, a, down, [5, 4, 3, 2, 1]],
  ];

  return Array.from(testData).map((d) => testRange(d));
});

test('#2047: from, to and step as variables', () => {
  let x;
  const up = 1;
  const down = -1;
  let a = 1;
  let b = 5;

  let r = ((() => {
    let asc; let end; let
      step1;
    const result = [];
    for (x = a, end = b, step1 = up, asc = step1 > 0; asc ? x <= end : x >= end; x += step1) {
      result.push(x);
    }
    return result;
  })());
  arrayEq(r, [1, 2, 3, 4, 5]);

  r = ((() => {
    let asc1; let end1; let
      step2;
    const result1 = [];
    for (x = a, end1 = b, step2 = down, asc1 = step2 > 0; asc1 ? x <= end1 : x >= end1; x += step2) {
      result1.push(x);
    }
    return result1;
  })());
  arrayEq(r, [1]);

  r = ((() => {
    let asc2; let end2; let
      step3;
    const result2 = [];
    for (x = b, end2 = a, step3 = up, asc2 = step3 > 0; asc2 ? x <= end2 : x >= end2; x += step3) {
      result2.push(x);
    }
    return result2;
  })());
  arrayEq(r, [5]);

  r = ((() => {
    let asc3; let end3; let
      step4;
    const result3 = [];
    for (x = b, end3 = a, step4 = down, asc3 = step4 > 0; asc3 ? x <= end3 : x >= end3; x += step4) {
      result3.push(x);
    }
    return result3;
  })());
  arrayEq(r, [5, 4, 3, 2, 1]);

  a = 1;
  b = -1;
  const step = 0;
  r = ((() => {
    let asc4; let end4; let
      step5;
    const result4 = [];
    for (x = b, end4 = a, step5 = step, asc4 = step5 > 0; asc4 ? x <= end4 : x >= end4; x += step5) {
      result4.push(x);
    }
    return result4;
  })());
  return arrayEq(r, []);
});

test("#4884: Range not declaring var for the 'i'", () => {
  __range__(0, 21, true).forEach((idx) => idx + 1);

  return eq(global.i, undefined);
});

function __range__(left, right, inclusive) {
  const range = [];
  const ascending = left < right;
  const end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
function __mod__(a, b) {
  a = +a;
  b = +b;
  return (a % b + b) % b;
}
