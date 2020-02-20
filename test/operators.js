/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS202: Simplify dynamic range loops
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Operators
// ---------

// * Operators
// * Existential Operator (Binary)
// * Existential Operator (Unary)
// * Aliased Operators
// * [not] in/of
// * Chained Comparison

test("binary (2-ary) math operators do not require spaces", function() {
  const a = 1;
  const b = -1;
  eq(+1, a*-b);
  eq(-1, a*+b);
  eq(+1, a/-b);
  return eq(-1, a/+b);
});

test("operators should respect new lines as spaced", function() {
  const a = 123 +
  456;
  eq(579, a);

  const b = `1${2}3` +
  "456";
  return eq('123456', b);
});

test("multiple operators should space themselves", () => eq((+ +1), (- -1)));

test("compound operators on successive lines", function() {
  let a = 1;
  a +=
  1;
  return eq(a, 2);
});

test("bitwise operators", function() {
  eq(2, (10 &   3));
  eq(11, (10 |   3));
  eq(9, (10 ^   3));
  eq(80, (10 <<  3));
  eq(1, (10 >>  3));
  eq(1, (10 >>> 3));
  let num = 10; eq(2, (num &=   3));
  num = 10; eq(11, (num |=   3));
  num = 10; eq(9, (num ^=   3));
  num = 10; eq(80, (num <<=  3));
  num = 10; eq(1, (num >>=  3));
  num = 10; return eq(1, (num >>>= 3));
});

test("`instanceof`", function() {
  ok(new String instanceof String);
  ok(new Boolean instanceof Boolean);
  // `instanceof` supports negation by prefixing the operator with `not`
  ok(!(new Number instanceof String));
  return ok(!(new Array instanceof Boolean));
});

test("use `::` operator on keywords `this` and `@`", function() {
  const nonce = {};
  const obj = {
    withAt() { return this.prototype.prop; },
    withThis() { return this.prototype.prop; }
  };
  obj.prototype = {prop: nonce};
  eq(nonce, obj.withAt());
  return eq(nonce, obj.withThis());
});


// Existential Operator (Binary)

test("binary existential operator", function() {
  const nonce = {};

  let b = a != null ? a : nonce;
  eq(nonce, b);

  var a = null;
  b = undefined;
  b = a != null ? a : nonce;
  eq(nonce, b);

  a = false;
  b = a != null ? a : nonce;
  eq(false, b);

  a = 0;
  b = a != null ? a : nonce;
  return eq(0, b);
});

test("binary existential operator conditionally evaluates second operand", function() {
  let left;
  let i = 1;
  const func = () => i -= 1;
  const result = (left = func()) != null ? left : func();
  return eq(result, 0);
});

test("binary existential operator with negative number", function() {
  const a = null != null ? null : - 1;
  return eq(-1, a);
});


// Existential Operator (Unary)

test("postfix existential operator", function() {
  ok(((typeof nonexistent !== 'undefined' && nonexistent !== null) ? false : true));
  let defined = true;
  ok(defined != null);
  defined = false;
  return ok(defined != null);
});

test("postfix existential operator only evaluates its operand once", function() {
  let semaphore = 0;
  const fn = function() {
    if (semaphore) { ok(false); }
    return ++semaphore;
  };
  return ok((fn() != null) ? true : false);
});

test("negated postfix existential operator", () => ok(!(typeof nothing !== 'undefined' && nothing !== null ? nothing.value : undefined)));

test("postfix existential operator on expressions", () => eq(true, ((1 || 0) != null), true));


// `is`,`isnt`,`==`,`!=`

test("`==` and `is` should be interchangeable", function() {
  let b;
  const a = (b = 1);
  ok((a === 1) && (b === 1));
  ok(a === b);
  return ok(a === b);
});

test("`!=` and `isnt` should be interchangeable", function() {
  const a = 0;
  const b = 1;
  ok((a !== 1) && (b !== 0));
  ok(a !== b);
  return ok(a !== b);
});


// [not] in/of

// - `in` should check if an array contains a value using `indexOf`
// - `of` should check if a property is defined on an object using `in`
test("in, of", function() {
  const arr = [1];
  ok(0 in arr);
  ok(Array.from(arr).includes(1));
  // prefixing `not` to `in and `of` should negate them
  ok(!(1 in arr));
  return ok(!Array.from(arr).includes(0));
});

