/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Exception Handling
// ------------------

// shared nonce
const nonce = {};


// Throw

test("basic exception throwing", () => throws((function() { throw 'error'; }), 'error'));


// Empty Try/Catch/Finally

test("try can exist alone", function() {
  try {} catch (error) {}
});

test("try/catch with empty try, empty catch", function() {
  try {}
    // nothing
  catch (err) {}
});
    // nothing

test("single-line try/catch with empty try, empty catch", function() {
  try {} catch (err) {}
});

test("try/finally with empty try, empty finally", function() {
  try {}
    // nothing
  finally {}
});
    // nothing

test("single-line try/finally with empty try, empty finally", function() {
  try {} finally {}
});

test("try/catch/finally with empty try, empty catch, empty finally", function() {
  try {}
  catch (err) {}
  finally {}
});

test("single-line try/catch/finally with empty try, empty catch, empty finally", function() {
  try {} catch (err) {} finally {}
});


// Try/Catch/Finally as an Expression

test("return the result of try when no exception is thrown", function() {
  const result = (() => { try {
    return nonce;
  } catch (err) {
    return undefined;
  }
  finally {
    undefined;
  } })();
  return eq(nonce, result);
});

test("single-line result of try when no exception is thrown", function() {
  const result = (() => { try { return nonce; } catch (err) { return undefined; } })();
  return eq(nonce, result);
});

test("return the result of catch when an exception is thrown", function() {
  const fn = function() {
    try {
      throw function() {};
    } catch (err) {
      return nonce;
    }
  };
  doesNotThrow(fn);
  return eq(nonce, fn());
});

test("single-line result of catch when an exception is thrown", function() {
  const fn = function() {
    try { throw (function() {}); } catch (err) { return nonce; }
  };
  doesNotThrow(fn);
  return eq(nonce, fn());
});

test("optional catch", function() {
  const fn = function() {
    try { throw function() {}; } catch (error) {}
    return nonce;
  };
  doesNotThrow(fn);
  return eq(nonce, fn());
});


// Try/Catch/Finally Interaction With Other Constructs

test("try/catch with empty catch as last statement in a function body", function() {
  const fn = function() {
    try { return nonce; }
    catch (err) {}
  };
  return eq(nonce, fn());
});

test("#1595: try/catch with a reused variable name", function() {
  // `catch` shouldn’t lead to broken scoping.
  (function() {
    let inner;
    try {
      return inner = 5;
    } catch (error) { return inner = error; }
  })();
      // nothing
  return eq(typeof inner, 'undefined');
});

test("#2580: try/catch with destructuring the exception object", function() {
  let message;
  const result = (() => { try {
    return missing.object;
  } catch (error) {
    ({message} = error);
    return message;
  } })();

  return eq(message, 'missing is not defined');
});

test("Try catch finally as implicit arguments", function() {
  let foo, e;
  const first = x => x;

  foo = false;
  try {
    first((() => { try { return iamwhoiam(); } finally {foo = true; } })());
  } catch (error) { e = error; }
  eq(foo, true);

  let bar = false;
  try {
    first((() => { try { return iamwhoiam(); } catch (error1) { return e = error1; } finally {} })());
    bar = true;
  } catch (error2) { e = error2; }
  return eq(bar, true);
});

test("#2900: parameter-less catch clause", function() {
  // `catch` should not require a parameter.
  try {
    throw new Error('failed');
  } catch (error) {
    ok(true);
  }

  try { throw new Error('failed'); } catch (error1) {} finally {ok(true); }

  return ok((() => { try { throw new Error('failed'); } catch (error2) { return true; } })());
});

test("#3709: throwing an if statement", function() {
  // `throw if` should return a closure around the `if` block, so that the
  // output is valid JavaScript.
  let err;
  try {
    throw false ?
        new Error('drat!')
      :
        new Error('no escape!');
  } catch (error) {
    err = error;
    eq(err.message, 'no escape!');
  }

  try {
    throw true ? new Error('huh?') : null;
  } catch (error1) {
    err = error1;
    return eq(err.message, 'huh?');
  }
});

test("#3709: throwing a switch statement", function() {
  const i = 3;
  try {
    throw (() => { switch (i) {
      case 2:
        return new Error('not this one');
      case 3:
        return new Error('oh no!');
    } })();
  } catch (err) {
    return eq(err.message, 'oh no!');
  }
});

test("#3709: throwing a for loop", function() {
  // `throw for` should return a closure around the `for` block, so that the
  // output is valid JavaScript.
  try {
    throw [0, 1, 2, 3].map((i) =>
      i * 2);
  } catch (err) {
    return arrayEq(err, [0, 2, 4, 6]);
  }
});

test("#3709: throwing a while loop", function() {
  let i = 0;
  try {
    throw (() => {
      const result = [];
      while (i < 3) {
        result.push(i++);
      }
      return result;
    })();
  } catch (err) {
    return eq(i, 3);
  }
});

test("#3789: throwing a throw", function() {
  try {
    throw (() => { throw (() => { throw new Error('whoa!'); })(); })();
  } catch (err) {
    return eq(err.message, 'whoa!');
  }
});
