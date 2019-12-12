/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Function Invocation
// -------------------

// * Function Invocation
// * Splats in Function Invocations
// * Implicit Returns
// * Explicit Returns

// shared identity function
const id = function(_) { if (arguments.length === 1) { return _; } else { return [...arguments]; } };

// helper to assert that a string should fail compilation
const cantCompile = code => throws(() => CoffeeScript.compile(code));

test("basic argument passing", function() {

  const a = {};
  const b = {};
  const c = {};
  eq(1, (id(1)));
  eq(2, (id(1, 2))[1]);
  eq(a, (id(a)));
  return eq(c, (id(a, b, c))[2]);
});


test("passing arguments on separate lines", function() {

  const a = {};
  const b = {};
  const c = {};
  ok(id(
    a,
    b,
    c
  )[1] === b);
  eq(0, id(
    0,
    10
  )[0]);
  eq(a,id(
    a
  ));
  return eq(b,
  (id(b)));
});


test("optional parens can be used in a nested fashion", function() {

  const call = func => func();
  const add = (a, b) => a + b;
  const result = call(function() {
    let inner;
    return inner = call(() => add(5, 5));
  });
  return ok(result === 10);
});


test("hanging commas and semicolons in argument list", function() {

  const fn = function() { return arguments.length; };
  eq(2, fn(0,1));
  eq(3, fn(0, 1,
  2)
  );
  eq(2, fn(0, 1));
  // TODO: this test fails (the string compiles), but should it?
  //throws -> CoffeeScript.compile "fn(0,1,;)"
  throws(() => CoffeeScript.compile("fn(0,1,;;)"));
  throws(() => CoffeeScript.compile("fn(0, 1;,)"));
  throws(() => CoffeeScript.compile("fn(,0)"));
  return throws(() => CoffeeScript.compile("fn(;0)"));
});


test("function invocation", function() {

  const func = function() {
    if (true) { return; }
  };
  eq(undefined, func());

  const result = ("hello".slice)(3);
  return ok(result === 'lo');
});


test("And even with strange things like this:", function() {

  const funcs  = [(x => x), (x => x * x)];
  const result = funcs[1](5);
  return ok(result === 25);
});


test("More fun with optional parens.", function() {

  const fn = arg => arg;
  ok(fn(fn({prop: 101})).prop === 101);

  const okFunc = f => ok(f());
  return okFunc(() => true);
});


test("chained function calls", function() {
  const nonce = {};
  const identityWrap = x => () => x;
  eq(nonce, identityWrap(identityWrap(nonce))()());
  return eq(nonce, (identityWrap(identityWrap(nonce)))()());
});


test("Multi-blocks with optional parens.", function() {

  const fn = arg => arg;
  const result = fn( () => fn(() => "Wrapped"));
  return ok(result()() === 'Wrapped');
});


test("method calls", function() {

  const fnId = fn => (function() { return fn.apply(this, arguments); });
  const math = {
    add(a, b) { return a + b; },
    anonymousAdd(a, b) { return a + b; },
    fastAdd: fnId((a, b) => a + b)
  };
  ok(math.add(5, 5) === 10);
  ok(math.anonymousAdd(10, 10) === 20);
  return ok(math.fastAdd(20, 20) === 40);
});


test("Ensure that functions can have a trailing comma in their argument list", function() {

  const mult = function(x, ...rest) {
    const adjustedLength = Math.max(rest.length, 1), mids = rest.slice(0, adjustedLength - 1), y = rest[adjustedLength - 1];
    for (let n of Array.from(mids)) { x *= n; }
    return x *= y;
  };
  //ok mult(1, 2,) is 2
  //ok mult(1, 2, 3,) is 6
  return ok(mult(10, ...(([1, 2, 3, 4, 5, 6]))) === 7200);
});


test("`@` and `this` should both be able to invoke a method", function() {
  const nonce = {};
  const fn          = arg => eq(nonce, arg);
  fn.withAt   = function() { return this(nonce); };
  fn.withThis = function() { return this(nonce); };
  fn.withAt();
  return fn.withThis();
});


test("Trying an implicit object call with a trailing function.", function() {

  let a = null;
  const meth = (arg, obj, func) => a = [obj.a, arg, func()].join(' ');
  meth('apple', {b: 1, a: 13}, () => 'orange');
  return ok(a === '13 apple orange');
});


