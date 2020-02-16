/* eslint-disable
    class-methods-use-this,
    consistent-return,
    default-case,
    func-names,
    implicit-arrow-linebreak,
    max-classes-per-file,
    no-await-in-loop,
    no-plusplus,
    no-restricted-properties,
    no-return-assign,
    no-return-await,
    no-shadow,
    no-undef,
    no-unreachable,
    no-unused-vars,
    no-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Functions that contain the `await` keyword will compile into async functions,
// supported by Node 7.6+, Chrome 55+, Firefox 52+, Safari 10.1+ and Edge.
// But runtimes that don’t support the `await` keyword will throw an error,
// even if we put `return unless global.supportsAsync` at the top of this file.
// Therefore we need to prevent runtimes which will choke on such code from even
// parsing it, which is handled in `Cakefile`.


// This is always fulfilled.
const winning = (val) => Promise.resolve(val);

// This is always rejected.
const failing = (val) => Promise.reject(new Error(val));


test('async as argument', () => ok(async () => await winning()));

test('explicit async', () => {
  const a = ((async () => 5))();
  eq(a.constructor, Promise);
  return a.then((val) => eq(val, 5));
});

test('implicit async', () => {
  const a = (async function () {
    const x = await winning(5);
    const y = await winning(4);
    const z = await winning(3);
    return [x, y, z];
  }());

  return eq(a.constructor, Promise);
});

test('async return value (implicit)', () => {
  let out = null;
  const a = async function () {
    const x = await winning(5);
    const y = await winning(4);
    const z = await winning(3);
    return [x, y, z];
  };

  const b = ((async () => out = await a()))();

  return b.then(() => arrayEq(out, [5, 4, 3]));
});

test('async return value (explicit)', () => {
  let out = null;
  const a = async () => [5, 2, 3];

  const b = ((async () => out = await a()))();

  return b.then(() => arrayEq(out, [5, 2, 3]));
});


test('async parameters', () => {
  let [out1, out2] = [null, null];
  const a = async function (a, [b, c]) {
    const arr = [a];
    arr.push(b);
    arr.push(c);
    return arr;
  };

  const b = async function (a, b, c = 5) {
    const arr = [a];
    arr.push(b);
    arr.push(c);
    return arr;
  };

  const c = (async function () {
    out1 = await a(5, [4, 3]);
    return out2 = await b(4, 4);
  }());

  return c.then(() => {
    arrayEq(out1, [5, 4, 3]);
    return arrayEq(out2, [4, 4, 5]);
  });
});

test('async `this` scoping', () => {
  let bnd = null;
  let ubnd = null;
  let nst = null;
  const obj = {
    bound() {
      return (async () => this)();
    },
    unbound() {
      return (async function () {
        return this;
      }());
    },
    nested() {
      return (async () => await (async () => await (async () => this)())())();
    },
  };

  const promise = (async function () {
    bnd = await obj.bound();
    ubnd = await obj.unbound();
    return nst = await obj.nested();
  }());

  return promise.then(() => {
    eq(bnd, obj);
    ok(ubnd !== obj);
    return eq(nst, obj);
  });
});

test('await precedence', () => {
  let out = null;

  const fn = (win, fail) => win(3);

  const promise = ((async () => // assert precedence between unary (new) and power (**) operators
    out = 1 + Math.pow(await new Promise(fn), 2)))();

  return promise.then(() => eq(out, 10));
});

test('`await` inside IIFEs', () => {
  let [x, y, z] = new Array(3);

  var a = (async function () {
    x = await (async () => {
      switch (4) { // switch 4
        case 2:
          return await winning(1);
        case 4:
          return await winning(5);
        case 7:
          return await winning(2);
      }
    })();

    y = await (async () => {
      try {
        const text = 'this should be caught';
        throw new Error(text);
        return await winning(1);
      } catch (e) {
        return await winning(4);
      }
    })();

    return z = await (async () => {
      const result = [];
      for (let i = 0; i <= 5; i++) {
        a = i * i;
        result.push(await winning(a));
      }
      return result;
    })();
  }());

  return a.then(() => {
    eq(x, 5);
    eq(y, 4);

    return arrayEq(z, [0, 1, 4, 9, 16, 25]);
  });
});

test('error handling', () => {
  let res = null;
  let val = 0;
  const a = async function () {
    try {
      return await failing('fail');
    } catch (e) {
      val = 7; // to assure the catch block runs
      return e;
    }
  };

  const b = ((async () => res = await a()))();

  return b.then(() => {
    eq(val, 7);

    ok(res.message != null);
    return eq(res.message, 'fail');
  });
});

test('await expression evaluates to argument if not A+', async () => eq(await 4, 4));


test('implicit call with `await`', async () => {
  const addOne = (arg) => arg + 1;

  const a = addOne(await 3);
  return eq(a, 4);
});

test('async methods in classes', async () => {
  class Base {
    static async static() {
      return await 1;
    }

    async method() {
      return await 2;
    }
  }

  eq(await Base.static(), 1);
  eq(await new Base().method(), 2);

  class Child extends Base {
    static static() { return super.static(); }

    method() { return super.method(); }
  }

  eq(await Child.static(), 1);
  return eq(await new Child().method(), 2);
});
