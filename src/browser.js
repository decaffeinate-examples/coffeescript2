/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS209: Avoid top-level return
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// This **Browser** compatibility layer extends core CoffeeScript functions
// to make things work smoothly when compiling code directly in the browser.
// We add support for loading remote Coffee scripts via **XHR**, and
// `text/coffeescript` script tags, source maps via data-URLs, and so on.

const CoffeeScript = require('./coffeescript');
let {
  compile
} = CoffeeScript;

// Use standard JavaScript `eval` to eval code.
CoffeeScript.eval = function(code, options) {
  if (options == null) { options = {}; }
  if (options.bare == null) { options.bare = true; }
  return eval(compile(code, options));
};

// Running code does not provide access to this scope.
CoffeeScript.run = function(code, options) {
  if (options == null) { options = {}; }
  options.bare      = true;
  options.shiftLine = true;
  return Function(compile(code, options))();
};

// Export this more limited `CoffeeScript` than what is exported by
// `index.coffee`, which is intended for a Node environment.
module.exports = CoffeeScript;

// If we’re not in a browser environment, we’re finished with the public API.
if (typeof window === 'undefined' || window === null) { return; }

// Include source maps where possible. If we’ve got a base64 encoder, a
// JSON serializer, and tools for escaping unicode characters, we’re good to go.
// Ported from https://developer.mozilla.org/en-US/docs/DOM/window.btoa
if ((typeof btoa !== 'undefined' && btoa !== null) && (typeof JSON !== 'undefined' && JSON !== null)) {
  compile = function(code, options) {
    if (options == null) { options = {}; }
    options.inlineMap = true;
    return CoffeeScript.compile(code, options);
  };
}

// Load a remote script from the current domain via XHR.
CoffeeScript.load = function(url, callback, options, hold) {
  if (options == null) { options = {}; }
  if (hold == null) { hold = false; }
  options.sourceFiles = [url];
  const xhr = window.ActiveXObject ?
    new window.ActiveXObject('Microsoft.XMLHTTP')
  :
    new window.XMLHttpRequest();
  xhr.open('GET', url, true);
  if ('overrideMimeType' in xhr) { xhr.overrideMimeType('text/plain'); }
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      let param;
      if ([0, 200].includes(xhr.status)) {
        param = [xhr.responseText, options];
        if (!hold) { CoffeeScript.run(...param); }
      } else {
        throw new Error(`Could not load ${url}`);
      }
      if (callback) { return callback(param); }
    }
  };
  return xhr.send(null);
};

// Activate CoffeeScript in the browser by having it compile and evaluate
// all script tags with a content-type of `text/coffeescript`.
// This happens on page load.
const runScripts = function() {
  const scripts = window.document.getElementsByTagName('script');
  const coffeetypes = ['text/coffeescript', 'text/literate-coffeescript'];
  const coffees = (Array.from(scripts).filter((s) => Array.from(coffeetypes).includes(s.type)));
  let index = 0;

  var execute = function() {
    const param = coffees[index];
    if (param instanceof Array) {
      CoffeeScript.run(...param);
      index++;
      return execute();
    }
  };

  for (let i = 0; i < coffees.length; i++) {
    const script = coffees[i];
    (function(script, i) {
      const options = {literate: script.type === coffeetypes[1]};
      const source = script.src || script.getAttribute('data-src');
      if (source) {
        options.filename = source;
        return CoffeeScript.load(source,
          function(param) {
            coffees[i] = param;
            return execute();
          },
          options,
          true);
      } else {
        // `options.filename` defines the filename the source map appears as
        // in Developer Tools. If a script tag has an `id`, use that as the
        // filename; otherwise use `coffeescript`, or `coffeescript1` etc.,
        // leaving the first one unnumbered for the common case that there’s
        // only one CoffeeScript script block to parse.
        options.filename = script.id && (script.id !== '') ? script.id : `coffeescript${i !== 0 ? i : ''}`;
        options.sourceFiles = ['embedded'];
        return coffees[i] = [script.innerHTML, options];
      }
    })(script, i);
  }

  return execute();
};

// Listen for window load, both in decent browsers and in IE.
if (window.addEventListener) {
  window.addEventListener('DOMContentLoaded', runScripts, false);
} else {
  window.attachEvent('onload', runScripts);
}
