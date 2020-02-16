/* eslint-disable
    block-scoped-var,
    consistent-return,
    func-names,
    global-require,
    guard-for-in,
    import/no-dynamic-require,
    import/no-extraneous-dependencies,
    max-len,
    no-console,
    no-continue,
    no-empty,
    no-eval,
    no-multi-assign,
    no-new-func,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-undef,
    no-unused-vars,
    no-use-before-define,
    no-useless-escape,
    no-var,
    prefer-rest-params,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let green; let red; let reset; let
  yellow;
const fs = require('fs');
const os = require('os');
const path = require('path');
const _ = require('underscore');
const { spawn, exec, execSync } = require('child_process');
let CoffeeScript = require('./lib/coffeescript');
const helpers = require('./lib/coffeescript/helpers');

// ANSI Terminal Colors.
let bold = (red = (green = (yellow = (reset = ''))));
if (!process.env.NODE_DISABLE_COLORS) {
  bold = '\x1B[0;1m';
  red = '\x1B[0;31m';
  green = '\x1B[0;32m';
  yellow = '\x1B[0;33m';
  reset = '\x1B[0m';
}

// Built file header.
const header = `\
/**
 * CoffeeScript Compiler v${CoffeeScript.VERSION}
 * http://coffeescript.org
 *
 * Copyright 2011, Jeremy Ashkenas
 * Released under the MIT License
 */\
`;

// Used in folder names like `docs/v1`.
const majorVersion = parseInt(CoffeeScript.VERSION.split('.')[0], 10);


// Log a message with a color.
const log = (message, color, explanation) => console.log(`${color + message + reset} ${explanation || ''}`);


const spawnNodeProcess = function (args, output, callback) {
  if (output == null) { output = 'stderr'; }
  const relayOutput = (buffer) => console.log(buffer.toString());
  const proc = spawn('node', args);
  if ((output === 'both') || (output === 'stdout')) { proc.stdout.on('data', relayOutput); }
  if ((output === 'both') || (output === 'stderr')) { proc.stderr.on('data', relayOutput); }
  return proc.on('exit', (status) => { if (typeof callback === 'function') { return callback(status); } });
};

// Run a CoffeeScript through our node/coffee interpreter.
const run = (args, callback) => spawnNodeProcess(['bin/coffee'].concat(args), 'stderr', (status) => {
  if (status !== 0) { process.exit(1); }
  if (typeof callback === 'function') { return callback(); }
});


// Build the CoffeeScript language from source.
const buildParser = function () {
  helpers.extend(global, require('util'));
  require('jison');
  // We don't need `moduleMain`, since the parser is unlikely to be run standalone.
  const parser = require('./lib/coffeescript/grammar').parser.generate({ moduleMain() {} });
  return fs.writeFileSync('lib/coffeescript/parser.js', parser);
};

const buildExceptParser = function (callback) {
  let files = fs.readdirSync('src');
  files = ((() => {
    const result = [];
    for (const file of Array.from(files)) {
      if (file.match(/\.(lit)?coffee$/)) {
        result.push(`src/${file}`);
      }
    }
    return result;
  })());
  return run(['-c', '-o', 'lib/coffeescript'].concat(files), callback);
};

const build = function (callback) {
  buildParser();
  return buildExceptParser(callback);
};

const transpile = function (code) {
  const babel = require('babel-core');
  const presets = [];
  // Exclude the `modules` plugin in order to not break the `}(this));`
  // at the end of the `build:browser` code block.
  if (process.env.TRANSFORM !== 'false') { presets.push(['env', { modules: false }]); }
  if (process.env.MINIFY !== 'false') { presets.push('minify'); }
  const babelOptions = {
    compact: process.env.MINIFY !== 'false',
    presets,
    sourceType: 'script',
  };
  if (presets.length !== 0) { ({ code } = babel.transform(code, babelOptions)); }
  return code;
};

const testBuiltCode = function (watch) {
  if (watch == null) { watch = false; }
  const csPath = './lib/coffeescript';
  const csDir = path.dirname(require.resolve(csPath));

  for (const mod in require.cache) {
    if (csDir === mod.slice(0, csDir.length)) {
      delete require.cache[mod];
    }
  }

  const testResults = runTests(require(csPath));
  if (!watch) {
    if (!testResults) { return process.exit(1); }
  }
};

const buildAndTest = function (includingParser, harmony) {
  if (includingParser == null) { includingParser = true; }
  if (harmony == null) { harmony = false; }
  process.stdout.write('\x1Bc'); // Clear terminal screen.
  execSync('git checkout lib/*', { stdio: 'inherit' }); // Reset the generated compiler.

  const buildArgs = ['bin/cake'];
  buildArgs.push(includingParser ? 'build' : 'build:except-parser');
  log(`building${includingParser ? ', including parser' : ''}...`, green);
  return spawnNodeProcess(buildArgs, 'both', () => {
    log('testing...', green);
    let testArgs = harmony ? ['--harmony'] : [];
    testArgs = testArgs.concat(['bin/cake', 'test']);
    return spawnNodeProcess(testArgs, 'both');
  });
};

const watchAndBuildAndTest = function (harmony) {
  if (harmony == null) { harmony = false; }
  buildAndTest(true, harmony);
  fs.watch('src/', { interval: 200 }, (eventType, filename) => {
    if (eventType === 'change') {
      log(`src/${filename} changed, rebuilding...`);
      return buildAndTest((filename === 'grammar.coffee'), harmony);
    }
  });
  return fs.watch('test/', { interval: 200, recursive: true }, (eventType, filename) => {
    if (eventType === 'change') {
      log(`test/${filename} changed, rebuilding...`);
      return buildAndTest(false, harmony);
    }
  });
};


task('build', 'build the CoffeeScript compiler from source', build);

task('build:parser', 'build the Jison parser only', buildParser);

task('build:except-parser', 'build the CoffeeScript compiler, except for the Jison parser', buildExceptParser);

task('build:full', 'build the CoffeeScript compiler from source twice, and run the tests', () => build(() => build(testBuiltCode)));

task('build:browser', 'merge the built scripts into a single file for use in a browser', () => {
  let code = `\
