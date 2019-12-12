/* eslint-disable
    array-bracket-spacing,
    func-names,
    max-len,
    no-cond-assign,
    no-mixed-operators,
    no-nested-ternary,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-sequences,
    no-shadow,
    no-sparse-arrays,
    no-undef,
    no-underscore-dangle,
    no-unused-expressions,
    no-unused-vars,
    no-use-before-define,
    no-var,
    prefer-const,
    prefer-destructuring,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Array Literals
// --------------

// * Array Literals
// * Splats in Array Literals

// TODO: add indexing and method invocation tests: [1][0] is 1, [].toString()

test('trailing commas', () => {
  let trailingComma = [1, 2, 3];
  ok((trailingComma[0] === 1) && (trailingComma[2] === 3) && (trailingComma.length === 3));

  trailingComma = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
  ];
  for (const n of Array.from(trailingComma)) { var sum = (sum || 0) + n; }

  const a = [((x) => x), ((x) => x * x)];
  return ok(a.length === 2);
});

test('incorrect indentation without commas', () => {
  const result = [['a'],
    { b: 'c' }];
  ok(result[0][0] === 'a');
  return ok(result[1].b === 'c');
});

// Elisions
test('array elisions', () => {
  eq([, 1].length, 2);
  eq([,, 1, 2,, ].length, 5);
  const arr = [1,, 2];
  eq(arr.length, 3);
  eq(arr[1], undefined);
  return eq([,, ].length, 2);
});

test('array elisions indentation and commas', () => {
  const arr1 = [,
    1, 2, , , 3,
    4, 5, 6,,
    8, 9,
  ];
  eq(arr1.length, 12);
  eq(arr1[5], 3);
  eq(arr1[9], undefined);
  const arr2 = [, , 1,
    2, , 3,,
    4, 5,
    6
    , , ,
  ];
  eq(arr2.length, 12);
  eq(arr2[8], 5);
  return eq(arr2[1], undefined);
});

test('array elisions destructuring', () => {
  let a; let b; let c; let d; let e; let f; let g; let
    h;
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  [, a] = arr;
  [,,, b] = arr;
  arrayEq([a, b], [2, 4]);
  [, a,, b,, c,,, d] = arr;
  arrayEq([a, b, c, d], [2, 4, 6, 9]);
  [,
    e,,
    f,,
    g,,,
    h] = arr;
  return arrayEq([e, f, g, h], [2, 4, 6, 9]);
});

test('array elisions destructuring with splats and expansions', () => {
  let a; let
    b;
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  [, a,,, ...b] = arr;
  arrayEq([a, b], [2, [5, 6, 7, 8, 9]]);
  const c = arr[1]; const d = arr[arr.length - 3]; const
    e = arr[arr.length - 1];
  arrayEq([c, d, e], [2, 7, 9]);
  const f = arr[arr.length - 6]; const
    g = arr[arr.length - 3];
  return arrayEq([f, g], [4, 7]);
});

test('array elisions as function parameters', () => {
  let b; let c; let
    d;
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let foo = ([, a]) => a;
  let a = foo(arr);
  eq(a, 2);
  foo = ([,,, a]) => a;
  a = foo(arr);
  eq(a, 4);
  foo = ([, a,, b,, c,,, d]) => [a, b, c, d];
  [a, b, c, d] = foo(arr);
  return arrayEq([a, b, c, d], [2, 4, 6, 9]);
});

test('array elisions nested destructuring', () => {
  let a; let b; let c; let d; let
    w;
  const arr = [
    1,
    [2, 3, [4, 5, 6, [7, 8, 9]]],
  ];
  [, a] = arr;
  arrayEq(a[2][3], [7, 8, 9]);
  [, [,, [, b,, [,, c]]]] = arr;
  eq(b, 5);
  eq(c, 9);
  const aobj = [
    {},
    { x: 2 },
    {},
    [
      {},
      {},
      {
        z: 1, w: [1, 2, 4], p: 3, q: 4,
      },
      {},
      {},
    ],
  ];
  [, d,, [,,, { w }]] = aobj;
  deepEqual(d, { x: 2 });
  return arrayEq(w, [1, 2, 4]);
});

// Splats in Array Literals

test('array splat expansions with assignments', () => {
  let a; let
    b;
  const nums = [1, 2, 3];
  const list = [(a = 0), ...nums, (b = 4)];
  eq(0, a);
  eq(4, b);
  return arrayEq([0, 1, 2, 3, 4], list);
});


test('mixed shorthand objects in array lists', () => {
  let arr = [
    { a: 1 },
    'b',
    { c: 1 },
  ];
  ok(arr.length === 3);
  ok(arr[2].c === 1);

  arr = [{ b: 1, a: 2 }, 100];
  eq(arr[1], 100);

  arr = [{ a: 0, b: 1 }, (1 + 1)];
  eq(arr[1], 2);

  arr = [{ a: 1 }, 'a', { b: 1 }, 'b'];
  eq(arr.length, 4);
  eq(arr[2].b, 1);
  return eq(arr[3], 'b');
});

test('array splats with nested arrays', () => {
  const nonce = {};
  let a = [nonce];
  let list = [1, 2, ...a];
  eq(list[0], 1);
  eq(list[2], nonce);

  a = [[nonce]];
  list = [1, 2, ...a];
  return arrayEq(list, [1, 2, [nonce]]);
});

test('#4260: splat after existential operator soak', () => {
  let left; let left1; let left2; let
    left3;
  const a = { b: [3] };
  const foo = (a) => [a];
  arrayEq([...(a != null ? a.b : undefined)], [3]);
  arrayEq([...((typeof c !== 'undefined' && c !== null ? c.b : undefined) != null ? typeof c !== 'undefined' && c !== null ? c.b : undefined : [])], []);
  arrayEq([...(a != null ? a.b : undefined)], [3]);
  arrayEq([...((typeof c !== 'undefined' && c !== null ? c.b : undefined) != null ? typeof c !== 'undefined' && c !== null ? c.b : undefined : [])], []);
  arrayEq(foo(...(a != null ? a.b : undefined)), [3]);
  arrayEq(foo(...(a != null ? a.b : undefined)), [3]);
  arrayEq(foo(...((typeof c !== 'undefined' && c !== null ? c.b : undefined) != null ? typeof c !== 'undefined' && c !== null ? c.b : undefined : [])), [undefined]);
  arrayEq(foo(...((typeof c !== 'undefined' && c !== null ? c.b : undefined) != null ? typeof c !== 'undefined' && c !== null ? c.b : undefined : [])), [undefined]);
  const e = true;
  const f = null;
  arrayEq([...__guard__((e ? a : undefined), (x) => x.b)], [3]);
  arrayEq([...((left = __guard__((f ? a : undefined), (x1) => x1.b)) != null ? left : [])], []);
  arrayEq([...__guard__((e ? a : undefined), (x2) => x2.b)], [3]);
  arrayEq([...((left1 = __guard__((f ? a : undefined), (x3) => x3.b)) != null ? left1 : [])], []);
  arrayEq(foo(...__guard__((e ? a : undefined), (x4) => x4.b)), [3]);
  arrayEq(foo(...__guard__((e ? a : undefined), (x5) => x5.b)), [3]);
  arrayEq(foo(...((left2 = __guard__((f ? a : undefined), (x6) => x6.b)) != null ? left2 : [])), [undefined]);
  arrayEq(foo(...((left3 = __guard__((f ? a : undefined), (x7) => x7.b)) != null ? left3 : [])), [undefined]);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  arrayEq([...(a != null ? a.b : undefined)], [3]);
  arrayEq([...((typeof c !== 'undefined' && c !== null ? c.b : undefined) != null ? typeof c !== 'undefined' && c !== null ? c.b : undefined : [])], []);
  arrayEq([...(a != null ? a.b : undefined)], [3]);
  arrayEq([...__guard__((e ? a : undefined), (x8) => x8.b)], [3]);
  arrayEq(foo(...(a != null ? a.b : undefined)), [3]);
  return arrayEq(foo(...(a != null ? a.b : undefined)), [3]);
});

test('#1349: trailing if after splat', () => {
  let left; let left1; let left2; let
    left3;
  const a = [3];
  const b = true;
  const c = null;
  const foo = (a) => [a];
  arrayEq([...(b ? a : undefined)], [3]);
  arrayEq([...(((left = c ? a : undefined)) != null ? left : [])], []);
  arrayEq([...(b ? a : undefined)], [3]);
  arrayEq([...(((left1 = c ? a : undefined)) != null ? left1 : [])], []);
  arrayEq(foo(...((b ? a : undefined))), [3]);
  arrayEq(foo(...((b ? a : undefined))), [3]);
  arrayEq(foo(...(((left2 = c ? a : undefined)) != null ? left2 : [])), [undefined]);
  arrayEq(foo(...(((left3 = c ? a : undefined)) != null ? left3 : [])), [undefined]);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  arrayEq([...(b ? a : undefined)], [3]);
  return arrayEq([...(b ? a : undefined)], [3]);
});

test('#1274: `[] = a()` compiles to `false` instead of `a()`', () => {
  let a = false;
  const fn = () => a = true;
  const array = fn();
  return ok(a);
});

test('#3194: string interpolation in array', () => {
  let arr = ['a',
    { key: 'value' },
  ];
  eq(2, arr.length);
  eq('a', arr[0]);
  eq('value', arr[1].key);

  const b = 'b';
  arr = [`a${b}`,
    { key: 'value' },
  ];
  eq(2, arr.length);
  eq('ab', arr[0]);
  return eq('value', arr[1].key);
});

test('regex interpolation in array', () => {
  let arr = [/a/,
    { key: 'value' },
  ];
  eq(2, arr.length);
  eq('a', arr[0].source);
  eq('value', arr[1].key);

  const b = 'b';
  arr = [new RegExp(`a${b}`),
    { key: 'value' },
  ];
  eq(2, arr.length);
  eq('ab', arr[0].source);
  return eq('value', arr[1].key);
});

test('splat extraction from generators', () => {
  const gen = function* () {
    yield 1;
    yield 2;
    return yield 3;
  };
  return arrayEq([...gen()], [1, 2, 3]);
});

test('for-from loops over Array', () => {
  let a; let
    b;
  let d;
  let array1 = [50, 30, 70, 20];
  let array2 = [];
  for (const x of array1) {
    array2.push(x);
  }
  arrayEq(array1, array2);

  array1 = [[20, 30], [40, 50]];
  array2 = [];
  for ([a, b] of array1) {
    array2.push(b);
    array2.push(a);
  }
  arrayEq(array2, [30, 20, 50, 40]);

  array1 = [{ a: 10, b: 20, c: 30 }, { a: 40, b: 50, c: 60 }];
  array2 = [];
  for ({ a, b, c: d } of array1) {
    array2.push([a, b, d]);
  }
  arrayEq(array2, [[10, 20, 30], [40, 50, 60]]);

  array1 = [[10, 20, 30, 40, 50]];
  return (() => {
    const result = [];
    for (const value of array1) {
      var adjustedLength; var
        c;
      a = value[0],
      adjustedLength = Math.max(value.length, 2),
      b = value.slice(1, adjustedLength - 1),
      c = value[adjustedLength - 1];
      eq(10, a);
      arrayEq([20, 30, 40], b);
      result.push(eq(50, c));
    }
    return result;
  })();
});

test('for-from comprehensions over Array', () => {
  let x; let a; let
    b;
  let array1 = ((() => {
    const result = [];
    for (x of [10, 20, 30]) {
      result.push(x + 10);
    }
    return result;
  })());
  ok(array1.join(' ') === '20 30 40');

  let array2 = ((() => {
    const result1 = [];
    for (x of [30, 41, 57]) {
      if (__mod__(x, 3) === 0) {
        result1.push(x);
      }
    }
    return result1;
  })());
  ok(array2.join(' ') === '30 57');

  array1 = ((() => {
    const result2 = [];
    for ([a, b] of [[20, 30], [40, 50]]) {
      result2.push(b + 5);
    }
    return result2;
  })());
  ok(array1.join(' ') === '35 55');

  array2 = ((() => {
    const result3 = [];
    for ([a, b] of [[10, 20], [30, 40], [50, 60]]) {
      if ((a + b) >= 70) {
        result3.push(a + b);
      }
    }
    return result3;
  })());
  return ok(array2.join(' ') === '70 110');
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __mod__(a, b) {
  a = +a;
  b = +b;
  return (a % b + b) % b;
}
