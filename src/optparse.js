/* eslint-disable
    func-names,
    max-len,
    no-continue,
    no-loop-func,
    no-multi-assign,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-shadow,
    no-underscore-dangle,
    no-unused-vars,
    no-use-before-define,
    no-useless-escape,
    no-var,
    prefer-const,
    prefer-destructuring,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let OptionParser;
const { repeat } = require('./helpers');

// A simple **OptionParser** class to parse option flags from the command-line.
// Use it like so:
//
//     parser  = new OptionParser switches, helpBanner
//     options = parser.parse process.argv
//
// The first non-option is considered to be the start of the file (and file
// option) list, and all subsequent arguments are left unparsed.
//
// The `coffee` command uses an instance of **OptionParser** to parse its
// command-line arguments in `src/command.coffee`.
exports.OptionParser = (OptionParser = class OptionParser {
  // Initialize with a list of valid options, in the form:
  //
  //     [short-flag, long-flag, description]
  //
  // Along with an optional banner for the usage help.
  constructor(ruleDeclarations, banner) {
    this.banner = banner;
    this.rules = buildRules(ruleDeclarations);
  }

  // Parse the list of arguments, populating an `options` object with all of the
  // specified options, and return it. Options after the first non-option
  // argument are treated as arguments. `options.arguments` will be an array
  // containing the remaining arguments. This is a simpler API than many option
  // parsers that allow you to attach callback actions for every flag. Instead,
  // you're responsible for interpreting the options object.
  parse(args) {
    // The CoffeeScript option parser is a little odd; options after the first
    // non-option argument are treated as non-option arguments themselves.
    // Optional arguments are normalized by expanding merged flags into multiple
    // flags. This allows you to have `-wl` be the same as `--watch --lint`.
    // Note that executable scripts with a shebang (`#!`) line should use the
    // line `#!/usr/bin/env coffee`, or `#!/absolute/path/to/coffee`, without a
    // `--` argument after, because that will fail on Linux (see #3946).
    let { rules, positional } = normalizeArguments(args, this.rules.flagDict);
    const options = {};

    // The `argument` field is added to the rule instance non-destructively by
    // `normalizeArguments`.
    for (const {
      hasArgument, argument, isList, name,
    } of Array.from(rules)) {
      if (hasArgument) {
        if (isList) {
          if (options[name] == null) { options[name] = []; }
          options[name].push(argument);
        } else {
          options[name] = argument;
        }
      } else {
        options[name] = true;
      }
    }

    if (positional[0] === '--') {
      options.doubleDashed = true;
      positional = positional.slice(1);
    }

    options.arguments = positional;
    return options;
  }

  // Return the help text for this **OptionParser**, listing and describing all
  // of the valid options, for `--help` and such.
  help() {
    const lines = [];
    if (this.banner) { lines.unshift(`${this.banner}\n`); }
    for (const rule of Array.from(this.rules.ruleList)) {
      let spaces = 15 - rule.longFlag.length;
      spaces = spaces > 0 ? repeat(' ', spaces) : '';
      const letPart = rule.shortFlag ? `${rule.shortFlag}, ` : '    ';
      lines.push(`  ${letPart}${rule.longFlag}${spaces}${rule.description}`);
    }
    return `\n${lines.join('\n')}\n`;
  }
});

// Helpers
// -------

// Regex matchers for option flags on the command line and their rules.
const LONG_FLAG = /^(--\w[\w\-]*)/;
const SHORT_FLAG = /^(-\w)$/;
const MULTI_FLAG = /^-(\w{2,})/;
// Matches the long flag part of a rule for an option with an argument. Not
// applied to anything in process.argv.
const OPTIONAL = /\[(\w+(\*?))\]/;

// Build and return the list of option rules. If the optional *short-flag* is
// unspecified, leave it out by padding with `null`.
var buildRules = function (ruleDeclarations) {
  const ruleList = (() => {
    const result = [];
    for (const tuple of Array.from(ruleDeclarations)) {
      if (tuple.length < 3) { tuple.unshift(null); }
      result.push(buildRule(...tuple));
    }
    return result;
  })();
  const flagDict = {};
  for (const rule of Array.from(ruleList)) {
    // `shortFlag` is null if not provided in the rule.
    for (const flag of [rule.shortFlag, rule.longFlag]) {
      if (flag != null) {
        if (flagDict[flag] != null) {
          throw new Error(`flag ${flag} for switch ${rule.name} \
was already declared for switch ${flagDict[flag].name}`);
        }
        flagDict[flag] = rule;
      }
    }
  }

  return { ruleList, flagDict };
};

// Build a rule from a `-o` short flag, a `--output [DIR]` long flag, and the
// description of what the option does.
var buildRule = function (shortFlag, longFlag, description) {
  const match = longFlag.match(OPTIONAL);
  shortFlag = shortFlag != null ? shortFlag.match(SHORT_FLAG)[1] : undefined;
  longFlag = longFlag.match(LONG_FLAG)[1];
  return {
    name: longFlag.replace(/^--/, ''),
    shortFlag,
    longFlag,
    description,
    hasArgument: !!(match && match[1]),
    isList: !!(match && match[2]),
  };
};

var normalizeArguments = function (args, flagDict) {
  let flag;
  const rules = [];
  let positional = [];
  let needsArgOpt = null;
  for (let argIndex = 0; argIndex < args.length; argIndex++) {
    // If the previous argument given to the script was an option that uses the
    // next command-line argument as its argument, create copy of the option’s
    // rule with an `argument` field.
    var rule;
    var arg = args[argIndex];
    if (needsArgOpt != null) {
      const withArg = { ...needsArgOpt.rule, argument: arg };
      rules.push(withArg);
      needsArgOpt = null;
      continue;
    }

    const multiFlags = __guard__(arg.match(MULTI_FLAG), (x) => x[1]
      .split('')
      .map((flagName) => `-${flagName}`));
    if (multiFlags != null) {
      const multiOpts = multiFlags.map((flag) => {
        const rule = flagDict[flag];
        if (rule == null) {
          throw new Error(`unrecognized option ${flag} in multi-flag ${arg}`);
        }
        return { rule, flag };
      });
      // Only the last flag in a multi-flag may have an argument.
      const adjustedLength = Math.max(multiOpts.length, 1); const innerOpts = multiOpts.slice(0, adjustedLength - 1); const
        lastOpt = multiOpts[adjustedLength - 1];
      for ({ rule, flag } of Array.from(innerOpts)) {
        if (rule.hasArgument) {
          throw new Error(`cannot use option ${flag} in multi-flag ${arg} except \
as the last option, because it needs an argument`);
        }
        rules.push(rule);
      }
      if (lastOpt.rule.hasArgument) {
        needsArgOpt = lastOpt;
      } else {
        rules.push(lastOpt.rule);
      }
    } else if ([LONG_FLAG, SHORT_FLAG].some((pat) => arg.match(pat) != null)) {
      const singleRule = flagDict[arg];
      if (singleRule == null) {
        throw new Error(`unrecognized option ${arg}`);
      }
      if (singleRule.hasArgument) {
        needsArgOpt = { rule: singleRule, flag: arg };
      } else {
        rules.push(singleRule);
      }
    } else {
      // This is a positional argument.
      positional = args.slice(argIndex);
      break;
    }
  }

  if (needsArgOpt != null) {
    throw new Error(`value required for ${needsArgOpt.flag}, but it was the last \
argument provided`);
  }
  return { rules, positional };
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
