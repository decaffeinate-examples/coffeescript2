/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS202: Simplify dynamic range loops
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// The CoffeeScript language has a good deal of optional syntax, implicit syntax,
// and shorthand syntax. This can greatly complicate a grammar and bloat
// the resulting parse table. Instead of making the parser handle it all, we take
// a series of passes over the token stream, using this **Rewriter** to convert
// shorthand into the unambiguous long form, add implicit indentation and
// parentheses, and generally clean things up.

let INVERSES, Rewriter;
const {throwSyntaxError} = require('./helpers');

// Move attached comments from one token to another.
const moveComments = function(fromToken, toToken) {
  if (!fromToken.comments) { return; }
  if (toToken.comments && (toToken.comments.length !== 0)) {
    const unshiftedComments = [];
    for (let comment of Array.from(fromToken.comments)) {
      if (comment.unshift) {
        unshiftedComments.push(comment);
      } else {
        toToken.comments.push(comment);
      }
    }
    toToken.comments = unshiftedComments.concat(toToken.comments);
  } else {
    toToken.comments = fromToken.comments;
  }
  return delete fromToken.comments;
};

// Create a generated token: one that exists due to a use of implicit syntax.
// Optionally have this new token take the attached comments from another token.
const generate = function(tag, value, origin, commentsToken) {
  const token = [tag, value];
  token.generated = true;
  if (origin) { token.origin = origin; }
  if (commentsToken) { moveComments(commentsToken, token); }
  return token;
};

