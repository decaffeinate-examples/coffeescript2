/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// JavaScript Literals
// -------------------

test("inline JavaScript is evaluated", () => eq('\\`', 
  // Inline JS
  "\\`"

));

test("escaped backticks are output correctly", function() {
  const a = `2 + 2 = ${4}`;
  return eq(a, '2 + 2 = 4');
});

test("backslashes before a newline don’t break JavaScript blocks", function() {
  const a = `To be, or not\\
  to be.`;
  return eq(a, `\
To be, or not\\
  to be.`
  );
});

test("block inline JavaScript is evaluated", function() {
  
  const a = 1;
  const b = 2;
  
  const c = 3;
  const d = 4;
  return eq(a + b + c + d, 10);
});

test("block inline JavaScript containing backticks", function() {
  
  // This is a comment with `backticks`
  const a = 42;
  const b = `foo ${'bar'}`;
  const c = 3;
  const d = 'foo`bar`';
  
  eq(a + c, 45);
  eq(b, 'foo bar');
  return eq(d, 'foo`bar`');
});

test("block JavaScript can end with an escaped backtick character", function() {
  const a = `hello`;
  
  const b = `world${'!'}`;
  eq(a, 'hello');
  return eq(b, 'world!');
});

test("JavaScript block only escapes backslashes followed by backticks", () => eq('\\\n', '\\\n'));

test("escaped JavaScript blocks speed round", () => // The following has escaped backslashes because they’re required in strings, but the intent is this:
// `hello`                                       → hello;
// `\`hello\``                                   → `hello`;
// `\`Escaping backticks in JS: \\\`hello\\\`\`` → `Escaping backticks in JS: \`hello\``;
// `Single backslash: \ `                        → Single backslash: \ ;
// `Double backslash: \\ `                       → Double backslash: \\ ;
// `Single backslash at EOS: \\`                 → Single backslash at EOS: \;
// `Double backslash at EOS: \\\\`               → Double backslash at EOS: \\;
(() => {
  const result = [];
  for (let [input, output] of [
  ['`hello`',                                               'hello;'],
  ['`\\`hello\\``',                                         '`hello`;'],
  ['`\\`Escaping backticks in JS: \\\\\\`hello\\\\\\`\\``', '`Escaping backticks in JS: \\`hello\\``;'],
  ['`Single backslash: \\ `',                               'Single backslash: \\ ;'],
  ['`Double backslash: \\\\ `',                             'Double backslash: \\\\ ;'],
  ['`Single backslash at EOS: \\\\`',                       'Single backslash at EOS: \\;'],
  ['`Double backslash at EOS: \\\\\\\\`',                   'Double backslash at EOS: \\\\;']
]) {
    result.push(eqJS(input, output));
  }
  return result;
})());
