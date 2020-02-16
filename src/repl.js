/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeREPL = require('repl');
const CoffeeScript = require('./');
const {merge, updateSyntaxError} = require('./helpers');

let sawSIGINT = false;
let transpile = false;

const replDefaults = {
  prompt: 'coffee> ',
  historyFile: (function() {
    const historyPath = process.env.XDG_CACHE_HOME || process.env.HOME;
    if (historyPath) { return path.join(historyPath, '.coffee_history'); }
  })(),
  historyMaxInputSize: 10240,
  eval(input, context, filename, cb) {
    // XXX: multiline hack.
    input = input.replace(/\uFF00/g, '\n');
    // Node's REPL sends the input ending with a newline and then wrapped in
    // parens. Unwrap all that.
    input = input.replace(/^\(([\s\S]*)\n\)$/m, '$1');
    // Node's REPL v6.9.1+ sends the input wrapped in a try/catch statement.
    // Unwrap that too.
    input = input.replace(/^\s*try\s*{([\s\S]*)}\s*catch.*$/m, '$1');

    // Require AST nodes to do some AST manipulation.
    const {Block, Assign, Value, Literal, Call, Code} = require('./nodes');

    try {
      // Tokenize the clean input.
      let tokens = CoffeeScript.tokens(input);
      // Filter out tokens generated just to hold comments.
      if ((tokens.length >= 2) && tokens[0].generated &&
         ((tokens[0].comments != null ? tokens[0].comments.length : undefined) !== 0) && (tokens[0][1] === '') &&
         (tokens[1][0] === 'TERMINATOR')) {
        tokens = tokens.slice(2);
      }
      if ((tokens.length >= 1) && tokens[tokens.length - 1].generated &&
         (__guard__(tokens[tokens.length - 1].comments, x => x.length) !== 0) && (tokens[tokens.length - 1][1] === '')) {
        tokens.pop();
      }
      // Collect referenced variable names just like in `CoffeeScript.compile`.
      const referencedVars = (Array.from(tokens).filter((token) => token[0] === 'IDENTIFIER').map((token) => token[1]));
      // Generate the AST of the tokens.
      let ast = CoffeeScript.nodes(tokens);
      // Add assignment to `__` variable to force the input to be an expression.
      ast = new Block([new Assign((new Value(new Literal('__'))), ast, '=')]);
      // Wrap the expression in a closure to support top-level `await`.
      ast     = new Code([], ast);
      const {
        isAsync
      } = ast;
      // Invoke the wrapping closure.
      ast    = new Block([new Call(ast)]);
      let js     = ast.compile({bare: true, locals: Object.keys(context), referencedVars, sharedScope: true});
      if (transpile) {
        js = transpile.transpile(js, transpile.options).code;
        // Strip `"use strict"`, to avoid an exception on assigning to
        // undeclared variable `__`.
        js = js.replace(/^"use strict"|^'use strict'/, '');
      }
      const result = runInContext(js, context, filename);
      // Await an async result, if necessary.
      if (isAsync) {
        result.then(function(resolvedResult) {
          if (!sawSIGINT) { return cb(null, resolvedResult); }
        });
        return sawSIGINT = false;
      } else {
        return cb(null, result);
      }
    } catch (err) {
      // AST's `compile` does not add source code information to syntax errors.
      updateSyntaxError(err, input);
      return cb(err);
    }
  }
};

var runInContext = function(js, context, filename) {
  if (context === global) {
    return vm.runInThisContext(js, filename);
  } else {
    return vm.runInContext(js, context, filename);
  }
};

const addMultilineHandler = function(repl) {
  const {rli, inputStream, outputStream} = repl;
  // Node 0.11.12 changed API, prompt is now _prompt.
  const origPrompt = repl._prompt != null ? repl._prompt : repl.prompt;

  const multiline = {
    enabled: false,
    initialPrompt: origPrompt.replace(/^[^> ]*/, x => x.replace(/./g, '-')),
    prompt: origPrompt.replace(/^[^> ]*>?/, x => x.replace(/./g, '.')),
    buffer: ''
  };

  // Proxy node's line listener
  const nodeLineListener = rli.listeners('line')[0];
  rli.removeListener('line', nodeLineListener);
  rli.on('line', function(cmd) {
    if (multiline.enabled) {
      multiline.buffer += `${cmd}\n`;
      rli.setPrompt(multiline.prompt);
      rli.prompt(true);
    } else {
      rli.setPrompt(origPrompt);
      nodeLineListener(cmd);
    }
  });

  // Handle Ctrl-v
  return inputStream.on('keypress', function(char, key) {
    if (!key || !key.ctrl || !!key.meta || !!key.shift || (key.name !== 'v')) { return; }
    if (multiline.enabled) {
      // allow arbitrarily switching between modes any time before multiple lines are entered
      if (!multiline.buffer.match(/\n/)) {
        multiline.enabled = !multiline.enabled;
        rli.setPrompt(origPrompt);
        rli.prompt(true);
        return;
      }
      // no-op unless the current line is empty
      if ((rli.line != null) && !rli.line.match(/^\s*$/)) { return; }
      // eval, print, loop
      multiline.enabled = !multiline.enabled;
      rli.line = '';
      rli.cursor = 0;
      rli.output.cursorTo(0);
      rli.output.clearLine(1);
      // XXX: multiline hack
      multiline.buffer = multiline.buffer.replace(/\n/g, '\uFF00');
      rli.emit('line', multiline.buffer);
      multiline.buffer = '';
    } else {
      multiline.enabled = !multiline.enabled;
      rli.setPrompt(multiline.initialPrompt);
      rli.prompt(true);
    }
  });
};

