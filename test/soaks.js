/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Soaks
// -----

// * Soaked Property Access
// * Soaked Method Invocation
// * Soaked Function Invocation


// Soaked Property Access

test("soaked property access", function() {
  const nonce = {};
  const obj = {a: {b: nonce}};
  eq(nonce    , obj != null ? obj.a.b : undefined);
  eq(nonce    , obj != null ? obj['a'].b : undefined);
  eq(nonce    , obj.a != null ? obj.a.b : undefined);
  eq(nonce    , __guard__(obj != null ? obj.a : undefined, x => x['b']));
  return eq(undefined, __guard__(__guard__(__guard__(obj != null ? obj.a : undefined, x3 => x3.non), x2 => x2.existent), x1 => x1.property));
});

test("soaked property access caches method calls", function() {
  const nonce ={};
  const obj = {fn() { return {a: nonce}; }};
  eq(nonce    , __guard__(obj.fn(), x => x.a));
  return eq(undefined, __guard__(obj.fn(), x1 => x1.b));
});

test("soaked property access caching", function() {
  const nonce = {};
  let counter = 0;
  const fn = function() {
    counter++;
    return 'self';
  };
  const obj = {
    self() { return this; },
    prop: nonce
  };
  eq(nonce, __guard__(obj[fn()]()[fn()]()[fn()](), x => x.prop));
  return eq(3, counter);
});

test("method calls on soaked methods", function() {
  const nonce = {};
  let obj = null;
  eq(undefined, obj != null ? obj.a().b() : undefined);
  obj = {a() { return {b() { return nonce; }}; }};
  return eq(nonce    , obj != null ? obj.a().b() : undefined);
});

test("postfix existential operator mixes well with soaked property accesses", () => eq(false, ((typeof nonexistent !== 'undefined' && nonexistent !== null ? nonexistent.property : undefined) != null)));

test("function invocation with soaked property access", function() {
  const id = _ => _;
  return eq(undefined, id(typeof nonexistent !== 'undefined' && nonexistent !== null ? nonexistent.method() : undefined));
});

test("if-to-ternary should safely parenthesize soaked property accesses", () => ok(((typeof nonexistent !== 'undefined' && nonexistent !== null ? nonexistent.property : undefined) ? false : true)));

test("#726: don't check for a property on a conditionally-referenced nonexistent thing", () => eq(undefined, typeof nonexistent !== 'undefined' && nonexistent !== null ? nonexistent[Date()] : undefined));

test("#756: conditional assignment edge cases", function() {
  // TODO: improve this test
  const a = null;
  ok(isNaN((a != null ? a.b.c : undefined) +  1));
  eq(undefined, (a != null ? a.b.c += 1 : undefined));
  eq(undefined, a != null ? ++a.b.c : undefined);
  return eq(undefined, a != null ? delete a.b.c : undefined);
});

test("operations on soaked properties", function() {
  // TODO: improve this test
  const a = {b: {c: 0}};
  eq(1,   (a != null ? a.b.c : undefined) +  1);
  eq(1,   (a != null ? a.b.c += 1 : undefined));
  eq(2,   a != null ? ++a.b.c : undefined);
  return eq(true, a != null ? delete a.b.c : undefined);
});


// Soaked Method Invocation

test("soaked method invocation", function() {
  const nonce = {};
  let counter = 0;
  const obj = {
    self() { return this; },
    increment() { counter++; return this; }
  };
  eq(obj      , typeof obj.self === 'function' ? obj.self() : undefined);
  eq(undefined, typeof obj.method === 'function' ? obj.method() : undefined);
  eq(nonce    , (typeof obj.self === 'function' ? obj.self().property = nonce : undefined));
  eq(undefined, (typeof obj.method === 'function' ? obj.method().property = nonce : undefined));
  eq(obj      , __guardMethod__(obj.increment().increment(), 'self', o => o.self()));
  return eq(2        , counter);
});

test("#733: conditional assignments", function() {
  const a = {b: {c: null}};
  eq(__guardMethod__(a.b, 'c', o => o.c()), undefined);
  if (a.b != null) {
    a.b.c || (a.b.c = it => it);
  }
  eq(__guardMethod__(a.b, 'c', o1 => o1.c(1)), 1);
  return eq(__guardMethod__(a.b, 'c', o2 => o2.c(...[2, 3])), 2);
});


// Soaked Function Invocation

test("soaked function invocation", function() {
  const nonce = {};
  const id = _ => _;
  eq(nonce    , typeof id === 'function' ? id(nonce) : undefined);
  eq(nonce    , (typeof id === 'function' ? id(nonce) : undefined));
  eq(undefined, typeof nonexistent === 'function' ? nonexistent(nonce) : undefined);
  return eq(undefined, (typeof nonexistent === 'function' ? nonexistent(nonce) : undefined));
});

test("soaked function invocation with generated functions", function() {
  const nonce = {};
  const id = _ => _;
  const maybe = function(fn, arg) { if (typeof fn === 'function') { return () => fn(arg); } };
  eq(__guardFunc__(maybe(id, nonce), f => f()), nonce);
  eq(__guardFunc__((maybe(id, nonce)), f1 => f1()), nonce);
  return eq(__guardFunc__((maybe(false, nonce)), f2 => f2()), undefined);
});

test("soaked constructor invocation", function() {
  eq(42       , +(typeof Number === 'function' ? new Number(42) : undefined));
  return eq(undefined,  typeof Other === 'function' ? new Other(42) : undefined);
});

test("soaked constructor invocations with caching and property access", function() {
  let semaphore = 0;
  const nonce = {};
  class C {
    static initClass() {
      this.prototype.prop = nonce;
    }
    constructor() {
      if (semaphore) { ok(false); }
      semaphore++;
    }
  }
  C.initClass();
  eq(nonce, __guard__((new C()), x => x.prop));
  return eq(1, semaphore);
});

test("soaked function invocation safe on non-functions", function() {
  eq(undefined, typeof 0 === 'function' ? (0)(1) : undefined);
  return eq(undefined, typeof 0 === 'function' ? (0)(1, 2) : undefined);
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}
function __guardFunc__(func, transform) {
  return typeof func === 'function' ? transform(func) : undefined;
}