require['../../package.json'] = (function() {
  return ${fs.readFileSync('./package.json')};
})();\
`;
  for (const name of ['helpers', 'rewriter', 'lexer', 'parser', 'scope', 'nodes', 'sourcemap', 'coffeescript', 'browser']) {
    code += `\
require['./${name}'] = (function() {
  var exports = {}, module = {exports: exports};
  ${fs.readFileSync(`lib/coffeescript/${name}.js`)}
  return module.exports;
})();\
`;
  }
  code = `\
(function(root) {
  var CoffeeScript = function() {
    function require(path){ return require[path]; }
    ${code}
    return require['./browser'];
  }();

  if (typeof define === 'function' && define.amd) {
    define(function() { return CoffeeScript; });
  } else {
    root.CoffeeScript = CoffeeScript;
  }
}(this));\
`;
  code = transpile(code);
  const outputFolder = `docs/v${majorVersion}/browser-compiler`;
  if (!fs.existsSync(outputFolder)) { fs.mkdirSync(outputFolder); }
  return fs.writeFileSync(`${outputFolder}/coffeescript.js`, `${header}\n${code}`);
});

task('build:browser:full', 'merge the built scripts into a single file for use in a browser, and test it', () => {
  invoke('build:browser');
  console.log('built ... running browser tests:');
  return invoke('test:browser');
});

task('build:watch', 'watch and continually rebuild the CoffeeScript compiler, running tests on each build', () => watchAndBuildAndTest());

task('build:watch:harmony', 'watch and continually rebuild the CoffeeScript compiler, running harmony tests on each build', () => watchAndBuildAndTest(true));


const buildDocs = function (watch) {
  // Constants
  let renderIndex;
  if (watch == null) { watch = false; }
  const indexFile = 'documentation/site/index.html';
  const siteSourceFolder = 'documentation/site';
  const sectionsSourceFolder = 'documentation/sections';
  const examplesSourceFolder = 'documentation/examples';
  const outputFolder = `docs/v${majorVersion}`;

  // Helpers
  const releaseHeader = function (date, version, prevVersion) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const formatDate = (date) => date.replace(/^(\d\d\d\d)-(\d\d)-(\d\d)$/, (match, $1, $2, $3) => `${monthNames[$2 - 1]} ${+$3}, ${$1}`);

    return `\
