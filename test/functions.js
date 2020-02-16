/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Function Literals
// -----------------

// TODO: add indexing and method invocation tests: (->)[0], (->).call()

// * Function Definition
// * Bound Function Definition
// * Parameter List Features
//   * Splat Parameters
//   * Context (@) Parameters
//   * Parameter Destructuring
//   * Default Parameters

// Function Definition

let x = 1;
const y = {};
y.x = () => 3;
ok(x === 1);
ok(typeof(y.x) === 'function');
ok(y.x instanceof Function);
ok(y.x() === 3);

// The empty function should not cause a syntax error.
(function() {});
(function() {});

// Multiple nested function declarations mixed with implicit calls should not
// cause a syntax error.
(one => two => three(four, five => six(seven, eight, function(nine) {})));

// with multiple single-line functions on the same line.
let func = x => x => x => x;
ok(func(1)(2)(3) === 3);

// Make incorrect indentation safe.
func = function() {
  const obj = {
          key: 10
        };
  return obj.key - 5;
};
eq(func(), 5);

// Ensure that functions with the same name don't clash with helper functions.
const del = () => 5;
ok(del() === 5);


// Bound Function Definition

let obj = {
  bound() {
    return (() => this)();
  },
  unbound() {
    return (function() { return this; })();
  },
  nested() {
    return (() => {
      return (() => {
        return (() => this)();
      }
      )();
    }
    )();
  }
};
eq(obj, obj.bound());
ok(obj !== obj.unbound());
eq(obj, obj.nested());


test("even more fancy bound functions", function() {
  obj = {
    one() {
      return (() => {
        return this.two();
      })();
    },
    two() {
      return (() => {
        return (() => {
          return (() => {
            return this.three;
          })();
        })();
      })();
    },
    three: 3
  };

  return eq(obj.one(), 3);
});


test("arguments in bound functions inherit from parent function", function() {
  // The `arguments` object in an ES arrow function refers to the `arguments`
  // of the parent scope, just like `this`. In the CoffeeScript 1.x
  // implementation of `=>`, the `arguments` object referred to the arguments
  // of the arrow function; but per the ES2015 spec, `arguments` should refer
  // to the parent.
  arrayEq((((...a) => a))([1, 2, 3]), ((...a) => a)([1, 2, 3]));

  const parent = function(a, b, c) {
    let bound;
    return (bound = function() {
      return [arguments[0], arguments[1], arguments[2]];
    }.bind(this)
    )();
  };
  return arrayEq([1, 2, 3], parent(1, 2, 3));
});


test("self-referencing functions", function() {
  var changeMe = () => changeMe = 2;

  changeMe();
  return eq(changeMe, 2);
});


// Parameter List Features

test("splats", function() {
  arrayEq([0, 1, 2], ((((...splat) => splat))(0, 1, 2)));
  arrayEq([2, 3], ((((_, _1, ...splat) => splat))(0, 1, 2, 3)));
  arrayEq([0, 1], ((function(...args) { const adjustedLength = Math.max(args.length, 2), splat = args.slice(0, adjustedLength - 2), _ = args[adjustedLength - 2], _1 = args[adjustedLength - 1]; return splat; })(0, 1, 2, 3)));
  arrayEq([2], ((function(_, _1, ...rest) { const adjustedLength = Math.max(rest.length, 1), splat = rest.slice(0, adjustedLength - 1), _2 = rest[adjustedLength - 1]; return splat; })(0, 1, 2, 3)));

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  arrayEq([0, 1, 2], ((((...splat) => splat))(0, 1, 2)));
  arrayEq([2, 3], ((((_, _1, ...splat) => splat))(0, 1, 2, 3)));
  arrayEq([0, 1], ((function(...args) { const adjustedLength = Math.max(args.length, 2), splat = args.slice(0, adjustedLength - 2), _ = args[adjustedLength - 2], _1 = args[adjustedLength - 1]; return splat; })(0, 1, 2, 3)));
  return arrayEq([2], ((function(_, _1, ...rest) { const adjustedLength = Math.max(rest.length, 1), splat = rest.slice(0, adjustedLength - 1), _2 = rest[adjustedLength - 1]; return splat; })(0, 1, 2, 3)));
});

