/* eslint-disable
    camelcase,
    func-names,
    global-require,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-underscore-dangle,
    no-use-before-define,
    no-var,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const child_process = require('child_process');
const path = require('path');
const CoffeeScript = require('./');
const helpers = require('./helpers');

// Load and run a CoffeeScript file for Node, stripping any `BOM`s.
const loadFile = function (module, filename) {
  const options = module.options || getRootModule(module).options;
  const answer = CoffeeScript._compileFile(filename, options);
  return module._compile(answer, filename);
};

// If the installed version of Node supports `require.extensions`, register
// CoffeeScript as an extension.
if (require.extensions) {
  for (const ext of Array.from(CoffeeScript.FILE_EXTENSIONS)) {
    require.extensions[ext] = loadFile;
  }

  // Patch Node's module loader to be able to handle multi-dot extensions.
  // This is a horrible thing that should not be required.
  const Module = require('module');

  const findExtension = function (filename) {
    const extensions = path.basename(filename).split('.');
    // Remove the initial dot from dotfiles.
    if (extensions[0] === '') { extensions.shift(); }
    // Start with the longest possible extension and work our way shortwards.
    while (extensions.shift()) {
      const curExtension = `.${extensions.join('.')}`;
      if (Module._extensions[curExtension]) { return curExtension; }
    }
    return '.js';
  };

  Module.prototype.load = function (filename) {
    this.filename = filename;
    this.paths = Module._nodeModulePaths(path.dirname(filename));
    const extension = findExtension(filename);
    Module._extensions[extension](this, filename);
    return this.loaded = true;
  };
}

// If we're on Node, patch `child_process.fork` so that Coffee scripts are able
// to fork both CoffeeScript files, and JavaScript files, directly.
if (child_process) {
  const { fork } = child_process;
  const binary = require.resolve('../../bin/coffee');
  child_process.fork = function (path, args, options) {
    if (helpers.isCoffee(path)) {
      if (!Array.isArray(args)) {
        options = args || {};
        args = [];
      }
      args = [path].concat(args);
      path = binary;
    }
    return fork(path, args, options);
  };
}

// Utility function to find the `options` object attached to the topmost module.
var getRootModule = function (module) {
  if (module.parent) { return getRootModule(module.parent); } return module;
};
