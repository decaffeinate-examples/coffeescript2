/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Scope
// -----

// * Variable Safety
// * Variable Shadowing
// * Auto-closure (`do`)
// * Global Scope Leaks

test("reference `arguments` inside of functions", function() {
  const sumOfArgs = function() {
    let sum = (a, b) => a + b;
    sum = 0;
    for (let num of Array.from(arguments)) { sum += num; }
    return sum;
  };
  return eq(10, sumOfArgs(0, 1, 2, 3, 4));
});

test("assignment to an Object.prototype-named variable should not leak to outer scope", function() {
  // FIXME: fails on IE
  (function() {
    let constructor;
    return constructor = 'word';
  })();
  return ok(constructor !== 'word');
});

test("siblings of splat parameters shouldn't leak to surrounding scope", function() {
  const x = 10;
  const oops = function(x, ...args) {};
  oops(20, 1, 2, 3);
  return eq(x, 10);
});

test("catch statements should introduce their argument to scope", function() {
  try { throw ''; }
  catch (e) {
    ((() => e = 5))();
    return eq(5, e);
  }
});

test("loop variable should be accessible after for-of loop", function() {
  let x;
  const d = ((() => {
    const result = [];
    for (x in {1:'a',2:'b'}) {
      result.push(x);
    }
    return result;
  })());
  return ok(['1','2'].includes(x));
});

test("loop variable should be accessible after for-in loop", function() {
  let x;
  const d = ((() => {
    const result = [];
    for (x of [1,2]) {       result.push(x);
    }
    return result;
  })());
  return eq(x, 2);
});

test("loop variable should be accessible after for-from loop", function() {
  let x;
  const d = ((() => {
    const result = [];
    for (x of [1,2]) {       result.push(x);
    }
    return result;
  })());
  return eq(x, 2);
});

class Array {
  static initClass() {
    this.prototype.slice = fail;
  }
}
Array.initClass(); // needs to be global
class Object {
  static initClass() {
    this.prototype.hasOwnProperty = fail;
  }
}
Object.initClass();
test("#1973: redefining Array/Object constructors shouldn't confuse __X helpers", function() {
  const arr = [1, 2, 3, 4];
  arrayEq([3, 4], arr.slice(2));
  const obj = {arr};
  return (() => {
    const result = [];
    for (let k of Object.keys(obj || {})) {
      result.push(eq(arr, obj[k]));
    }
    return result;
  })();
});

test("#2255: global leak with splatted @-params", function() {
  ok((typeof x === 'undefined' || x === null));
  arrayEq([0], (function(...args) { [...this.x] = args; return this.x; }).call({}, 0));
  return ok((typeof x === 'undefined' || x === null));
});

test("#1183: super + fat arrows", function() {
  const dolater = cb => cb();

  class A {
    constructor() {
      this._i = 0;
    }
    foo(cb) {
      return dolater(() => {
        this._i += 1;
        return cb();
      });
    }
  }

  class B extends A {
    constructor() {
      super();
    }
    foo(cb) {
      return dolater(() => {
        return dolater(() => {
          this._i += 2;
          return B.prototype.__proto__.foo.call(this, cb);
        });
      });
    }
  }

  const b = new B;
  return b.foo(() => eq(b._i, 3));
});

test("#1183: super + wrap", function() {
  class A {
    m() { return 10; }
  }

  class B extends A {
    constructor() { super(); }
    m() { let r;
    return r = (() => { try { return super.m(); } catch (error) {} })(); }
    m() { let r;
    return r = super.m(); }
  }

  return eq((new B).m(), 10);
});

test("#1183: super + closures", function() {
  class A {
    constructor() {
      this.i = 10;
    }
    foo() { return this.i; }
  }

  class B extends A {
    foo() {
      const ret = (() => { switch (1) {
        case 0: return 0;
        case 1: return super.foo();
      } })();
      return ret;
    }
  }
  return eq((new B).foo(), 10);
});

test("#2331: bound super regression", function() {
  class A {
    static initClass() {
      this.value = 'A';
    }
    method() { return this.constructor.value; }
  }
  A.initClass();

  class B extends A {
    constructor(...args) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.method = this.method.bind(this);
      super(...args);
    }

    method() { return super.method(); }
  }

  return eq((new B).method(), 'A');
});

test("#3259: leak with @-params within destructured parameters", function() {
  const fn = function({foo1}, [bar1], [{baz1}]) {
    let bar, baz, foo;
    this.foo = foo1;
    this.bar = bar1;
    this.baz = baz1;
    return foo = (bar = (baz = false));
  };

  fn.call({}, {foo: 'foo'}, ['bar'], [{baz: 'baz'}]);

  eq('undefined', typeof foo);
  eq('undefined', typeof bar);
  return eq('undefined', typeof baz);
});