test("destructured splatted parameters", function() {
  const arr = [0,1,2];
  let splatArray = ([...a]) => a;
  let splatArrayRest = function([...a],...b) { arrayEq(a,b); return b; };
  arrayEq(splatArray(arr), arr);
  arrayEq(splatArrayRest(arr,0,1,2), arr);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  splatArray = ([...a]) => a;
  return splatArrayRest = function([...a],...b) { arrayEq(a,b); return b; };
});

test("@-parameters: automatically assign an argument's value to a property of the context", function() {
  let context;
  const nonce = {};

  (function(prop) {
    this.prop = prop;
    }).call((context = {}), nonce);
  eq(nonce, context.prop);

  // Allow splats alongside the special argument
  (function(...args) {
    let adjustedLength, splat;
    adjustedLength = Math.max(args.length, 1),
      splat = args.slice(0, adjustedLength - 1),
      this.prop = args[adjustedLength - 1];
    }).apply((context = {}), [0, 0, nonce]);
  eq(nonce, context.prop);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  (function(...args) {
    let adjustedLength, splat;
    adjustedLength = Math.max(args.length, 1),
      splat = args.slice(0, adjustedLength - 1),
      this.prop = args[adjustedLength - 1];
    }).apply((context = {}), [0, 0, nonce]);
  eq(nonce, context.prop);

  // Allow the argument itself to be a splat
  (function(...args) {
    [...this.prop] = args;
    }).call((context = {}), 0, nonce, 0);
  eq(nonce, context.prop[1]);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  (function(...args) {
    [...this.prop] = args;
    }).call((context = {}), 0, nonce, 0);
  eq(nonce, context.prop[1]);

  // The argument should not be able to be referenced normally
  let code = '((@prop) -> prop).call {}';
  doesNotThrow(() => CoffeeScript.compile(code));
  throws((() => CoffeeScript.run(code)), ReferenceError);
  code = '((@prop) -> _at_prop).call {}';
  doesNotThrow(() => CoffeeScript.compile(code));
  return throws((() => CoffeeScript.run(code)), ReferenceError);
});

test("@-parameters and splats with constructors", function() {
  const a = {};
  const b = {};
  class Klass {
    constructor(first, ...rest) {
      let adjustedLength, splat;
      this.first = first;
      adjustedLength = Math.max(rest.length, 1),
        splat = rest.slice(0, adjustedLength - 1),
        this.last = rest[adjustedLength - 1];
    }
  }

  obj = new Klass(a, 0, 0, b);
  eq(a, obj.first);
  eq(b, obj.last);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  Klass = class Klass {
    constructor(first, ...rest) {
      let adjustedLength, splat;
      this.first = first;
      adjustedLength = Math.max(rest.length, 1),
        splat = rest.slice(0, adjustedLength - 1),
        this.last = rest[adjustedLength - 1];
    }
  };

  obj = new Klass(a, 0, 0, b);
  eq(a, obj.first);
  return eq(b, obj.last);
});

test("destructuring in function definition", function() {
  (function(...args) {
    let b, c;
    [...[{a: [b], c}]] = args;
    eq(1, b);
    return eq(2, c);
  })({a: [1], c: 2});

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  (function(...args) {
    let b, c;
    [...[{a: [b], c}]] = args;
    eq(1, b);
    return eq(2, c);
  })({a: [1], c: 2});

  const context = {};
  (function(...args) {
    let b, c, e;
    [...[{a: [b, c = 2], d: this.d, e = 4}]] = args;
    eq(1, b);
    eq(2, c);
    eq(this.d, 3);
    eq(context.d, 3);
    return eq(e, 4);
  }).call(context, {a: [1], d: 3});

  (function({a: aa = 1, b: bb = 2}) {
    eq(5, aa);
    return eq(2, bb);
  })({a: 5});

  const ajax = (
    url,
    {
      async = true,
      beforeSend = (function() {}),
      cache = true,
      method = 'get',
      data = {}
    }
  ) => ({
    url,
    async,
    beforeSend,
    cache,
    method,
    data
  });

  const fn = function() {};
  return deepEqual(ajax('/home', {beforeSend: fn, method: 'post'}), {
    url: '/home', async: true, beforeSend: fn, cache: true, method: 'post', data: {}
  });
});

