/* eslint-disable
    consistent-return,
    func-names,
    guard-for-in,
    max-len,
    no-bitwise,
    no-constant-condition,
    no-continue,
    no-empty,
    no-loop-func,
    no-multi-assign,
    no-multi-str,
    no-nested-ternary,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-undef,
    no-underscore-dangle,
    no-unused-expressions,
    no-unused-vars,
    no-use-before-define,
    prefer-rest-params,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS202: Simplify dynamic range loops
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Comprehensions
// --------------

// * Array Comprehensions
// * Range Comprehensions
// * Object Comprehensions
// * Implicit Destructuring Assignment
// * Comprehensions with Nonstandard Step

// TODO: refactor comprehension tests

test('Basic array comprehensions.', () => {
  let n;
  const nums = ((() => {
    const result = [];
    for (n of [1, 2, 3]) {
      if (n & 1) {
        result.push(n * n);
      }
    }
    return result;
  })());
  const results = ((() => {
    const result1 = [];
    for (n of Array.from(nums)) {
      result1.push(n * 2);
    }
    return result1;
  })());

  return ok(results.join(',') === '2,18');
});


test('Basic object comprehensions.', () => {
  let prop;
  const obj = { one: 1, two: 2, three: 3 };
  const names = ((() => {
    const result = [];
    for (prop in obj) {
      result.push(`${prop}!`);
    }
    return result;
  })());
  const odds = ((() => {
    const result1 = [];
    for (prop in obj) {
      const value = obj[prop];
      if (value & 1) {
        result1.push(`${prop}!`);
      }
    }
    return result1;
  })());

  ok(names.join(' ') === 'one! two! three!');
  return ok(odds.join(' ') === 'one! three!');
});


test('Basic range comprehensions.', () => {
  const nums = ([1, 2, 3].map((i) => i * 3));

  let negs = (__range__(-20, -5 * 2, true));
  negs = negs.slice(0, 3);

  const result = nums.concat(negs).join(', ');

  return ok(result === '3, 6, 9, -20, -19, -18');
});


test('With range comprehensions, you can loop in steps.', () => {
  let x;
  let results = ((() => {
    const result = [];
    for (x = 0; x < 15; x += 5) {
      result.push(x);
    }
    return result;
  })());
  ok(results.join(' ') === '0 5 10');

  results = ((() => {
    const result1 = [];
    for (x = 0; x <= 100; x += 10) {
      result1.push(x);
    }
    return result1;
  })());
  return ok(results.join(' ') === '0 10 20 30 40 50 60 70 80 90 100');
});


test('And can loop downwards, with a negative step.', () => {
  let x;
  let results = ((() => {
    const result = [];
    for (x = 5; x >= 1; x--) {
      result.push(x);
    }
    return result;
  })());

  ok(results.join(' ') === '5 4 3 2 1');
  ok(results.join(' ') === __range__((10 - 5), (-2 + 3), true).join(' '));

  results = ((() => {
    const result1 = [];
    for (x = 10; x >= 1; x--) {
      result1.push(x);
    }
    return result1;
  })());
  ok(results.join(' ') === [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].join(' '));

  results = ((() => {
    const result2 = [];
    for (x = 10; x > 0; x -= 2) {
      result2.push(x);
    }
    return result2;
  })());
  return ok(results.join(' ') === [10, 8, 6, 4, 2].join(' '));
});


test('Range comprehension gymnastics.', () => {
  let i;
  eq(`${(() => {
    const result = [];
    for (i = 5; i >= 1; i--) {
      result.push(i);
    }
    return result;
  })()}`, '5,4,3,2,1');
  eq(`${(() => {
    let end;
    const result1 = [];
    for (i = 5, end = -5; i >= end; i -= 5) {
      result1.push(i);
    }
    return result1;
  })()}`, '5,0,-5');

  const a = 6;
  const b = 0;
  const c = -2;

  eq(`${(() => {
    let asc; let
      end1;
    const result2 = [];
    for (i = a, end1 = b, asc = a <= end1; asc ? i <= end1 : i >= end1; asc ? i++ : i--) {
      result2.push(i);
    }
    return result2;
  })()}`, '6,5,4,3,2,1,0');
  return eq(`${(() => {
    let asc1; let end2; let
      step;
    const result3 = [];
    for (i = a, end2 = b, step = c, asc1 = step > 0; asc1 ? i <= end2 : i >= end2; i += step) {
      result3.push(i);
    }
    return result3;
  })()}`, '6,4,2,0');
});


test('Multiline array comprehension with filter.', () => {
  const evens = (() => {
    const result = [];
    for (let num of [1, 2, 3, 4, 5, 6]) {
      if (!(num & 1)) {
        num *= -1;
        num -= 2;
        result.push(num * -1);
      }
    }
    return result;
  })();
  eq(`${evens}`, '4,6,8');


  return test('The in operator still works, standalone.', () => ok(2 in evens));
});


test("all isn't reserved.", () => {
  let all;
  return all = 1;
});


test('Ensure that the closure wrapper preserves local variables.', () => {
  const obj = {};

  for (const method of ['one', 'two', 'three']) { (((method) => obj[method] = () => `I'm ${method}`))(method); }

  ok(obj.one() === "I'm one");
  ok(obj.two() === "I'm two");
  return ok(obj.three() === "I'm three");
});


test('Index values at the end of a loop.', () => {
  let i = 0;
  for (i = 1; i <= 3; i++) {
    (() => 'func');
    if (false) { break; }
  }
  return ok(i === 4);
});


test('Ensure that local variables are closed over for range comprehensions.', () => {
  let i;
  const funcs = (() => {
    const result = [];
    for (i = 1; i <= 3; i++) {
      result.push((((i) => () => -i))(i));
    }
    return result;
  })();

  eq((Array.from(funcs).map((func) => func())).join(' '), '-1 -2 -3');
  return ok(i === 4);
});


test('Even when referenced in the filter.', () => {
  const list = ['one', 'two', 'three'];

  const methods = (() => {
    const result = [];
    for (let i = 0; i < list.length; i++) {
      const num = list[i];
      if ((num !== 'two') && (i !== 1)) {
        result.push((((num, i) => () => `${num} ${i}`))(num, i));
      }
    }
    return result;
  })();

  ok(methods.length === 2);
  ok(methods[0]() === 'one 0');
  return ok(methods[1]() === 'three 2');
});


test('Even a convoluted one.', () => {
  let i; let z; let
    x;
  let funcs = [];

  for (i = 1; i <= 3; i++) {
    (function (i) {
      x = i * 2;
      return (((z) => funcs.push(() => `${z} ${i}`)))(x);
    }(i));
  }

  ok((Array.from(funcs).map((func) => func())).join(', ') === '2 1, 4 2, 6 3');

  funcs = [];

  const results = (() => {
    const result = [];
    for (i = 1; i <= 3; i++) {
      result.push((function (i) {
        z = (__range__(1, i, true).map((x) => x * 3));
        return (((a, b, c) => [a, b, c].join(' '))).apply(this, z);
      })(i));
    }
    return result;
  })();

  return ok(results.join(', ') === '3  , 3 6 , 3 6 9');
});


test('Naked ranges are expanded into arrays.', () => {
  const array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return ok((() => {
    const result = [];
    for (let i = 0; i < array.length; i += 2) {
      const num = array[i];
      result.push((num % 2) === 0);
    }
    return result;
  })());
});


test('Nested shared scopes.', () => {
  const foo = () => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (((i) => [0, 1, 2, 3, 4, 5, 6, 7].map((j) => (((j) => () => i + j))(j))))(i));

  return eq(foo()[3][4](), 7);
});


test('Scoped loop pattern matching.', () => {
  const a = [[0], [1]];
  const funcs = [];

  for (const [v] of Array.from(a)) {
    (((v) => funcs.push(() => v)))(v);
  }

  eq(funcs[0](), 0);
  return eq(funcs[1](), 1);
});


test('Nested comprehensions.', () => {
  let x; let
    y;
  const multiLiner = (() => {
    const result = [];
    for (x = 3; x <= 5; x++) {
      result.push((() => {
        const result1 = [];
        for (y = 3; y <= 5; y++) {
          result1.push([x, y]);
        }
        return result1;
      })());
    }
    return result;
  })();

  const singleLiner = ((() => {
    const result2 = [];
    for (x = 3; x <= 5; x++) {
      result2.push(((() => {
        const result3 = [];
        for (y = 3; y <= 5; y++) {
          result3.push([x, y]);
        }
        return result3;
      })()));
    }
    return result2;
  })());

  ok(multiLiner.length === singleLiner.length);
  ok(multiLiner[2][2][1] === 5);
  return ok(singleLiner[2][2][1] === 5);
});


test('Comprehensions within parentheses.', () => {
  let result = null;
  const store = (obj) => result = obj;
  store(([3, 2, 1].map((x) => x * 2)));

  return ok(result.join(' ') === '6 4 2');
});


test("Closure-wrapped comprehensions that refer to the 'arguments' object.", () => {
  const expr = function () {
    let result;
    return result = (Array.from(arguments).map((item) => item * item));
  };

  return ok(expr(2, 4, 8).join(' ') === '4 16 64');
});


test('Fast object comprehensions over all properties, including prototypal ones.', () => {
  let key; let
    value;
  class Cat {
    static initClass() {
      this.prototype.breed = 'tabby';
      this.prototype.hair = 'cream';
    }

    constructor() { this.name = 'Whiskers'; }
  }
  Cat.initClass();

  const whiskers = new Cat();
  const own = ((() => {
    const result = [];
    for (key of Object.keys(whiskers || {})) {
      value = whiskers[key];
      result.push(value);
    }
    return result;
  })());
  const all = ((() => {
    const result1 = [];
    for (key in whiskers) {
      value = whiskers[key];
      result1.push(value);
    }
    return result1;
  })());

  ok(own.join(' ') === 'Whiskers');
  return ok(all.sort().join(' ') === 'Whiskers cream tabby');
});


test('Optimized range comprehensions.', () => {
  const exxes = ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => 'x'));
  return ok(exxes.join(' ') === 'x x x x x x x x x x');
});


test('#3671: Allow step in optimized range comprehensions.', () => {
  const exxes = ((() => {
    const result = [];
    for (let i = 0; i < 10; i += 2) {
      result.push('x');
    }
    return result;
  })());
  return eq(exxes.join(' '), 'x x x x x');
});


test('#3671: Disallow guard in optimized range comprehensions.', () => throws(() => CoffeeScript.compile("exxes = ('x' for [0...10] when a)")));


test('Loop variables should be able to reference outer variables', () => {
  let outer = 1;
  ((() => (() => {
    const result = [];
    for (outer of [1, 2, 3]) {
      result.push(null);
    }
    return result;
  })()))();
  return eq(outer, 3);
});


test('Lenient on pure statements not trying to reach out of the closure', () => {
  let i;
  const val = (() => {
    const result = [];
    for (i of [1]) {
      for (const j of []) { break; }
      result.push(i);
    }
    return result;
  })();
  return ok(val[0] === i);
});


test('Comprehensions only wrap their last line in a closure, allowing other lines \
to have pure expressions in them.', () => {
  const func = () => (() => {
    const result = [];
    for (const i of [1]) {
      if (i === 2) { break; }
      result.push([1]);
    }
    return result;
  })();

  ok(func()[0][0] === 1);

  let i = 6;
  const odds = (() => {
    const result = [];
    while (i--) {
      if (!(i & 1)) { continue; }
      result.push(i);
    }
    return result;
  })();

  return ok(odds.join(', ') === '5, 3, 1');
});


test("Issue #897: Ensure that plucked function variables aren't leaked.", () => {
  const facets = {};
  const list = ['one', 'two'];

  ((() => Array.from(list).map((entity) => (facets[entity] = () => entity))))();

  eq(typeof entity, 'undefined');
  return eq(facets.two(), 'two');
});


test('Issue #905. Soaks as the for loop subject.', () => {
  let e;
  const a = { b: { c: [1, 2, 3] } };
  for (const d of Array.from((a.b != null ? a.b.c : undefined))) {
    e = d;
  }

  return eq(e, 3);
});


test('Issue #948. Capturing loop variables.', () => {
  const funcs = [];
  const list = () => [1, 2, 3];

  for (const y of Array.from(list())) {
    (function (y) {
      const z = y;
      return funcs.push(() => `y is ${y} and z is ${z}`);
    }(y));
  }

  return eq(funcs[1](), 'y is 2 and z is 2');
});


test("Cancel the comprehension if there's a jump inside the loop.", () => {
  const result = (() => {
    try {
      let i;
      for (i = 0; i < 10; i++) {
        if (i < 5) { continue; }
      }
      return i;
    } catch (error) {}
  })();

  return eq(result, 10);
});


test('Comprehensions over break.', () => arrayEq(((() => {
  const result = [];
  for (let i = 1; i <= 10; i++) {
    break;
  }
  return result;
})()), []));


test('Comprehensions over continue.', () => arrayEq(((() => {
  const result = [];
  for (let i = 1; i <= 10; i++) {
    continue;
  }
  return result;
})()), []));


test('Comprehensions over function literals.', () => {
  let a = 0;
  for (const f of [() => a = 1]) {
    (((f) => f()))(f);
  }

  return eq(a, 1);
});


test('Comprehensions that mention arguments.', () => {
  const list = [{ arguments: 10 }];
  const args = Array.from(list).map((f) => (function (f) {
    return f.arguments;
  }(f)));
  return eq(args[0], 10);
});


test('expression conversion under explicit returns', () => {
  const nonce = {};
  let fn = () => [1, 2, 3].map((x) => nonce);
  arrayEq([nonce, nonce, nonce], fn());
  fn = () => [[1, 2, 3].map((x) => nonce)][0];
  arrayEq([nonce, nonce, nonce], fn());
  fn = () => [([1, 2, 3].map((x) => nonce))][0];
  return arrayEq([nonce, nonce, nonce], fn());
});


test('implicit destructuring assignment in object of objects', () => {
  const a = {}; const b = {}; const c = {};
  const obj = {
    a: { d: a },
    b: { d: b },
    c: { d: c },
  };
  const result = ((() => {
    const result1 = [];
    for (const y in obj) {
      const { d: z } = obj[y];
      result1.push([y, z]);
    }
    return result1;
  })());
  return arrayEq([['a', a], ['b', b], ['c', c]], result);
});


test('implicit destructuring assignment in array of objects', () => {
  const a = {}; const b = {}; const c = {}; const d = {}; const e = {}; const f = {};
  const arr = [
    { a, b: { c: b } },
    { a: c, b: { c: d } },
    { a: e, b: { c: f } },
  ];
  const result = ((() => {
    const result1 = [];
    for (const { a: y, b: { c: z } } of Array.from(arr)) {
      result1.push([y, z]);
    }
    return result1;
  })());
  return arrayEq([[a, b], [c, d], [e, f]], result);
});


test('implicit destructuring assignment in array of arrays', () => {
  const a = {}; const b = {}; const c = {}; const d = {}; const e = {}; const f = {};
  const arr = [[a, [b]], [c, [d]], [e, [f]]];
  const result = ((() => {
    const result1 = [];
    for (const [y, [z]] of Array.from(arr)) {
      result1.push([y, z]);
    }
    return result1;
  })());
  return arrayEq([[a, b], [c, d], [e, f]], result);
});

test("issue #1124: don't assign a variable in two scopes", () => {
  const lista = [1, 2, 3, 4, 5];
  const listb = (Array.from(lista).map((_i) => _i + 1));
  return arrayEq([2, 3, 4, 5, 6], listb);
});

test('#1326: `by` value is uncached', () => {
  let gi; let
    hi;
  let asc; let
    step;
  let i;
  const a = [0, 1, 2];
  let fi = (gi = (hi = 0));
  const f = () => ++fi;
  const g = () => ++gi;
  const h = () => ++hi;

  const forCompile = [];
  let rangeCompileSimple = [];

  // exercises For.compile
  for (step = f(), asc = step > 0, i = asc ? 0 : a.length - 1; asc ? i < a.length : i >= 0; i += step) {
    const v = a[i];
    forCompile.push(i);
  }

  // exercises Range.compileSimple
  rangeCompileSimple = ((() => {
    let step1;
    const result = [];
    for (i = 0, step1 = g(); i <= 2; i += step1) {
      result.push(i);
    }
    return result;
  })());

  arrayEq(a, forCompile);
  arrayEq(a, rangeCompileSimple);
  // exercises Range.compile
  return eq(`${(() => {
    let step2;
    const result1 = [];
    for (i = 0, step2 = h(); i <= 2; i += step2) {
      result1.push(i);
    }
    return result1;
  })()}`, '0,1,2');
});

test('#1669: break/continue should skip the result only for that branch', () => {
  let n;
  let ns = (() => {
    const result = [];
    for (n = 0; n <= 99; n++) {
      if (n > 9) {
        break;
      } else if (n & 1) {
        continue;
      } else {
        result.push(n);
      }
    }
    return result;
  })();
  eq(`${ns}`, '0,2,4,6,8');

  // `else undefined` is implied.
  ns = (() => {
    const result1 = [];
    for (n = 1; n <= 9; n++) {
      if (n % 2) {
        if (!(n % 5)) { continue; }
        result1.push(n);
      } else {
        result1.push(undefined);
      }
    }
    return result1;
  })();
  eq(`${ns}`, '1,,3,,,7,,9');

  // Ditto.
  ns = (() => {
    const result2 = [];
    for (n = 1; n <= 9; n++) {
      switch (false) {
        case !(n % 2):
          if (!(n % 5)) { continue; }
          result2.push(n);
          break;
        default:
          result2.push(undefined);
      }
    }
    return result2;
  })();
  return eq(`${ns}`, '1,,3,,,7,,9');
});

test('#1850: inner `for` should not be expression-ized if `return`ing', () => eq('3,4,5', (function () {
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      const c = Math.sqrt((a * a) + (b * b));
      if (!(c % 1)) { return String([a, b, c]); }
    }
  }
}())));

test('#1910: loop index should be mutable within a loop iteration and immutable between loop iterations', () => {
  let i;
  let k;
  let asc; let
    end;
  let j;
  let v;
  const n = 1;
  let iterations = 0;
  let arr = __range__(0, n, true);
  for (i = 0, k = i; i < arr.length; i++, k = i) {
    v = arr[k];
    ++iterations;
    v = (k = 5);
    eq(5, k);
  }
  eq(2, k);
  eq(2, iterations);

  iterations = 0;
  for (v = 0, end = n, asc = end >= 0; asc ? v <= end : v >= end; asc ? v++ : v--) {
    ++iterations;
  }
  eq(2, k);
  eq(2, iterations);

  arr = ((() => {
    const result = [];
    for (v = 0; v <= 5; v++) {
      result.push([v, v + 1]);
    }
    return result;
  })());
  iterations = 0;
  for (j = 0, k = j; j < arr.length; j++, k = j) {
    const [v0, v1] = arr[k];
    if (v0) {
      k += 3;
      ++iterations;
    }
  }
  eq(6, k);
  return eq(5, iterations);
});

test('#2007: Return object literal from comprehension', () => {
  let x;
  let y = (() => {
    const result = [];
    for (x of [1, 2]) {
      result.push({ foo: `foo${x}` });
    }
    return result;
  })();
  eq(2, y.length);
  eq('foo1', y[0].foo);
  eq('foo2', y[1].foo);

  x = 2;
  y = (() => {
    const result1 = [];
    while (x) {
      result1.push({ x: --x });
    }
    return result1;
  })();
  eq(2, y.length);
  eq(1, y[0].x);
  return eq(0, y[1].x);
});

test('#2274: Allow @values as loop variables', () => {
  const obj = {
    item: null,
    method() {
      return (() => {
        const result = [];
        for (this.item of [1, 2, 3]) {
          result.push(null);
        }
        return result;
      })();
    },
  };
  eq(obj.item, null);
  obj.method();
  return eq(obj.item, 3);
});

test('#4411: Allow @values as loop indices', () => {
  const obj = {
    index: null,
    get() { return this.index; },
    method() {
      return (() => {
        let i;
        const result = [];
        const iterable = [1, 2, 3];
        for (i = 0, this.index = i; i < iterable.length; i++, this.index = i) {
          const _ = iterable[this.index];
          result.push(this.get());
        }
        return result;
      })();
    },
  };
  eq(obj.index, null);
  arrayEq(obj.method(), [0, 1, 2]);
  return eq(obj.index, 3);
});

test('#2525, #1187, #1208, #1758, looping over an array forwards', () => {
  let i; let
    index;
  const list = [0, 1, 2, 3, 4];

  const ident = (x) => x;

  arrayEq(((() => {
    const result = [];
    for (i of Array.from(list)) {
      result.push(i);
    }
    return result;
  })()), list);

  arrayEq(((() => {
    const result1 = [];
    for (index = 0; index < list.length; index++) {
      i = list[index];
      result1.push(index);
    }
    return result1;
  })()), list);

  arrayEq(((() => {
    const result2 = [];
    for (let j = 0; j < list.length; j++) {
      i = list[j];
      result2.push(i);
    }
    return result2;
  })()), list);

  arrayEq(((() => {
    const result3 = [];
    for (let step = ident(1), asc = step > 0, k = asc ? 0 : list.length - 1; asc ? k < list.length : k >= 0; k += step) {
      i = list[k];
      result3.push(i);
    }
    return result3;
  })()), list);

  arrayEq(((() => {
    const result4 = [];
    for (let step1 = ident(1) * 2, asc1 = step1 > 0, i1 = asc1 ? 0 : list.length - 1; asc1 ? i1 < list.length : i1 >= 0; i1 += step1) {
      i = list[i1];
      result4.push(i);
    }
    return result4;
  })()), [0, 2, 4]);

  return arrayEq(((() => {
    let asc2; let
      step2;
    const result5 = [];
    for (step2 = ident(1) * 2, asc2 = step2 > 0, index = asc2 ? 0 : list.length - 1; asc2 ? index < list.length : index >= 0; index += step2) {
      i = list[index];
      result5.push(index);
    }
    return result5;
  })()), [0, 2, 4]);
});

test('#2525, #1187, #1208, #1758, looping over an array backwards', () => {
  let i; let
    index;
  const list = [0, 1, 2, 3, 4];
  const backwards = [4, 3, 2, 1, 0];

  const ident = (x) => x;

  arrayEq(((() => {
    const result = [];
    for (let j = list.length - 1; j >= 0; j--) {
      i = list[j];
      result.push(i);
    }
    return result;
  })()), backwards);

  arrayEq(((() => {
    const result1 = [];
    for (index = list.length - 1; index >= 0; index--) {
      i = list[index];
      result1.push(index);
    }
    return result1;
  })()), backwards);

  arrayEq(((() => {
    const result2 = [];
    for (let step = ident(-1), asc = step > 0, k = asc ? 0 : list.length - 1; asc ? k < list.length : k >= 0; k += step) {
      i = list[k];
      result2.push(i);
    }
    return result2;
  })()), backwards);

  arrayEq(((() => {
    const result3 = [];
    for (let step1 = ident(-1) * 2, asc1 = step1 > 0, i1 = asc1 ? 0 : list.length - 1; asc1 ? i1 < list.length : i1 >= 0; i1 += step1) {
      i = list[i1];
      result3.push(i);
    }
    return result3;
  })()), [4, 2, 0]);

  return arrayEq(((() => {
    let asc2; let
      step2;
    const result4 = [];
    for (step2 = ident(-1) * 2, asc2 = step2 > 0, index = asc2 ? 0 : list.length - 1; asc2 ? index < list.length : index >= 0; index += step2) {
      i = list[index];
      result4.push(index);
    }
    return result4;
  })()), [4, 2, 0]);
});

test('splats in destructuring in comprehensions', () => {
  const list = [[0, 1, 2], [2, 3, 4], [4, 5, 6]];
  return arrayEq(((() => {
    const result = [];
    for (const [rep, ...seq] of Array.from(list)) {
      result.push(seq);
    }
    return result;
  })()), [[1, 2], [3, 4], [5, 6]]);
});

test('#156: expansion in destructuring in comprehensions', () => {
  const list = [[0, 1, 2], [2, 3, 4], [4, 5, 6]];
  return arrayEq(((() => {
    const result = [];
    for (const value of Array.from(list)) {
      const last = value[value.length - 1]; result.push(last);
    }
    return result;
  })()), [2, 4, 6]);
});

test('#3778: Consistently always cache for loop range boundaries and steps, even \
if they are simple identifiers', () => {
  let n; let
    a;
  a = 1; arrayEq([1, 2, 3], ((() => {
    const result = [];
    const iterable = [1, 2, 3];
    for (let step = a, asc = step > 0, i = asc ? 0 : iterable.length - 1; asc ? i < iterable.length : i >= 0; i += step) {
      n = iterable[i];
      a = 4; result.push(n);
    }
    return result;
  })()));
  a = 1; arrayEq([1, 2, 3], ((() => {
    const result1 = [];
    const iterable1 = [1, 2, 3];
    for (let step1 = +a, asc1 = step1 > 0, j = asc1 ? 0 : iterable1.length - 1; asc1 ? j < iterable1.length : j >= 0; j += step1) {
      n = iterable1[j];
      a = 4; result1.push(n);
    }
    return result1;
  })()));
  a = 1; arrayEq([1, 2, 3], ((() => {
    let asc2;
    const result2 = [];
    for (n = a, asc2 = a <= 3; asc2 ? n <= 3 : n >= 3; asc2 ? n++ : n--) {
      a = 4; result2.push(n);
    }
    return result2;
  })()));
  a = 1; arrayEq([1, 2, 3], ((() => {
    let asc3;
    const result3 = [];
    for (n = +a, asc3 = +a <= 3; asc3 ? n <= 3 : n >= 3; asc3 ? n++ : n--) {
      a = 4; result3.push(n);
    }
    return result3;
  })()));
  a = 3; arrayEq([1, 2, 3], ((() => {
    let asc4; let
      end;
    const result4 = [];
    for (n = 1, end = a, asc4 = end >= 1; asc4 ? n <= end : n >= end; asc4 ? n++ : n--) {
      a = 4; result4.push(n);
    }
    return result4;
  })()));
  a = 3; arrayEq([1, 2, 3], ((() => {
    let asc5; let
      end1;
    const result5 = [];
    for (n = 1, end1 = +a, asc5 = end1 >= 1; asc5 ? n <= end1 : n >= end1; asc5 ? n++ : n--) {
      a = 4; result5.push(n);
    }
    return result5;
  })()));
  a = 1; arrayEq([1, 2, 3], ((() => {
    let step2;
    const result6 = [];
    for (n = 1, step2 = a; n <= 3; n += step2) {
      a = 4; result6.push(n);
    }
    return result6;
  })()));
  a = 1; return arrayEq([1, 2, 3], ((() => {
    let step3;
    const result7 = [];
    for (n = 1, step3 = +a; n <= 3; n += step3) {
      a = 4; result7.push(n);
    }
    return result7;
  })()));
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