// Store and load command history from a file
const addHistory = function(repl, filename, maxSize) {
  let lastLine = null;
  try {
    // Get file info and at most maxSize of command history
    const stat = fs.statSync(filename);
    const size = Math.min(maxSize, stat.size);
    // Read last `size` bytes from the file
    const readFd = fs.openSync(filename, 'r');
    const buffer = Buffer.alloc(size);
    fs.readSync(readFd, buffer, 0, size, stat.size - size);
    fs.closeSync(readFd);
    // Set the history on the interpreter
    repl.rli.history = buffer.toString().split('\n').reverse();
    // If the history file was truncated we should pop off a potential partial line
    if (stat.size > maxSize) { repl.rli.history.pop(); }
    // Shift off the final blank newline
    if (repl.rli.history[0] === '') { repl.rli.history.shift(); }
    repl.rli.historyIndex = -1;
    lastLine = repl.rli.history[0];
  } catch (error) {}

  const fd = fs.openSync(filename, 'a');

  repl.rli.addListener('line', function(code) {
    if (code && code.length && (code !== '.history') && (code !== '.exit') && (lastLine !== code)) {
      // Save the latest command in the file
      fs.writeSync(fd, `${code}\n`);
      return lastLine = code;
    }
  });

  // XXX: The SIGINT event from REPLServer is undocumented, so this is a bit fragile
  repl.on('SIGINT', () => sawSIGINT = true);
  repl.on('exit', () => fs.closeSync(fd));

  // Add a command to show the history stack
  return repl.commands[getCommandId(repl, 'history')] = {
    help: 'Show command history',
    action() {
      repl.outputStream.write(`${repl.rli.history.slice().reverse().join('\n')}\n`);
      return repl.displayPrompt();
    }
  };
};

var getCommandId = function(repl, commandName) {
  // Node 0.11 changed API, a command such as '.help' is now stored as 'help'
  const commandsHaveLeadingDot = (repl.commands['.help'] != null);
  if (commandsHaveLeadingDot) { return `.${commandName}`; } else { return commandName; }
};

module.exports = {
  start(opts) {
    if (opts == null) { opts = {}; }
    const [major, minor, build] = process.versions.node.split('.').map(n => parseInt(n, 10));

    if (major < 6) {
      console.warn("Node 6+ required for CoffeeScript REPL");
      process.exit(1);
    }

    CoffeeScript.register();
    process.argv = ['coffee'].concat(process.argv.slice(2));
    if (opts.transpile) {
      try {
        transpile = {};
        transpile.transpile = require('babel-core').transform;
      } catch (error) {
        console.error(`\
To use --transpile with an interactive REPL, babel-core must be installed either in the current folder or globally:
  npm install --save-dev babel-core
or
  npm install --global babel-core
And you must save options to configure Babel in one of the places it looks to find its options.
See http://coffeescript.org/#transpilation\
`
        );
        process.exit(1);
      }
      transpile.options =
        {filename: path.resolve(process.cwd(), '<repl>')};
      // Since the REPL compilation path is unique (in `eval` above), we need
      // another way to get the `options` object attached to a module so that
      // it knows later on whether it needs to be transpiled. In the case of
      // the REPL, the only applicable option is `transpile`.
      const Module = require('module');
      const originalModuleLoad = Module.prototype.load;
      Module.prototype.load = function(filename) {
        this.options = {transpile: transpile.options};
        return originalModuleLoad.call(this, filename);
      };
    }
    opts = merge(replDefaults, opts);
    const repl = nodeREPL.start(opts);
    if (opts.prelude) { runInContext(opts.prelude, repl.context, 'prelude'); }
    repl.on('exit', function() { if (!repl.rli.closed) { return repl.outputStream.write('\n'); } });
    addMultilineHandler(repl);
    if (opts.historyFile) { addHistory(repl, opts.historyFile, opts.historyMaxInputSize); }
    // Adapt help inherited from the node REPL
    repl.commands[getCommandId(repl, 'load')].help = 'Load code from a file into this REPL session';
    return repl;
  }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}