test("rest element destructuring in function definition", function() {
  obj = {a: 1, b: 2, c: 3, d: 4, e: 5};

  (function({a, b, ...r}) {
    eq(1, a);
    return eq(2, b,
    deepEqual(r, {c: 3, d: 4, e: 5}));
  })(obj);

  (function({a: p, b, ...r}, q) {
    eq(p, 1);
    eq(q, 9);
    return deepEqual(r, {c: 3, d: 4, e: 5});
  })({a:1, b:2, c:3, d:4, e:5}, 9);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  (function({
      a: p,
      b,
      ...r
    }, q) {
    eq(p, 1);
    eq(q, 9);
    return deepEqual(r, {c: 3, d: 4, e: 5});
  })({a:1, b:2, c:3, d:4, e:5}, 9);

  const a1={}; const b1={}; const c1={}; const d1={};
  const obj1 = {
    a: a1,
    b: {
      'c': {
        d: {
          b1,
          e: c1,
          f: d1
        }
      }
    },
    b2: {b1, c1}
  };

  (function({a: w, b: {c: {d: {b1: bb, ...r1}}}, ...r2}) {
    eq(a1, w);
    eq(bb, b1);
    eq(r2.b, undefined);
    deepEqual(r1, {e: c1, f: d1});
    return deepEqual(r2.b2, {b1, c1});
  })(obj1);

  const b = 3;
  let f = function({a, ...b}) {};
  f({});
  eq(3, b);

  (function(param) {
    if (param == null) { param = {}; }
    const {a, ...r} = param;
    eq(a, undefined);
    return deepEqual(r, {});
  })();

  (function(param) {
    if (param == null) { param = {}; }
    const {a, ...r} = param;
    eq(a, 1);
    return deepEqual(r, {b: 2, c: 3});
  })({a: 1, b: 2, c: 3});

  f = function(param) { if (param == null) { param = {}; } const {a, ...r} = param; return [a, r]; };
  deepEqual([undefined, {}], f());
  deepEqual([1, {b: 2}], f({a: 1, b: 2}));
  deepEqual([1, {}], f({a: 1}));

  f = function(param) { if (param == null) { param = {a: 1, b: 2}; } const {a, ...r} = param; return [a, r]; };
  deepEqual([1, {b:2}], f());
  deepEqual([2, {}], f({a:2}));
  deepEqual([3, {c:5}], f({a:3, c:5}));

  f = ({ a: aa = 0, b: bb = 0 }) => [aa, bb];
  deepEqual([0, 0], f({}));
  deepEqual([0, 42], f({b:42}));
  deepEqual([42, 0], f({a:42}));
  return deepEqual([42, 43], f({a:42, b:43}));
});

test("#4005: `([a = {}]..., b) ->` weirdness", function() {
  let fn = function(...args) { const adjustedLength = Math.max(args.length, 1), [a = {}] = args.slice(0, adjustedLength - 1), b = args[adjustedLength - 1]; return [a, b]; };
  deepEqual(fn(5), [{}, 5]);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  fn = function(...args) { const adjustedLength = Math.max(args.length, 1), [a = {}] = args.slice(0, adjustedLength - 1), b = args[adjustedLength - 1]; return [a, b]; };
  return deepEqual(fn(5), [{}, 5]);
});

