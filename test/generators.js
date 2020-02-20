/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Generators
// -----------------
//
// * Generator Definition

test("most basic generator support", () => ok(function*() { return yield; }));

test("empty generator", function() {
  const x = (function*() {  })();

  const y = x.next();
  return ok((y.value === undefined) && (y.done === true));
});

test("generator iteration", function() {
  const x = (function*() {
    yield 0;
    yield;
    yield 2;
    return 3;
  })();

  let y = x.next();
  ok((y.value === 0) && (y.done === false));

  y = x.next();
  ok((y.value === undefined) && (y.done === false));

  y = x.next();
  ok((y.value === 2) && (y.done === false));

  y = x.next();
  return ok((y.value === 3) && (y.done === true));
});

test("last line yields are returned", function() {
  const x = (function*() {
    return yield 3;
  })();
  let y = x.next();
  ok((y.value === 3) && (y.done === false));

  y = x.next(42);
  return ok((y.value === 42) && (y.done === true));
});

test("yield return can be used anywhere in the function body", function() {
  const x = (function*() {
    if (2 === (yield 1)) {
      return 42;
    }
    throw new Error("this code shouldn't be reachable");
  })();

  let y = x.next();
  ok((y.value === 1) && (y.done === false));

  y = x.next(2);
  return ok((y.value === 42) && (y.done === true));
});

test("`yield from` support", function() {
  const x = (function*() {
    return yield* (function*() {
      return yield* (function*() {
        const result = [];
        for (let i = 3; i <= 4; i++) {
          result.push(yield i);
        }
        return result;
      }).call(this);
    })();
  })();

  let y = x.next();
  ok((y.value === 3) && (y.done === false));

  y = x.next(1);
  ok((y.value === 4) && (y.done === false));

  y = x.next(2);
  arrayEq(y.value, [1, 2]);
  return ok(y.done === true);
});

test("error if `yield from` occurs outside of a function", () => throws(() => CoffeeScript.compile('yield from 1')));

test("`yield from` at the end of a function errors", () => throws(() => CoffeeScript.compile('x = -> x = 1; yield from')));

test("yield in if statements", function() {
  const x = (function*() { if (1 === (yield 2)) { return 3; } else { return 4; } })();

  let y = x.next();
  ok((y.value === 2) && (y.done === false));

  y = x.next(1);
  return ok((y.value === 3) && (y.done === true));
});

test("yielding if statements", function() {
  const x = (function*() { return yield (true ? 3 : 4); })();

  let y = x.next();
  ok((y.value === 3) && (y.done === false));

  y = x.next(42);
  return ok((y.value === 42) && (y.done === true));
});

test("yield in for loop expressions", function() {
  const x = (function*() {
    let y;
    return y = yield* (function*() {
      const result = [];
      for (let i = 1; i <= 3; i++) {
        result.push(yield (i * 2));
      }
      return result;
    }).call(this);
  })();

  let z = x.next();
  ok((z.value === 2) && (z.done === false));

  z = x.next(10);
  ok((z.value === 4) && (z.done === false));

  z = x.next(20);
  ok((z.value === 6) && (z.done === false));

  z = x.next(30);
  arrayEq(z.value, [10, 20, 30]);
  return ok(z.done === true);
});

test("yield in switch expressions", function() {
  const x = (function*() {
    let y;
    return y = yield* (function*() { switch ((yield 1)) {
      case 2: return yield 1337;
      default: return 1336;
    } }).call(this);
  })();

  let z = x.next();
  ok((z.value === 1) && (z.done === false));

  z = x.next(2);
  ok((z.value === 1337) && (z.done === false));

  z = x.next(3);
  return ok((z.value === 3) && (z.done === true));
});

test("yielding switch expressions", function() {
  const x = (function*() {
    return yield (() => { switch (1337) {
      case 1337: return 1338;
      default: return 1336;
    } })();
  })();

  let y = x.next();
  ok((y.value === 1338) && (y.done === false));

  y = x.next(42);
  return ok((y.value === 42) && (y.done === true));
});

test("yield in try expressions", function() {
  const x = (function*() {
    try { return yield 1; } catch (error) {}
  })();

  let y = x.next();
  ok((y.value === 1) && (y.done === false));

  y = x.next(42);
  return ok((y.value === 42) && (y.done === true));
});

test("yielding try expressions", function() {
  const x = (function*() {
    return yield (() => { try { return 1; } catch (error) {} })();
  })();

  let y = x.next();
  ok((y.value === 1) && (y.done === false));

  y = x.next(42);
  return ok((y.value === 42) && (y.done === true));
});

test("`yield` can be thrown", function() {
  const x = (function*() {
    throw (yield null);
  })();
  x.next();
  return throws(() => x.next(new Error("boom")));
});

test("`throw` can be yielded", function() {
  const x = (function*() {
    return yield (() => { throw new Error("boom"); })();
  })();
  return throws(() => x.next());
});