test("`in` should be able to operate on an array literal", function() {
  let needle, needle1;
  ok([0, 1, 2, 3].includes(2));
  ok(![0, 1, 2, 3].includes(4));
  let arr = [0, 1, 2, 3];
  ok(Array.from(arr).includes(2));
  ok(!Array.from(arr).includes(4));
  // should cache the value used to test the array
  arr = [0];
  let val = 0;
  ok((needle = val++, Array.from(arr).includes(needle)));
  ok((needle1 = val++, !Array.from(arr).includes(needle1)));
  val = 0;
  ok(val++ in arr);
  return ok(!(val++ in arr));
});

test("`of` and `in` should be able to operate on instance variables", function() {
  const obj = {
    list: [2,3],
    in_list(value) { return Array.from(this.list).includes(value); },
    not_in_list(value) { return !Array.from(this.list).includes(value); },
    of_list(value) { return value in this.list; },
    not_of_list(value) { return !(value in this.list); }
  };
  ok(obj.in_list(3));
  ok(obj.not_in_list(1));
  ok(obj.of_list(0));
  return ok(obj.not_of_list(2));
});

test("#???: `in` with cache and `__indexOf` should work in argument lists", function() {
  let needle;
  return eq(1, [(needle = Object(), Array.from(Array()).includes(needle))].length);
});

test("#737: `in` should have higher precedence than logical operators", () => eq(1, [1].includes(1) && 1));

test("#768: `in` should preserve evaluation order", function() {
  let needle;
  let share = 0;
  const a = function() { if (share === 0) { return share++; } };
  const b = function() { if (share === 1) { return share++; } };
  const c = function() { if (share === 2) { return share++; } };
  ok((needle = a(), ![b(),c()].includes(needle)));
  return eq(3, share);
});

test("#1099: empty array after `in` should compile to `false`", function() {
  eq(1, [[].includes(5)].length);
  return eq(false, ((() => [].includes(0)))());
});

test("#1354: optimized `in` checks should not happen when splats are present", function() {
  let needle;
  const a = [6, 9];
  return eq((needle = 9, [3, ...a].includes(needle)), true);
});

test("#1100: precedence in or-test compilation of `in`", function() {
  ok([1 && 0].includes(0));
  ok([1, 1 && 0].includes(0));
  return ok(!([1, 0 || 1].includes(0)));
});

test("#1630: `in` should check `hasOwnProperty`", function() {
  let needle;
  return ok((needle = undefined, !Array.from({length: 1}).includes(needle)));
});

test("#1714: lexer bug with raw range `for` followed by `in`", function() {
  for (let i = 1; i <= 2; i++) { 0; }
  ok(!(['b'].includes('a')));

  for (let j = 1; j <= 2; j++) { 0; } ok(!(['b'].includes('a')));

  for (let k = 1; k <= 10; k++) { 0; } // comment ending
  ok(!(['b'].includes('a')));

  // lexer state (specifically @seenFor) should be reset before each compilation
  CoffeeScript.compile("0 for [1..2]");
  return CoffeeScript.compile("'a' in ['b']");
});

test("#1099: statically determined `not in []` reporting incorrect result", () => ok(![].includes(0)));

test("#1099: make sure expression tested gets evaluted when array is empty", function() {
  let needle;
  let a = 0;
  ((needle = ((() => a = 1))()), [].includes(needle));
  return eq(a, 1);
});

// Chained Comparison

test("chainable operators", function() {
  ok(100 > 10 && 10 > 1 && 1 > 0 && 0 > -1);
  return ok(-1 < 0 && 0 < 1 && 1 < 10 && 10 < 100);
});

test("`is` and `isnt` may be chained", function() {
  ok(true === !false && !false === true && true === !false);
  return ok(0 === 0 && 0 !== 1 && 1 === 1);
});

test("different comparison operators (`>`,`<`,`is`,etc.) may be combined", function() {
  let middle;
  ok(1 < 2 && 2 > 1);
  return ok(10 < 20 && 20 > (middle = 2+3) && middle === 5);
});

test("some chainable operators can be negated by `unless`", () => ok((0!==10 || 10===100 ? true : undefined)));

test("operator precedence: `|` lower than `<`", () => eq(1, 1 | (2 < 3 && 3 < 4)));

test("preserve references", function() {
  let b, c;
  const a = (b = (c = 1));
  // `a == b <= c` should become `a === b && b <= c`
  // (this test does not seem to test for this)
  return ok(a === b && b <= c);
});

test("chained operations should evaluate each value only once", function() {
  let middle;
  let a = 0;
  return ok(1 > (middle = a++) && middle < 1);
});

test("#891: incorrect inversion of chained comparisons", function() {
  let middle;
  ok((!(0 > 1 && 1 > 2) ? true : undefined));
  return ok((!((this.NaN = 0/0) < (middle = 0/0) && middle < this.NaN) ? true : undefined));
});