test("default values", function() {
  const nonceA = {};
  const nonceB = {};
  const a = function(_,_1,arg) { if (arg == null) { arg = nonceA; } return arg; };
  eq(nonceA, a());
  eq(nonceA, a(0));
  eq(nonceB, a(0,0,nonceB));
  eq(nonceA, a(0,0,undefined));
  eq(null, a(0,0,null)); // Per ES2015, `null` doesn’t trigger a parameter default value
  eq(false , a(0,0,false));
  eq(nonceB, a(undefined,undefined,nonceB,undefined));
  const b = function(_,arg,_1,_2) { if (arg == null) { arg = nonceA; } return arg; };
  eq(nonceA, b());
  eq(nonceA, b(0));
  eq(nonceB, b(0,nonceB));
  eq(nonceA, b(0,undefined));
  eq(null, b(0,null));
  eq(false , b(0,false));
  eq(nonceB, b(undefined,nonceB,undefined));
  const c = function(arg,_,_1) { if (arg == null) { arg = nonceA; } return arg; };
  eq(nonceA, c());
  eq(0, c(0));
  eq(nonceB, c(nonceB));
  eq(nonceA, c(undefined));
  eq(null, c(null));
  eq(false , c(false));
  return eq(nonceB, c(nonceB,undefined,undefined));
});

test("default values with @-parameters", function() {
  const a = {};
  const b = {};
  obj = {f(q, p) { if (q == null) { q = a; } if (p == null) { p = b; } this.p = p; return q; }};
  eq(a, obj.f());
  return eq(b, obj.p);
});

test("default values with splatted arguments", function() {
  let withSplats = function(a, ...rest) { if (a == null) { a = 2; } const adjustedLength = Math.max(rest.length, 2), b = rest.slice(0, adjustedLength - 2), val = rest[adjustedLength - 2], c = val !== undefined ? val : 3, val1 = rest[adjustedLength - 1], d = val1 !== undefined ? val1 : 5; return a * (b.length + 1) * c * d; };
  eq(30, withSplats());
  eq(15, withSplats(1));
  eq(5, withSplats(1,1));
  eq(1, withSplats(1,1,1));
  eq(2, withSplats(1,1,1,1));

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  withSplats = function(a, ...rest) { if (a == null) { a = 2; } const adjustedLength = Math.max(rest.length, 2), b = rest.slice(0, adjustedLength - 2), val = rest[adjustedLength - 2], c = val !== undefined ? val : 3, val1 = rest[adjustedLength - 1], d = val1 !== undefined ? val1 : 5; return a * (b.length + 1) * c * d; };
  eq(30, withSplats());
  eq(15, withSplats(1));
  eq(5, withSplats(1,1));
  eq(1, withSplats(1,1,1));
  return eq(2, withSplats(1,1,1,1));
});

test("#156: parameter lists with expansion", function() {
  const expandArguments = function(...args) {
    const first = args[0], lastButOne = args[args.length - 2], last = args[args.length - 1];
    eq(1, first);
    eq(4, lastButOne);
    return last;
  };
  eq(5, expandArguments(1, 2, 3, 4, 5));

  throws((() => CoffeeScript.compile("(..., a, b...) ->")), null, "prohibit expansion and a splat");
  return throws((() => CoffeeScript.compile("(...) ->")),          null, "prohibit lone expansion");
});

test("#156: parameter lists with expansion in array destructuring", function() {
  const expandArray = function(...args) {
    const array = args[args.length - 1], last = array[array.length - 1];
    return last;
  };
  return eq(3, expandArray(1, 2, 3, [1, 2, 3]));
});

test("#3502: variable definitions and expansion", function() {
  let b;
  const a = (b = 0);
  const f = function(...args) { let a, b; a = args[0], b = args[args.length - 1]; return [a, b]; };
  arrayEq([1, 5], f(1, 2, 3, 4, 5));
  eq(0, a);
  return eq(0, b);
});

