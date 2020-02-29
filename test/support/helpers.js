/* eslint-disable
    consistent-return,
    func-names,
    max-len,
    no-plusplus,
    no-self-compare,
    no-undef,
    no-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// See [http://wiki.ecmascript.org/doku.php?id=harmony:egal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
const egal = function (a, b) {
  if (a === b) {
    return (a !== 0) || ((1 / a) === (1 / b));
  }
  return (a !== a) && (b !== b);
};

// A recursive functional equivalence helper; uses egal for testing equivalence.
var arrayEgal = function (a, b) {
  if (egal(a, b)) {
    return true;
  } if (a instanceof Array && b instanceof Array) {
    if (a.length !== b.length) { return false; }
    for (let idx = 0; idx < a.length; idx++) { const el = a[idx]; if (!arrayEgal(el, b[idx])) { return false; } }
    return true;
  }
};

const diffOutput = function (expectedOutput, actualOutput) {
  const expectedOutputLines = expectedOutput.split('\n');
  const actualOutputLines = actualOutput.split('\n');
  for (let i = 0; i < actualOutputLines.length; i++) {
    const line = actualOutputLines[i];
    if (line !== expectedOutputLines[i]) {
      actualOutputLines[i] = `${yellow}${line}${reset}`;
    }
  }
  return `Expected generated JavaScript to be:
${reset}${expectedOutput}${red}
  but instead it was:
${reset}${actualOutputLines.join('\n')}${red}`;
};

exports.eq = (a, b, msg) => ok(egal(a, b), msg
|| `Expected ${reset}${a}${red} to equal ${reset}${b}${red}`);

exports.arrayEq = (a, b, msg) => ok(arrayEgal(a, b), msg
|| `Expected ${reset}${a}${red} to deep equal ${reset}${b}${red}`);

exports.eqJS = function (input, expectedOutput, msg) {
  const actualOutput = CoffeeScript.compile(input, { bare: true })
    .replace(/^\s+|\s+$/g, ''); // Trim leading/trailing whitespace.
  return ok(egal(expectedOutput, actualOutput), msg || diffOutput(expectedOutput, actualOutput));
};

exports.isWindows = () => process.platform === 'win32';