test("Ensure that empty functions don't return mistaken values.", function() {

  const obj = {
    func(param, ...rest) {
      this.param = param;
      [...this.rest] = rest;
    }
  };
  ok(obj.func(101, 102, 103, 104) === undefined);
  ok(obj.param === 101);
  return ok(obj.rest.join(' ') === '102 103 104');
});


test("Passing multiple functions without paren-wrapping is legal, and should compile.", function() {

  const sum = (one, two) => one() + two();
  const result = sum(() => 7 + 9
  , () => 1 + 3);
  return ok(result === 20);
});


test("Implicit call with a trailing if statement as a param.", function() {

  const func = function() { return arguments[1]; };
  const result = func('one', false ? 100 : 13);
  return ok(result === 13);
});


test("Test more function passing:", function() {

  let sum = (one, two) => one() + two();

  let result = sum( () => 1 + 2
  , () => 2 + 1);
  ok(result === 6);

  sum = (a, b) => a + b;
  result = sum(1
  , 2);
  return ok(result === 3);
});


test("Chained blocks, with proper indentation levels:", function() {

  const counter = {
    results: [],
    tick(func) {
      this.results.push(func());
      return this;
    }
  };
  counter
    .tick(() => 3).tick(() => 2).tick(() => 1);
  return arrayEq([3,2,1], counter.results);
});


test("This is a crazy one.", function() {

  const x = (obj, func) => func(obj);
  const ident = x => x;
  const result = x({one: ident(1)}, function(obj) {
    const inner = ident(obj);
    return ident(inner);
  });
  return ok(result.one === 1);
});


test("More paren compilation tests:", function() {

  const reverse = obj => obj.reverse();
  return ok(reverse([1, 2].concat(3)).join(' ') === '3 2 1');
});


test("Test for inline functions with parentheses and implicit calls.", function() {

  const combine = (func, num) => func() * num;
  const result  = combine((() => 1 + 2), 3);
  return ok(result === 9);
});


test("Test for calls/parens/multiline-chains.", function() {

  const f = x => x;
  const result = (f(1)).toString()
    .length;
  return ok(result === 1);
});


test("Test implicit calls in functions in parens:", function() {

  const result = (function(val) {
    [].push(val);
    return val;
  })(10);
  return ok(result === 10);
});


test("Ensure that chained calls with indented implicit object literals below are alright.", function() {

  let result = null;
  const obj = {
    method(val)  { return this; },
    second(hash) { return result = hash.three; }
  };
  obj
    .method(
      101
    ).second({
      one: {
        two: 2
      },
      three: 3
    });
  return eq(result, 3);
});


test("Test newline-supressed call chains with nested functions.", function() {

  const obj  =
    {call() { return this; }};
  const func = function() {
    obj
      .call(() => one(two)).call(() => three(four));
    return 101;
  };
  return eq(func(), 101);
});


test("Implicit objects with number arguments.", function() {

  const func = (x, y) => y;
  const obj =
    {prop: func("a", 1)};
  return ok(obj.prop === 1);
});


test("Non-spaced unary and binary operators should cause a function call.", function() {

  const func = val => val + 1;
  ok((func(+5)) === 6);
  return ok((func(-5)) === -4);
});


test("Prefix unary assignment operators are allowed in parenless calls.", function() {

  const func = val => val + 1;
  let val = 5;
  return ok((func(--val)) === 5);
});

test("#855: execution context for `func arr...` should be `null`", function() {
  const contextTest = function() { return eq(this, (typeof window !== 'undefined' && window !== null) ? window : global); };
  const array = [];
  contextTest(array);
  contextTest.apply(null, array);
  return contextTest(...array);
});

test("#904: Destructuring function arguments with same-named variables in scope", function() {
  let b, c, d, nonce;
  const a = (b = (nonce = {}));
  const fn = ([a,b]) => ({
    a,
    b
  });
  const result = fn([(c={}),(d={})]);
  eq(c, result.a);
  eq(d, result.b);
  eq(nonce, a);
  return eq(nonce, b);
});

test("Simple Destructuring function arguments with same-named variables in scope", function() {
  const x = 1;
  const f = ([x]) => x;
  eq(f([2]), 2);
  return eq(x, 1);
});

