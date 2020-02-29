/* eslint-disable
    constructor-super,
    func-names,
    max-classes-per-file,
    max-len,
    no-array-constructor,
    no-cond-assign,
    no-constant-condition,
    no-empty-pattern,
    no-eval,
    no-loop-func,
    no-mixed-operators,
    no-multi-assign,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-sequences,
    no-shadow,
    no-this-before-super,
    no-throw-literal,
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
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Assignment
// ----------

// * Assignment
// * Compound Assignment
// * Destructuring Assignment
// * Context Property (@) Assignment
// * Existential Assignment (?=)
// * Assignment to variables similar to generated variables

test('context property assignment (using @)', () => {
  const nonce = {};
  const addMethod = function () {
    this.method = () => nonce;
    return this;
  };
  return eq(nonce, addMethod.call({}).method());
});

test('unassignable values', () => {
  const nonce = {};
  return Array.from(['', '""', '0', 'f()'].concat(CoffeeScript.RESERVED)).map((nonref) => eq(nonce, ((() => { try { return CoffeeScript.compile(`${nonref} = v`); } catch (e) { return nonce; } })())));
});

// Compound Assignment

test('boolean operators', () => {
  let f;
  const nonce = {};

  let a = 0;
  if (!a) { a = nonce; }
  eq(nonce, a);

  let b = 1;
  if (!b) { b = nonce; }
  eq(1, b);

  let c = 0;
  if (c) { c = nonce; }
  eq(0, c);

  let d = 1;
  if (d) { d = nonce; }
  eq(nonce, d);

  // ensure that RHS is treated as a group
  let e = (f = false);
  if (e) { e = f || true; }
  return eq(false, e);
});

test('compound assignment as a sub expression', () => {
  let [a, b, c] = [1, 2, 3];
  eq(6, (a + (b += c)));
  eq(1, a);
  eq(5, b);
  return eq(3, c);
});

// *note: this test could still use refactoring*
test('compound assignment should be careful about caching variables', () => {
  let base1; let base2; let base3; let name; let name1; let
    name2;
  let count = 0;
  const list = [];

  if (!list[name = ++count]) { list[name] = 1; }
  eq(1, list[1]);
  eq(1, count);

  if (list[name1 = ++count] == null) { list[name1] = 2; }
  eq(2, list[2]);
  eq(2, count);

  if (list[name2 = count++]) { list[name2] = 6; }
  eq(6, list[2]);
  eq(3, count);

  var base = function () {
    ++count;
    return base;
  };

  if (!(base1 = base()).four) { base1.four = 4; }
  eq(4, base.four);
  eq(4, count);

  if ((base2 = base()).five == null) { base2.five = 5; }
  eq(5, base.five);
  eq(5, count);

  eq(5, (base3 = base()).five != null ? base3.five : (base3.five = 6));
  return eq(6, count);
});

test('compound assignment with implicit objects', () => {
  let obj;
  if (obj == null) {
    obj = { one: 1 };
  }

  eq(1, obj.one);

  if (obj) { obj = { two: 2 }; }

  eq(undefined, obj.one);
  return eq(2, obj.two);
});

test('compound assignment (math operators)', () => {
  let num = 10;
  num -= 5;
  eq(5, num);

  num *= 10;
  eq(50, num);

  num /= 10;
  eq(5, num);

  num %= 3;
  return eq(2, num);
});

test('more compound assignment', () => {
  const a = {};
  let val;
  if (!val) { val = a; }
  if (!val) { val = true; }
  eq(a, val);

  const b = {};
  if (val) { val = true; }
  eq(val, true);
  if (val) { val = b; }
  eq(b, val);

  const c = {};
  val = null;
  if (val == null) { val = c; }
  if (val == null) { val = true; }
  return eq(c, val);
});

test('#1192: assignment starting with object literals', () => {
  doesNotThrow((() => CoffeeScript.run('{}.p = 0')));
  doesNotThrow((() => CoffeeScript.run('{}.p++')));
  doesNotThrow((() => CoffeeScript.run('{}[0] = 1')));
  doesNotThrow((() => CoffeeScript.run(`{a: 1, 'b', "${1}": 2}.p = 0`)));
  return doesNotThrow((() => CoffeeScript.run('{a:{0:{}}}.a[0] = 0')));
});


// Destructuring Assignment

test('empty destructuring assignment', () => {
  let ref;
  ({} = {});
  return ref = [], ref;
});

test('chained destructuring assignments', () => {
  let b; let c; let
    nonce;
  const [a] = ({ 0: b } = ({ 0: c } = [(nonce = {})]));
  eq(nonce, a);
  eq(nonce, b);
  return eq(nonce, c);
});

test('variable swapping to verify caching of RHS values when appropriate', () => {
  let nonceA; let nonceB; let
    nonceC;
  let a = (nonceA = {});
  let b = (nonceB = {});
  let c = (nonceC = {});
  [a, b, c] = [b, c, a];
  eq(nonceB, a);
  eq(nonceC, b);
  eq(nonceA, c);
  [a, b, c] = [b, c, a];
  eq(nonceC, a);
  eq(nonceA, b);
  eq(nonceB, c);
  const fn = () => [a, b, c] = [b, c, a];
  arrayEq([nonceA, nonceB, nonceC], fn());
  eq(nonceA, a);
  eq(nonceB, b);
  return eq(nonceC, c);
});

test('#713: destructuring assignment should return right-hand-side value', () => {
  let a; let b; let c; let d; let nonceA; let
    nonceB;
  const nonces = [(nonceA = {}), (nonceB = {})];
  eq(nonces, ([a, b] = ([c, d] = nonces)));
  eq(nonceA, a);
  eq(nonceA, c);
  eq(nonceB, b);
  return eq(nonceB, d);
});

test('#4787 destructuring of objects within arrays', () => {
  const arr = [1, { a: 1, b: 2 }];
  const { a, b } = arr[arr.length - 1];
  eq(a, 1);
  eq(b, arr[1].b);
  return deepEqual({ a, b }, arr[1]);
});

test('#4798 destructuring of objects with splat within arrays', () => {
  const arr = [1, { a: 1, b: 2 }];
  const { a, ...r } = arr[arr.length - 1];
  eq(a, 1);
  deepEqual(r, { b: 2 });
  const [b, { ...q }] = arr;
  eq(b, 1);
  deepEqual(q, arr[1]);
  eq(q.b, r.b);
  return eq(q.a, a);
});

test('destructuring assignment with splats', () => {
  let adjustedLength1; let
    array1;
  const a = {}; const b = {}; const c = {}; const d = {}; const e = {};
  const array = [a, b, c, d, e]; let x = array[0]; const adjustedLength = Math.max(array.length, 2); let y = array.slice(1, adjustedLength - 1); let
    z = array[adjustedLength - 1];
  eq(a, x);
  arrayEq([b, c, d], y);
  eq(e, z);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  array1 = [a, b, c, d, e],
  x = array1[0],
  adjustedLength1 = Math.max(array1.length, 2),
  y = array1.slice(1, adjustedLength1 - 1),
  z = array1[adjustedLength1 - 1];
  eq(a, x);
  arrayEq([b, c, d], y);
  return eq(e, z);
});

test('deep destructuring assignment with splats', () => {
  const a = {}; const b = {}; const c = {}; const d = {}; const e = {}; const f = {}; const g = {}; const h = {}; const i = {};
  const array = [a, [b, c, d, e], f, g, h, i]; const u = array[0]; const array1 = array[1]; const v = array1[0]; const adjustedLength = Math.max(array1.length, 2); const w = array1.slice(1, adjustedLength - 1); const x = array1[adjustedLength - 1]; const adjustedLength1 = Math.max(array.length, 3); const y = array.slice(2, adjustedLength1 - 1); const
    z = array[adjustedLength1 - 1];
  eq(a, u);
  eq(b, v);
  arrayEq([c, d], w);
  eq(e, x);
  arrayEq([f, g, h], y);
  return eq(i, z);
});

test('destructuring assignment with objects', () => {
  const a = {}; const b = {}; const c = {};
  const obj = { a, b, c };
  const { a: x, b: y, c: z } = obj;
  eq(a, x);
  eq(b, y);
  return eq(c, z);
});

test('deep destructuring assignment with objects', () => {
  const a = {}; const b = {}; const c = {}; const d = {};
  const obj = {
    a,
    b: {
      c: {
        d: [
          b,
          { e: c, f: d },
        ],
      },
    },
  };
  const { a: w, b: { c: { d: [x, { f: z, e: y }] } } } = obj;
  eq(a, w);
  eq(b, x);
  eq(c, y);
  return eq(d, z);
});

test('destructuring assignment with objects and splats', () => {
  const a = {}; const b = {}; const c = {}; const d = {};
  const obj = { a: { b: [a, b, c, d] } };
  let { a: { b: [y, ...z] } } = obj;
  eq(a, y);
  arrayEq([b, c, d], z);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  ({ a: { b: [y, ...z] } } = obj);
  eq(a, y);
  return arrayEq([b, c, d], z);
});

test('destructuring assignment against an expression', () => {
  const a = {}; const b = {};
  const [y, z] = true ? [a, b] : [b, a];
  eq(a, y);
  return eq(b, z);
});

test('destructuring assignment with objects and splats: ES2015', () => {
  let d; let g; let x; let
    z;
  const obj = {
    a: 1, b: 2, c: 3, d: 4, e: 5,
  };
  throws((() => CoffeeScript.compile('{a, r..., s...} = x')), null, 'multiple rest elements are disallowed');
  throws((() => CoffeeScript.compile('{a, r..., s..., b} = x')), null, 'multiple rest elements are disallowed');
  const prop = 'b';
  let { a, b, ...r } = obj;
  eq(a, 1);
  eq(b, 2);
  eq(r.e, obj.e);
  eq(r.a, undefined);
  ({ d, c: x, ...r } = obj);
  eq(x, 3);
  eq(d, 4);
  eq(r.c, undefined);
  eq(r.b, 2);
  ({
    a, b: z, g = 9, ...r
  } = obj);
  eq(g, 9);
  eq(z, 2);
  return eq(r.b, undefined);
});

test('destructuring assignment with splats and default values', () => {
  const obj = {};
  const c = { b: 1 };
  let { a: { b } = c, ...d } = obj;

  eq(b, 1);
  deepEqual(d, {});

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  ({
    a: { b } = c,
    ...d
  } = obj);

  eq(b, 1);
  return deepEqual(d, {});
});

test('destructuring assignment with splat with default value', () => {
  const obj = {};
  const c = { val: 1 };
  const { a: { ...b } = c } = obj;

  return deepEqual(b, { val: 1 });
});

test('destructuring assignment with multiple splats in different objects', function () {
  const obj = { a: { val: 1 }, b: { val: 2 } };
  let { a: { ...a }, b: { ...b } } = obj;
  deepEqual(a, { val: 1 });
  deepEqual(b, { val: 2 });

  const o = {
    props: {
      p: {
        n: 1,
        m: 5,
      },
      s: 6,
    },
  };
  const obj1 = o.props.p;
  let {
    m,
  } = obj1;
  const q = __objectWithoutKeys__(obj1, ['m', 't']);
  const val = obj1.t;
  const t = val !== undefined ? val : { ...obj };
  let r = __objectWithoutKeys__(o.props, ['p']);
  eq(m, o.props.p.m);
  deepEqual(r, { s: 6 });
  deepEqual(q, { n: 1 });
  deepEqual(t, obj);

  this.props = o.props;
  ({ p: { m }, ...r } = this.props);
  eq(m, this.props.p.m);
  deepEqual(r, { s: 6 });

  ({ p: { m }, ...r } = { ...o.props, p: { m: 9 } });
  eq(m, 9);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  ({
    a: {
      ...a
    },
    b: {
      ...b
    },
  } = obj);
  deepEqual(a, { val: 1 });
  return deepEqual(b, { val: 2 });
});

test('destructuring assignment with dynamic keys and splats', () => {
  let i = 0;
  const foo = () => ++i;

  const obj = { 1: 'a', 2: 'b' };
  const { [foo()]: a, ...b } = obj;

  eq(a, 'a');
  eq(i, 1);
  return deepEqual(b, { 2: 'b' });
});

// Tests from https://babeljs.io/docs/plugins/transform-object-rest-spread/.
test('destructuring assignment with objects and splats: Babel tests', () => {
  // What Babel calls “rest properties:”
  let { x, y, ...z } = {
    x: 1, y: 2, a: 3, b: 4,
  };
  eq(x, 1);
  eq(y, 2);
  deepEqual(z, { a: 3, b: 4 });

  // What Babel calls “spread properties:”
  let n = { x, y, ...z };
  deepEqual(n, {
    x: 1, y: 2, a: 3, b: 4,
  });

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  ({ x, y, ...z } = {
    x: 1, y: 2, a: 3, b: 4,
  });
  eq(x, 1);
  eq(y, 2);
  deepEqual(z, { a: 3, b: 4 });

  n = { x, y, ...z };
  return deepEqual(n, {
    x: 1, y: 2, a: 3, b: 4,
  });
});

test('deep destructuring assignment with objects: ES2015', () => {
  const a1 = {}; const b1 = {}; const c1 = {}; const d1 = {};
  const obj = {
    a: a1,
    b: {
      c: {
        d: {
          b1,
          e: c1,
          f: d1,
        },
      },
    },
    b2: { b1, c1 },
  };
  let { a: w, b: { c: { d: { b1: bb, ...r1 } } }, ...r2 } = obj;
  eq(r1.e, c1);
  eq(r2.b, undefined);
  eq(bb, b1);
  eq(r2.b2, obj.b2);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  ({ a: w, b: { c: { d: { b1: bb, ...r1 } } }, ...r2 } = obj);
  eq(r1.e, c1);
  eq(r2.b, undefined);
  eq(bb, b1);
  return eq(r2.b2, obj.b2);
});

test('deep destructuring assignment with defaults: ES2015', () => {
  let val1;
  const obj = {
    b: { c: 1, baz: 'qux' },
    foo: 'bar',
  };
  const j = { f: 'world' };
  const i = { some: 'prop' };
  let a = __objectWithoutKeys__(obj, ['b', 'e']);
  let { c, ...d } = obj.b;
  const val = obj.e;
  let {
    f: hello,
    g: { ...h } = i,
  } = val !== undefined ? val : j;

  deepEqual(a, { foo: 'bar' });
  eq(c, 1);
  deepEqual(d, { baz: 'qux' });
  eq(hello, 'world');
  deepEqual(h, { some: 'prop' });

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  a = __objectWithoutKeys__(obj, ['b', 'e']),
  ({
    c,
    ...d
  } = obj.b),
  val1 = obj.e,
  ({
    f: hello,
    g: {
      ...h
    } = i,
  } = val1 !== undefined ? val1 : j);

  deepEqual(a, { foo: 'bar' });
  eq(c, 1);
  deepEqual(d, { baz: 'qux' });
  eq(hello, 'world');
  return deepEqual(h, { some: 'prop' });
});

test('object spread properties: ES2015', () => {
  let obj = {
    a: 1, b: 2, c: 3, d: 4, e: 5,
  };
  let obj2 = { ...obj, c: 9 };
  eq(obj2.c, 9);
  eq(obj.a, obj2.a);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  obj2 = {
    ...obj,
    c: 9,
  };
  eq(obj2.c, 9);
  eq(obj.a, obj2.a);

  obj2 = {
    ...obj, a: 8, c: 9, ...obj,
  };
  eq(obj2.c, 3);
  eq(obj.a, obj2.a);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  obj2 = {
    ...obj,
    a: 8,
    c: 9,
    ...obj,
  };
  eq(obj2.c, 3);
  eq(obj.a, obj2.a);

  const obj3 = { ...obj, b: 7, g: { ...obj2, c: 1 } };
  eq(obj3.g.c, 1);
  eq(obj3.b, 7);
  deepEqual(obj3.g, { ...obj, c: 1 });

  (function ({ a, b, ...r }) {
    eq(1, a);
    return deepEqual(r, { c: 3, d: 44, e: 55 });
  }({ ...obj2, d: 44, e: 55 }));

  obj = { a: 1, b: 2, c: { d: 3, e: 4, f: { g: 5 } } };
  let obj4 = { a: 10, ...obj.c };
  eq(obj4.a, 10);
  eq(obj4.d, 3);
  eq(obj4.f.g, 5);
  deepEqual(obj4.f, obj.c.f);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  (function ({
    a,
    b,
    ...r
  }) {
    eq(1, a);
    return deepEqual(r, { c: 3, d: 44, e: 55 });
  }({
    ...obj2,
    d: 44,
    e: 55,
  }));

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  obj4 = {
    a: 10,
    ...obj.c,
  };
  eq(obj4.a, 10);
  eq(obj4.d, 3);
  eq(obj4.f.g, 5);
  deepEqual(obj4.f, obj.c.f);

  let obj5 = {
    ...obj,
    ...(((k) => ({
      b: k,
    })))(99),
  };
  eq(obj5.b, 99);
  deepEqual(obj5.c, obj.c);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  obj5 = {
    ...obj,
    ...(((k) => ({
      b: k,
    })))(99),
  };
  eq(obj5.b, 99);
  deepEqual(obj5.c, obj.c);

  const fn = () => ({
    c: { d: 33, e: 44, f: { g: 55 } },
  });
  const obj6 = { ...obj, ...fn() };
  eq(obj6.c.d, 33);
  deepEqual(obj6.c, { d: 33, e: 44, f: { g: 55 } });

  let obj7 = { ...obj, ...fn(), ...{ c: { d: 55, e: 66, f: { 77: 77 } } } };
  eq(obj7.c.d, 55);
  deepEqual(obj6.c, { d: 33, e: 44, f: { g: 55 } });

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  obj7 = {
    ...obj,
    ...fn(),
    ...{ c: { d: 55, e: 66, f: { 77: 77 } } },
  };
  eq(obj7.c.d, 55);
  deepEqual(obj6.c, { d: 33, e: 44, f: { g: 55 } });

  obj = {
    a: {
      b: {
        c: {
          d: {
            e: {},
          },
        },
      },
    },
  };
  let obj9 = { a: 1, ...obj.a.b.c, g: 3 };
  deepEqual(obj9.d, { e: {} });

  const a = 'a';
  const c = 'c';
  obj9 = { a: 1, ...obj[a].b[c], g: 3 };
  deepEqual(obj9.d, { e: {} });

  obj9 = { a: 1, ...obj.a.b.c.d, g: 3 };
  return deepEqual(obj9.e, {});
});

test('bracket insertion when necessary', () => {
  let left;
  const [a] = (left = [0]) != null ? left : [1];
  return eq(a, 0);
});

// for implicit destructuring assignment in comprehensions, see the comprehension tests

test('destructuring assignment with context (@) properties', () => {
  const a = {}; const b = {}; const c = {}; const d = {}; const e = {};
  const obj = {
    fn() {
      const local = [a, { b, c }, d, e];
      return [this.a, { b: this.b, c: this.c }, this.d, this.e] = local;
    },
  };
  for (const key of ['a', 'b', 'c', 'd', 'e']) { eq(undefined, obj[key]); }
  obj.fn();
  eq(a, obj.a);
  eq(b, obj.b);
  eq(c, obj.c);
  eq(d, obj.d);
  return eq(e, obj.e);
});

test('#1024: destructure empty assignments to produce javascript-like results', () => {
  let ref;
  return eq(2 * (ref = 3 + 5, ref), 16);
});

test('#1005: invalid identifiers allowed on LHS of destructuring assignment', () => {
  let tSplat; let
    v;
  const disallowed = ['eval', 'arguments'].concat(CoffeeScript.RESERVED);
  throws((() => CoffeeScript.compile(`[${disallowed.join(', ')}] = x`)), null, 'all disallowed');
  throws((() => CoffeeScript.compile(`[${disallowed.join('..., ')}...] = x`)), null, 'all disallowed as splats');
  let t = (tSplat = null);
  for (v of Array.from(disallowed)) { // `class` by itself is an expression
    if (v !== 'class') {
      throws((() => CoffeeScript.compile(t)), null, (t = `[${v}] = x`));
      throws((() => CoffeeScript.compile(tSplat)), null, (tSplat = `[${v}...] = x`));
    }
  }
  return doesNotThrow(() => (() => {
    const result = [];
    for (v of Array.from(disallowed)) {
      CoffeeScript.compile(`[a.${v}] = x`);
      CoffeeScript.compile(`[a.${v}...] = x`);
      CoffeeScript.compile(`[@${v}] = x`);
      result.push(CoffeeScript.compile(`[@${v}...] = x`));
    }
    return result;
  })());
});

test('#2055: destructuring assignment with `new`', () => {
  const { length } = new Array();
  return eq(0, length);
});

test('#156: destructuring with expansion', () => {
  let lastButOne; let
    second;
  const array = [1, 2, 3, 4, 5];
  let first = array[0]; let
    last = array[array.length - 1];
  eq(1, first);
  eq(5, last);
  lastButOne = array[array.length - 2], last = array[array.length - 1];
  eq(4, lastButOne);
  eq(5, last);
  first = array[0], second = array[1], last = array[array.length - 1];
  eq(2, second);
  last = 'strings as well -> x'['strings as well -> x'.length - 1];
  eq('x', last);
  throws((() => CoffeeScript.compile('[1, ..., 3]')), null, 'prohibit expansion outside of assignment');
  throws((() => CoffeeScript.compile('[..., a, b...] = c')), null, 'prohibit expansion and a splat');
  return throws((() => CoffeeScript.compile('[...] = c')), null, 'prohibit lone expansion');
});

test('destructuring with dynamic keys', () => {
  const { a, b, c } = { a: 1, b: 2, c: 3 };
  eq(1, a);
  eq(2, b);
  eq(3, c);
  return throws(() => CoffeeScript.compile('{"#{a}"} = b'));
});

test('simple array destructuring defaults', () => {
  let [a = 1] = [];
  eq(1, a);
  [a = 2] = [undefined];
  eq(2, a);
  [a = 3] = [null];
  eq(null, a); // Breaking change in CS2: per ES2015, default values are applied for `undefined` but not for `null`.
  [a = 4] = [0];
  eq(0, a);
  const arr = [(a = 5)];
  eq(5, a);
  return arrayEq([5], arr);
});

test('simple object destructuring defaults', () => {
  let { b = 1 } = {};
  eq(b, 1);
  ({ b = 2 } = { b: undefined });
  eq(b, 2);
  ({ b = 3 } = { b: null });
  eq(b, null); // Breaking change in CS2: per ES2015, default values are applied for `undefined` but not for `null`.
  ({ b = 4 } = { b: 0 });
  eq(b, 0);

  let { b: c = 1 } = {};
  eq(c, 1);
  ({ b: c = 2 } = { b: undefined });
  eq(c, 2);
  ({ b: c = 3 } = { b: null });
  eq(c, null); // Breaking change in CS2: per ES2015, default values are applied for `undefined` but not for `null`.
  ({ b: c = 4 } = { b: 0 });
  return eq(c, 0);
});

test('multiple array destructuring defaults', () => {
  let [a = 1, b = 2, c] = [undefined, 12, 13];
  eq(a, 1);
  eq(b, 12);
  eq(c, 13);
  [a, b = 2, c = 3] = [undefined, 12, 13];
  eq(a, undefined);
  eq(b, 12);
  eq(c, 13);
  [a = 1, b, c = 3] = [11, 12];
  eq(a, 11);
  eq(b, 12);
  return eq(c, 3);
});

test('multiple object destructuring defaults', () => {
  const {
    a = 1, b: bb = 2, c = 3, 0: d = 4,
  } = { b: 12 };
  eq(a, 1);
  eq(bb, 12);
  eq(c, 3);
  return eq(d, 4);
});

test('array destructuring defaults with splats', () => {
  const array = []; const val = array[array.length - 1]; const
    a = val !== undefined ? val : 9;
  eq(a, 9);
  const array1 = [19]; const val1 = array1[array1.length - 1]; const
    b = val1 !== undefined ? val1 : 9;
  return eq(b, 19);
});

test('deep destructuring assignment with defaults', () => {
  const [a, [{ b = 1, c = 3 }] = [{ c: 2 }]] = [0];
  eq(a, 0);
  eq(b, 1);
  return eq(c, 2);
});

test('destructuring assignment with context (@) properties and defaults', () => {
  const a = {}; const b = {}; const c = {}; const d = {}; const e = {};
  const obj = {
    fn() {
      const local = [a, { b, c: undefined }, d];
      return [this.a, { b: this.b = b, c: this.c = c }, this.d, this.e = e] = local;
    },
  };
  for (const key of ['a', 'b', 'c', 'd', 'e']) { eq(undefined, obj[key]); }
  obj.fn();
  eq(a, obj.a);
  eq(b, obj.b);
  eq(c, obj.c);
  eq(d, obj.d);
  return eq(e, obj.e);
});

test('destructuring assignment with defaults single evaluation', () => {
  let c;
  let callCount = 0;
  const fn = () => callCount++;
  let [a = fn()] = [];
  eq(0, a);
  eq(1, callCount);
  [a = fn()] = [10];
  eq(10, a);
  eq(1, callCount);
  ({ a = fn(), b: c = fn() } = { a: 20, b: undefined });
  eq(20, a);
  eq(c, 1);
  return eq(callCount, 2);
});


// Existential Assignment

test('existential assignment', () => {
  const nonce = {};
  let a = false;
  if (a == null) { a = nonce; }
  eq(false, a);
  let b;
  if (b == null) { b = nonce; }
  eq(nonce, b);
  let c = null;
  if (c == null) { c = nonce; }
  return eq(nonce, c);
});

test('#1627: prohibit conditional assignment of undefined variables', () => {
  throws((() => CoffeeScript.compile('x ?= 10')), null, 'prohibit (x ?= 10)');
  throws((() => CoffeeScript.compile('x ||= 10')), null, 'prohibit (x ||= 10)');
  throws((() => CoffeeScript.compile('x or= 10')), null, 'prohibit (x or= 10)');
  throws((() => CoffeeScript.compile('do -> x ?= 10')), null, 'prohibit (do -> x ?= 10)');
  throws((() => CoffeeScript.compile('do -> x ||= 10')), null, 'prohibit (do -> x ||= 10)');
  throws((() => CoffeeScript.compile('do -> x or= 10')), null, 'prohibit (do -> x or= 10)');
  doesNotThrow((() => CoffeeScript.compile('x = null; x ?= 10')), 'allow (x = null; x ?= 10)');
  doesNotThrow((() => CoffeeScript.compile('x = null; x ||= 10')), 'allow (x = null; x ||= 10)');
  doesNotThrow((() => CoffeeScript.compile('x = null; x or= 10')), 'allow (x = null; x or= 10)');
  doesNotThrow((() => CoffeeScript.compile('x = null; do -> x ?= 10')), 'allow (x = null; do -> x ?= 10)');
  doesNotThrow((() => CoffeeScript.compile('x = null; do -> x ||= 10')), 'allow (x = null; do -> x ||= 10)');
  doesNotThrow((() => CoffeeScript.compile('x = null; do -> x or= 10')), 'allow (x = null; do -> x or= 10)');

  throws((() => CoffeeScript.compile('-> -> -> x ?= 10')), null, 'prohibit (-> -> -> x ?= 10)');
  return doesNotThrow((() => CoffeeScript.compile('x = null; -> -> -> x ?= 10')), 'allow (x = null; -> -> -> x ?= 10)');
});

test('more existential assignment', () => {
  if (global.temp == null) { global.temp = 0; }
  eq(global.temp, 0);
  if (!global.temp) { global.temp = 100; }
  eq(global.temp, 100);
  return delete global.temp;
});

test('#1348, #1216: existential assignment compilation', () => {
  const nonce = {};
  let a = nonce;
  let b = (a != null ? a : (a = 0));
  eq(nonce, b);
  // the first ?= compiles into a statement; the second ?= compiles to a ternary expression
  eq(a != null ? a : (a = b != null ? b : (b = 1)), nonce);

  if (a) { if (a == null) { a = 2; } } else { a = 3; }
  return eq(a, nonce);
});

test('#1591, #1101: splatted expressions in destructuring assignment must be assignable', () => {
  const nonce = {};
  return Array.from(['', '""', '0', 'f()', '(->)'].concat(CoffeeScript.RESERVED)).map((nonref) => eq(nonce, ((() => { try { return CoffeeScript.compile(`[${nonref}...] = v`); } catch (e) { return nonce; } })())));
});

test('#1643: splatted accesses in destructuring assignments should not be declared as variables', () => {
  let code; let i; let
    j;
  let e;
  const nonce = {};
  const accesses = ['o.a', 'o["a"]', '(o.a)', '(o.a).a', '@o.a', 'C::a', 'f().a', 'o?.a', 'o?.a.b', 'f?().a'];
  for (const access of Array.from(accesses)) {
    const iterable = [1, 2, 3];
    for (j = 0; j < iterable.length; j++) { // position can matter
      i = iterable[j];
      code = `\
nonce = {}; nonce2 = {}; nonce3 = {};
@o = o = new (class C then a:{}); f = -> o
[${new Array(i).join('x,')}${access}...] = [${new Array(i).join('0,')}nonce, nonce2, nonce3]
unless ${access}[0] is nonce and ${access}[1] is nonce2 and ${access}[2] is nonce3 then throw new Error('[...]')\
`;
      eq(nonce, (!(() => { try { return CoffeeScript.run(code, { bare: true }); } catch (error) { e = error; return true; } })()) ? nonce : undefined);
    }
  }
  // subpatterns like `[[a]...]` and `[{a}...]`
  const subpatterns = ['[sub, sub2, sub3]', '{0: sub, 1: sub2, 2: sub3}'];
  return Array.from(subpatterns).map((subpattern) => (() => {
    const result = [];
    const iterable1 = [1, 2, 3];
    for (j = 0; j < iterable1.length; j++) {
      i = iterable1[j];
      code = `\
nonce = {}; nonce2 = {}; nonce3 = {};
[${new Array(i).join('x,')}${subpattern}...] = [${new Array(i).join('0,')}nonce, nonce2, nonce3]
unless sub is nonce and sub2 is nonce2 and sub3 is nonce3 then throw new Error('[sub...]')\
`;
      result.push(eq(nonce, (!(() => { try { return CoffeeScript.run(code, { bare: true }); } catch (error1) { e = error1; return true; } })()) ? nonce : undefined));
    }
    return result;
  })());
});

test('#1838: Regression with variable assignment', () => {
  const name = 'dave';

  return eq(name, 'dave');
});

test('#2211: splats in destructured parameters', () => {
  doesNotThrow(() => CoffeeScript.compile('([a...]) ->'));
  doesNotThrow(() => CoffeeScript.compile('([a...],b) ->'));
  doesNotThrow(() => CoffeeScript.compile('([a...],[b...]) ->'));
  throws(() => CoffeeScript.compile('([a...,[a...]]) ->'));
  return doesNotThrow(() => CoffeeScript.compile('([a...,[b...]]) ->'));
});

test('#2213: invocations within destructured parameters', () => {
  throws(() => CoffeeScript.compile('([a()])->'));
  throws(() => CoffeeScript.compile('([a:b()])->'));
  throws(() => CoffeeScript.compile('([a:b.c()])->'));
  throws(() => CoffeeScript.compile('({a()})->'));
  throws(() => CoffeeScript.compile('({a:b()})->'));
  return throws(() => CoffeeScript.compile('({a:b.c()})->'));
});

test('#2532: compound assignment with terminator', () => doesNotThrow(() => CoffeeScript.compile(`\
a = "hello"
a +=
"
world
!
"\
`)));

test('#2613: parens on LHS of destructuring', () => {
  const a = {};
  [(a).b] = [1, 2, 3];
  return eq(a.b, 1);
});

test('#2181: conditional assignment as a subexpression', () => {
  let a = false;
  false && (a || (a = true));
  eq(false, a);
  return eq(false, !(a || (a = true)));
});

test('#1500: Assignment to variables similar to generated variables', () => {
  let results;
  let base1; let error; let f; let left; let
    scope;
  const len = 0;
  let x = ([1, 2, 3].map((n) => ((results = null), n)));
  arrayEq([1, 2, 3], x);
  eq(0, len);

  for (x of [1, 2, 3]) {
    f = function () {
      let i;
      return i = 0;
    };
    f();
    eq('undefined', typeof i);
  }

  const ref = 2;
  x = (left = ref * 2) != null ? left : 1;
  eq(x, 4);
  eq('undefined', typeof ref1);

  x = {};
  const base = () => x;
  const name = -1;
  if ((base1 = base())[-name] == null) { base1[-name] = 2; }
  eq(x[1], 2);
  eq(base(), x);
  eq(name, -1);

  f = function (a1, a) { this.a = a1; return [this.a, a]; };
  arrayEq([1, 2], f.call((scope = {}), 1, 2));
  eq(1, scope.a);

  try { throw 'foo'; } catch (error1) {
    error = error1;
    eq(error, 'foo');
  }

  eq(error, 'foo');

  return doesNotThrow(() => CoffeeScript.compile('(@slice...) ->'));
});

test('Assignment to variables similar to helper functions', () => {
  const f = (...slice) => slice;
  arrayEq([1, 2, 3], f(1, 2, 3));
  eq('undefined', typeof slice1);

  class A {}
  var B = (function () {
    let extend;
    let hasProp;
    B = class B extends A {
      constructor(...args) {
        {
          // Hack: trick Babel/TypeScript into allowing this before super.
          if (false) { super(); }
          const thisFn = (() => this).toString();
          const thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
          eval(`${thisName} = this;`);
        }
        this.method = this.method.bind(this);
        super(...args);
      }

      static initClass() {
        extend = 3;
        hasProp = 4;
        this.prototype.value = 5;
      }

      method(bind, bind1) { return [bind, bind1, extend, hasProp, this.value]; }
    };
    B.initClass();
    return B;
  }());
  const { method } = new B();
  arrayEq([1, 2, 3, 4, 5], method(1, 2));

  const modulo = __mod__(-1, 3);
  eq(2, modulo);

  const indexOf = [1, 2, 3];
  return ok(Array.from(indexOf).includes(2));
});

test('#4566: destructuring with nested default values', () => {
  const { a: { b = 1 } } = { a: {} };
  eq(1, b);

  const { c: { d } = {} } = { c: { d: 3 } };
  eq(3, d);

  const { e: { f = 5 } = {} } = {};
  return eq(5, f);
});

test('#4674: _extends utility for object spreads 1', () => eqJS(
  '{a, b..., c..., d}',
  `\
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

_extends({a}, b, c, {d});\
`,
));

test('#4674: _extends utility for object spreads 2', () => {
  const _extends = () => 3;
  const a = { b: 1 };
  const c = { d: 2 };
  const e = { ...a, ...c };
  eq(e.b, 1);
  return eq(e.d, 2);
});

test('#4673: complex destructured object spread variables', () => {
  let obj;
  const b = { c: 1 };
  const { ...a } = __objectWithoutKeys__(b, []);
  eq(a.c, 1);

  const d = {};
  obj = { f: 1 }, d.e = __objectWithoutKeys__(obj, []);
  eq(d.e.f, 1);

  const obj1 = { g: 1 }; const
    { g } = __objectWithoutKeys__(obj1, []);
  return eq(g, 1);
});

test('#4878: Compile error when using destructuring with a splat or expansion in an array', () => {
  const arr = ['a', 'b', 'c', 'd'];

  const f1 = function (list) {
    let first; let
      last;
    return first = list[0], last = list[list.length - 1], list;
  };

  const f2 = function (list) {
    let adjustedLength; let first; let
      last;
    return adjustedLength = Math.max(list.length, 1), first = list.slice(0, adjustedLength - 1), last = list[adjustedLength - 1], list;
  };

  const f3 = function (list) {
    const [first] = list; return first;
  };

  const f4 = function (list) {
    const [first, ...rest] = list; return rest;
  };

  arrayEq(f1(arr), arr);
  arrayEq(f2(arr), arr);
  arrayEq(f3(arr), 'a');
  arrayEq(f4(arr), ['b', 'c', 'd']);

  const foo = function (list) {
    let ret;
    return ret = (() => {
      if ((list != null ? list.length : undefined) > 0) {
        const first = list[0]; const
          last = list[list.length - 1];
        return [first, last];
      }
      return [];
    })();
  };

  arrayEq(foo(arr), ['a', 'd']);

  const bar = function (list) {
    let ret;
    return ret = (() => {
      if ((list != null ? list.length : undefined) > 0) {
        const [first, ...rest] = list;
        return [first, rest];
      }
      return [];
    })();
  };

  return arrayEq(bar(arr), ['a', ['b', 'c', 'd']]);
});

function __objectWithoutKeys__(object, keys) {
  const result = { ...object };
  for (const k of keys) {
    delete result[keys];
  }
  return result;
}
function __mod__(a, b) {
  a = +a;
  b = +b;
  return (a % b + b) % b;
}