<div class="anchor" id="${version}"></div>
<h2 class="header">
  ${(prevVersion && `<a href=\"https://github.com/jashkenas/coffeescript/compare/${prevVersion}...${version}\">${version}</a>`) || version}
  <span class="timestamp"> &mdash; <time datetime="${date}">${formatDate(date)}</time></span>
</h2>\
`;
  };

  const codeFor = require('./documentation/site/code.coffee');

  const htmlFor = function () {
    const hljs = require('highlight.js');
    hljs.configure({ classPrefix: '' });
    const markdownRenderer = require('markdown-it')({
      html: true,
      typographer: true,
      highlight(str, lang) {
        // From https://github.com/markdown-it/markdown-it#syntax-highlighting
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(lang, str).value;
          } catch (ex) {}
        }
        return '';
      },
    }); // No syntax highlighting


    // Add some custom overrides to Markdown-It’s rendering, per
    // https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
    const defaultFence = markdownRenderer.renderer.rules.fence;
    markdownRenderer.renderer.rules.fence = function (tokens, idx, options, env, slf) {
      const code = tokens[idx].content;
      if ((code.indexOf('codeFor(') === 0) || (code.indexOf('releaseHeader(') === 0)) {
        return `<%= ${code} %>`;
      }
      return `<blockquote class=\"uneditable-code-block\">${defaultFence.apply(this, arguments)}</blockquote>`;
    };

    return function (file, bookmark) {
      let md = fs.readFileSync(`${sectionsSourceFolder}/${file}.md`, 'utf-8');
      md = md.replace(/<%= releaseHeader %>/g, releaseHeader);
      md = md.replace(/<%= majorVersion %>/g, majorVersion);
      md = md.replace(/<%= fullVersion %>/g, CoffeeScript.VERSION);
      let html = markdownRenderer.render(md);
      return html = _.template(html)({
        codeFor: codeFor(),
        releaseHeader,
      });
    };
  };

  const includeScript = () => (function (file) {
    if (!Array.from(file).includes('/')) { file = `${siteSourceFolder}/${file}`; }
    let code = fs.readFileSync(file, 'utf-8');
    code = CoffeeScript.compile(code);
    code = transpile(code);
    return code;
  });

  var include = () => (function (file) {
    if (!Array.from(file).includes('/')) { file = `${siteSourceFolder}/${file}`; }
    let output = fs.readFileSync(file, 'utf-8');
    if (/\.html$/.test(file)) {
      const render = _.template(output);
      output = render({
        releaseHeader,
        majorVersion,
        fullVersion: CoffeeScript.VERSION,
        htmlFor: htmlFor(),
        codeFor: codeFor(),
        include: include(),
        includeScript: includeScript(),
      });
    }
    return output;
  });

  // Task
  (renderIndex = function () {
    const render = _.template(fs.readFileSync(indexFile, 'utf-8'));
    const output = render({ include: include() });
    fs.writeFileSync(`${outputFolder}/index.html`, output);
    return log('compiled', green, `${indexFile} → ${outputFolder}/index.html`);
  })();
  try {
    fs.symlinkSync(`v${majorVersion}/index.html`, 'docs/index.html');
  } catch (exception) {}

  if (watch) {
    for (const target of [indexFile, siteSourceFolder, examplesSourceFolder, sectionsSourceFolder]) {
      fs.watch(target, { interval: 200 }, renderIndex);
    }
    return log('watching...', green);
  }
};

task('doc:site', 'build the documentation for the website', () => buildDocs());

task('doc:site:watch', 'watch and continually rebuild the documentation for the website', () => buildDocs(true));