test("#4843: Bad output when assigning to @prop in destructuring assignment with defaults", function() {
  const works = "maybe";
  const drinks = "beer";
  class A {
    constructor({works1 = 'no', drinks1 = 'wine'}) {
      this.works = works1;
      this.drinks = drinks1;
    }
  }
  const a = new A({works: 'yes', drinks: 'coffee'});
  eq(a.works, 'yes');
  return eq(a.drinks, 'coffee');
});

test("caching base value", function() {

  var obj = {
    index: 0,
    0: {method() { return this === obj[0]; }}
  };
  return ok(obj[obj.index++].method(...[]));
});


test("passing splats to functions", function() {
  arrayEq([0, 1, 2, 3, 4], id(id(...[0, 1, 2, 3, 4])));
  let fn = function(a, b, ...rest) { const adjustedLength = Math.max(rest.length, 1), c = rest.slice(0, adjustedLength - 1), d = rest[adjustedLength - 1]; return [a, b, c, d]; };
  let range = [0, 1, 2, 3];
  let [first, second, others, last] = fn(...range, 4, ...[5, 6, 7]);
  eq(0, first);
  eq(1, second);
  arrayEq([2, 3, 4, 5, 6], others);
  eq(7, last);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  arrayEq([0, 1, 2, 3, 4], id(id(...[0, 1, 2, 3, 4])));
  fn = function(a, b, ...rest) { const adjustedLength = Math.max(rest.length, 1), c = rest.slice(0, adjustedLength - 1), d = rest[adjustedLength - 1]; return [a, b, c, d]; };
  range = [0, 1, 2, 3];
  [first, second, others, last] = fn(...range, 4, ...[5, 6, 7]);
  eq(0, first);
  eq(1, second);
  arrayEq([2, 3, 4, 5, 6], others);
  return eq(7, last);
});

test("splat variables are local to the function", function() {
  const outer = "x";
  const clobber = (avar, ...outer) => outer;
  clobber("foo", "bar");
  return eq("x", outer);
});

test("Issue 4631: left and right spread dots with preceding space", function() {
  let middle, middle1, middle2, middle3, middle4, middle5;
  const a = [];
  const f = a => a;
  return eq(true, (f(...a)) === ((middle = f(... a))) && middle === ((middle1 = f(...a))) && middle1 === ((middle2 = f(...a))) && middle2 === (middle3 = f(...a)) && middle3 === (middle4 = f(...a)) && middle4 === (middle5 = f(...a)) && middle5 === f(... a));
});

test("Issue 894: Splatting against constructor-chained functions.", function() {

  let x = null;
  class Foo {
    bar(y) { return x = y; }
  }
  new Foo().bar(...[101]);
  return eq(x, 101);
});


test("Functions with splats being called with too few arguments.", function() {

  let pen = null;
  const method = function(first, ...rest) {
    const adjustedLength = Math.max(rest.length, 2), variable = rest.slice(0, adjustedLength - 2), penultimate = rest[adjustedLength - 2], ultimate = rest[adjustedLength - 1];
    return pen = penultimate;
  };
  method(1, 2, 3, 4, 5, 6, 7, 8, 9);
  ok(pen === 8);
  method(1, 2, 3);
  ok(pen === 2);
  method(1, 2);
  return ok(pen === 2);
});


test("splats with super() within classes.", function() {

  class Parent {
    meth(...args) {
      return args;
    }
  }
  class Child extends Parent {
    meth() {
      const nums = [3, 2, 1];
      return super.meth(...nums);
    }
  }
  ok((new Child).meth().join(' ') === '3 2 1');

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  Parent = class Parent {
    meth(...args) {
      return args;
    }
  };
  Child = class Child extends Parent {
    meth() {
      const nums = [3, 2, 1];
      return super.meth(...nums);
    }
  };
  return ok((new Child).meth().join(' ') === '3 2 1');
});


test("#1011: passing a splat to a method of a number", function() {
  eq('1011', (11).toString(...[2]));
  eq('1011', ((31)).toString(...[3]));
  eq('1011', (69.0).toString(...[4]));
  eq('1011', (131.0).toString(...[5]));

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  eq('1011', (11).toString(...[2]));
  eq('1011', ((31)).toString(...[3]));
  eq('1011', (69.0).toString(...[4]));
  return eq('1011', (131.0).toString(...[5]));
});

test("splats and the `new` operator: functions that return `null` should construct their instance", function() {
  let constructor;
  const args = [];
  let child = new (constructor = () => null)(...args);
  ok(child instanceof constructor);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  child = new (constructor = () => null)(...args);
  return ok(child instanceof constructor);
});