// The **Rewriter** class is used by the [Lexer](lexer.html), directly against
// its internal array of tokens.
exports.Rewriter = (Rewriter = (function() {
  Rewriter = class Rewriter {
    static initClass() {
  
      this.prototype.generate = generate;
    }

    // Rewrite the token stream in multiple passes, one logical filter at
    // a time. This could certainly be changed into a single pass through the
    // stream, with a big ol’ efficient switch, but it’s much nicer to work with
    // like this. The order of these passes matters—indentation must be
    // corrected before implicit parentheses can be wrapped around blocks of code.
    rewrite(tokens) {
      // Set environment variable `DEBUG_TOKEN_STREAM` to `true` to output token
      // debugging info. Also set `DEBUG_REWRITTEN_TOKEN_STREAM` to `true` to
      // output the token stream after it has been rewritten by this file.
      let t;
      this.tokens = tokens;
      if (__guard__(typeof process !== 'undefined' && process !== null ? process.env : undefined, x => x.DEBUG_TOKEN_STREAM)) {
        if (process.env.DEBUG_REWRITTEN_TOKEN_STREAM) { console.log('Initial token stream:'); }
        console.log(((() => {
          const result = [];
          for (t of Array.from(this.tokens)) {             result.push(t[0] + '/' + t[1] + (t.comments ? '*' : ''));
          }
          return result;
        })()).join(' '));
      }
      this.removeLeadingNewlines();
      this.closeOpenCalls();
      this.closeOpenIndexes();
      this.normalizeLines();
      this.tagPostfixConditionals();
      this.addImplicitBracesAndParens();
      this.addParensToChainedDoIife();
      this.rescueStowawayComments();
      this.addLocationDataToGeneratedTokens();
      this.enforceValidCSXAttributes();
      this.fixOutdentLocationData();
      if (__guard__(typeof process !== 'undefined' && process !== null ? process.env : undefined, x1 => x1.DEBUG_REWRITTEN_TOKEN_STREAM)) {
        if (process.env.DEBUG_TOKEN_STREAM) { console.log('Rewritten token stream:'); }
        console.log(((() => {
          const result1 = [];
          for (t of Array.from(this.tokens)) {             result1.push(t[0] + '/' + t[1] + (t.comments ? '*' : ''));
          }
          return result1;
        })()).join(' '));
      }
      return this.tokens;
    }

    // Rewrite the token stream, looking one token ahead and behind.
    // Allow the return value of the block to tell us how many tokens to move
    // forwards (or backwards) in the stream, to make sure we don’t miss anything
    // as tokens are inserted and removed, and the stream changes length under
    // our feet.
    scanTokens(block) {
      let token;
      const {tokens} = this;
      let i = 0;
      while ((token = tokens[i])) { i += block.call(this, token, i, tokens); }
      return true;
    }

    detectEnd(i, condition, action, opts) {
      let token;
      if (opts == null) { opts = {}; }
      const {tokens} = this;
      let levels = 0;
      while ((token = tokens[i])) {
        if ((levels === 0) && condition.call(this, token, i)) { return action.call(this, token, i); }
        if (Array.from(EXPRESSION_START).includes(token[0])) {
          levels += 1;
        } else if (Array.from(EXPRESSION_END).includes(token[0])) {
          levels -= 1;
        }
        if (levels < 0) {
          if (opts.returnOnNegativeLevel) { return; }
          return action.call(this, token, i);
        }
        i += 1;
      }
      return i - 1;
    }

    // Leading newlines would introduce an ambiguity in the grammar, so we
    // dispatch them here.
    removeLeadingNewlines() {
      // Find the index of the first non-`TERMINATOR` token.
      let i;
      for (i = 0; i < this.tokens.length; i++) { const [tag] = this.tokens[i]; if (tag !== 'TERMINATOR') { break; } }
      if (i === 0) { return; }
      // If there are any comments attached to the tokens we’re about to discard,
      // shift them forward to what will become the new first token.
      for (let leadingNewlineToken of Array.from(this.tokens.slice(0, i))) {
        moveComments(leadingNewlineToken, this.tokens[i]);
      }
      // Discard all the leading newline tokens.
      return this.tokens.splice(0, i);
    }

    // The lexer has tagged the opening parenthesis of a method call. Match it with
    // its paired close.
    closeOpenCalls() {
      const condition = (token, i) => [')', 'CALL_END'].includes(token[0]);

      const action = (token, i) => token[0] = 'CALL_END';

      return this.scanTokens(function(token, i) {
        if (token[0] === 'CALL_START') { this.detectEnd(i + 1, condition, action); }
        return 1;
      });
    }

    // The lexer has tagged the opening bracket of an indexing operation call.
    // Match it with its paired close.
    closeOpenIndexes() {
      const condition = (token, i) => [']', 'INDEX_END'].includes(token[0]);

      const action = (token, i) => token[0] = 'INDEX_END';

      return this.scanTokens(function(token, i) {
        if (token[0] === 'INDEX_START') { this.detectEnd(i + 1, condition, action); }
        return 1;
      });
    }

    // Match tags in token stream starting at `i` with `pattern`.
    // `pattern` may consist of strings (equality), an array of strings (one of)
    // or null (wildcard). Returns the index of the match or -1 if no match.
    indexOfTag(i, ...pattern) {
      let j;
      let asc, end;
      const fuzz = 0;
      for (j = 0, end = pattern.length, asc = 0 <= end; asc ? j < end : j > end; asc ? j++ : j--) {
        var needle;
        if ((pattern[j] == null)) { continue; }
        if (typeof pattern[j] === 'string') { pattern[j] = [pattern[j]]; }
        if ((needle = this.tag(i + j + fuzz), !Array.from(pattern[j]).includes(needle))) { return -1; }
      }
      return (i + j + fuzz) - 1;
    }

    // Returns `yes` if standing in front of something looking like
    // `@<x>:`, `<x>:` or `<EXPRESSION_START><x>...<EXPRESSION_END>:`.
    looksObjectish(j) {
      if ((this.indexOfTag(j, '@', null, ':') !== -1) || (this.indexOfTag(j, null, ':') !== -1)) { return true; }
      const index = this.indexOfTag(j, EXPRESSION_START);
      if (index !== -1) {
        let end = null;
        this.detectEnd(index + 1, (token => Array.from(EXPRESSION_END).includes(token[0])), ((token, i) => end = i));
        if (this.tag(end + 1) === ':') { return true; }
      }
      return false;
    }

    // Returns `yes` if current line of tokens contain an element of tags on same
    // expression level. Stop searching at `LINEBREAKS` or explicit start of
    // containing balanced expression.
    findTagsBackwards(i, tags) {
      let needle, needle1, needle2;
      let needle5;
      const backStack = [];
      while ((i >= 0) && (backStack.length ||
            ((needle = this.tag(i), !Array.from(tags).includes(needle)) &&
            ((needle1 = this.tag(i), !Array.from(EXPRESSION_START).includes(needle1)) || this.tokens[i].generated) &&
            (needle2 = this.tag(i), !Array.from(LINEBREAKS).includes(needle2))))) {
        var needle3, needle4;
        if ((needle3 = this.tag(i), Array.from(EXPRESSION_END).includes(needle3))) { backStack.push(this.tag(i)); }
        if ((needle4 = this.tag(i), Array.from(EXPRESSION_START).includes(needle4)) && backStack.length) { backStack.pop(); }
        i -= 1;
      }
      return (needle5 = this.tag(i), Array.from(tags).includes(needle5));
    }

    // Look for signs of implicit calls and objects in the token stream and
    // add them.
    addImplicitBracesAndParens() {
      // Track current balancing depth (both implicit and explicit) on stack.
      const stack = [];
      let start = null;

      return this.scanTokens(function(token, i, tokens) {
        let needle, needle3, nextToken, prevToken, stackIdx, stackTag, startsLine;
        let [tag]     = token;
        let [prevTag] = (prevToken = i > 0 ? tokens[i - 1] : []);
        const [nextTag] = (nextToken = i < (tokens.length - 1) ? tokens[i + 1] : []);
        const stackTop  = () => stack[stack.length - 1];
        const startIdx  = i;

        // Helper function, used for keeping track of the number of tokens consumed
        // and spliced, when returning for getting a new token.
        const forward   = n => (i - startIdx) + n;

        // Helper functions
        const isImplicit        = stackItem => __guard__(stackItem != null ? stackItem[2] : undefined, x => x.ours);
        const isImplicitObject  = stackItem => isImplicit(stackItem) && ((stackItem != null ? stackItem[0] : undefined) === '{');
        const isImplicitCall    = stackItem => isImplicit(stackItem) && ((stackItem != null ? stackItem[0] : undefined) === '(');
        const inImplicit        = () => isImplicit(stackTop());
        const inImplicitCall    = () => isImplicitCall(stackTop());
        const inImplicitObject  = () => isImplicitObject(stackTop());
        // Unclosed control statement inside implicit parens (like
        // class declaration or if-conditionals).
        const inImplicitControl = () => inImplicit() && (__guard__(stackTop(), x => x[0]) === 'CONTROL');

        const startImplicitCall = function(idx) {
          stack.push(['(', idx, {ours: true}]);
          return tokens.splice(idx, 0, generate('CALL_START', '(', ['', 'implicit function call', token[2]], prevToken));
        };

        const endImplicitCall = function() {
          stack.pop();
          tokens.splice(i, 0, generate('CALL_END', ')', ['', 'end of input', token[2]], prevToken));
          return i += 1;
        };

        const startImplicitObject = function(idx, startsLine) {
          if (startsLine == null) { startsLine = true; }
          stack.push(['{', idx, {sameLine: true, startsLine, ours: true}]);
          const val = new String('{');
          val.generated = true;
          return tokens.splice(idx, 0, generate('{', val, token, prevToken));
        };

        const endImplicitObject = function(j) {
          j = j != null ? j : i;
          stack.pop();
          tokens.splice(j, 0, generate('}', '}', token, prevToken));
          return i += 1;
        };

        const implicitObjectContinues = j => {
          let nextTerminatorIdx = null;
          this.detectEnd(j,
            token => token[0] === 'TERMINATOR',
            (token, i) => nextTerminatorIdx = i,
            {returnOnNegativeLevel: true});
          if (nextTerminatorIdx == null) { return false; }
          return this.looksObjectish(nextTerminatorIdx + 1);
        };

        // Don’t end an implicit call/object on next indent if any of these are in an argument/value.
        if (
          ((inImplicitCall() || inImplicitObject()) && Array.from(CONTROL_IN_IMPLICIT).includes(tag)) ||
          (inImplicitObject() && (prevTag === ':') && (tag === 'FOR'))
        ) {
          stack.push(['CONTROL', i, {ours: true}]);
          return forward(1);
        }

        if ((tag === 'INDENT') && inImplicit()) {

          // An `INDENT` closes an implicit call unless
          //
          //  1. We have seen a `CONTROL` argument on the line.
          //  2. The last token before the indent is part of the list below.
          if (!['=>', '->', '[', '(', ',', '{', 'ELSE', '='].includes(prevTag)) {
            while (inImplicitCall() || (inImplicitObject() && (prevTag !== ':'))) {
              if (inImplicitCall()) {
                endImplicitCall();
              } else {
                endImplicitObject();
              }
            }
          }
          if (inImplicitControl()) { stack.pop(); }
          stack.push([tag, i]);
          return forward(1);
        }

        // Straightforward start of explicit expression.
        if (Array.from(EXPRESSION_START).includes(tag)) {
          stack.push([tag, i]);
          return forward(1);
        }

        // Close all implicit expressions inside of explicitly closed expressions.
        if (Array.from(EXPRESSION_END).includes(tag)) {
          while (inImplicit()) {
            if (inImplicitCall()) {
              endImplicitCall();
            } else if (inImplicitObject()) {
              endImplicitObject();
            } else {
              stack.pop();
            }
          }
          start = stack.pop();
        }

        const inControlFlow = () => {
          const seenFor = this.findTagsBackwards(i, ['FOR']) && this.findTagsBackwards(i, ['FORIN', 'FOROF', 'FORFROM']);
          const controlFlow = seenFor || this.findTagsBackwards(i, ['WHILE', 'UNTIL', 'LOOP', 'LEADING_WHEN']);
          if (!controlFlow) { return false; }
          let isFunc = false;
          const tagCurrentLine = token[2].first_line;
          this.detectEnd(i,
            (token, i) => Array.from(LINEBREAKS).includes(token[0]),
            function(token, i) {
              let first_line;
              [prevTag, ,,{first_line}] = tokens[i - 1] || [];
              return isFunc = (tagCurrentLine === first_line) && ['->', '=>'].includes(prevTag);
            },
            {returnOnNegativeLevel: true});
          return isFunc;
        };

        // Recognize standard implicit calls like
        // f a, f() b, f? c, h[0] d etc.
        // Added support for spread dots on the left side: f ...a
        if (((Array.from(IMPLICIT_FUNC).includes(tag) && token.spaced) ||
            ((tag === '?') && (i > 0) && !tokens[i - 1].spaced)) &&
           (Array.from(IMPLICIT_CALL).includes(nextTag) ||
           ((nextTag === '...') && (needle = this.tag(i + 2), Array.from(IMPLICIT_CALL).includes(needle)) && !this.findTagsBackwards(i, ['INDEX_START', '['])) ||
            (Array.from(IMPLICIT_UNSPACED_CALL).includes(nextTag) &&
            !nextToken.spaced && !nextToken.newLine)) &&
            !inControlFlow()) {
          if (tag === '?') { tag = (token[0] = 'FUNC_EXIST'); }
          startImplicitCall(i + 1);
          return forward(2);
        }

        // Implicit call taking an implicit indented object as first argument.
        //
        //     f
        //       a: b
        //       c: d
        //
        // Don’t accept implicit calls of this type, when on the same line
        // as the control structures below as that may misinterpret constructs like:
        //
        //     if f
        //        a: 1
        // as
        //
        //     if f(a: 1)
        //
        // which is probably always unintended.
        // Furthermore don’t allow this in literal arrays, as
        // that creates grammatical ambiguities.
        if (Array.from(IMPLICIT_FUNC).includes(tag) &&
           (this.indexOfTag(i + 1, 'INDENT') > -1) && this.looksObjectish(i + 2) &&
           !this.findTagsBackwards(i, ['CLASS', 'EXTENDS', 'IF', 'CATCH',
            'SWITCH', 'LEADING_WHEN', 'FOR', 'WHILE', 'UNTIL'])) {
          startImplicitCall(i + 1);
          stack.push(['INDENT', i + 2]);
          return forward(3);
        }

        // Implicit objects start here.
        if (tag === ':') {
          // Go back to the (implicit) start of the object.
          let needle2;
          const s = (() => { let needle1;
          switch (false) {
            case (needle1 = this.tag(i - 1), !Array.from(EXPRESSION_END).includes(needle1)): return start[1];
            case this.tag(i - 2) !== '@': return i - 2;
            default: return i - 1;
          } })();

          startsLine = (s <= 0) || (needle2 = this.tag(s - 1), Array.from(LINEBREAKS).includes(needle2)) || tokens[s - 1].newLine;
          // Are we just continuing an already declared object?
          if (stackTop()) {
            [stackTag, stackIdx] = stackTop();
            if (((stackTag === '{') || ((stackTag === 'INDENT') && (this.tag(stackIdx - 1) === '{'))) &&
               (startsLine || (this.tag(s - 1) === ',') || (this.tag(s - 1) === '{'))) {
              return forward(1);
            }
          }

          startImplicitObject(s, !!startsLine);
          return forward(2);
        }

        // End implicit calls when chaining method calls
        // like e.g.:
        //
        //     f ->
        //       a
        //     .g b, ->
        //       c
        //     .h a
        //
        // and also
        //
        //     f a
        //     .g b
        //     .h a

        // Mark all enclosing objects as not sameLine
        if (Array.from(LINEBREAKS).includes(tag)) {
          for (let j = stack.length - 1; j >= 0; j--) {
            const stackItem = stack[j];
            if (!isImplicit(stackItem)) { break; }
            if (isImplicitObject(stackItem)) { stackItem[2].sameLine = false; }
          }
        }

        const newLine = (prevTag === 'OUTDENT') || prevToken.newLine;
        if (Array.from(IMPLICIT_END).includes(tag) ||
            (Array.from(CALL_CLOSERS).includes(tag) && newLine) ||
            (['..', '...'].includes(tag) && this.findTagsBackwards(i, ["INDEX_START"]))) {
          while (inImplicit()) {
            let sameLine;
            [stackTag, stackIdx, {sameLine, startsLine}] = stackTop();
            // Close implicit calls when reached end of argument list
            if ((inImplicitCall() && (prevTag !== ',')) ||
                ((prevTag === ',') && (tag === 'TERMINATOR') && (nextTag == null))) {
              endImplicitCall();
            // Close implicit objects such as:
            // return a: 1, b: 2 unless true
            } else if (inImplicitObject() && sameLine &&
                    (tag !== 'TERMINATOR') && (prevTag !== ':') &&
                    !(['POST_IF', 'FOR', 'WHILE', 'UNTIL'].includes(tag) && startsLine && implicitObjectContinues(i + 1))) {
              endImplicitObject();
            // Close implicit objects when at end of line, line didn't end with a comma
            // and the implicit object didn't start the line or the next line doesn’t look like
            // the continuation of an object.
            } else if (inImplicitObject() && (tag === 'TERMINATOR') && (prevTag !== ',') &&
                    !(startsLine && this.looksObjectish(i + 1))) {
              endImplicitObject();
            } else {
              break;
            }
          }
        }

        // Close implicit object if comma is the last character
        // and what comes after doesn’t look like it belongs.
        // This is used for trailing commas and calls, like:
        //
        //     x =
        //         a: b,
        //         c: d,
        //     e = 2
        //
        // and
        //
        //     f a, b: c, d: e, f, g: h: i, j
        //
        if ((tag === ',') && !this.looksObjectish(i + 1) && inImplicitObject() && !((needle3 = this.tag(i + 2), ['FOROF', 'FORIN'].includes(needle3))) &&
           ((nextTag !== 'TERMINATOR') || !this.looksObjectish(i + 2))) {
          // When nextTag is OUTDENT the comma is insignificant and
          // should just be ignored so embed it in the implicit object.
          //
          // When it isn’t the comma go on to play a role in a call or
          // array further up the stack, so give it a chance.
          const offset = nextTag === 'OUTDENT' ? 1 : 0;
          while (inImplicitObject()) {
            endImplicitObject(i + offset);
          }
        }
        return forward(1);
      });
    }

    // Make sure only strings and wrapped expressions are used in CSX attributes.
    enforceValidCSXAttributes() {
      return this.scanTokens(function(token, i, tokens) {
        if (token.csxColon) {
          const next = tokens[i + 1];
          if (!['STRING_START', 'STRING', '('].includes(next[0])) {
            throwSyntaxError('expected wrapped or quoted JSX attribute', next[2]);
          }
        }
        return 1;
      });
    }

    // Not all tokens survive processing by the parser. To avoid comments getting
    // lost into the ether, find comments attached to doomed tokens and move them
    // to a token that will make it to the other side.
    rescueStowawayComments() {
      const insertPlaceholder = function(token, j, tokens, method) {
        if (tokens[j][0] !== 'TERMINATOR') { tokens[method](generate('TERMINATOR', '\n', tokens[j])); }
        return tokens[method](generate('JS', '', tokens[j], token));
      };

      const shiftCommentsForward = function(token, i, tokens) {
        // Find the next surviving token and attach this token’s comments to it,
        // with a flag that we know to output such comments *before* that
        // token’s own compilation. (Otherwise comments are output following
        // the token they’re attached to.)
        let j = i;
        while ((j !== tokens.length) && Array.from(DISCARDED).includes(tokens[j][0])) { j++; }
        if ((j !== tokens.length) && !Array.from(DISCARDED).includes(tokens[j][0])) {
          for (let comment of Array.from(token.comments)) { comment.unshift = true; }
          moveComments(token, tokens[j]);
          return 1;
        } else { // All following tokens are doomed!
          j = tokens.length - 1;
          insertPlaceholder(token, j, tokens, 'push');
          // The generated tokens were added to the end, not inline, so we don’t skip.
          return 1;
        }
      };

      const shiftCommentsBackward = function(token, i, tokens) {
        // Find the last surviving token and attach this token’s comments to it.
        let j = i;
        while ((j !== -1) && Array.from(DISCARDED).includes(tokens[j][0])) { j--; }
        if ((j !== -1) && !Array.from(DISCARDED).includes(tokens[j][0])) {
          moveComments(token, tokens[j]);
          return 1;
        } else { // All previous tokens are doomed!
          insertPlaceholder(token, 0, tokens, 'unshift');
          // We added two tokens, so shift forward to account for the insertion.
          return 3;
        }
      };

      return this.scanTokens(function(token, i, tokens) {
        let dummyToken, j;
        if (!token.comments) { return 1; }
        let ret = 1;
        if (Array.from(DISCARDED).includes(token[0])) {
          // This token won’t survive passage through the parser, so we need to
          // rescue its attached tokens and redistribute them to nearby tokens.
          // Comments that don’t start a new line can shift backwards to the last
          // safe token, while other tokens should shift forward.
          dummyToken = {comments: []};
          j = token.comments.length - 1;
          while (j !== -1) {
            if ((token.comments[j].newLine === false) && (token.comments[j].here === false)) {
              dummyToken.comments.unshift(token.comments[j]);
              token.comments.splice(j, 1);
            }
            j--;
          }
          if (dummyToken.comments.length !== 0) {
            ret = shiftCommentsBackward(dummyToken, i - 1, tokens);
          }
          if (token.comments.length !== 0) {
            shiftCommentsForward(token, i, tokens);
          }
        } else {
          // If any of this token’s comments start a line—there’s only
          // whitespace between the preceding newline and the start of the
          // comment—and this isn’t one of the special `JS` tokens, then
          // shift this comment forward to precede the next valid token.
          // `Block.compileComments` also has logic to make sure that
          // “starting new line” comments follow or precede the nearest
          // newline relative to the token that the comment is attached to,
          // but that newline might be inside a `}` or `)` or other generated
          // token that we really want this comment to output after. Therefore
          // we need to shift the comments here, avoiding such generated and
          // discarded tokens.
          dummyToken = {comments: []};
          j = token.comments.length - 1;
          while (j !== -1) {
            if (token.comments[j].newLine && !token.comments[j].unshift &&
               !((token[0] === 'JS') && token.generated)) {
              dummyToken.comments.unshift(token.comments[j]);
              token.comments.splice(j, 1);
            }
            j--;
          }
          if (dummyToken.comments.length !== 0) {
            ret = shiftCommentsForward(dummyToken, i + 1, tokens);
          }
        }
        if ((token.comments != null ? token.comments.length : undefined) === 0) { delete token.comments; }
        return ret;
      });
    }

    // Add location data to all tokens generated by the rewriter.
    addLocationDataToGeneratedTokens() {
      return this.scanTokens(function(token, i, tokens) {
        let column, line, nextLocation, prevLocation;
        if     (token[2]) { return 1; }
        if (!token.generated && !token.explicit) { return 1; }
        if ((token[0] === '{') && (nextLocation=__guard__(tokens[i + 1], x => x[2]))) {
          ({first_line: line, first_column: column} = nextLocation);
        } else if ((prevLocation = __guard__(tokens[i - 1], x1 => x1[2]))) {
          ({last_line: line, last_column: column} = prevLocation);
        } else {
          line = (column = 0);
        }
        token[2] = {
          first_line:   line,
          first_column: column,
          last_line:    line,
          last_column:  column
        };
        return 1;
      });
    }

    // `OUTDENT` tokens should always be positioned at the last character of the
    // previous token, so that AST nodes ending in an `OUTDENT` token end up with a
    // location corresponding to the last “real” token under the node.
    fixOutdentLocationData() {
      return this.scanTokens(function(token, i, tokens) {
        if ((token[0] !== 'OUTDENT') &&
          (!token.generated || (token[0] !== 'CALL_END')) &&
          (!token.generated || (token[0] !== '}'))) { return 1; }
        const prevLocationData = tokens[i - 1][2];
        token[2] = {
          first_line:   prevLocationData.last_line,
          first_column: prevLocationData.last_column,
          last_line:    prevLocationData.last_line,
          last_column:  prevLocationData.last_column
        };
        return 1;
      });
    }

    // Add parens around a `do` IIFE followed by a chained `.` so that the
    // chaining applies to the executed function rather than the function
    // object (see #3736)
    addParensToChainedDoIife() {
      const condition = function(token, i) {
        return this.tag(i - 1) === 'OUTDENT';
      };
      const action = function(token, i) {
        if (!Array.from(CALL_CLOSERS).includes(token[0])) { return; }
        this.tokens.splice(doIndex, 0, generate('(', '(', this.tokens[doIndex]));
        return this.tokens.splice(i + 1, 0, generate(')', ')', this.tokens[i]));
      };
      var doIndex = null;
      return this.scanTokens(function(token, i, tokens) {
        let needle;
        if (token[1] !== 'do') { return 1; }
        doIndex = i;
        let glyphIndex = i + 1;
        if (this.tag(i + 1) === 'PARAM_START') {
          glyphIndex = null;
          this.detectEnd(i + 1,
            function(token, i) { return this.tag(i - 1) === 'PARAM_END'; },
            (token, i) => glyphIndex = i);
        }
        if ((glyphIndex == null) || (needle = this.tag(glyphIndex), !['->', '=>'].includes(needle)) || (this.tag(glyphIndex + 1) !== 'INDENT')) { return 1; }
        this.detectEnd(glyphIndex + 1, condition, action);
        return 2;
      });
    }

    // Because our grammar is LALR(1), it can’t handle some single-line
    // expressions that lack ending delimiters. The **Rewriter** adds the implicit
    // blocks, so it doesn’t need to. To keep the grammar clean and tidy, trailing
    // newlines within expressions are removed and the indentation tokens of empty
    // blocks are added.
    normalizeLines() {
      let indent, outdent;
      let starter = (indent = (outdent = null));
      let leading_switch_when = null;
      let leading_if_then = null;
      // Count `THEN` tags
      const ifThens = [];

      const condition = function(token, i) {
        let needle;
        return ((token[1] !== ';') && Array.from(SINGLE_CLOSERS).includes(token[0]) &&
        !((token[0] === 'TERMINATOR') && (needle = this.tag(i + 1), Array.from(EXPRESSION_CLOSE).includes(needle))) &&
        !((token[0] === 'ELSE') &&
             ((starter !== 'THEN') || (leading_if_then || leading_switch_when))) &&
        !(['CATCH', 'FINALLY'].includes(token[0]) && ['->', '=>'].includes(starter))) ||
        (Array.from(CALL_CLOSERS).includes(token[0]) &&
        (this.tokens[i - 1].newLine || (this.tokens[i - 1][0] === 'OUTDENT')));
      };

      const action = function(token, i) {
        if ((token[0] === 'ELSE') && (starter === 'THEN')) { ifThens.pop(); }
        return this.tokens.splice((this.tag(i - 1) === ',' ? i - 1 : i), 0, outdent);
      };

      const closeElseTag = (tokens, i) => {
        let outdentElse;
        const tlen = ifThens.length;
        if (!(tlen > 0)) { return i; }
        const lastThen = ifThens.pop();
        [, outdentElse] = this.indentation(tokens[lastThen]);
        // Insert `OUTDENT` to close inner `IF`.
        outdentElse[1] = tlen*2;
        tokens.splice(i, 0, outdentElse);
        // Insert `OUTDENT` to close outer `IF`.
        outdentElse[1] = 2;
        tokens.splice(i + 1, 0, outdentElse);
        // Remove outdents from the end.
        this.detectEnd(i + 2,
          (token, i) => ['OUTDENT', 'TERMINATOR'].includes(token[0]),
          function(token, i) {
              if ((this.tag(i) === 'OUTDENT') && (this.tag(i + 1) === 'OUTDENT')) {
                return tokens.splice(i, 2);
              }
        });
        return i + 2;
      };

      return this.scanTokens(function(token, i, tokens) {
        const [tag] = token;
        const conditionTag = ['->', '=>'].includes(tag) &&
          this.findTagsBackwards(i, ['IF', 'WHILE', 'FOR', 'UNTIL', 'SWITCH', 'WHEN', 'LEADING_WHEN', '[', 'INDEX_START']) &&
          !(this.findTagsBackwards(i, ['THEN', '..', '...']));

        if (tag === 'TERMINATOR') {
          let needle;
          if ((this.tag(i + 1) === 'ELSE') && (this.tag(i - 1) !== 'OUTDENT')) {
            tokens.splice(i, 1, ...this.indentation());
            return 1;
          }
          if ((needle = this.tag(i + 1), Array.from(EXPRESSION_CLOSE).includes(needle))) {
            tokens.splice(i, 1);
            return 0;
          }
        }
        if (tag === 'CATCH') {
          for (let j = 1; j <= 2; j++) {
            var needle1;
            if ((needle1 = this.tag(i + j), ['OUTDENT', 'TERMINATOR', 'FINALLY'].includes(needle1))) {
              tokens.splice(i + j, 0, ...this.indentation());
              return 2 + j;
            }
          }
        }
        if (['->', '=>'].includes(tag) && ((this.tag(i + 1) === ',') || ((this.tag(i + 1) === '.') && token.newLine))) {
          [indent, outdent] = this.indentation(tokens[i]);
          tokens.splice(i + 1, 0, indent, outdent);
          return 1;
        }
        if (Array.from(SINGLE_LINERS).includes(tag) && (this.tag(i + 1) !== 'INDENT') &&
           !((tag === 'ELSE') && (this.tag(i + 1) === 'IF')) &&
           !conditionTag) {
          starter = tag;
          [indent, outdent] = this.indentation(tokens[i]);
          if (starter === 'THEN') { indent.fromThen   = true; }
          if (tag === 'THEN') {
            leading_switch_when = this.findTagsBackwards(i, ['LEADING_WHEN']) && (this.tag(i + 1) === 'IF');
            leading_if_then = this.findTagsBackwards(i, ['IF']) && (this.tag(i + 1) === 'IF');
          }
          if ((tag === 'THEN') && this.findTagsBackwards(i, ['IF'])) { ifThens.push(i); }
          // `ELSE` tag is not closed.
          if ((tag === 'ELSE') && (this.tag(i - 1) !== 'OUTDENT')) {
            i = closeElseTag(tokens, i);
          }
          tokens.splice(i + 1, 0, indent);
          this.detectEnd(i + 2, condition, action);
          if (tag === 'THEN') { tokens.splice(i, 1); }
          return 1;
        }
        return 1;
      });
    }

    // Tag postfix conditionals as such, so that we can parse them with a
    // different precedence.
    tagPostfixConditionals() {
      let original = null;

      const condition = function(token, i) {
        const [tag] = token;
        const [prevTag] = this.tokens[i - 1];
        return (tag === 'TERMINATOR') || ((tag === 'INDENT') && !Array.from(SINGLE_LINERS).includes(prevTag));
      };

      const action = function(token, i) {
        if ((token[0] !== 'INDENT') || (token.generated && !token.fromThen)) {
          return original[0] = 'POST_' + original[0];
        }
      };

      return this.scanTokens(function(token, i) {
        if (token[0] !== 'IF') { return 1; }
        original = token;
        this.detectEnd(i + 1, condition, action);
        return 1;
      });
    }

    // Generate the indentation tokens, based on another token on the same line.
    indentation(origin) {
      const indent  = ['INDENT', 2];
      const outdent = ['OUTDENT', 2];
      if (origin) {
        indent.generated = (outdent.generated = true);
        indent.origin = (outdent.origin = origin);
      } else {
        indent.explicit = (outdent.explicit = true);
      }
      return [indent, outdent];
    }

    // Look up a tag by token index.
    tag(i) { return (this.tokens[i] != null ? this.tokens[i][0] : undefined); }
  };
  Rewriter.initClass();
  return Rewriter;
})());