const buildDocTests = function (watch) {
  // Constants
  let renderTest;
  if (watch == null) { watch = false; }
  const testFile = 'documentation/site/test.html';
  const testsSourceFolder = 'test';
  const outputFolder = `docs/v${majorVersion}`;

  // Included in test.html
  const testHelpers = fs.readFileSync('test/support/helpers.coffee', 'utf-8').replace(/exports\./g, '@');

  // Helpers
  const testsInScriptBlocks = function () {
    let output = '';
    for (const filename of Array.from(fs.readdirSync(testsSourceFolder))) {
      var type;
      if (filename.indexOf('.coffee') !== -1) {
        type = 'coffeescript';
      } else if (filename.indexOf('.litcoffee') !== -1) {
        type = 'literate-coffeescript';
      } else {
        continue;
      }

      // Set the type to text/x-coffeescript or text/x-literate-coffeescript
      // to prevent the browser compiler from automatically running the script
      output += `\
<script type="text/x-${type}" class="test" id="${filename.split('.')[0]}">
${fs.readFileSync(`test/${filename}`, 'utf-8')}
</script>\n\
`;
    }
    return output;
  };

  // Task
  (renderTest = function () {
    const render = _.template(fs.readFileSync(testFile, 'utf-8'));
    const output = render({
      testHelpers,
      tests: testsInScriptBlocks(),
    });
    fs.writeFileSync(`${outputFolder}/test.html`, output);
    return log('compiled', green, `${testFile} → ${outputFolder}/test.html`);
  })();

  if (watch) {
    for (const target of [testFile, testsSourceFolder]) {
      fs.watch(target, { interval: 200 }, renderTest);
    }
    return log('watching...', green);
  }
};

task('doc:test', 'build the browser-based tests', () => buildDocTests());

task('doc:test:watch', 'watch and continually rebuild the browser-based tests', () => buildDocTests(true));


const buildAnnotatedSource = function (watch) {
  let generateAnnotatedSource;
  if (watch == null) { watch = false; }
  (generateAnnotatedSource = function () {
    exec(`cd src && ../node_modules/docco/bin/docco *.*coffee --output ../docs/v${majorVersion}/annotated-source`, (err) => { if (err) { throw err; } });
    return log('generated', green, `annotated source in docs/v${majorVersion}/annotated-source/`);
  })();

  if (watch) {
    fs.watch('src/', { interval: 200 }, generateAnnotatedSource);
    return log('watching...', green);
  }
};

task('doc:source', 'build the annotated source documentation', () => buildAnnotatedSource());

task('doc:source:watch', 'watch and continually rebuild the annotated source documentation', () => buildAnnotatedSource(true));


task('release', 'build and test the CoffeeScript source, and build the documentation', () => execSync(`\
cake build:full
cake build:browser
cake test:browser
cake test:integrations
cake doc:site
cake doc:test
cake doc:source`, { stdio: 'inherit' }));


task('bench', 'quick benchmark of compilation time', () => {
  const { Rewriter } = require('./lib/coffeescript/rewriter');
  const sources = ['coffeescript', 'grammar', 'helpers', 'lexer', 'nodes', 'rewriter'];
  const coffee = sources.map((name) => fs.readFileSync(`src/${name}.coffee`)).join('\n');
  const litcoffee = fs.readFileSync('src/scope.litcoffee').toString();
  const fmt = (ms) => ` ${bold}${`   ${ms}`.slice(-4)}${reset} ms`;
  let total = 0;
  let now = Date.now();
  const time = function () {
    let ms;
    total += (ms = -(now - (now = Date.now()))); return fmt(ms);
  };
  let tokens = CoffeeScript.tokens(coffee, { rewrite: false });
  const littokens = CoffeeScript.tokens(litcoffee, { rewrite: false, literate: true });
  tokens = tokens.concat(littokens);
  console.log(`Lex    ${time()} (${tokens.length} tokens)`);
  tokens = new Rewriter().rewrite(tokens);
  console.log(`Rewrite${time()} (${tokens.length} tokens)`);
  const nodes = CoffeeScript.nodes(tokens);
  console.log(`Parse  ${time()}`);
  const js = nodes.compile({ bare: true });
  console.log(`Compile${time()} (${js.length} chars)`);
  return console.log(`total  ${fmt(total)}`);
});


