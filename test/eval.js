/* eslint-disable
    global-require,
    max-len,
    no-cond-assign,
    no-multi-str,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let vm;
if (vm = typeof require === 'function' ? require('vm') : undefined) {
  test('CoffeeScript.eval runs in the global context by default', () => {
    global.punctuation = '!';
    const code = '\
global.fhqwhgads = "global superpower#{global.punctuation}"\
';
    const result = CoffeeScript.eval(code);
    eq(result, 'global superpower!');
    return eq(fhqwhgads, 'global superpower!');
  });

  test('CoffeeScript.eval can run in, and modify, a Script context sandbox', () => {
    const createContext = vm.Script.createContext != null ? vm.Script.createContext : vm.createContext;
    const sandbox = createContext();
    sandbox.foo = 'bar';
    const code = '\
global.foo = \'not bar!\'\
';
    const result = CoffeeScript.eval(code, { sandbox });
    eq(result, 'not bar!');
    return eq(sandbox.foo, 'not bar!');
  });

  test('CoffeeScript.eval can run in, but cannot modify, an ordinary object sandbox', () => {
    const sandbox = { foo: 'bar' };
    const code = '\
global.foo = \'not bar!\'\
';
    const result = CoffeeScript.eval(code, { sandbox });
    eq(result, 'not bar!');
    return eq(sandbox.foo, 'bar');
  });
}