// Constants
// ---------

// List of the token pairs that must be balanced.
const BALANCED_PAIRS = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['INDENT', 'OUTDENT'],
  ['CALL_START', 'CALL_END'],
  ['PARAM_START', 'PARAM_END'],
  ['INDEX_START', 'INDEX_END'],
  ['STRING_START', 'STRING_END'],
  ['REGEX_START', 'REGEX_END']
];

// The inverse mappings of `BALANCED_PAIRS` we’re trying to fix up, so we can
// look things up from either end.
exports.INVERSES = (INVERSES = {});

// The tokens that signal the start/end of a balanced pair.
var EXPRESSION_START = [];
var EXPRESSION_END   = [];

for (let [left, right] of Array.from(BALANCED_PAIRS)) {
  EXPRESSION_START.push(INVERSES[right] = left);
  EXPRESSION_END  .push(INVERSES[left] = right);
}

// Tokens that indicate the close of a clause of an expression.
var EXPRESSION_CLOSE = ['CATCH', 'THEN', 'ELSE', 'FINALLY'].concat(EXPRESSION_END);

// Tokens that, if followed by an `IMPLICIT_CALL`, indicate a function invocation.
var IMPLICIT_FUNC    = ['IDENTIFIER', 'PROPERTY', 'SUPER', ')', 'CALL_END', ']', 'INDEX_END', '@', 'THIS'];

