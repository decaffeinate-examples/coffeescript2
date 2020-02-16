// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS209: Avoid top-level return
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Option Parser
// -------------

// Ensure that the OptionParser handles arguments correctly.
if (typeof require === 'undefined' || require === null) { return; }
const {OptionParser} = require('./../lib/coffeescript/optparse');

const flags = [
  ['-r', '--required [DIR]',  'desc required'],
  ['-o', '--optional',        'desc optional'],
  ['-l', '--list [FILES*]',   'desc list']
];

const banner = `\
banner text\
`;

const opt = new OptionParser(flags, banner);

test("basic arguments", function() {
  const args = ['one', 'two', 'three', '-r', 'dir'];
  const result = opt.parse(args);
  arrayEq(args, result.arguments);
  return eq(undefined, result.required);
});

test("boolean and parameterised options", function() {
  const result = opt.parse(['--optional', '-r', 'folder', 'one', 'two']);
  ok(result.optional);
  eq('folder', result.required);
  return arrayEq(['one', 'two'], result.arguments);
});

test("list options", function() {
  const result = opt.parse(['-l', 'one.txt', '-l', 'two.txt', 'three']);
  arrayEq(['one.txt', 'two.txt'], result.list);
  return arrayEq(['three'], result.arguments);
});

test("-- and interesting combinations", function() {
  let result = opt.parse(['-o','-r','a','-r','b','-o','--','-a','b','--c','d']);
  arrayEq(['-a', 'b', '--c', 'd'], result.arguments);
  ok(result.optional);
  eq('b', result.required);

  const args = ['--','-o','a','-r','c','-o','--','-a','arg0','-b','arg1'];
  result = opt.parse(args);
  eq(undefined, result.optional);
  eq(undefined, result.required);
  return arrayEq(args.slice(1), result.arguments);
});

test("throw if multiple flags try to use the same short or long name", function() {
  throws(() => new OptionParser([
    ['-r', '--required [DIR]', 'required'],
    ['-r', '--long',           'switch']
  ]));

  throws(() => new OptionParser([
    ['-a', '--append [STR]', 'append'],
    ['-b', '--append',       'append with -b short opt']
  ]));

  throws(() => new OptionParser([
    ['--just-long', 'desc'],
    ['--just-long', 'another desc']
  ]));

  throws(() => new OptionParser([
    ['-j', '--just-long', 'desc'],
    ['--just-long', 'another desc']
  ]));

  return throws(() => new OptionParser([
    ['--just-long',       'desc'],
    ['-j', '--just-long', 'another desc']
  ]));
});

test("outputs expected help text", function() {
  const expectedBanner = `\

banner text

-r, --required     desc required
-o, --optional     desc optional
-l, --list         desc list
\
`;
  ok(opt.help() === expectedBanner);

  const expected = [
    '',
    '  -r, --required     desc required',
    '  -o, --optional     desc optional',
    '  -l, --list         desc list',
    ''
  ].join('\n');
  return ok(new OptionParser(flags).help() === expected);
});
