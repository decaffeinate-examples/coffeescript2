/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS209: Avoid top-level return
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
if (typeof require === 'undefined' || require === null) { return; }

const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

// Get the folder containing the compiled `coffee` executable and make it the
// PATH so that `#!/usr/bin/env coffee` resolves to our locally built file.
const coffeeBinFolder = path.dirname(require.resolve('../bin/coffee'));
// For some reason, Windows requires `coffee` to be executed as `node coffee`.
const coffeeCommand = isWindows() ? 'node coffee' : 'coffee';
const spawnOptions = {
  cwd: coffeeBinFolder,
  encoding: 'utf8',
  env: {
    PATH: coffeeBinFolder + (isWindows() ? ';' : ':') + process.env.PATH
  },
  shell: isWindows()
};

const shebangScript = require.resolve('./importing/shebang.coffee');
const initialSpaceScript = require.resolve('./importing/shebang_initial_space.coffee');
const extraArgsScript = require.resolve('./importing/shebang_extra_args.coffee');
const initialSpaceExtraArgsScript = require.resolve('./importing/shebang_initial_space_extra_args.coffee');

test("parse arguments for shebang scripts correctly (on *nix platforms)", function() {
  if (isWindows()) { return; }

  let stdout = execFileSync(shebangScript, ['-abck'], spawnOptions);
  let expectedArgs = ['coffee', shebangScript, '-abck'];
  let realArgs = JSON.parse(stdout);
  arrayEq(expectedArgs, realArgs);

  stdout = execFileSync(initialSpaceScript, ['-abck'], spawnOptions);
  expectedArgs = ['coffee', initialSpaceScript, '-abck'];
  realArgs = JSON.parse(stdout);
  return arrayEq(expectedArgs, realArgs);
});

test("warn and remove -- if it is the second positional argument", function() {
  let result = spawnSync(coffeeCommand, [shebangScript, '--'], spawnOptions);
  let stderr = result.stderr.toString();
  arrayEq(JSON.parse(result.stdout), ['coffee', shebangScript]);
  ok(stderr.match(/^coffee was invoked with '--'/m));
  let posArgs = stderr.match(/^The positional arguments were: (.*)$/m)[1];
  arrayEq(JSON.parse(posArgs), [shebangScript, '--']);
  ok(result.status === 0);

  result = spawnSync(coffeeCommand, ['-b', shebangScript, '--'], spawnOptions);
  stderr = result.stderr.toString();
  arrayEq(JSON.parse(result.stdout), ['coffee', shebangScript]);
  ok(stderr.match(/^coffee was invoked with '--'/m));
  posArgs = stderr.match(/^The positional arguments were: (.*)$/m)[1];
  arrayEq(JSON.parse(posArgs), [shebangScript, '--']);
  ok(result.status === 0);

  result = spawnSync(
    coffeeCommand, ['-b', shebangScript, '--', 'ANOTHER'], spawnOptions);
  stderr = result.stderr.toString();
  arrayEq(JSON.parse(result.stdout), ['coffee', shebangScript, 'ANOTHER']);
  ok(stderr.match(/^coffee was invoked with '--'/m));
  posArgs = stderr.match(/^The positional arguments were: (.*)$/m)[1];
  arrayEq(JSON.parse(posArgs), [shebangScript, '--', 'ANOTHER']);
  ok(result.status === 0);

  result = spawnSync(
    coffeeCommand, ['--', initialSpaceScript, 'arg'], spawnOptions);
  const expectedArgs = ['coffee', initialSpaceScript, 'arg'];
  const realArgs = JSON.parse(result.stdout);
  arrayEq(expectedArgs, realArgs);
  ok(result.stderr.toString() === '');
  return ok(result.status === 0);
});

test("warn about non-portable shebang lines", function() {
  let result = spawnSync(coffeeCommand, [extraArgsScript, 'arg'], spawnOptions);
  let stderr = result.stderr.toString();
  arrayEq(JSON.parse(result.stdout), ['coffee', extraArgsScript, 'arg']);
  ok(stderr.match(/^The script to be run begins with a shebang line with more than one/m));
  let [_, firstLine, file] = stderr.match(/^The shebang line was: '([^']+)' in file '([^']+)'/m);
  ok((firstLine === '#!/usr/bin/env coffee --'));
  ok((file === extraArgsScript));
  let args = stderr.match(/^The arguments were: (.*)$/m)[1];
  arrayEq(JSON.parse(args), ['coffee', '--']);
  ok(result.status === 0);

  result = spawnSync(coffeeCommand, [initialSpaceScript, 'arg'], spawnOptions);
  stderr = result.stderr.toString();
  ok(stderr === '');
  arrayEq(JSON.parse(result.stdout), ['coffee', initialSpaceScript, 'arg']);
  ok(result.status === 0);

  result = spawnSync(
    coffeeCommand, [initialSpaceExtraArgsScript, 'arg'], spawnOptions);
  stderr = result.stderr.toString();
  arrayEq(JSON.parse(result.stdout), ['coffee', initialSpaceExtraArgsScript, 'arg']);
  ok(stderr.match(/^The script to be run begins with a shebang line with more than one/m));
  [_, firstLine, file] = stderr.match(/^The shebang line was: '([^']+)' in file '([^']+)'/m);
  ok((firstLine === '#! /usr/bin/env coffee extra'));
  ok((file === initialSpaceExtraArgsScript));
  args = stderr.match(/^The arguments were: (.*)$/m)[1];
  arrayEq(JSON.parse(args), ['coffee', 'extra']);
  return ok(result.status === 0);
});

test("both warnings will be shown at once", function() {
  const result = spawnSync(
    coffeeCommand, [initialSpaceExtraArgsScript, '--', 'arg'], spawnOptions);
  const stderr = result.stderr.toString();
  arrayEq(JSON.parse(result.stdout), ['coffee', initialSpaceExtraArgsScript, 'arg']);
  ok(stderr.match(/^The script to be run begins with a shebang line with more than one/m));
  const [_, firstLine, file] = stderr.match(/^The shebang line was: '([^']+)' in file '([^']+)'/m);
  ok((firstLine === '#! /usr/bin/env coffee extra'));
  ok((file === initialSpaceExtraArgsScript));
  const args = stderr.match(/^The arguments were: (.*)$/m)[1];
  arrayEq(JSON.parse(args), ['coffee', 'extra']);
  ok(stderr.match(/^coffee was invoked with '--'/m));
  const posArgs = stderr.match(/^The positional arguments were: (.*)$/m)[1];
  arrayEq(JSON.parse(posArgs), [initialSpaceExtraArgsScript, '--', 'arg']);
  return ok(result.status === 0);
});