// If preceded by an `IMPLICIT_FUNC`, indicates a function invocation.
var IMPLICIT_CALL    = [
  'IDENTIFIER', 'CSX_TAG', 'PROPERTY', 'NUMBER', 'INFINITY', 'NAN',
  'STRING', 'STRING_START', 'REGEX', 'REGEX_START', 'JS',
  'NEW', 'PARAM_START', 'CLASS', 'IF', 'TRY', 'SWITCH', 'THIS',
  'UNDEFINED', 'NULL', 'BOOL',
  'UNARY', 'YIELD', 'AWAIT', 'UNARY_MATH', 'SUPER', 'THROW',
  '@', '->', '=>', '[', '(', '{', '--', '++'
];

var IMPLICIT_UNSPACED_CALL = ['+', '-'];

// Tokens that always mark the end of an implicit call for single-liners.
var IMPLICIT_END     = ['POST_IF', 'FOR', 'WHILE', 'UNTIL', 'WHEN', 'BY',
  'LOOP', 'TERMINATOR'];

// Single-line flavors of block expressions that have unclosed endings.
// The grammar can’t disambiguate them, so we insert the implicit indentation.
var SINGLE_LINERS    = ['ELSE', '->', '=>', 'TRY', 'FINALLY', 'THEN'];
var SINGLE_CLOSERS   = ['TERMINATOR', 'CATCH', 'FINALLY', 'ELSE', 'OUTDENT', 'LEADING_WHEN'];

