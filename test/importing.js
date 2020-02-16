/* eslint-disable
    consistent-return,
    global-require,
    import/no-dynamic-require,
    no-return-assign,
    no-undef,
    no-underscore-dangle,
    no-use-before-define,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Importing
// ---------

if ((typeof window === 'undefined' || window === null) && (typeof testingBrowser === 'undefined' || testingBrowser === null)) {
  test('coffeescript modules can be imported and executed', () => {
    const magicKey = __filename;
    const magicValue = 0xFFFF;

    if (global[magicKey] != null) {
      if (typeof exports !== 'undefined' && exports !== null) {
        const local = magicValue;
        return exports.method = () => local;
      }
    } else {
      global[magicKey] = {};
      if ((typeof require !== 'undefined' && require !== null ? require.extensions : undefined) != null) {
        ok(require(__filename).method() === magicValue);
      }
      return delete global[magicKey];
    }
  });

  test('javascript modules can be imported', () => {
    const magicVal = 1;
    return Array.from('import.js import2 .import2 import.extension.js import.unknownextension .coffee .coffee.md'.split(' ')).map((module) => ok(__guardMethod__(require(`./importing/${module}`), 'value', (o) => o.value()) === magicVal, module));
  });

  test('coffeescript modules can be imported', () => {
    const magicVal = 2;
    return Array.from('.import.coffee import.coffee import.extension.coffee'.split(' ')).map((module) => ok(__guardMethod__(require(`./importing/${module}`), 'value', (o) => o.value()) === magicVal, module));
  });

  test('literate coffeescript modules can be imported', () => {
    const magicVal = 3;
    // Leading space intentional to check for index.coffee.md
    return Array.from(' .import.coffee.md import.coffee.md import.litcoffee import.extension.coffee.md'.split(' ')).map((module) => ok(__guardMethod__(require(`./importing/${module}`), 'value', (o) => o.value()) === magicVal, module));
  });
}

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  }
  return undefined;
}