test("variable definitions and splat", function() {
  let b;
  const a = (b = 0);
  let f = function(a, ...rest) { let adjustedLength, middle;
  let b; adjustedLength = Math.max(rest.length, 1),
    middle = rest.slice(0, adjustedLength - 1),
    b = rest[adjustedLength - 1]; return [a, middle, b]; };
  arrayEq([1, [2, 3, 4], 5], f(1, 2, 3, 4, 5));
  eq(0, a);
  eq(0, b);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  f = function(a, ...rest) { let adjustedLength, middle;
  let b; adjustedLength = Math.max(rest.length, 1),
    middle = rest.slice(0, adjustedLength - 1),
    b = rest[adjustedLength - 1]; return [a, middle, b]; };
  arrayEq([1, [2, 3, 4], 5], f(1, 2, 3, 4, 5));
  eq(0, a);
  return eq(0, b);
});

test("default values with function calls", () => doesNotThrow(() => CoffeeScript.compile("(x = f()) ->")));

test("arguments vs parameters", function() {
  doesNotThrow(() => CoffeeScript.compile("f(x) ->"));
  const f = g => g();
  return eq(5, f(x => 5));
});

test("reserved keyword as parameters", function() {
  let c;
  let f = function(_case, case1) { this.case = case1; return [_case, this.case]; };
  let [a, b] = f(1, 2);
  eq(1, a);
  eq(2, b);

  f = function(case1, ..._case) { this.case = case1; return [this.case, ..._case]; };
  [a, b, c] = f(1, 2, 3);
  eq(1, a);
  eq(2, b);
  return eq(3, c);
});

test("reserved keyword at-splat", function() {
  let f = function(...args) { [...this.case] = args; return this.case; };
  let [a, b] = f(1, 2);
  eq(1, a);
  eq(2, b);

  // Should not trigger implicit call, e.g. rest ... => rest(...)
  f = function(...args) { [...this.case] = args; return this.case; };
  [a, b] = f(1, 2);
  eq(1, a);
  return eq(2, b);
});

test("#1574: Destructuring and a parameter named _arg", function() {
  const f = ({a, b}, _arg, _arg1) => [a, b, _arg, _arg1];
  return arrayEq([1, 2, 3, 4], f({a: 1, b: 2}, 3, 4));
});

test("#1844: bound functions in nested comprehensions causing empty var statements", function() {
  var a = ([0].map((b) => (() => {
    const result = [];
    for (a of [0]) {       result.push((() => {}));
    }
    return result;
  })()));
  return eq(1, a.length);
});

test("#1859: inline function bodies shouldn't modify prior postfix ifs", function() {
  const list = [1, 2, 3];
  if (list.some(x => x === 2)) { return ok(true); }
});

test("#2258: allow whitespace-style parameter lists in function definitions", function() {
  func = (a, b, c) => c;
  eq(func(1, 2, 3), 3);

  func = (a, b, c) => b;
  return eq(func(1, 2, 3), 2);
});

test("#2621: fancy destructuring in parameter lists", function() {
  func = function({ prop1: { key1 }, prop2: { key2, key3: [a, b, c] } }) {
    eq(key2, 'key2');
    return eq(a, 'a');
  };

  return func({prop1: {key1: 'key1'}, prop2: {key2: 'key2', key3: ['a', 'b', 'c']}});
});

test("#1435 Indented property access", function() {
  var rec = () => ({
    rec
  });

  return eq(1, (function() {
    rec()
      .rec(() => rec()
      .rec(() => rec.rec()).rec());
    return 1;
  })()
  );
});

test("#1038 Optimize trailing return statements", function() {
  const compile = code => CoffeeScript.compile(code, {bare: true}).trim().replace(/\s+/g, " ");

  eq("(function() {});",                 compile("->"));
  eq("(function() {});",                 compile("-> return"));
  eq("(function() { return void 0; });", compile("-> undefined"));
  eq("(function() { return void 0; });", compile("-> return undefined"));
  return eq("(function() { foo(); });",         compile(`\
->
  foo()
  return\
`)
  );
});

test("#4406 Destructured parameter default evaluation order with incrementing variable", function() {
  let i = 0;
  const f = function({ a = ++i }, b) { if (b == null) { b = ++i; } return [a, b]; };
  return arrayEq(f({}), [1, 2]);
});