// Run the CoffeeScript test suite.
var runTests = function (CoffeeScript) {
  if (!global.testingBrowser) { CoffeeScript.register(); }

  // These are attached to `global` so that they’re accessible from within
  // `test/async.coffee`, which has an async-capable version of
  // `global.test`.
  global.currentFile = null;
  global.passedTests = 0;
  global.failures = [];

  const object = require('assert');
  for (const name in object) { const func = object[name]; global[name] = func; }

  // Convenience aliases.
  global.CoffeeScript = CoffeeScript;
  global.Repl = require('./lib/coffeescript/repl');
  global.bold = bold;
  global.red = red;
  global.green = green;
  global.yellow = yellow;
  global.reset = reset;

  const asyncTests = [];
  const onFail = (description, fn, err) => failures.push({
    filename: global.currentFile,
    error: err,
    description,
    source: ((fn.toString != null) ? fn.toString() : undefined),
  });

  // Our test helper function for delimiting different test cases.
  global.test = function (description, fn) {
    try {
      fn.test = { description, currentFile };
      const result = fn.call(fn);
      if (result instanceof Promise) { // An async test.
        asyncTests.push(result);
        return result.then(() => passedTests++).catch((err) => onFail(description, fn, err));
      }
      return passedTests++;
    } catch (error1) {
      const err = error1;
      return onFail(description, fn, err);
    }
  };

  global.supportsAsync = (() => {
    try {
      new Function('async () => {}')();
      return true;
    } catch (error2) {
      return false;
    }
  })();

  helpers.extend(global, require('./test/support/helpers'));

  // When all the tests have run, collect and print errors.
  // If a stacktrace is available, output the compiled function source.
  process.on('exit', () => {
    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    const message = `passed ${passedTests} tests in ${time} seconds${reset}`;
    if (!failures.length) { return log(message, green); }
    log(`failed ${failures.length} and ${message}`, red);
    for (const fail of Array.from(failures)) {
      const {
        error, filename, description, source,
      } = fail;
      console.log('');
      if (description) { log(`  ${description}`, red); }
      log(`  ${error.stack}`, red);
      if (source) { console.log(`  ${source}`); }
    }
  });

  // Run every test in the `test` folder, recording failures.
  let files = fs.readdirSync('test');
  if (!global.supportsAsync) { // Except for async tests, if async isn’t supported.
    files = files.filter((filename) => filename !== 'async.coffee');
  }

  var startTime = Date.now();
  for (const file of Array.from(files)) {
    if (helpers.isCoffee(file)) {
      var filename;

      const literate = helpers.isLiterate(file);
      var currentFile = (filename = path.join('test', file));
      const code = fs.readFileSync(filename);
      try {
        CoffeeScript.run(code.toString(), { filename, literate });
      } catch (error1) {
        const error = error1;
        failures.push({ filename, error });
      }
    }
  }

  return Promise.all(asyncTests).then(() => {
    if (failures.length !== 0) { return Promise.reject(); }
  });
};


task('test', 'run the CoffeeScript language test suite', () => runTests(CoffeeScript).catch(() => process.exit(1)));


task('test:browser', 'run the test suite against the merged browser script', () => {
  const source = fs.readFileSync(`docs/v${majorVersion}/browser-compiler/coffeescript.js`, 'utf-8');
  const result = {};
  global.testingBrowser = true;
  ((() => eval(source))).call(result);
  return runTests(CoffeeScript).catch(() => process.exit(1));
});


task('test:integrations', 'test the module integrated with other libraries and environments', () => {
  // Tools like Webpack and Browserify generate builds intended for a browser
  // environment where Node modules are not available. We want to ensure that
  // the CoffeeScript module as presented by the `browser` key in `package.json`
  // can be built by such tools; if such a build succeeds, it verifies that no
  // Node modules are required as part of the compiler (as opposed to the tests)
  // and that therefore the compiler will run in a browser environment.
  const tmpdir = os.tmpdir();
  const webpack = require('webpack');
  return webpack({
    entry: './',
    output: {
      path: tmpdir,
      filename: 'coffeescript.js',
      library: 'CoffeeScript',
      libraryTarget: 'commonjs2',
    },
  }, (err, stats) => {
    if (err || stats.hasErrors()) {
      if (err) {
        console.error(err.stack || err);
        if (err.details) { console.error(err.details); }
      }
      if (stats.hasErrors()) {
        for (const error of Array.from(stats.compilation.errors)) { console.error(error); }
      }
      if (stats.hasWarnings()) {
        for (const warning of Array.from(stats.compilation.warnings)) { console.warn(warning); }
      }
      process.exit(1);
    }

    const builtCompiler = path.join(tmpdir, 'coffeescript.js');
    CoffeeScript = require(builtCompiler);
    global.testingBrowser = true;
    const testResults = runTests(CoffeeScript);
    fs.unlinkSync(builtCompiler);
    if (!testResults) { return process.exit(1); }
  });
});