test("splats and the `new` operator: functions that return functions should construct their return value", function() {
  let constructor;
  const args = [];
  const fn = function() {};
  const child = new (constructor = () => fn)(...args);
  ok(!(child instanceof constructor));
  return eq(fn, child);
});

test("implicit return", () => eq(ok, new (function() {
  return ok;
})
));
    /* Should `return` implicitly   */
    /* even with trailing comments. */


test("implicit returns with multiple branches", function() {
  const nonce = {};
  const fn = function() {
    if (false) {
      for (let a of Array.from(b)) {
        if (d) { return c; }
      }
    } else {
      return nonce;
    }
  };
  return eq(nonce, fn());
});


test("implicit returns with switches", function() {
  const nonce = {};
  const fn = function() {
    switch (nonce) {
      case nonce: return nonce;
      default: return undefined;
    }
  };
  return eq(nonce, fn());
});


test("preserve context when generating closure wrappers for expression conversions", function() {
  const nonce = {};
  const obj = {
    property: nonce,
    method() {
      return this.result = (() => {
        if (false) {
        return 10;
      } else {
        "a";
        "b";
        return this.property;
      }
      })();
    }
  };
  eq(nonce, obj.method());
  return eq(nonce, obj.property);
});


test("don't wrap 'pure' statements in a closure", function() {
  const nonce = {};
  const items = [0, 1, 2, 3, nonce, 4, 5];
  const fn = function(items) {
    for (let item of Array.from(items)) {
      if (item === nonce) { return item; }
    }
  };
  return eq(nonce, fn(items));
});


test("usage of `new` is careful about where the invocation parens end up", function() {
  eq('object', typeof new ((() => { try { return Array; } catch (error) {} })()));
  return eq('object', typeof new (((() => (function() {})))()));
});


test("implicit call against control structures", function() {
  let error;
  let result = null;
  const save   = obj => result = obj;

  save((() => { switch (id(false)) {
    case true:
      return 'true';
    case false:
      return 'false';
  
  } })());

  eq(result, 'false');

  save(id(false) ?
    'false'
  :
    'true'
  );

  eq(result, 'true');

  save(!id(false) ?
    'true'
  :
    'false'
  );

  eq(result, 'true');

  save((() => { try {
    return doesnt(exist);
  } catch (error1) {
    error = error1;
    return 'caught';
  }
   })());

  eq(result, 'caught');

  save((() => { try { return doesnt(exist); } catch (error2) { error = error2; return 'caught2'; } })());

  return eq(result, 'caught2');
});


test("#1420: things like `(fn() ->)`; there are no words for this one", function() {
  const fn = () => f => f();
  const nonce = {};
  return eq(nonce, (fn()(() => nonce)));
});

test("#1416: don't omit one 'new' when compiling 'new new'", function() {
  const nonce = {};
  const obj = new (new (function() { return () => ({
    prop: nonce
  }); }));
  return eq(obj.prop, nonce);
});

test("#1416: don't omit one 'new' when compiling 'new new fn()()'", function() {
  const nonce = {};
  const argNonceA = {};
  const argNonceB = {};
  const fn = a => b => ({
    a,
    b,
    prop: nonce
  });
  const obj = new (new fn(argNonceA))(argNonceB);
  eq(obj.prop, nonce);
  eq(obj.a, argNonceA);
  return eq(obj.b, argNonceB);
});

test("#1840: accessing the `prototype` after function invocation should compile", function() {
  doesNotThrow(() => CoffeeScript.compile('fn()::prop'));

  const nonce = {};
  class Test {
    static initClass() {
      this.prototype.id = nonce;
    }
  }
  Test.initClass();

  const dotAccess = () => Test.prototype;
  const protoAccess = () => Test;

  eq(dotAccess().id, nonce);
  return eq(protoAccess().prototype.id, nonce);
});

test("#960: improved 'do'", function() {

  let func;
  ((nonExistent => eq(nonExistent, 'one')))('one');

  const overridden = 1;
  ((overridden => eq(overridden, 2)))(2);

  const two = 2;
  (function(one, two, three) {
    eq(one, 1);
    eq(two, 2);
    return eq(three, 3);
  })(1, two, 3);

  const ret = (func = function(two) {
    eq(two, 2);
    return func;
  })(two);
  return eq(ret, func);
});