test("#4406 Destructured parameter default evaluation order with generator function", function() {
  let current = 0;
  const next    = () => ++current;
  const foo = function({ a = next() }, b) { if (b == null) { b = next(); } return [ a, b ]; };
  return arrayEq(foo({}), [1, 2]);
});

test("Destructured parameter with default value, that itself has a default value", function() {
  // Adapted from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
  const draw = function(param) { if (param == null) { param = {}; } const {size = 'big', coords = {x: 0, y: 0}, radius = 25} = param; return `${size}-${coords.x}-${coords.y}-${radius}`; };
  const output = draw({
    coords: {
      x: 18,
      y: 30
    },
    radius: 30
  });
  return eq(output, 'big-18-30-30');
});

test("#4566: destructuring with nested default values", function() {
  const f = ({a: {b = 1}}) => b;
  return eq(2, f({a: {b: 2}}));
});

test("#1043: comma after function glyph", function() {
  x = function(a, b) {
    if (a == null) { a = function() {}; }
    if (b == null) { b = 2; }
    return a();
  };
  eq(x(), undefined);

  const f = a => a();
  const g = f(function() {}, 2);
  eq(g, undefined);
  const h = f(() => {}, 2);
  return eq(h, undefined);
});

test("#3845/#3446: chain after function glyph", function() {
  const angular = {module() { return {controller() { return {controller() {}}; }}; }};

  eq(undefined,
    angular.module('foo')
    .controller('EmailLoginCtrl', function() {})
    .controller('EmailSignupCtrl', function() {})
  );

  const beforeEach = f => f();
  const getPromise = () => ({
    then() { return {catch() {}}; }
  });

  eq(undefined,
    beforeEach(function() {
      return getPromise()
      .then(result => {
        this.result = result;
        
    })
      .catch(error => {
        this.error = error;
        
    });
    })
  );

  const doThing = () => ({
    then() { return {catch(f) { return f(); }}; }
  });
  const handleError = () => 3;
  return eq(3,
    doThing()
    .then(result => {
      this.result = result;
      
  })
    .catch(handleError)
  );
});

test("#4413: expressions in function parameters that create generated variables have those variables declared correctly", function() {
  'use strict';
  // We’re in strict mode because we want an error to be thrown if the generated
  // variable (`ref`) is assigned before being declared.
  const foo = () => null;
  const bar = () => 33;
  const f = function(a) { if (a == null) { let left;
  a = (left = foo()) != null ? left : bar(); } return a; };
  const g = function(a) { if (a == null) { let left;
  a = (left = foo()) != null ? left : bar(); } return a + 1; };
  eq(f(), 33);
  return eq(g(), 34);
});

test("#4673: complex destructured object spread variables", function() {
  const f = function(...args) {
    const obj1 = args[0], {...a} = __objectWithoutKeys__(obj1, []);
    return a;
  };
  eq(f({c: 1}).c, 1);

  const g = function(...args) {
    let obj1;
    obj1 = args[0], this.y = __objectWithoutKeys__(obj1, []);
    return eq(this.y.b, 1);
  };
  return g({b: 1});
});

test("#4657: destructured array param declarations", function() {
  const a = 1;
  const b = 2;
  const f = function(...args) {
    let adjustedLength, array;
    let a, b;
    array = args[0],
      adjustedLength = Math.max(array.length, 1),
      a = array.slice(0, adjustedLength - 1),
      b = array[adjustedLength - 1];
  };
  f([3, 4, 5]);
  eq(a, 1);
  return eq(b, 2);
});

test("#4657: destructured array parameters", function() {
  const f = function(...args) { const array = args[0], adjustedLength = Math.max(array.length, 1), a = array.slice(0, adjustedLength - 1), b = array[adjustedLength - 1]; return {a, b}; };
  const result = f([1, 2, 3, 4]);
  arrayEq(result.a, [1, 2, 3]);
  return eq(result.b, 4);
});

function __objectWithoutKeys__(object, keys) {
  const result = {...object};
  for (const k of keys) {
    delete result[keys];
  }
  return result;
}