test("#1234: Applying a splat to :: applies the splat to the wrong object", function() {
  const nonce = {};
  class C {
    static initClass() {
      this.prototype.nonce = nonce;
    }
    method() { return this.nonce; }
  }
  C.initClass();

  const arr = [];
  return eq(nonce, C.prototype.method(...arr));
}); // should be applied to `C::`

test("#1102: String literal prevents line continuation", () => eq("': '", '' +
   "': '"
));

test("#1703, ---x is invalid JS", function() {
  let x = 2;
  return eq((- --x), -1);
});

test("Regression with implicit calls against an indented assignment", function() {
  let a;
  eq(1, (a =
    1)
  );

  return eq(a, 1);
});

test("#2155 ... conditional assignment to a closure", function() {
  let x = null;
  const func = () => x != null ? x : (x = (function() { if (true) { return 'hi'; } }));
  func();
  return eq(x(), 'hi');
});

test("#2197: Existential existential double trouble", function() {
  let counter = 0;
  const func = () => counter++;
  if ((func() != null) == null) { 100; }
  return eq(counter, 1);
});

test("#2567: Optimization of negated existential produces correct result", function() {
  const a = 1;
  ok(!((a == null)));
  return ok((typeof b === 'undefined' || b === null));
});

test("#2508: Existential access of the prototype", function() {
  eq(typeof NonExistent !== 'undefined' && NonExistent !== null ? NonExistent.prototype.nothing : undefined, undefined);
  return ok(typeof Object !== 'undefined' && Object !== null ? Object.prototype.toString : undefined);
});

test("power operator", () => eq(27, Math.pow(3, 3)));

test("power operator has higher precedence than other maths operators", function() {
  eq(55, 1 + (Math.pow(3, 3) * 2));
  eq(-4, -Math.pow(2, 2));
  eq(false, !Math.pow(2, 2));
  eq(0, Math.pow((!2), 2));
  return eq(-2, ~Math.pow(1, 5));
});

test("power operator is right associative", () => eq(2, Math.pow(2, Math.pow(1, 3))));

test("power operator compound assignment", function() {
  let a = 2;
  a **= 3;
  return eq(8, a);
});

test("floor division operator", function() {
  eq(2, Math.floor(7 / 3));
  eq(-3, Math.floor(-7 / 3));
  return eq(NaN, Math.floor(0 / 0));
});

test("floor division operator compound assignment", function() {
  let a = 7;
  a = Math.floor(a / (1 + 1));
  return eq(3, a);
});

test("modulo operator", function() {
  const check = (a, b, expected) => eq(expected, __mod__(a, b), `expected ${a} %%%% ${b} to be ${expected}`);
  check(0, 1, 0);
  check(0, -1, -0);
  check(1, 0, NaN);
  check(1, 2, 1);
  check(1, -2, -1);
  check(1, 3, 1);
  check(2, 3, 2);
  check(3, 3, 0);
  check(4, 3, 1);
  check(-1, 3, 2);
  check(-2, 3, 1);
  check(-3, 3, 0);
  check(-4, 3, 2);
  check(5.5, 2.5, 0.5);
  return check(-5.5, 2.5, 2.0);
});

test("modulo operator compound assignment", function() {
  let a = -2;
  a = __mod__(a, 5);
  return eq(3, a);
});

test("modulo operator converts arguments to numbers", function() {
  eq(1, __mod__(1, '42'));
  eq(1, __mod__('1', 42));
  return eq(1, __mod__('1', '42'));
});

test("#3361: Modulo operator coerces right operand once", function() {
  let count = 0;
  const res = __mod__(42, {valueOf() { return count += 1; }});
  eq(1, count);
  return eq(0, res);
});

test("#3363: Modulo operator coercing order", function() {
  let count = 2;
  const a = {valueOf() { return count *= 2; }};
  const b = {valueOf() { return count += 1; }};
  eq(4, __mod__(a, b));
  return eq(5, count);
});