test("#2617: implicit call before unrelated implicit object", function() {
  const pass = () => true;

  const result = pass(1) ?
    {one: 1} : undefined;
  return eq(result.one, 1);
});

test("#2292, b: f (z),(x)", function() {
  const f = (x, y) => y;
  const one = 1;
  const two = 2;
  const o = {b: f((one),(two))};
  return eq(o.b, 2);
});

test("#2297, Different behaviors on interpreting literal", function() {
  const foo = (x, y) => y;
  const bar =
    {baz: foo(100, true)};

  eq(bar.baz, true);

  const qux = x => x;
  const quux = qux({
    corge: foo(100, true)});

  eq(quux.corge, true);

  const xyzzy = {
    e: 1,
    f: foo({
      a: 1,
      b: 2
    }
    , {
      one: 1,
      two: 2,
      three: 3
    }
    ),
    g: {
      a: 1,
      b: 2,
      c: foo(2, {
        one: 1,
        two: 2,
        three: 3
      }
      ),
      d: 3
    },
    four: 4,
    h: foo({one: 1, two: 2, three: {three: {three: 3}}},
      2)
  };

  eq(xyzzy.f.two, 2);
  eq(xyzzy.g.c.three, 3);
  eq(xyzzy.four, 4);
  return eq(xyzzy.h, 2);
});

test("#2715, Chained implicit calls", function() {
  const first  = x => x;
  const second = (x, y) => y;

  const foo = first(first({
    one: 1})
  );
  eq(foo.one, 1);

  const bar = first(second(
    {one: 1}, 2)
  );
  eq(bar, 2);

  const baz = first(second(
    {one: 1},
    2)
  );
  return eq(baz, 2);
});

test("Implicit calls and new", function() {
  const first = x => x;
  const foo = function(x) {
    this.x = x;
  };
  const bar = first(new foo(first(1)));
  eq(bar.x, 1);

  const third = (x, y, z) => z;
  const baz = first(new foo(new foo(third({
        one: 1,
        two: 2
      },
        1,
        {three: 3},
        2)
  )
  )
  );
  return eq(baz.x.x.three, 3);
});

test("Loose tokens inside of explicit call lists", function() {
  const first = x => x;
  const second = (x, y) => y;
  const one = 1;

  const foo = second( one,
                2);
  eq(foo, 2);

  const bar = first( first({
               one: 1}));
  return eq(bar.one, 1);
});

test("Non-callable literals shouldn't compile", function() {
  cantCompile('1(2)');
  cantCompile('1 2');
  cantCompile('/t/(2)');
  cantCompile('/t/ 2');
  cantCompile('///t///(2)');
  cantCompile('///t/// 2');
  cantCompile("''(2)");
  cantCompile("'' 2");
  cantCompile('""(2)');
  cantCompile('"" 2');
  cantCompile('""""""(2)');
  cantCompile('"""""" 2');
  cantCompile('{}(2)');
  cantCompile('{} 2');
  cantCompile('[](2)');
  cantCompile('[] 2');
  cantCompile('[2..9] 2');
  cantCompile('[2..9](2)');
  cantCompile('[1..10][2..9] 2');
  return cantCompile('[1..10][2..9](2)');
});

test("implicit invocation with implicit object literal", function() {
  const f = obj => eq(1, obj.a);

  f({
    a: 1});
  let obj =
    f ?
      {a: 2}
    :
      {a: 1};
  eq(2, obj.a);

  f({
    "a": 1});
  obj =
    f ?
      {"a": 2}
    :
      {"a": 1};
  eq(2, obj.a);

  // #3935: Implicit call when the first key of an implicit object has interpolation.
  const a = 'a';
  f({
    [a]: 1});
  obj =
    f ?
      {[a]: 2}
    :
      {[a]: 1};
  return eq(2, obj.a);
});

test("get and set can be used as function names when not ambiguous with `get`/`set` keywords", function() {
  let get = val => val;
  let set = val => val;
  eq(2, get(2));
  eq(3, set(3));
  eq('a', get('a'));
  eq('b', set('b'));
  eq(4, get(4));
  eq(5, set(5));
  eq('c', get('c'));
  eq('d', set('d'));

  this.get = get;
  this.set = set;
  eq(6, this.get(6));
  eq(7, this.set(7));

  get = ({val}) => val;
  set = ({val}) => val;
  eq(8, get({val: 8}));
  eq(9, set({val: 9}));
  eq('e', get({val: 'e'}));
  eq('f', set({val: 'f'}));
  eq(10, get({val: 10}));
  eq(11, set({val: 11}));
  eq('g', get({val: 'g'}));
  return eq('h', set({val: 'h'}));
});