// Tokens that end a line.
var LINEBREAKS       = ['TERMINATOR', 'INDENT', 'OUTDENT'];

// Tokens that close open calls when they follow a newline.
var CALL_CLOSERS     = ['.', '?.', '::', '?::'];

// Tokens that prevent a subsequent indent from ending implicit calls/objects
var CONTROL_IN_IMPLICIT = ['IF', 'TRY', 'FINALLY', 'CATCH', 'CLASS', 'SWITCH'];

// Tokens that are swallowed up by the parser, never leading to code generation.
// You can spot these in `grammar.coffee` because the `o` function second
// argument doesn’t contain a `new` call for these tokens.
// `STRING_START` isn’t on this list because its `locationData` matches that of
// the node that becomes `StringWithInterpolations`, and therefore
// `addDataToNode` attaches `STRING_START`’s tokens to that node.
var DISCARDED = ['(', ')', '[', ']', '{', '}', '.', '..', '...', ',', '=', '++', '--', '?',
  'AS', 'AWAIT', 'CALL_START', 'CALL_END', 'DEFAULT', 'ELSE', 'EXTENDS', 'EXPORT',
  'FORIN', 'FOROF', 'FORFROM', 'IMPORT', 'INDENT', 'INDEX_SOAK', 'LEADING_WHEN',
  'OUTDENT', 'PARAM_END', 'REGEX_START', 'REGEX_END', 'RETURN', 'STRING_END', 'THROW',
  'UNARY', 'YIELD'
].concat(IMPLICIT_UNSPACED_CALL.concat(IMPLICIT_END.concat(CALL_CLOSERS.concat(CONTROL_IN_IMPLICIT))));

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}