test("symbolic operators has precedence over the `yield`", function() {
  let op;
  const symbolic   = '+ - * / << >> & | || && ** ^ // or and'.split(' ');
  const compound   = ((() => {
    const result = [];
    for (op of Array.from(symbolic)) {       result.push(`${op}=`);
    }
    return result;
  })());
  const relations  = '< > == != <= >= is isnt'.split(' ');

  const operators  = [...symbolic, '=', ...compound, ...relations];

  const collect = gen => (() => {
    let ref;
    const result1 = [];
    while (!(ref = gen.next()).done) {
      result1.push(ref.value);
    }
    return result1;
  })();

  const values = [0, 1, 2, 3];
  return (() => {
    const result1 = [];
    for (op of Array.from(operators)) {
      const expression = `i ${op} 2`;

      const yielded = CoffeeScript.eval(`(arr) ->  yield ${expression} for i in arr`);
      const mapped  = CoffeeScript.eval(`(arr) ->       (${expression} for i in arr)`);

      result1.push(arrayEq(mapped(values), collect(yielded(values))));
    }
    return result1;
  })();
});

test("yield handles 'this' correctly", function() {
  const x = function*() {
    yield (yield* (function*() { switch (false) {
      case !true: return yield () => this;
    } }).call(this));
    const array = yield* (function*() {
      const result = [];
      for (let item of [1]) {
        result.push(yield () => this);
      }
      return result;
    }).call(this);
    yield array;
    yield true ? (yield () => this) : undefined;
    yield (yield* (function*() { try { throw (yield () => this); } catch (error) {} }).call(this));
    throw (yield () => this);
  };

  const y = x.call([1, 2, 3]);

  let z = y.next();
  arrayEq(z.value(), [1, 2, 3]);
  ok(z.done === false);

  z = y.next(123);
  ok((z.value === 123) && (z.done === false));

  z = y.next();
  arrayEq(z.value(), [1, 2, 3]);
  ok(z.done === false);

  z = y.next(42);
  arrayEq(z.value, [42]);
  ok(z.done === false);

  z = y.next();
  arrayEq(z.value(), [1, 2, 3]);
  ok(z.done === false);

  z = y.next(456);
  ok((z.value === 456) && (z.done === false));

  z = y.next();
  arrayEq(z.value(), [1, 2, 3]);
  ok(z.done === false);

  z = y.next(new Error("ignore me"));
  ok((z.value === undefined) && (z.done === false));

  z = y.next();
  arrayEq(z.value(), [1, 2, 3]);
  ok(z.done === false);

  return throws(() => y.next(new Error("boom")));
});

test("for-from loops over generators", function() {
  let x;
  const array1 = [50, 30, 70, 20];
  const gen = function*() { return yield* array1; };

  const array2 = [];
  const array3 = [];
  const array4 = [];

  const iterator = gen();
  for (x of iterator) {
    array2.push(x);
    if (x === 30) { break; }
  }

  for (x of iterator) {
    array3.push(x);
  }

  for (x of iterator) {
    array4.push(x);
  }

  arrayEq(array2, [50, 30]);
  // Different JS engines have different opinions on the value of array3:
  // https://github.com/jashkenas/coffeescript/pull/4306#issuecomment-257066877
  // As a temporary measure, either result is accepted.
  ok((array3.length === 0) || (array3.join(',') === '70,20'));
  return arrayEq(array4, []);
});

test("for-from comprehensions over generators", function() {
  let x;
  const gen = function*() {
    return yield* [30, 41, 51, 60];
  };

  const iterator = gen();
  const array1 = ((() => {
    const result = [];
    for (x of iterator) {       if (__mod__(x, 2) === 1) {
        result.push(x);
      }
    }
    return result;
  })());
  const array2 = ((() => {
    const result1 = [];
    for (x of iterator) {       result1.push(x);
    }
    return result1;
  })());

  ok(array1.join(' ') === '41 51');
  return ok(array2.length === 0);
});

test("from as an iterable variable name in a for loop declaration", function() {
  const from = [1, 2, 3];
  const out = [];
  for (let i of from) {
    out.push(i);
  }
  return arrayEq(from, out);
});

test("from as an iterator variable name in a for loop declaration", function() {
  const a = [1, 2, 3];
  const b = [];
  for (let from of a) {
    b.push(from);
  }
  return arrayEq(a, b);
});

test("from as a destructured object variable name in a for loop declaration", function() {
  let from, to;
  const a = [{
      from: 1,
      to: 2
    }
    , {
      from: 3,
      to: 4
    }
  ];
  const b = [];
  for ({from, to} of Array.from(a)) {
    b.push(from);
  }
  arrayEq(b, [1, 3]);

  const c = [];
  for ({to, from} of Array.from(a)) {
    c.push(from);
  }
  return arrayEq(c, [1, 3]);
});

test("from as a destructured, aliased object variable name in a for loop declaration", function() {
  const a = [{
      b: 1,
      c: 2
    }
    , {
      b: 3,
      c: 4
    }
  ];
  const out = [];

  for (let {b: from} of Array.from(a)) {
    out.push(from);
  }
  return arrayEq(out, [1, 3]);
});

test("from as a destructured array variable name in a for loop declaration", function() {
  const a = [
    [1, 2],
    [3, 4]
  ];
  const b = [];
  for (let [from, to] of a) {
    b.push(from);
  }
  return arrayEq(b, [1, 3]);
});

test("generator methods in classes", function() {
  class Base {
    static *static() {
      return yield 1;
    }
    *method() {
      return yield 2;
    }
  }

  arrayEq([1], Array.from(Base.static()));
  arrayEq([2], Array.from(new Base().method()));

  class Child extends Base {
    static static() { return super.static(); }
    method() { return super.method(); }
  }

  arrayEq([1], Array.from(Child.static()));
  return arrayEq([2], Array.from(new Child().method()));
});

function __mod__(a, b) {
  a = +a;
  b = +b;
  return (a % b + b) % b;
}