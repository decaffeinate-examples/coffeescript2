/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Interpolation
// -------------

// * String Interpolation
// * Regular Expression Interpolation

// String Interpolation

// TODO: refactor string interpolation tests

eq('multiline nested "interpolations" work', `multiline ${
  `nested ${
    (ok(true), "\"interpolations\"")
  }`
} work`
);

// Issue #923: Tricky interpolation.
eq(`${ "{" }`, "{");
eq(`${ '#{}}' } }`, '#{}} }');
eq(`${`'${ ({a: `b${1}`}['a']) }'`}`, "'b1'");

// Issue #1150: String interpolation regression
eq(`${'"/'}`,                '"/');
eq(`${"/'"}`,                "/'");
eq(`${/'"/}`,                '/\'"/');
eq(`${"'//\"" + /"'/}`,  '\'//"/"\'/');
eq(`${"'/"}${'/"'}${/"'/}`,  '\'//"/"\'/');
eq(`${6 / 2}`,               '3');
eq(`${6 / 2}${6 / 2}`,       '33'); // parsed as division
eq(`${6 + /2}#{6/ + 2}`,     '6/2}#{6/2'); // parsed as a regex
eq(`${6/2} \
${6/2}`,                 '3 3'); // newline cannot be part of a regex, so it's division
eq(`${new RegExp(`"'/'"/"`)}`,     '/"\'\\/\'"\\/"/'); // heregex, stuffed with spicy characters
eq(`${/\\'/}`,               "/\\\\'/");

// Issue #2321: Regex/division conflict in interpolation
eq(`${4/2}/`, '2/');
const curWidth = 4;
eq(`<i style='left:${ curWidth/2 }%;'></i>`,   "<i style='left:2%;'></i>");
throws(() => CoffeeScript.compile(`\
"<i style='left:#{ curWidth /2 }%;'></i>"`
));
//                 valid regex--^^^^^^^^^^^ ^--unclosed string
eq(`<i style='left:${ curWidth/2 }%;'></i>`,   "<i style='left:2%;'></i>");
eq(`<i style='left:${ curWidth/ 2 }%;'></i>`,  "<i style='left:2%;'></i>");
eq(`<i style='left:${ curWidth / 2 }%;'></i>`, "<i style='left:2%;'></i>");

const hello = 'Hello';
const world = 'World';
ok('#{hello} #{world}!' === '#{hello} #{world}!');
ok(`${hello} ${world}!` === 'Hello World!');
ok(`[${hello}${world}]` === '[HelloWorld]');
ok(`${hello}#${world}` === 'Hello#World');
ok(`Hello ${ 1 + 2 } World` === 'Hello 3 World');
ok(`${hello} ${ 1 + 2 } ${world}` === "Hello 3 World");
ok((1 + `${2}px`) === '12px');
ok(isNaN(`a${2}` * 2));
ok(`${2}` === '2');
ok(`${2}${2}` === '22');

const [s, t, r, i, n, g] = ['s', 't', 'r', 'i', 'n', 'g'];
ok(`${s}${t}${r}${i}${n}${g}` === 'string');
ok("\#{s}\#{t}\#{r}\#{i}\#{n}\#{g}" === '#{s}#{t}#{r}#{i}#{n}#{g}');
ok("\#{string}" === '#{string}');

ok("\#{Escaping} first" === '#{Escaping} first');
ok("Escaping \#{in} middle" === 'Escaping #{in} middle');
ok("Escaping \#{last}" === 'Escaping #{last}');

ok("##" === '##');
ok(`` === '');
ok(`A  B` === 'A  B');
ok("\\\#{}" === '\\#{}');

ok(`I won #${20} last night.` === 'I won #20 last night.');
ok(`I won #${'#20'} last night.` === 'I won ##20 last night.');

ok(`${hello + world}` === 'HelloWorld');
ok(`${hello + ' ' + world + '!'}` === 'Hello World!');

const list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
ok(`values: ${list.join(', ')}, length: ${list.length}.` === 'values: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, length: 10.');
ok(`values: ${list.join(' ')}` === 'values: 0 1 2 3 4 5 6 7 8 9');

const obj = {
  name: 'Joe',
  hi() { return `Hello ${this.name}.`; },
  cya() { return `Hello ${this.name}.`.replace('Hello','Goodbye'); }
};
ok(obj.hi() === "Hello Joe.");
ok(obj.cya() === "Goodbye Joe.");

ok(`With ${"quotes"}` === 'With quotes');
ok('With #{"quotes"}' === 'With #{"quotes"}');

ok(`Where is ${obj["name"] + '?'}` === 'Where is Joe?');

ok(`Where is ${`the nested ${obj["name"]}`}?` === 'Where is the nested Joe?');
ok(`Hello ${world != null ? world : `${hello}`}` === 'Hello World');

ok(`Hello ${`${`${obj["name"]}` + '!'}`}` === 'Hello Joe!');

let a = `\
Hello ${ "Joe" }\
`;
ok(a === "Hello Joe");

a = 1;
let b = 2;
const c = 3;
ok(`${a}${b}${c}` === '123');

let result = null;
const stash = str => result = str;
stash(`a ${ ('aa').replace(/a/g, 'b') } c`);
ok(result === 'a bb c');

const foo = "hello";
ok(`${foo.replace("\"", "")}` === 'hello');

const val = 10;
a = `\
basic heredoc ${val}
on two lines\
`;
b = `\
basic heredoc #{val}
on two lines\
`;
ok(a === "basic heredoc 10\non two lines");
ok(b === "basic heredoc \#{val}\non two lines");

eq('multiline nested "interpolations" work', `multiline ${
  `nested ${(function() {
    ok(true);
    return "\"interpolations\"";
  })()}`
} work`
);

eq('function(){}', `${function() {}}`.replace(/\s/g, ''));
ok(/^a[\s\S]+b$/.test(`a${() => {}}b`));
ok(/^a[\s\S]+b$/.test(`a${ x => Math.pow(x, 2) }b`));

// Regular Expression Interpolation

// TODO: improve heregex interpolation tests

test("heregex interpolation", () => eq(/\\#{}\\"/ + '', new RegExp(`\
${
   `${ '\\' }` // normal comment
 }\
\
\\#{}\
\\\\"\
`) + ''
));
