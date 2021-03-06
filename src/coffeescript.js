/* eslint-disable
    consistent-return,
    func-names,
    import/no-unresolved,
    max-len,
    no-cond-assign,
    no-console,
    no-multi-assign,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
    no-underscore-dangle,
    no-unused-vars,
    no-use-before-define,
    no-var,
    prefer-const,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// CoffeeScript can be used both on the server, as a command-line compiler based
// on Node.js/V8, or to run CoffeeScript directly in the browser. This module
// contains the main entry functions for tokenizing, parsing, and compiling
// source CoffeeScript into JavaScript.

let compile; let
  FILE_EXTENSIONS;
const { Lexer } = require('./lexer');
const { parser } = require('./parser');
const helpers = require('./helpers');
const SourceMap = require('./sourcemap');
// Require `package.json`, which is two levels above this file, as this file is
// evaluated from `lib/coffeescript`.
const packageJson = require('../../package.json');

// The current CoffeeScript version number.
exports.VERSION = packageJson.version;

exports.FILE_EXTENSIONS = (FILE_EXTENSIONS = ['.coffee', '.litcoffee', '.coffee.md']);

// Expose helpers for testing.
exports.helpers = helpers;

// Function that allows for btoa in both nodejs and the browser.
const base64encode = function (src) {
  switch (false) {
    case typeof Buffer !== 'function':
      return Buffer.from(src).toString('base64');
    case typeof btoa !== 'function':
    // The contents of a `<script>` block are encoded via UTF-16, so if any extended
    // characters are used in the block, btoa will fail as it maxes out at UTF-8.
    // See https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
    // for the gory details, and for the solution implemented here.
      return btoa(encodeURIComponent(src).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(`0x${p1}`)));
    default:
      throw new Error('Unable to base64 encode inline sourcemap.');
  }
};

// Function wrapper to add source file information to SyntaxErrors thrown by the
// lexer/parser/compiler.
const withPrettyErrors = (fn) => (function (code, options) {
  if (options == null) { options = {}; }
  try {
    return fn.call(this, code, options);
  } catch (err) {
    if (typeof code !== 'string') { throw err; } // Support `CoffeeScript.nodes(tokens)`.
    throw helpers.updateSyntaxError(err, code, options.filename);
  }
});

// For each compiled file, save its source in memory in case we need to
// recompile it later. We might need to recompile if the first compilation
// didn’t create a source map (faster) but something went wrong and we need
// a stack trace. Assuming that most of the time, code isn’t throwing
// exceptions, it’s probably more efficient to compile twice only when we
// need a stack trace, rather than always generating a source map even when
// it’s not likely to be used. Save in form of `filename`: [`(source)`]
const sources = {};
// Also save source maps if generated, in form of `(source)`: [`(source map)`].
const sourceMaps = {};

// Compile CoffeeScript code to JavaScript, using the Coffee/Jison compiler.
//
// If `options.sourceMap` is specified, then `options.filename` must also be
// specified. All options that can be passed to `SourceMap#generate` may also
// be passed here.
//
// This returns a javascript string, unless `options.sourceMap` is passed,
// in which case this returns a `{js, v3SourceMap, sourceMap}`
// object, where sourceMap is a sourcemap.coffee#SourceMap object, handy for
// doing programmatic lookups.
exports.compile = (compile = withPrettyErrors(function (code, options) {
  // Clone `options`, to avoid mutating the `options` object passed in.
  let map; let
    v3SourceMap;
  let token;
  if (options == null) { options = {}; }
  options = { ...options };
  // Always generate a source map if no filename is passed in, since without a
  // a filename we have no way to retrieve this source later in the event that
  // we need to recompile it to get a source map for `prepareStackTrace`.
  const generateSourceMap = options.sourceMap || options.inlineMap || (options.filename == null);
  const filename = options.filename || '<anonymous>';

  checkShebangLine(filename, code);

  if (sources[filename] == null) { sources[filename] = []; }
  sources[filename].push(code);
  if (generateSourceMap) { map = new SourceMap(); }

  const tokens = lexer.tokenize(code, options);

  // Pass a list of referenced variables, so that generated variables won’t get
  // the same name.
  options.referencedVars = ((() => {
    const result = [];

    for (token of Array.from(tokens)) {
      if (token[0] === 'IDENTIFIER') {
        result.push(token[1]);
      }
    }

    return result;
  })());

  // Check for import or export; if found, force bare mode.
  if ((options.bare == null) || (options.bare !== true)) {
    for (token of Array.from(tokens)) {
      if (['IMPORT', 'EXPORT'].includes(token[0])) {
        options.bare = true;
        break;
      }
    }
  }

  const fragments = parser.parse(tokens).compileToFragments(options);

  let currentLine = 0;
  if (options.header) { currentLine += 1; }
  if (options.shiftLine) { currentLine += 1; }
  let currentColumn = 0;
  let js = '';
  for (const fragment of Array.from(fragments)) {
    // Update the sourcemap with data from each fragment.
    if (generateSourceMap) {
      // Do not include empty, whitespace, or semicolon-only fragments.
      if (fragment.locationData && !/^[;\s]*$/.test(fragment.code)) {
        map.add(
          [fragment.locationData.first_line, fragment.locationData.first_column],
          [currentLine, currentColumn],
          { noReplace: true },
        );
      }
      const newLines = helpers.count(fragment.code, '\n');
      currentLine += newLines;
      if (newLines) {
        currentColumn = fragment.code.length - (fragment.code.lastIndexOf('\n') + 1);
      } else {
        currentColumn += fragment.code.length;
      }
    }

    // Copy the code from each fragment into the final JavaScript.
    js += fragment.code;
  }

  if (options.header) {
    const header = `Generated by CoffeeScript ${this.VERSION}`;
    js = `// ${header}\n${js}`;
  }

  if (generateSourceMap) {
    v3SourceMap = map.generate(options, code);
    if (sourceMaps[filename] == null) { sourceMaps[filename] = []; }
    sourceMaps[filename].push(map);
  }

  if (options.transpile) {
    if (typeof options.transpile !== 'object') {
      // This only happens if run via the Node API and `transpile` is set to
      // something other than an object.
      throw new Error('The transpile option must be given an object with options to pass to Babel');
    }

    // Get the reference to Babel that we have been passed if this compiler
    // is run via the CLI or Node API.
    const transpiler = options.transpile.transpile;
    delete options.transpile.transpile;

    const transpilerOptions = { ...options.transpile };

    // See https://github.com/babel/babel/issues/827#issuecomment-77573107:
    // Babel can take a v3 source map object as input in `inputSourceMap`
    // and it will return an *updated* v3 source map object in its output.
    if (v3SourceMap && (transpilerOptions.inputSourceMap == null)) {
      transpilerOptions.inputSourceMap = v3SourceMap;
    }
    const transpilerOutput = transpiler(js, transpilerOptions);
    js = transpilerOutput.code;
    if (v3SourceMap && transpilerOutput.map) {
      v3SourceMap = transpilerOutput.map;
    }
  }

  if (options.inlineMap) {
    const encoded = base64encode(JSON.stringify(v3SourceMap));
    const sourceMapDataURI = `//# sourceMappingURL=data:application/json;base64,${encoded}`;
    const sourceURL = `//# sourceURL=${options.filename != null ? options.filename : 'coffeescript'}`;
    js = `${js}\n${sourceMapDataURI}\n${sourceURL}`;
  }

  if (options.sourceMap) {
    return {
      js,
      sourceMap: map,
      v3SourceMap: JSON.stringify(v3SourceMap, null, 2),
    };
  }
  return js;
}));

// Tokenize a string of CoffeeScript code, and return the array of tokens.
exports.tokens = withPrettyErrors((code, options) => lexer.tokenize(code, options));

// Parse a string of CoffeeScript code or an array of lexed tokens, and
// return the AST. You can then compile it by calling `.compile()` on the root,
// or traverse it by using `.traverseChildren()` with a callback.
exports.nodes = withPrettyErrors((source, options) => {
  if (typeof source === 'string') {
    return parser.parse(lexer.tokenize(source, options));
  }
  return parser.parse(source);
});

// This file used to export these methods; leave stubs that throw warnings
// instead. These methods have been moved into `index.coffee` to provide
// separate entrypoints for Node and non-Node environments, so that static
// analysis tools don’t choke on Node packages when compiling for a non-Node
// environment.
exports.run = (exports.eval = (exports.register = function () {
  throw new Error('require index.coffee, not this file');
}));

// Instantiate a Lexer for our use here.
var lexer = new Lexer();

// The real Lexer produces a generic stream of tokens. This object provides a
// thin wrapper around it, compatible with the Jison API. We can then pass it
// directly as a "Jison lexer".
parser.lexer = {
  lex() {
    let tag;
    const token = parser.tokens[this.pos++];
    if (token) {
      [tag, this.yytext, this.yylloc] = token;
      parser.errorToken = token.origin || token;
      this.yylineno = this.yylloc.first_line;
    } else {
      tag = '';
    }
    return tag;
  },
  setInput(tokens) {
    parser.tokens = tokens;
    return this.pos = 0;
  },
  upcomingInput() { return ''; },
};

// Make all the AST nodes visible to the parser.
parser.yy = require('./nodes');

// Override Jison's default error handling function.
parser.yy.parseError = function (message, { token }) {
  // Disregard Jison's message, it contains redundant line number information.
  // Disregard the token, we take its value directly from the lexer in case
  // the error is caused by a generated token which might refer to its origin.
  const { errorToken, tokens } = parser;
  let [errorTag, errorText, errorLoc] = errorToken;

  errorText = (() => {
    switch (false) {
      case errorToken !== tokens[tokens.length - 1]:
        return 'end of input';
      case !['INDENT', 'OUTDENT'].includes(errorTag):
        return 'indentation';
      case !['IDENTIFIER', 'NUMBER', 'INFINITY', 'STRING', 'STRING_START', 'REGEX', 'REGEX_START'].includes(errorTag):
        return errorTag.replace(/_START$/, '').toLowerCase();
      default:
        return helpers.nameWhitespaceCharacter(errorText);
    }
  })();

  // The second argument has a `loc` property, which should have the location
  // data for this token. Unfortunately, Jison seems to send an outdated `loc`
  // (from the previous token), so we take the location information directly
  // from the lexer.
  return helpers.throwSyntaxError(`unexpected ${errorText}`, errorLoc);
};

// Based on http://v8.googlecode.com/svn/branches/bleeding_edge/src/messages.js
// Modified to handle sourceMap
const formatSourcePosition = function (frame, getSourceMapping) {
  let filename;
  let fileLocation = '';

  if (frame.isNative()) {
    fileLocation = 'native';
  } else {
    if (frame.isEval()) {
      filename = frame.getScriptNameOrSourceURL();
      if (!filename) { fileLocation = `${frame.getEvalOrigin()}, `; }
    } else {
      filename = frame.getFileName();
    }

    if (!filename) { filename = '<anonymous>'; }

    const line = frame.getLineNumber();
    const column = frame.getColumnNumber();

    // Check for a sourceMap position
    const source = getSourceMapping(filename, line, column);
    fileLocation = source
      ? `${filename}:${source[0]}:${source[1]}`
      : `${filename}:${line}:${column}`;
  }

  const functionName = frame.getFunctionName();
  const isConstructor = frame.isConstructor();
  const isMethodCall = !(frame.isToplevel() || isConstructor);

  if (isMethodCall) {
    const methodName = frame.getMethodName();
    const typeName = frame.getTypeName();

    if (functionName) {
      let as;
      let tp = (as = '');
      if (typeName && functionName.indexOf(typeName)) {
        tp = `${typeName}.`;
      }
      if (methodName && (functionName.indexOf(`.${methodName}`) !== (functionName.length - methodName.length - 1))) {
        as = ` [as ${methodName}]`;
      }

      return `${tp}${functionName}${as} (${fileLocation})`;
    }
    return `${typeName}.${methodName || '<anonymous>'} (${fileLocation})`;
  } if (isConstructor) {
    return `new ${functionName || '<anonymous>'} (${fileLocation})`;
  } if (functionName) {
    return `${functionName} (${fileLocation})`;
  }
  return fileLocation;
};

const getSourceMap = function (filename, line, column) {
  // Skip files that we didn’t compile, like Node system files that appear in
  // the stack trace, as they never have source maps.
  let needle;
  if ((filename !== '<anonymous>') && (needle = filename.slice(filename.lastIndexOf('.')), !Array.from(FILE_EXTENSIONS).includes(needle))) { return null; }

  if ((filename !== '<anonymous>') && (sourceMaps[filename] != null)) {
    return sourceMaps[filename][sourceMaps[filename].length - 1];
  // CoffeeScript compiled in a browser or via `CoffeeScript.compile` or `.run`
  // may get compiled with `options.filename` that’s missing, which becomes
  // `<anonymous>`; but the runtime might request the stack trace with the
  // filename of the script file. See if we have a source map cached under
  // `<anonymous>` that matches the error.
  } if (sourceMaps['<anonymous>'] != null) {
    // Work backwards from the most recent anonymous source maps, until we find
    // one that works. This isn’t foolproof; there is a chance that multiple
    // source maps will have line/column pairs that match. But we have no other
    // way to match them. `frame.getFunction().toString()` doesn’t always work,
    // and it’s not foolproof either.
    for (let i = sourceMaps['<anonymous>'].length - 1; i >= 0; i--) {
      const map = sourceMaps['<anonymous>'][i];
      const sourceLocation = map.sourceLocation([line - 1, column - 1]);
      if (((sourceLocation != null ? sourceLocation[0] : undefined) != null) && (sourceLocation[1] != null)) { return map; }
    }
  }

  // If all else fails, recompile this source to get a source map. We need the
  // previous section (for `<anonymous>`) despite this option, because after it
  // gets compiled we will still need to look it up from
  // `sourceMaps['<anonymous>']` in order to find and return it. That’s why we
  // start searching from the end in the previous block, because most of the
  // time the source map we want is the last one.
  if (sources[filename] != null) {
    const answer = compile(sources[filename][sources[filename].length - 1], {
      filename,
      sourceMap: true,
      literate: helpers.isLiterate(filename),
    });
    return answer.sourceMap;
  }
  return null;
};

// Based on [michaelficarra/CoffeeScriptRedux](http://goo.gl/ZTx1p)
// NodeJS / V8 have no support for transforming positions in stack traces using
// sourceMap, so we must monkey-patch Error to display CoffeeScript source
// positions.
Error.prepareStackTrace = function (err, stack) {
  const getSourceMapping = function (filename, line, column) {
    let answer;
    const sourceMap = getSourceMap(filename, line, column);
    if (sourceMap != null) { answer = sourceMap.sourceLocation([line - 1, column - 1]); }
    if (answer != null) { return [answer[0] + 1, answer[1] + 1]; } return null;
  };

  const frames = (() => {
    const result = [];
    for (const frame of Array.from(stack)) {
      if (frame.getFunction() === exports.run) { break; }
      result.push(`    at ${formatSourcePosition(frame, getSourceMapping)}`);
    }
    return result;
  })();

  return `${err.toString()}\n${frames.join('\n')}\n`;
};

var checkShebangLine = function (file, input) {
  const firstLine = input.split(/$/m)[0];
  const rest = firstLine != null ? firstLine.match(/^#!\s*([^\s]+\s*)(.*)/) : undefined;
  const args = __guard__(rest != null ? rest[2] : undefined, (x) => x.split(/\s/).filter((s) => s !== ''));
  if ((args != null ? args.length : undefined) > 1) {
    console.error(`\
The script to be run begins with a shebang line with more than one
argument. This script will fail on platforms such as Linux which only
allow a single argument.\
`);
    console.error(`The shebang line was: '${firstLine}' in file '${file}'`);
    return console.error(`The arguments were: ${JSON.stringify(args)}`);
  }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