test("#3598: Unary + and - coerce the operand once when it is an identifier", function() {
  // Unary + and - do not generate `_ref`s when the operand is a number, for
  // readability. To make sure that they do when the operand is an identifier,
  // test that they are consistent with another unary operator as well as another
  // complex expression.
  // Tip: Making one of the tests temporarily fail lets you easily inspect the
  // compiled JavaScript.

  let n;
  const assertOneCoercion = function(fn) {
    let count = 0;
    const value = {valueOf() { count++; return 1; }};
    fn(value);
    return eq(1, count);
  };

  eq(1, 1 != null ? 1 : 0);
  eq(1, +1 != null ? +1 : 0);
  eq(-1, -1 != null ? -1 : 0);
  assertOneCoercion(a => eq(1, +a != null ? +a : 0));
  assertOneCoercion(a => eq(-1, -a != null ? -a : 0));
  assertOneCoercion(a => eq(-2, ~a != null ? ~a : 0));
  assertOneCoercion(function(a) {
    let left;
    return eq(0.5, (left = a / 2) != null ? left : 0);
  });

  ok(-2 <= 1 && 1 < 2);
  ok(-2 <= +1 && +1 < 2);
  ok(-2 <= -1 && -1 < 2);
  assertOneCoercion(a => ok(-2 <= +a && +a < 2));
  assertOneCoercion(a => ok(-2 <= -a && -a < 2));
  assertOneCoercion(a => ok(-2 <= ~a && ~a < 2));
  assertOneCoercion(function(a) {
    let middle;
    return ok(-2 <= (middle = a / 2) && middle < 2);
  });

  arrayEq([0], ((() => {
    const result = [];
    const iterable = [0];
    for (let i = 0; i < iterable.length; i++) {
      n = iterable[i];
      result.push(n);
    }
    return result;
  })()));
  arrayEq([0], ((() => {
    const result1 = [];
    const iterable1 = [0];
    for (let step = +1, asc = step > 0, j = asc ? 0 : iterable1.length - 1; asc ? j < iterable1.length : j >= 0; j += step) {
      n = iterable1[j];
      result1.push(n);
    }
    return result1;
  })()));
  arrayEq([0], ((() => {
    const result2 = [];
    const iterable2 = [0];
    for (let k = iterable2.length - 1; k >= 0; k--) {
      n = iterable2[k];
      result2.push(n);
    }
    return result2;
  })()));
  assertOneCoercion(a => arrayEq([0], ((() => {
    const result3 = [];
    const iterable3 = [0];
    for (let step1 = +a, asc1 = step1 > 0, i1 = asc1 ? 0 : iterable3.length - 1; asc1 ? i1 < iterable3.length : i1 >= 0; i1 += step1) {
      n = iterable3[i1];
      result3.push(n);
    }
    return result3;
  })())));
  assertOneCoercion(a => arrayEq([0], ((() => {
    const result3 = [];
    const iterable3 = [0];
    for (let step1 = -a, asc1 = step1 > 0, i1 = asc1 ? 0 : iterable3.length - 1; asc1 ? i1 < iterable3.length : i1 >= 0; i1 += step1) {
      n = iterable3[i1];
      result3.push(n);
    }
    return result3;
  })())));
  assertOneCoercion(a => arrayEq([0], ((() => {
    const result3 = [];
    const iterable3 = [0];
    for (let step1 = ~a, asc1 = step1 > 0, i1 = asc1 ? 0 : iterable3.length - 1; asc1 ? i1 < iterable3.length : i1 >= 0; i1 += step1) {
      n = iterable3[i1];
      result3.push(n);
    }
    return result3;
  })())));
  assertOneCoercion(a => arrayEq([0], ((() => {
    const result3 = [];
    const iterable3 = [0];
    for (let step1 = (a * 2) / 2, asc1 = step1 > 0, i1 = asc1 ? 0 : iterable3.length - 1; asc1 ? i1 < iterable3.length : i1 >= 0; i1 += step1) {
      n = iterable3[i1];
      result3.push(n);
    }
    return result3;
  })())));

  ok([0, 1].includes(1));
  ok([0, 1].includes(+1));
  ok([0, -1].includes(-1));
  assertOneCoercion(a => ok([0, 1].includes(+a)));
  assertOneCoercion(a => ok([0, -1].includes(-a)));
  assertOneCoercion(a => ok([0, -2].includes(~a)));
  return assertOneCoercion(a => ok([0, 0.5].includes(a / 2)));
});

test("'new' target", function() {
  const nonce = {};
  let ctor  = () => nonce;

  eq((new ctor), nonce);
  eq((new ctor()), nonce);

  ok(new (class {}),

  (ctor  = class {}),
  ok((new ctor) instanceof ctor),
  ok((new ctor()) instanceof ctor),

  // Force an executable class body
  (ctor  = (function() {
    let a = undefined;
    const Cls = class {
      static initClass() {
        a = 1;
      }
    };
    Cls.initClass();
    return Cls;
  })()));
  ok((new ctor) instanceof ctor);

  const get   = () => ctor;
  ok(!((new get()) instanceof ctor));
  ok((new (get())()) instanceof ctor);

  // classes must be called with `new`. In this case `new` applies to `get` only
  return throws(() => new get()());
});

function __mod__(a, b) {
  a = +a;
  b = +b;
  return (a % b + b) % b;
}