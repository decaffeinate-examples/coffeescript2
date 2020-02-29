/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Error Formatting
// ----------------

// Ensure that errors of different kinds (lexer, parser and compiler) are shown
// in a consistent way.

const assertErrorFormat = (code, expectedErrorFormat) => throws((() => CoffeeScript.run(code)), function(err) {
  err.colorful = false;
  eq(expectedErrorFormat, `${err}`);
  return true;
});

test("lexer errors formatting", () => assertErrorFormat(`\
normalObject    = {}
insideOutObject = }{\
`,
`\
[stdin]:2:19: error: unmatched }
insideOutObject = }{
                ^\
`
));

test("parser error formatting", () => assertErrorFormat(`\
foo in bar or in baz\
`,
`\
[stdin]:1:15: error: unexpected in
foo in bar or in baz
            ^^\
`
));

test("compiler error formatting", () => assertErrorFormat(`\
evil = (foo, eval, bar) ->\
`,
`\
[stdin]:1:14: error: 'eval' can't be assigned
evil = (foo, eval, bar) ->
           ^^^^\
`
));

if (typeof require !== 'undefined' && require !== null) {
  const os   = require('os');
  const fs   = require('fs');
  const path = require('path');

  test("patchStackTrace line patching", function() {
    const err = new Error('error');
    return ok(err.stack.match(/test[\/\\]error_messages\.coffee:\d+:\d+\b/));
  });

  test("patchStackTrace stack prelude consistent with V8", function() {
    let err = new Error;
    ok(err.stack.match(/^Error\n/)); // Notice no colon when no message.

    err = new Error('error');
    return ok(err.stack.match(/^Error: error\n/));
  });

  test("#2849: compilation error in a require()d file", function() {
    // Create a temporary file to require().
    const tempFile = path.join(os.tmpdir(), 'syntax-error.coffee');
    ok(!fs.existsSync(tempFile));
    fs.writeFileSync(tempFile, 'foo in bar or in baz');

    try {
      return assertErrorFormat(`\
require '${tempFile.replace(/\\/g, '\\\\')}'\
`,
      `\
${fs.realpathSync(tempFile)}:1:15: error: unexpected in
foo in bar or in baz
              ^^\
`
      );
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  test("#3890: Error.prepareStackTrace doesn't throw an error if a compiled file is deleted", function() {
    // Adapted from https://github.com/atom/coffee-cash/blob/master/spec/coffee-cash-spec.coffee
    let error;
    const filePath = path.join(os.tmpdir(), 'PrepareStackTraceTestFile.coffee');
    fs.writeFileSync(filePath, "module.exports = -> throw new Error('hello world')");
    const throwsAnError = require(filePath);
    fs.unlinkSync(filePath);

    try {
      throwsAnError();
    } catch (error1) { error = error1; }

    eq(error.message, 'hello world');
    doesNotThrow(() => error.stack);
    return notEqual(error.stack.toString().indexOf(filePath), -1);
  });

  test("#4418: stack traces for compiled files reference the correct line number", function() {
    // The browser is already compiling other anonymous scripts (the tests)
    // which will conflict.
    let error;
    if (global.testingBrowser) { return; }
    const filePath = path.join(os.tmpdir(), 'StackTraceLineNumberTestFile.coffee');
    const fileContents = `\
testCompiledFileStackTraceLineNumber = ->
  # \`a\` on the next line is undefined and should throw a ReferenceError
  console.log a if true

do testCompiledFileStackTraceLineNumber\
`;
    fs.writeFileSync(filePath, fileContents);

    try {
      require(filePath);
    } catch (error1) { error = error1; }
    fs.unlinkSync(filePath);

    // Make sure the line number reported is line 3 (the original Coffee source)
    // and not line 6 (the generated JavaScript).
    return eq(/StackTraceLineNumberTestFile.coffee:(\d)/.exec(error.stack.toString())[1], '3');
  });
}


test("#4418: stack traces for compiled strings reference the correct line number", function() {
  // The browser is already compiling other anonymous scripts (the tests)
  // which will conflict.
  let error;
  if (global.testingBrowser) { return; }
  try {
    CoffeeScript.run(`\
testCompiledStringStackTraceLineNumber = ->
  # \`a\` on the next line is undefined and should throw a ReferenceError
  console.log a if true

do testCompiledStringStackTraceLineNumber\
`
    );
  } catch (error1) { error = error1; }

  // Make sure the line number reported is line 3 (the original Coffee source)
  // and not line 6 (the generated JavaScript).
  return eq(/testCompiledStringStackTraceLineNumber.*:(\d):/.exec(error.stack.toString())[1], '3');
});


test("#4558: compiling a string inside a script doesn’t screw up stack trace line number", function() {
  // The browser is already compiling other anonymous scripts (the tests)
  // which will conflict.
  let error;
  if (global.testingBrowser) { return; }
  try {
    CoffeeScript.run(`\
testCompilingInsideAScriptDoesntScrewUpStackTraceLineNumber = ->
  if require?
    CoffeeScript = require './lib/coffeescript'
    CoffeeScript.compile ''
  throw new Error 'Some Error'

do testCompilingInsideAScriptDoesntScrewUpStackTraceLineNumber\
`
    );
  } catch (error1) { error = error1; }

  // Make sure the line number reported is line 5 (the original Coffee source)
  // and not line 10 (the generated JavaScript).
  return eq(/testCompilingInsideAScriptDoesntScrewUpStackTraceLineNumber.*:(\d):/.exec(error.stack.toString())[1], '5');
});

test("#1096: unexpected generated tokens", function() {
  // Implicit ends
  assertErrorFormat('a:, b', `\
[stdin]:1:3: error: unexpected ,
a:, b
  ^\
`
  );
  // Explicit ends
  assertErrorFormat('(a:)', `\
[stdin]:1:4: error: unexpected )
(a:)
   ^\
`
  );
  // Unexpected end of file
  assertErrorFormat('a:', `\
[stdin]:1:3: error: unexpected end of input
a:
  ^\
`
  );
  assertErrorFormat('a +', `\
[stdin]:1:4: error: unexpected end of input
a +
   ^\
`
  );
  // Unexpected key in implicit object (an implicit object itself is _not_
  // unexpected here)
  assertErrorFormat(`\
for i in [1]:
  1\
`, `\
[stdin]:2:4: error: unexpected end of input
  1
   ^\
`
  );
  // Unexpected regex
  assertErrorFormat('{/a/i: val}', `\
[stdin]:1:2: error: unexpected regex
{/a/i: val}
 ^^^^\
`
  );
  assertErrorFormat('{///a///i: val}', `\
[stdin]:1:2: error: unexpected regex
{///a///i: val}
 ^^^^^^^^\
`
  );
  assertErrorFormat('{///#{a}///i: val}', `\
[stdin]:1:2: error: unexpected regex
{///#{a}///i: val}
 ^^^^^^^^^^^\
`
  );
  // Unexpected string
  assertErrorFormat('import foo from "lib-#{version}"', `\
[stdin]:1:17: error: the name of the module to be imported from must be an uninterpolated string
import foo from "lib-#{version}"
                ^^^^^^^^^^^^^^^^\
`
  );

  // Unexpected number
  return assertErrorFormat('"a"0x00Af2', `\
[stdin]:1:4: error: unexpected number
"a"0x00Af2
   ^^^^^^^\
`
  );
});

test("#1316: unexpected end of interpolation", function() {
  assertErrorFormat(`\
"#{+}"\
`, `\
[stdin]:1:5: error: unexpected end of interpolation
"#{+}"
    ^\
`
  );
  assertErrorFormat(`\
"#{++}"\
`, `\
[stdin]:1:6: error: unexpected end of interpolation
"#{++}"
     ^\
`
  );
  assertErrorFormat(`\
"#{-}"\
`, `\
[stdin]:1:5: error: unexpected end of interpolation
"#{-}"
    ^\
`
  );
  assertErrorFormat(`\
"#{--}"\
`, `\
[stdin]:1:6: error: unexpected end of interpolation
"#{--}"
     ^\
`
  );
  assertErrorFormat(`\
"#{~}"\
`, `\
[stdin]:1:5: error: unexpected end of interpolation
"#{~}"
    ^\
`
  );
  assertErrorFormat(`\
"#{!}"\
`, `\
[stdin]:1:5: error: unexpected end of interpolation
"#{!}"
    ^\
`
  );
  assertErrorFormat(`\
"#{not}"\
`, `\
[stdin]:1:7: error: unexpected end of interpolation
"#{not}"
      ^\
`
  );
  assertErrorFormat(`\
"#{5) + (4}_"\
`, `\
[stdin]:1:5: error: unmatched )
"#{5) + (4}_"
    ^\
`
  );
  // #2918
  return assertErrorFormat(`\
"#{foo.}"\
`, `\
[stdin]:1:8: error: unexpected end of interpolation
"#{foo.}"
       ^\
`
  );
});

test("#3325: implicit indentation errors", () => assertErrorFormat(`\
i for i in a then i\
`, `\
[stdin]:1:14: error: unexpected then
i for i in a then i
           ^^^^\
`
));

test("explicit indentation errors", () => assertErrorFormat(`\
a = b
c\
`, `\
[stdin]:2:1: error: unexpected indentation
c
^^\
`
));

test("unclosed strings", function() {
  assertErrorFormat(`\
'\
`, `\
[stdin]:1:1: error: missing '
'
^\
`
  );
  assertErrorFormat(`\
"\
`, `\
[stdin]:1:1: error: missing "
"
^\
`
  );
  assertErrorFormat(`\
'''\
`, `\
[stdin]:1:1: error: missing '''
'''
^^^\
`
  );
  assertErrorFormat(`\
"""\
`, `\
[stdin]:1:1: error: missing """
"""
^^^\
`
  );
  assertErrorFormat(`\
"#{"\
`, `\
[stdin]:1:4: error: missing "
"#{"
   ^\
`
  );
  assertErrorFormat(`\
"""#{"\
`, `\
[stdin]:1:6: error: missing "
"""#{"
     ^\
`
  );
  assertErrorFormat(`\
"#{"""\
`, `\
[stdin]:1:4: error: missing """
"#{"""
   ^^^\
`
  );
  assertErrorFormat(`\
"""#{"""\
`, `\
[stdin]:1:6: error: missing """
"""#{"""
     ^^^\
`
  );
  assertErrorFormat(`\
///#{"""\
`, `\
[stdin]:1:6: error: missing """
///#{"""
     ^^^\
`
  );
  assertErrorFormat(`\
"a
  #{foo """
    bar
      #{ +'12 }
    baz
    """} b"\
`, `\
[stdin]:4:11: error: missing '
      #{ +'12 }
          ^\
`
  );
  // https://github.com/jashkenas/coffeescript/issues/3301#issuecomment-31735168
  return assertErrorFormat(`\
# Note the double escaping; this would be \`"""a\"""\` real code.
"""a\\"""\
`, `\
[stdin]:2:1: error: missing """
"""a\\"""
^^^\
`
  );
});

test("unclosed heregexes", function() {
  assertErrorFormat(`\
///\
`, `\
[stdin]:1:1: error: missing ///
///
^^^\
`
  );
  // https://github.com/jashkenas/coffeescript/issues/3301#issuecomment-31735168
  return assertErrorFormat(`\
# Note the double escaping; this would be \`///a\///\` real code.
///a\\///\
`, `\
[stdin]:2:1: error: missing ///
///a\\///
^^^\
`
  );
});

test("unexpected token after string", function() {
  // Parsing error.
  assertErrorFormat(`\
'foo'bar\
`, `\
[stdin]:1:6: error: unexpected identifier
'foo'bar
     ^^^\
`
  );
  assertErrorFormat(`\
"foo"bar\
`, `\
[stdin]:1:6: error: unexpected identifier
"foo"bar
     ^^^\
`
  );
  // Lexing error.
  assertErrorFormat(`\
'foo'bar'\
`, `\
[stdin]:1:9: error: missing '
'foo'bar'
        ^\
`
  );
  return assertErrorFormat(`\
"foo"bar"\
`, `\
[stdin]:1:9: error: missing "
"foo"bar"
        ^\
`
  );
});

test("#3348: Location data is wrong in interpolations with leading whitespace", () => assertErrorFormat(`\
"#{ * }"\
`, `\
[stdin]:1:5: error: unexpected *
"#{ * }"
  ^\
`
));

test("octal escapes", function() {
  assertErrorFormat(`\
"a\\0\\tb\\\\\\07c"\
`, `\
[stdin]:1:10: error: octal escape sequences are not allowed \\07
"a\\0\\tb\\\\\\07c"
  \  \   \ \ ^\^^\
`
  );
  assertErrorFormat(`\
"a
  #{b} \\1"\
`, `\
[stdin]:2:8: error: octal escape sequences are not allowed \\1
  #{b} \\1"
       ^\^\
`
  );
  assertErrorFormat(`\
/a\\0\\tb\\\\\\07c/\
`, `\
[stdin]:1:10: error: octal escape sequences are not allowed \\07
/a\\0\\tb\\\\\\07c/
  \  \   \ \ ^\^^\
`
  );
  assertErrorFormat(`\
/a\\1\\tb\\\\\\07c/\
`, `\
[stdin]:1:10: error: octal escape sequences are not allowed \\07
/a\\1\\tb\\\\\\07c/
  \  \   \ \ ^\^^\
`
  );
  return assertErrorFormat(`\
///a
  #{b} \\01///\
`, `\
[stdin]:2:8: error: octal escape sequences are not allowed \\01
  #{b} \\01///
       ^\^^\
`
  );
});

test("#3795: invalid escapes", function() {
  assertErrorFormat(`\
"a\\0\\tb\\\\\\x7g"\
`, `\
[stdin]:1:10: error: invalid escape sequence \\x7g
"a\\0\\tb\\\\\\x7g"
  \  \   \ \ ^\^^^\
`
  );
  assertErrorFormat(`\
"a
  #{b} \\uA02
 c"\
`, `\
[stdin]:2:8: error: invalid escape sequence \\uA02
  #{b} \\uA02
       ^\^^^^\
`
  );
  assertErrorFormat(`\
/a\\u002space/\
`, `\
[stdin]:1:3: error: invalid escape sequence \\u002s
/a\\u002space/
  ^\^^^^^\
`
  );
  assertErrorFormat(`\
///a \\u002 0 space///\
`, `\
[stdin]:1:6: error: invalid escape sequence \\u002 \n\
///a \\u002 0 space///
     ^\^^^^^\
`
  );
  assertErrorFormat(`\
///a
  #{b} \\x0
 c///\
`, `\
[stdin]:2:8: error: invalid escape sequence \\x0
  #{b} \\x0
       ^\^^\
`
  );
  return assertErrorFormat(`\
/ab\\u/\
`, `\
[stdin]:1:4: error: invalid escape sequence \\u
/ab\\u/
   ^\^\
`
  );
});

test("illegal herecomment", () => assertErrorFormat(`\
###
Regex: /a*/g
###\
`, `\
[stdin]:2:12: error: block comments cannot contain */
Regex: /a*/g
         ^^\
`
));

test("#1724: regular expressions beginning with *", function() {
  assertErrorFormat(`\
/* foo/\
`, `\
[stdin]:1:2: error: regular expressions cannot begin with *
/* foo/
 ^\
`
  );
  return assertErrorFormat(`\
///
  * foo
///\
`, `\
[stdin]:2:3: error: regular expressions cannot begin with *
  * foo
  ^\
`
  );
});

test("invalid regex flags", function() {
  assertErrorFormat(`\
/a/ii\
`, `\
[stdin]:1:4: error: invalid regular expression flags ii
/a/ii
   ^^\
`
  );
  assertErrorFormat(`\
/a/G\
`, `\
[stdin]:1:4: error: invalid regular expression flags G
/a/G
   ^\
`
  );
  assertErrorFormat(`\
/a/gimi\
`, `\
[stdin]:1:4: error: invalid regular expression flags gimi
/a/gimi
   ^^^^\
`
  );
  assertErrorFormat(`\
/a/g_\
`, `\
[stdin]:1:4: error: invalid regular expression flags g_
/a/g_
   ^^\
`
  );
  assertErrorFormat(`\
///a///ii\
`, `\
[stdin]:1:8: error: invalid regular expression flags ii
///a///ii
       ^^\
`
  );
  return doesNotThrow(() => CoffeeScript.compile('/a/ymgi'));
});

test("missing `)`, `}`, `]`", function() {
  assertErrorFormat(`\
(\
`, `\
[stdin]:1:1: error: missing )
(
^\
`
  );
  assertErrorFormat(`\
{\
`, `\
[stdin]:1:1: error: missing }
{
^\
`
  );
  assertErrorFormat(`\
[\
`, `\
[stdin]:1:1: error: missing ]
[
^\
`
  );
  assertErrorFormat(`\
obj = {a: [1, (2+\
`, `\
[stdin]:1:15: error: missing )
obj = {a: [1, (2+
              ^\
`
  );
  assertErrorFormat(`\
"#{\
`, `\
[stdin]:1:3: error: missing }
"#{
  ^\
`
  );
  return assertErrorFormat(`\
"""
  foo#{ bar "#{1}"\
`, `\
[stdin]:2:7: error: missing }
  foo#{ bar "#{1}"
      ^\
`
  );
});

test("unclosed regexes", function() {
  assertErrorFormat(`\
/\
`, `\
[stdin]:1:1: error: missing / (unclosed regex)
/
^\
`
  );
  assertErrorFormat(`\
# Note the double escaping; this would be \`/a\/\` real code.
/a\\/\
`, `\
[stdin]:2:1: error: missing / (unclosed regex)
/a\\/
^\
`
  );
  return assertErrorFormat(`\
/// ^
  a #{""" ""#{if /[/].test "|" then 1 else 0}"" """}
///\
`, `\
[stdin]:2:18: error: missing / (unclosed regex)
  a #{""" ""#{if /[/].test "|" then 1 else 0}"" """}
                 ^\
`
  );
});

test("duplicate function arguments", function() {
  assertErrorFormat(`\
(foo, bar, foo) ->\
`, `\
[stdin]:1:12: error: multiple parameters named 'foo'
(foo, bar, foo) ->
           ^^^\
`
  );
  return assertErrorFormat(`\
(@foo, bar, @foo) ->\
`, `\
[stdin]:1:13: error: multiple parameters named '@foo'
(@foo, bar, @foo) ->
            ^^^^\
`
  );
});

test("reserved words", function() {
  assertErrorFormat(`\
case\
`, `\
[stdin]:1:1: error: reserved word 'case'
case
^^^^\
`
  );
  assertErrorFormat(`\
case = 1\
`, `\
[stdin]:1:1: error: reserved word 'case'
case = 1
^^^^\
`
  );
  assertErrorFormat(`\
for = 1\
`, `\
[stdin]:1:1: error: keyword 'for' can't be assigned
for = 1
^^^\
`
  );
  assertErrorFormat(`\
unless = 1\
`, `\
[stdin]:1:1: error: keyword 'unless' can't be assigned
unless = 1
^^^^^^\
`
  );
  assertErrorFormat(`\
for += 1\
`, `\
[stdin]:1:1: error: keyword 'for' can't be assigned
for += 1
^^^\
`
  );
  assertErrorFormat(`\
for &&= 1\
`, `\
[stdin]:1:1: error: keyword 'for' can't be assigned
for &&= 1
^^^\
`
  );
  // Make sure token look-behind doesn't go out of range.
  assertErrorFormat(`\
&&= 1\
`, `\
[stdin]:1:1: error: unexpected &&=
&&= 1
^^^\
`
  );
  // #2306: Show unaliased name in error messages.
  return assertErrorFormat(`\
on = 1\
`, `\
[stdin]:1:1: error: keyword 'on' can't be assigned
on = 1
^^\
`
  );
});

test("strict mode errors", function() {
  assertErrorFormat(`\
eval = 1\
`, `\
[stdin]:1:1: error: 'eval' can't be assigned
eval = 1
^^^^\
`
  );
  assertErrorFormat(`\
class eval\
`, `\
[stdin]:1:7: error: 'eval' can't be assigned
class eval
      ^^^^\
`
  );
  assertErrorFormat(`\
arguments++\
`, `\
[stdin]:1:1: error: 'arguments' can't be assigned
arguments++
^^^^^^^^^\
`
  );
  return assertErrorFormat(`\
--arguments\
`, `\
[stdin]:1:3: error: 'arguments' can't be assigned
--arguments
  ^^^^^^^^^\
`
  );
});

test("invalid numbers", function() {
  assertErrorFormat(`\
0X0\
`, `\
[stdin]:1:2: error: radix prefix in '0X0' must be lowercase
0X0
 ^\
`
  );
  assertErrorFormat(`\
10E0\
`, `\
[stdin]:1:3: error: exponential notation in '10E0' must be indicated with a lowercase 'e'
10E0
  ^\
`
  );
  assertErrorFormat(`\
018\
`, `\
[stdin]:1:1: error: decimal literal '018' must not be prefixed with '0'
018
^^^\
`
  );
  return assertErrorFormat(`\
010\
`, `\
[stdin]:1:1: error: octal literal '010' must be prefixed with '0o'
010
^^^\
`
  );
});


test("unexpected object keys", function() {
  assertErrorFormat(`\
{(a + "b")}\
`, `\
[stdin]:1:11: error: unexpected }
{(a + "b")}
          ^\
`
  );
  assertErrorFormat(`\
{(a + "b"): 1}\
`, `\
[stdin]:1:11: error: unexpected :
{(a + "b"): 1}
          ^\
`
  );
  return assertErrorFormat(`\
(a + "b"): 1\
`, `\
[stdin]:1:10: error: unexpected :
(a + "b"): 1
         ^\
`
  );
});

test("invalid object keys", function() {
  assertErrorFormat(`\
@a: 1\
`, `\
[stdin]:1:1: error: invalid object key
@a: 1
^^\
`
  );
  assertErrorFormat(`\
f
  @a: 1\
`, `\
[stdin]:2:3: error: invalid object key
  @a: 1
  ^^\
`
  );
  return assertErrorFormat(`\
{a=2}\
`, `\
[stdin]:1:3: error: unexpected =
{a=2}
  ^\
`
  );
});

test("invalid destructuring default target", () => assertErrorFormat(`\
{'a' = 2} = obj\
`, `\
[stdin]:1:6: error: unexpected =
{'a' = 2} = obj
   ^\
`
));

test("#4070: lone expansion", function() {
  assertErrorFormat(`\
[...] = a\
`, `\
[stdin]:1:2: error: Destructuring assignment has no target
[...] = a
 ^^^\
`
  );
  return assertErrorFormat(`\
[ ..., ] = a\
`, `\
[stdin]:1:3: error: Destructuring assignment has no target
[ ..., ] = a
  ^^^\
`
  );
});

test("#3926: implicit object in parameter list", function() {
  assertErrorFormat(`\
(a: b) ->\
`, `\
[stdin]:1:3: error: unexpected :
(a: b) ->
  ^\
`
  );
  return assertErrorFormat(`\
(one, two, {three, four: five}, key: value) ->\
`, `\
[stdin]:1:36: error: unexpected :
(one, two, {three, four: five}, key: value) ->
                                   ^\
`
  );
});

test("#4130: unassignable in destructured param", function() {
  assertErrorFormat(`\
fun = ({
  @param : null
}) ->
  console.log "Oh hello!"\
`, `\
[stdin]:2:12: error: keyword 'null' can't be assigned
  @param : null
           ^^^^\
`
  );
  assertErrorFormat(`\
({a: null}) ->\
`, `\
[stdin]:1:6: error: keyword 'null' can't be assigned
({a: null}) ->
     ^^^^\
`
  );
  assertErrorFormat(`\
({a: 1}) ->\
`, `\
[stdin]:1:6: error: '1' can't be assigned
({a: 1}) ->
     ^\
`
  );
  assertErrorFormat(`\
({1}) ->\
`, `\
[stdin]:1:3: error: '1' can't be assigned
({1}) ->
  ^\
`
  );
  return assertErrorFormat(`\
({a: true = 1}) ->\
`, `\
[stdin]:1:6: error: keyword 'true' can't be assigned
({a: true = 1}) ->
     ^^^^\
`
  );
});

test("`yield` outside of a function", function() {
  assertErrorFormat(`\
yield 1\
`, `\
[stdin]:1:1: error: yield can only occur inside functions
yield 1
^^^^^^^\
`
  );
  return assertErrorFormat(`\
yield return\
`, `\
[stdin]:1:1: error: yield can only occur inside functions
yield return
^^^^^^^^^^^^\
`
  );
});

test("#4097: `yield return` as an expression", () => assertErrorFormat(`\
-> (yield return)\
`, `\
[stdin]:1:5: error: cannot use a pure statement in an expression
-> (yield return)
  ^^^^^^^^^^^^\
`
));

test("`&&=` and `||=` with a space in-between", function() {
  assertErrorFormat(`\
a = 0
a && = 1\
`, `\
[stdin]:2:6: error: unexpected =
a && = 1
     ^\
`
  );
  assertErrorFormat(`\
a = 0
a and = 1\
`, `\
[stdin]:2:7: error: unexpected =
a and = 1
      ^\
`
  );
  assertErrorFormat(`\
a = 0
a || = 1\
`, `\
[stdin]:2:6: error: unexpected =
a || = 1
     ^\
`
  );
  return assertErrorFormat(`\
a = 0
a or = 1\
`, `\
[stdin]:2:6: error: unexpected =
a or = 1
     ^\
`
  );
});

test("anonymous functions cannot be exported", () => assertErrorFormat(`\
export ->
console.log 'hello, world!'\
`, `\
[stdin]:1:8: error: unexpected ->
export ->
     ^^\
`
));

test("anonymous classes cannot be exported", () => assertErrorFormat(`\
export class
constructor: ->
  console.log 'hello, world!'\
`, `\
[stdin]:1:8: error: anonymous classes cannot be exported
export class
     ^^^^^\
`
));

test("unless enclosed by curly braces, only * can be aliased", () => assertErrorFormat(`\
import foo as bar from 'lib'\
`, `\
[stdin]:1:12: error: unexpected as
import foo as bar from 'lib'
         ^^\
`
));

test("unwrapped imports must follow constrained syntax", function() {
  assertErrorFormat(`\
import foo, bar from 'lib'\
`, `\
[stdin]:1:13: error: unexpected identifier
import foo, bar from 'lib'
            ^^^\
`
  );
  assertErrorFormat(`\
import foo, bar, baz from 'lib'\
`, `\
[stdin]:1:13: error: unexpected identifier
import foo, bar, baz from 'lib'
            ^^^\
`
  );
  return assertErrorFormat(`\
import foo, bar as baz from 'lib'\
`, `\
[stdin]:1:13: error: unexpected identifier
import foo, bar as baz from 'lib'
            ^^^\
`
  );
});

test("cannot export * without a module to export from", () => assertErrorFormat(`\
export *\
`, `\
[stdin]:1:9: error: unexpected end of input
export *
      ^\
`
));

test("imports and exports must be top-level", function() {
  assertErrorFormat(`\
if foo
  import { bar } from 'lib'\
`, `\
[stdin]:2:3: error: import statements must be at top-level scope
  import { bar } from 'lib'
  ^^^^^^^^^^^^^^^^^^^^^^^^^\
`
  );
  return assertErrorFormat(`\
foo = ->
  export { bar }\
`, `\
[stdin]:2:3: error: export statements must be at top-level scope
  export { bar }
  ^^^^^^^^^^^^^^\
`
  );
});

test("cannot import the same member more than once", function() {
  assertErrorFormat(`\
import { foo, foo } from 'lib'\
`, `\
[stdin]:1:15: error: 'foo' has already been declared
import { foo, foo } from 'lib'
              ^^^\
`
  );
  assertErrorFormat(`\
import { foo, bar, foo } from 'lib'\
`, `\
[stdin]:1:20: error: 'foo' has already been declared
import { foo, bar, foo } from 'lib'
                   ^^^\
`
  );
  assertErrorFormat(`\
import { foo, bar as foo } from 'lib'\
`, `\
[stdin]:1:15: error: 'foo' has already been declared
import { foo, bar as foo } from 'lib'
              ^^^^^^^^^^\
`
  );
  assertErrorFormat(`\
import foo, { foo } from 'lib'\
`, `\
[stdin]:1:15: error: 'foo' has already been declared
import foo, { foo } from 'lib'
              ^^^\
`
  );
  assertErrorFormat(`\
import foo, { bar as foo } from 'lib'\
`, `\
[stdin]:1:15: error: 'foo' has already been declared
import foo, { bar as foo } from 'lib'
              ^^^^^^^^^^\
`
  );
  assertErrorFormat(`\
import foo from 'libA'
import foo from 'libB'\
`, `\
[stdin]:2:8: error: 'foo' has already been declared
import foo from 'libB'
       ^^^\
`
  );
  return assertErrorFormat(`\
import * as foo from 'libA'
import { foo } from 'libB'\
`, `\
[stdin]:2:10: error: 'foo' has already been declared
import { foo } from 'libB'
         ^^^\
`
  );
});

test("imported members cannot be reassigned", function() {
  assertErrorFormat(`\
import { foo } from 'lib'
foo = 'bar'\
`, `\
[stdin]:2:1: error: 'foo' is read-only
foo = 'bar'
^^^\
`
  );
  assertErrorFormat(`\
import { foo } from 'lib'
export default foo = 'bar'\
`, `\
[stdin]:2:16: error: 'foo' is read-only
export default foo = 'bar'
               ^^^\
`
  );
  return assertErrorFormat(`\
import { foo } from 'lib'
export foo = 'bar'\
`, `\
[stdin]:2:8: error: 'foo' is read-only
export foo = 'bar'
       ^^^\
`
  );
});

test("bound functions cannot be generators", () => assertErrorFormat('f = => yield this', `\
[stdin]:1:8: error: yield cannot occur inside bound (fat arrow) functions
f = => yield this
     ^^^^^^^^^^\
`
));

test("#4790: bound functions cannot be generators, even when we’re creating IIFEs", () => assertErrorFormat(`\
=>
for x in []
  for y in []
    yield z\
`, `\
[stdin]:4:7: error: yield cannot occur inside bound (fat arrow) functions
    yield z
    ^^^^^^^\
`
));

test("CoffeeScript keywords cannot be used as unaliased names in import lists", () => assertErrorFormat(`\
import { unless, baz as bar } from 'lib'
bar.barMethod()\
`, `\
[stdin]:1:10: error: unexpected unless
import { unless, baz as bar } from 'lib'
       ^^^^^^\
`
));

test("CoffeeScript keywords cannot be used as local names in import list aliases", () => assertErrorFormat(`\
import { bar as unless, baz as bar } from 'lib'
bar.barMethod()\
`, `\
[stdin]:1:17: error: unexpected unless
import { bar as unless, baz as bar } from 'lib'
              ^^^^^^\
`
));

test("function cannot contain both `await` and `yield`", () => assertErrorFormat(`\
f = () ->
yield 5
await a\
`, `\
[stdin]:3:3: error: function can't contain both yield and await
await a
^^^^^^^\
`
));

test("function cannot contain both `await` and `yield from`", () => assertErrorFormat(`\
f = () ->
yield from a
await b\
`, `\
[stdin]:3:3: error: function can't contain both yield and await
await b
^^^^^^^\
`
));

test("cannot have `await` outside a function", () => assertErrorFormat(`\
await 1\
`, `\
[stdin]:1:1: error: await can only occur inside functions
await 1
^^^^^^^\
`
));

test("indexes are not supported in for-from loops", () => assertErrorFormat("x for x, i from [1, 2, 3]", `\
[stdin]:1:10: error: cannot use index with for-from
x for x, i from [1, 2, 3]
       ^\
`
));

test("own is not supported in for-from loops", () => assertErrorFormat("x for own x from [1, 2, 3]", `\
[stdin]:1:7: error: cannot use own with for-from
x for own x from [1, 2, 3]
    ^^^\
`
));

test("tagged template literals must be called by an identifier", function() {
  assertErrorFormat("1''", `\
[stdin]:1:1: error: literal is not a function
1''
^\
`
  );
  assertErrorFormat('1""', `\
[stdin]:1:1: error: literal is not a function
1""
^\
`
  );
  assertErrorFormat("1'b'", `\
[stdin]:1:1: error: literal is not a function
1'b'
^\
`
  );
  assertErrorFormat('1"b"', `\
[stdin]:1:1: error: literal is not a function
1"b"
^\
`
  );
  assertErrorFormat("1'''b'''", `\
[stdin]:1:1: error: literal is not a function
1'''b'''
^\
`
  );
  assertErrorFormat('1"""b"""', `\
[stdin]:1:1: error: literal is not a function
1"""b"""
^\
`
  );
  assertErrorFormat('1"#{b}"', `\
[stdin]:1:1: error: literal is not a function
1"#{b}"
^\
`
  );
  return assertErrorFormat('1"""#{b}"""', `\
[stdin]:1:1: error: literal is not a function
1"""#{b}"""
^\
`
  );
});

test("constructor functions can't be async", () => assertErrorFormat('class then constructor: -> await x', `\
[stdin]:1:12: error: Class constructor may not be async
class then constructor: -> await x
         ^^^^^^^^^^^\
`
));

test("constructor functions can't be generators", () => assertErrorFormat('class then constructor: -> yield', `\
[stdin]:1:12: error: Class constructor may not be a generator
class then constructor: -> yield
         ^^^^^^^^^^^\
`
));

test("non-derived constructors can't call super", () => assertErrorFormat('class then constructor: -> super()', `\
[stdin]:1:28: error: 'super' is only allowed in derived class constructors
class then constructor: -> super()
                         ^^^^^^^\
`
));

test("derived constructors can't reference `this` before calling super", () => assertErrorFormat('class extends A then constructor: -> @', `\
[stdin]:1:38: error: Can't reference 'this' before calling super in derived class constructors
class extends A then constructor: -> @
                                   ^\
`
));

test("derived constructors can't use @params without calling super", () => assertErrorFormat('class extends A then constructor: (@a) ->', `\
[stdin]:1:36: error: Can't use @params in derived class constructors without calling super
class extends A then constructor: (@a) ->
                                 ^^\
`
));

test("derived constructors can't call super with @params", () => assertErrorFormat('class extends A then constructor: (@a) -> super(@a)', `\
[stdin]:1:49: error: Can't call super with @params in derived class constructors
class extends A then constructor: (@a) -> super(@a)
                                              ^^\
`
));

test("derived constructors can't call super with buried @params", () => assertErrorFormat('class extends A then constructor: (@a) -> super((=> @a)())', `\
[stdin]:1:53: error: Can't call super with @params in derived class constructors
class extends A then constructor: (@a) -> super((=> @a)())
                                                  ^^\
`
));

test("'super' is not allowed in constructor parameter defaults", () => assertErrorFormat('class extends A then constructor: (a = super()) ->', `\
[stdin]:1:40: error: 'super' is not allowed in constructor parameter defaults
class extends A then constructor: (a = super()) ->
                                     ^^^^^^^\
`
));

test("can't use pattern matches for loop indices", () => assertErrorFormat('a for b, {c} in d', `\
[stdin]:1:10: error: index cannot be a pattern matching expression
a for b, {c} in d
       ^^^\
`
));

test("bare 'super' is no longer allowed", () => // TODO Improve this error message (it should at least be 'unexpected super')
assertErrorFormat('class extends A then constructor: -> super', `\
[stdin]:1:35: error: unexpected ->
class extends A then constructor: -> super
                                ^^\
`));

test("soaked 'super' in constructor", () => assertErrorFormat('class extends A then constructor: -> super?()', `\
[stdin]:1:38: error: Unsupported reference to 'super'
class extends A then constructor: -> super?()
                                   ^^^^^\
`
));

test("new with 'super'", () => assertErrorFormat('class extends A then foo: -> new super()', `\
[stdin]:1:34: error: Unsupported reference to 'super'
class extends A then foo: -> new super()
                               ^^^^^\
`
));

test("getter keyword in object", () => assertErrorFormat(`\
obj =
get foo: ->\
`, `\
[stdin]:2:3: error: 'get' cannot be used as a keyword, or as a function call without parentheses
get foo: ->
^^^\
`
));

test("setter keyword in object", () => assertErrorFormat(`\
obj =
set foo: ->\
`, `\
[stdin]:2:3: error: 'set' cannot be used as a keyword, or as a function call without parentheses
set foo: ->
^^^\
`
));

test("getter keyword in inline implicit object", () => assertErrorFormat('obj = get foo: ->', `\
[stdin]:1:7: error: 'get' cannot be used as a keyword, or as a function call without parentheses
obj = get foo: ->
    ^^^\
`
));

test("setter keyword in inline implicit object", () => assertErrorFormat('obj = set foo: ->', `\
[stdin]:1:7: error: 'set' cannot be used as a keyword, or as a function call without parentheses
obj = set foo: ->
    ^^^\
`
));

test("getter keyword in inline explicit object", () => assertErrorFormat('obj = {get foo: ->}', `\
[stdin]:1:8: error: 'get' cannot be used as a keyword, or as a function call without parentheses
obj = {get foo: ->}
     ^^^\
`
));

test("setter keyword in inline explicit object", () => assertErrorFormat('obj = {set foo: ->}', `\
[stdin]:1:8: error: 'set' cannot be used as a keyword, or as a function call without parentheses
obj = {set foo: ->}
     ^^^\
`
));

test("getter keyword in function", () => assertErrorFormat(`\
f = ->
get foo: ->\
`, `\
[stdin]:2:3: error: 'get' cannot be used as a keyword, or as a function call without parentheses
get foo: ->
^^^\
`
));

test("setter keyword in function", () => assertErrorFormat(`\
f = ->
set foo: ->\
`, `\
[stdin]:2:3: error: 'set' cannot be used as a keyword, or as a function call without parentheses
set foo: ->
^^^\
`
));

test("getter keyword in inline function", () => assertErrorFormat('f = -> get foo: ->', `\
[stdin]:1:8: error: 'get' cannot be used as a keyword, or as a function call without parentheses
f = -> get foo: ->
     ^^^\
`
));

test("setter keyword in inline function", () => assertErrorFormat('f = -> set foo: ->', `\
[stdin]:1:8: error: 'set' cannot be used as a keyword, or as a function call without parentheses
f = -> set foo: ->
     ^^^\
`
));

test("getter keyword in class", () => assertErrorFormat(`\
class A
get foo: ->\
`, `\
[stdin]:2:3: error: 'get' cannot be used as a keyword, or as a function call without parentheses
get foo: ->
^^^\
`
));

test("setter keyword in class", () => assertErrorFormat(`\
class A
set foo: ->\
`, `\
[stdin]:2:3: error: 'set' cannot be used as a keyword, or as a function call without parentheses
set foo: ->
^^^\
`
));

test("getter keyword in inline class", () => assertErrorFormat('class A then get foo: ->', `\
[stdin]:1:14: error: 'get' cannot be used as a keyword, or as a function call without parentheses
class A then get foo: ->
           ^^^\
`
));

test("setter keyword in inline class", () => assertErrorFormat('class A then set foo: ->', `\
[stdin]:1:14: error: 'set' cannot be used as a keyword, or as a function call without parentheses
class A then set foo: ->
           ^^^\
`
));

test("getter keyword before static method", () => assertErrorFormat(`\
class A
get @foo = ->\
`, `\
[stdin]:2:3: error: 'get' cannot be used as a keyword, or as a function call without parentheses
get @foo = ->
^^^\
`
));

test("setter keyword before static method", () => assertErrorFormat(`\
class A
set @foo = ->\
`, `\
[stdin]:2:3: error: 'set' cannot be used as a keyword, or as a function call without parentheses
set @foo = ->
^^^\
`
));

test("#4248: Unicode code point escapes", function() {
  assertErrorFormat(`\
"a
  #{b} \\u{G02}
 c"\
`, `\
[stdin]:2:8: error: invalid escape sequence \\u{G02}
  #{b} \\u{G02}
       ^\^^^^^^\
`
  );
  assertErrorFormat(`\
/a\\u{}b/\
`, `\
[stdin]:1:3: error: invalid escape sequence \\u{}
/a\\u{}b/
  ^\^^^\
`
  );
  assertErrorFormat(`\
///a \\u{01abc///\
`, `\
[stdin]:1:6: error: invalid escape sequence \\u{01abc
///a \\u{01abc///
     ^\^^^^^^^\
`
  );

  assertErrorFormat(`\
/\\u{123} \\u{110000}/\
`, `\
[stdin]:1:10: error: unicode code point escapes greater than \\u{10ffff} are not allowed
/\\u{123} \\u{110000}/
  \       ^\^^^^^^^^^\
`
  );

  assertErrorFormat(`\
///abc\\\\\\u{123456}///u\
`, `\
[stdin]:1:9: error: unicode code point escapes greater than \\u{10ffff} are not allowed
///abc\\\\\\u{123456}///u
       \ \^\^^^^^^^^^\
`
  );

  assertErrorFormat(`\
"""
  \\u{123}
  a
    \\u{00110000}
  #{ 'b' }
"""\
`, `\
[stdin]:4:5: error: unicode code point escapes greater than \\u{10ffff} are not allowed
    \\u{00110000}
    ^\^^^^^^^^^^^\
`
  );

  return assertErrorFormat(`\
'\\u{a}\\u{1111110000}'\
`, `\
[stdin]:1:7: error: unicode code point escapes greater than \\u{10ffff} are not allowed
'\\u{a}\\u{1111110000}'
  \    ^\^^^^^^^^^^^^^\
`
  );
});

test("CSX error: non-matching tag names", () => assertErrorFormat(`\
<div><span></div></span>\
`,
`\
[stdin]:1:7: error: expected corresponding CSX closing tag for span
<div><span></div></span>
    ^^^^\
`
));

test("CSX error: bare expressions not allowed", () => assertErrorFormat(`\
<div x=3 />\
`,
`\
[stdin]:1:8: error: expected wrapped or quoted JSX attribute
<div x=3 />
     ^\
`
));

test("CSX error: unescaped opening tag angle bracket disallowed", () => assertErrorFormat(`\
<Person><<</Person>\
`,
`\
[stdin]:1:9: error: unexpected <<
<Person><<</Person>
      ^^\
`
));

test("CSX error: ambiguous tag-like expression", () => assertErrorFormat(`\
x = a <b > c\
`,
`\
[stdin]:1:10: error: missing </
x = a <b > c
       ^\
`
));

test('CSX error: invalid attributes', function() {
  assertErrorFormat(`\
<div a="b" {props} />\
`, `\
[stdin]:1:12: error: Unexpected token. Allowed CSX attributes are: id="val", src={source}, {props...} or attribute.
<div a="b" {props} />
           ^^^^^^^\
`
  );
  assertErrorFormat(`\
<div a={b} {a:{b}} />\
`, `\
[stdin]:1:12: error: Unexpected token. Allowed CSX attributes are: id="val", src={source}, {props...} or attribute.
<div a={b} {a:{b}} />
           ^^^^^^^\
`
  );
  assertErrorFormat(`\
<div {"#{a}"} />\
`, `\
[stdin]:1:6: error: Unexpected token. Allowed CSX attributes are: id="val", src={source}, {props...} or attribute.
<div {"#{a}"} />
     ^^^^^^^^\
`
  );
  assertErrorFormat(`\
<div props... />\
`, `\
[stdin]:1:11: error: Unexpected token. Allowed CSX attributes are: id="val", src={source}, {props...} or attribute.
<div props... />
          ^^^\
`
  );
  assertErrorFormat(`\
<div {a:"b", props..., c:d()} />\
`, `\
[stdin]:1:6: error: Unexpected token. Allowed CSX attributes are: id="val", src={source}, {props...} or attribute.
<div {a:"b", props..., c:d()} />
     ^^^^^^^^^^^^^^^^^^^^^^^^\
`
  );
  return assertErrorFormat(`\
<div {props..., a, b} />\
`, `\
[stdin]:1:6: error: Unexpected token. Allowed CSX attributes are: id="val", src={source}, {props...} or attribute.
<div {props..., a, b} />
     ^^^^^^^^^^^^^^^^\
`
  );
});

test('Bound method called as callback before binding throws runtime error', function() {
  let d;
  class Base {
    constructor() {
      const f = this.derivedBound;
      try {
        f();
        ok(false);
      } catch (e) {
        eq(e.message, 'Bound instance method accessed before binding');
      }
    }
  }

  class Derived extends Base {
    constructor(...args) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.derivedBound = this.derivedBound.bind(this);
      super(...args);
    }

    derivedBound() {
      return ok(false);
    }
  }
  return d = new Derived;
});

test("#3845/#3446: chain after function glyph (but not inline)", () => assertErrorFormat(`\
a -> .b\
`,
`\
[stdin]:1:6: error: unexpected .
a -> .b
   ^\
`
));

test("#3906: error for unusual indentation", () => assertErrorFormat(`\
a
c
.d

e(
f)

g\
`, `\
[stdin]:2:1: error: unexpected indentation
c
^^\
`
));

test("#4283: error message for implicit call", () => assertErrorFormat(`\
(a, b c) ->\
`, `\
[stdin]:1:5: error: unexpected implicit function call
(a, b c) ->
  ^\
`
));

test("#3199: error message for call indented non-object", () => assertErrorFormat(`\
fn = ->
fn
1\
`, `\
[stdin]:3:1: error: unexpected indentation
1
^^\
`
));

test("#3199: error message for call indented comprehension", () => assertErrorFormat(`\
fn = ->
fn
x for x in [1, 2, 3]\
`, `\
[stdin]:3:1: error: unexpected indentation
x for x in [1, 2, 3]
^^\
`
));

test("#3199: error message for return indented non-object", () => assertErrorFormat(`\
return
1\
`, `\
[stdin]:2:3: error: unexpected number
1
^\
`
));

test("#3199: error message for return indented comprehension", () => assertErrorFormat(`\
return
x for x in [1, 2, 3]\
`, `\
[stdin]:2:3: error: unexpected identifier
x for x in [1, 2, 3]
^\
`
));

test("#3199: error message for throw indented non-object", () => assertErrorFormat(`\
throw
1\
`, `\
[stdin]:2:3: error: unexpected number
1
^\
`
));

test("#3199: error message for throw indented comprehension", () => assertErrorFormat(`\
throw
x for x in [1, 2, 3]\
`, `\
[stdin]:2:3: error: unexpected identifier
x for x in [1, 2, 3]
^\
`
));

test("#3098: suppressed newline should be unsuppressed by semicolon", () => assertErrorFormat(`\
a = ; 5\
`, `\
[stdin]:1:5: error: unexpected ;
a = ; 5
  ^\
`
));

test("#4811: '///' inside a heregex comment does not close the heregex", () => assertErrorFormat(`\
/// .* # comment ///\
`, `\
[stdin]:1:1: error: missing ///
/// .* # comment ///
^^^\
`
));

test("#3933: prevent implicit calls when cotrol flow is missing `THEN`", function() {
  assertErrorFormat(`\
for a in b do ->\
`,`\
[stdin]:1:12: error: unexpected do
for a in b do ->
           ^^\
`
  );

  assertErrorFormat(`\
for a in b ->\
`,`\
[stdin]:1:12: error: unexpected ->
for a in b ->
           ^^\
`
  );

  assertErrorFormat(`\
for a in b do =>\
`,`\
[stdin]:1:12: error: unexpected do
for a in b do =>
           ^^\
`
  );

  assertErrorFormat(`\
while a do ->\
`,`\
[stdin]:1:9: error: unexpected do
while a do ->
        ^^\
`
  );

  assertErrorFormat(`\
until a do =>\
`,`\
[stdin]:1:9: error: unexpected do
until a do =>
        ^^\
`
  );

  return assertErrorFormat(`\
switch
  when a ->\
`,`\
[stdin]:2:10: error: unexpected ->
  when a ->
         ^^\
`
  );
});