test("get and set can be used as variable and property names", function() {
  let get = 2;
  let set = 3;
  eq(2, get);
  eq(3, set);

  ({get} = {get: 4});
  ({set} = {set: 5});
  eq(4, get);
  return eq(5, set);
});

test("get and set can be used as class method names", function() {
  class A {
    get() { return 2; }
    set() { return 3; }
  }

  const a = new A();
  eq(2, a.get());
  eq(3, a.set());

  class B {
    static get() { return 4; }
    static set() { return 5; }
  }

  eq(4, B.get());
  return eq(5, B.set());
});

test("#4524: functions named get or set can be used without parentheses when attached to an object", function() {
  const obj = {
    get(x) { return x + 2; },
    set(x) { return x + 3; }
  };

  class A {
    get(x) { return x + 4; }
    set(x) { return x + 5; }
  }

  const a = new A();

  class B {
    get(x) { return x.value + 6; }
    set(x) { return x.value + 7; }
  }

  const b = new B();

  eq(12, obj.get(10));
  eq(13, obj.set(10));
  eq(12, obj != null ? obj.get(10) : undefined);
  eq(13, obj != null ? obj.set(10) : undefined);

  eq(14, a.get(10));
  eq(15, a.set(10));

  this.ten = 10;

  eq(12, obj.get(this.ten));
  eq(13, obj.set(this.ten));

  eq(14, a.get(this.ten));
  eq(15, a.set(this.ten));

  obj.obj = obj;

  eq(12, obj.obj.get(this.ten));
  eq(13, obj.obj.set(this.ten));

  eq(16, b.get({value: 10}));
  eq(17, b.set({value: 10}));

  eq(16, b.get({value: this.ten}));
  return eq(17, b.set({value: this.ten}));
});

test("#4836: functions named get or set can be used without parentheses when attached to this or @", function() {
  this.get = x => x + 2;
  this.set = x => x + 3;
  this.a = 4;

  eq(12, this.get(10));
  eq(13, this.set(10));
  eq(12, this != null ? this.get(10) : undefined);
  eq(13, this != null ? this.set(10) : undefined);
  eq(6, this.get(this.a));
  eq(7, this.set(this.a));
  eq(6, this != null ? this.get(this.a) : undefined);
  eq(7, this != null ? this.set(this.a) : undefined);

  eq(12, this.get(10));
  eq(13, this.set(10));
  eq(12, this != null ? this.get(10) : undefined);
  eq(13, this != null ? this.set(10) : undefined);
  eq(6, this.get(this.a));
  eq(7, this.set(this.a));
  eq(6, this != null ? this.get(this.a) : undefined);
  return eq(7, this != null ? this.set(this.a) : undefined);
});

test("#4852: functions named get or set can be used without parentheses when attached to this or @, with an argument of an implicit object", function() {
  this.get = ({ x }) => x + 2;
  this.set = ({ x }) => x + 3;

  eq(12, this.get({x: 10}));
  eq(13, this.set({x: 10}));
  eq(12, this != null ? this.get({x: 10}) : undefined);
  eq(13, this != null ? this.set({x: 10}) : undefined);
  eq(12, this != null ? this.get({x: 10}) : undefined);
  return eq(13, this != null ? this.set({x: 10}) : undefined);
});

test("#4473: variable scope in chained calls", function() {
  let a, b, c, d, e, f;
  const obj = {
    foo() { return this; },
    bar(a) {
      a();
      return this;
    }
  };

  obj.foo(a = 1).bar(() => a = 2);
  eq(a, 2);

  obj.bar(function() { let b;
  return b = 2; }).foo(b = 1);
  eq(b, 1);

  obj.foo(c = 1).bar(() => c = 2).foo(c = 3);
  eq(c, 3);

  obj.foo(([d, e] = [1, 2])).bar(() => d = 4);
  eq(d, 4);

  obj.foo({f} = {f: 1}).bar(() => f = 5);
  return eq(f, 5);
});
