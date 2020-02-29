/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// The CoffeeScript Lexer. Uses a series of token-matching regexes to attempt
// matches against the beginning of the source code. When a match is found,
// a token is produced, we consume the match, and start again. Tokens are in the
// form:
//
//     [tag, value, locationData]
//
// where locationData is {first_line, first_column, last_line, last_column}, which is a
// format that can be fed directly into [Jison](https://github.com/zaach/jison).  These
// are read by jison in the `parser.lexer` function defined in coffeescript.coffee.

let Lexer;
const {Rewriter, INVERSES} = require('./rewriter');

// Import the helpers we need.
const {count, starts, compact, repeat, invertLiterate, merge,
attachCommentsToNode, locationDataToString, throwSyntaxError} = require('./helpers');

// The Lexer Class
// ---------------

// The Lexer class reads a stream of CoffeeScript and divvies it up into tagged
// tokens. Some potential ambiguity in the grammar has been avoided by
// pushing some extra smarts into the Lexer.
exports.Lexer = (Lexer = class Lexer {

  // **tokenize** is the Lexer's main method. Scan by attempting to match tokens
  // one at a time, using a regular expression anchored at the start of the
  // remaining code, or a custom recursive token-matching method
  // (for interpolations). When the next token has been recorded, we move forward
  // within the code past the token, and begin again.
  //
  // Each tokenizing method is responsible for returning the number of characters
  // it has consumed.
  //
  // Before returning the token stream, run it through the [Rewriter](rewriter.html).
  tokenize(code, opts) {
    let end;
    if (opts == null) { opts = {}; }
    this.literate   = opts.literate;  // Are we lexing literate CoffeeScript?
    this.indent     = 0;              // The current indentation level.
    this.baseIndent = 0;              // The overall minimum indentation level.
    this.indebt     = 0;              // The over-indentation at the current level.
    this.outdebt    = 0;              // The under-outdentation at the current level.
    this.indents    = [];             // The stack of all current indentation levels.
    this.indentLiteral = '';          // The indentation.
    this.ends       = [];             // The stack for pairing up tokens.
    this.tokens     = [];             // Stream of parsed tokens in the form `['TYPE', value, location data]`.
    this.seenFor    = false;             // Used to recognize `FORIN`, `FOROF` and `FORFROM` tokens.
    this.seenImport = false;             // Used to recognize `IMPORT FROM? AS?` tokens.
    this.seenExport = false;             // Used to recognize `EXPORT FROM? AS?` tokens.
    this.importSpecifierList = false;    // Used to identify when in an `IMPORT {...} FROM? ...`.
    this.exportSpecifierList = false;    // Used to identify when in an `EXPORT {...} FROM? ...`.
    this.csxDepth = 0;                // Used to optimize CSX checks, how deep in CSX we are.
    this.csxObjAttribute = {};        // Used to detect if CSX attributes is wrapped in {} (<div {props...} />).

    this.chunkLine =
      opts.line || 0;             // The start line for the current @chunk.
    this.chunkColumn =
      opts.column || 0;           // The start column of the current @chunk.
    code = this.clean(code);           // The stripped, cleaned original source code.

    // At every position, run through this list of attempted matches,
    // short-circuiting if any of them succeed. Their order determines precedence:
    // `@literalToken` is the fallback catch-all.
    let i = 0;
    while ((this.chunk = code.slice(i))) {
      const consumed = 
           this.identifierToken() ||
           this.commentToken()    ||
           this.whitespaceToken() ||
           this.lineToken()       ||
           this.stringToken()     ||
           this.numberToken()     ||
           this.csxToken()        ||
           this.regexToken()      ||
           this.jsToken()         ||
           this.literalToken();

      // Update position.
      [this.chunkLine, this.chunkColumn] = this.getLineAndColumnFromChunk(consumed);

      i += consumed;

      if (opts.untilBalanced && (this.ends.length === 0)) { return {tokens: this.tokens, index: i}; }
    }

    this.closeIndentation();
    if (end = this.ends.pop()) { this.error(`missing ${end.tag}`, (end.origin != null ? end.origin : end)[2]); }
    if (opts.rewrite === false) { return this.tokens; }
    return (new Rewriter).rewrite(this.tokens);
  }

  // Preprocess the code to remove leading and trailing whitespace, carriage
  // returns, etc. If we’re lexing literate CoffeeScript, strip external Markdown
  // by removing all lines that aren’t indented by at least four spaces or a tab.
  clean(code) {
    if (code.charCodeAt(0) === BOM) { code = code.slice(1); }
    code = code.replace(/\r/g, '').replace(TRAILING_SPACES, '');
    if (WHITESPACE.test(code)) {
      code = `\n${code}`;
      this.chunkLine--;
    }
    if (this.literate) { code = invertLiterate(code); }
    return code;
  }

  // Tokenizers
  // ----------

  // Matches identifying literals: variables, keywords, method names, etc.
  // Check to ensure that JavaScript reserved words aren’t being used as
  // identifiers. Because CoffeeScript reserves a handful of keywords that are
  // allowed in JavaScript, we’re careful not to tag them as keywords when
  // referenced as property names here, so you can still do `jQuery.is()` even
  // though `is` means `===` otherwise.
  identifierToken() {
    let alias, match, needle4, prev, regExSuper;
    const inCSXTag = this.atCSXTag();
    const regex = inCSXTag ? CSX_ATTRIBUTE : IDENTIFIER;
    if (!(match = regex.exec(this.chunk))) { return 0; }
    let [input, id, colon] = match;

    // Preserve length of id for location data
    const idLength = id.length;
    let poppedToken = undefined;
    if ((id === 'own') && (this.tag() === 'FOR')) {
      this.token('OWN', id);
      return id.length;
    }
    if ((id === 'from') && (this.tag() === 'YIELD')) {
      this.token('FROM', id);
      return id.length;
    }
    if ((id === 'as') && this.seenImport) {
      let needle, needle1;
      if (this.value() === '*') {
        this.tokens[this.tokens.length - 1][0] = 'IMPORT_ALL';
      } else if ((needle = this.value(true), Array.from(COFFEE_KEYWORDS).includes(needle))) {
        prev = this.prev();
        [prev[0], prev[1]] = ['IDENTIFIER', this.value(true)];
      }
      if ((needle1 = this.tag(), ['DEFAULT', 'IMPORT_ALL', 'IDENTIFIER'].includes(needle1))) {
        this.token('AS', id);
        return id.length;
      }
    }
    if ((id === 'as') && this.seenExport) {
      let needle2, needle3;
      if ((needle2 = this.tag(), ['IDENTIFIER', 'DEFAULT'].includes(needle2))) {
        this.token('AS', id);
        return id.length;
      }
      if ((needle3 = this.value(true), Array.from(COFFEE_KEYWORDS).includes(needle3))) {
        prev = this.prev();
        [prev[0], prev[1]] = ['IDENTIFIER', this.value(true)];
        this.token('AS', id);
        return id.length;
      }
    }
    if ((id === 'default') && this.seenExport && (needle4 = this.tag(), ['EXPORT', 'AS'].includes(needle4))) {
      this.token('DEFAULT', id);
      return id.length;
    }
    if ((id === 'do') && (regExSuper = /^(\s*super)(?!\(\))/.exec(this.chunk.slice(3)))) {
      let sup;
      this.token('SUPER', 'super');
      this.token('CALL_START', '(');
      this.token('CALL_END', ')');
      [input, sup] = regExSuper;
      return sup.length + 3;
    }

    prev = this.prev();

    let tag =
      colon || ((prev != null) &&
         (['.', '?.', '::', '?::'].includes(prev[0]) ||
         (!prev.spaced && (prev[0] === '@')))) ?
        'PROPERTY'
      :
        'IDENTIFIER';

    if ((tag === 'IDENTIFIER') && (Array.from(JS_KEYWORDS).includes(id) || Array.from(COFFEE_KEYWORDS).includes(id)) &&
       !(this.exportSpecifierList && Array.from(COFFEE_KEYWORDS).includes(id))) {
      let needle5;
      tag = id.toUpperCase();
      if ((tag === 'WHEN') && (needle5 = this.tag(), Array.from(LINE_BREAK).includes(needle5))) {
        tag = 'LEADING_WHEN';
      } else if (tag === 'FOR') {
        this.seenFor = true;
      } else if (tag === 'UNLESS') {
        tag = 'IF';
      } else if (tag === 'IMPORT') {
        this.seenImport = true;
      } else if (tag === 'EXPORT') {
        this.seenExport = true;
      } else if (Array.from(UNARY).includes(tag)) {
        tag = 'UNARY';
      } else if (Array.from(RELATION).includes(tag)) {
        if ((tag !== 'INSTANCEOF') && this.seenFor) {
          tag = 'FOR' + tag;
          this.seenFor = false;
        } else {
          tag = 'RELATION';
          if (this.value() === '!') {
            poppedToken = this.tokens.pop();
            id = '!' + id;
          }
        }
      }
    } else if ((tag === 'IDENTIFIER') && this.seenFor && (id === 'from') &&
       isForFrom(prev)) {
      tag = 'FORFROM';
      this.seenFor = false;
    // Throw an error on attempts to use `get` or `set` as keywords, or
    // what CoffeeScript would normally interpret as calls to functions named
    // `get` or `set`, i.e. `get({foo: function () {}})`.
    } else if ((tag === 'PROPERTY') && prev) {
      let needle6;
      if (prev.spaced && Array.from(CALLABLE).includes(prev[0]) && /^[gs]et$/.test(prev[1]) &&
         (this.tokens.length > 1) && (needle6 = this.tokens[this.tokens.length - 2][0], !['.', '?.', '@'].includes(needle6))) {
        this.error(`'${prev[1]}' cannot be used as a keyword, or as a function call \
without parentheses`, prev[2]);
      } else if (this.tokens.length > 2) {
        let needle7;
        const prevprev = this.tokens[this.tokens.length - 2];
        if (['@', 'THIS'].includes(prev[0]) && prevprev && prevprev.spaced &&
           /^[gs]et$/.test(prevprev[1]) &&
           (needle7 = this.tokens[this.tokens.length - 3][0], !['.', '?.', '@'].includes(needle7))) {
          this.error(`'${prevprev[1]}' cannot be used as a keyword, or as a \
function call without parentheses`, prevprev[2]);
        }
      }
    }

    if ((tag === 'IDENTIFIER') && Array.from(RESERVED).includes(id)) {
      this.error(`reserved word '${id}'`, {length: id.length});
    }

    if ((tag !== 'PROPERTY') && !this.exportSpecifierList) {
      if (Array.from(COFFEE_ALIASES).includes(id)) {
        alias = id;
        id = COFFEE_ALIAS_MAP[id];
      }
      tag = (() => { switch (id) {
        case '!':                 return 'UNARY';
        case '==': case '!=':          return 'COMPARE';
        case 'true': case 'false':     return 'BOOL';
        case 'break': case 'continue': 
             case 'debugger':          return 'STATEMENT';
        case '&&': case '||':          return id;
        default:  return tag;
      } })();
    }

    const tagToken = this.token(tag, id, 0, idLength);
    if (alias) { tagToken.origin = [tag, alias, tagToken[2]]; }
    if (poppedToken) {
      [tagToken[2].first_line, tagToken[2].first_column] =
        [poppedToken[2].first_line, poppedToken[2].first_column];
    }
    if (colon) {
      const colonOffset = input.lastIndexOf(inCSXTag ? '=' : ':');
      const colonToken = this.token(':', ':', colonOffset, colon.length);
      if (inCSXTag) { colonToken.csxColon = true; } // used by rewriter
    }
    if (inCSXTag && (tag === 'IDENTIFIER') && (prev[0] !== ':')) {
      this.token(',', ',', 0, 0, tagToken);
    }

    return input.length;
  }

  // Matches numbers, including decimals, hex, and exponential notation.
  // Be careful not to interfere with ranges in progress.
  numberToken() {
    let match;
    if (!(match = NUMBER.exec(this.chunk))) { return 0; }

    const number = match[0];
    const lexedLength = number.length;

    switch (false) {
      case !/^0[BOX]/.test(number):
        this.error(`radix prefix in '${number}' must be lowercase`, {offset: 1});
        break;
      case !/^(?!0x).*E/.test(number):
        this.error(`exponential notation in '${number}' must be indicated with a lowercase 'e'`,
          {offset: number.indexOf('E')});
        break;
      case !/^0\d*[89]/.test(number):
        this.error(`decimal literal '${number}' must not be prefixed with '0'`, {length: lexedLength});
        break;
      case !/^0\d+/.test(number):
        this.error(`octal literal '${number}' must be prefixed with '0o'`, {length: lexedLength});
        break;
    }

    const base = (() => { switch (number.charAt(1)) {
      case 'b': return 2;
      case 'o': return 8;
      case 'x': return 16;
      default: return null;
    } })();

    const numberValue = (base != null) ? parseInt(number.slice(2), base) : parseFloat(number);

    const tag = numberValue === Infinity ? 'INFINITY' : 'NUMBER';
    this.token(tag, number, 0, lexedLength);
    return lexedLength;
  }

  // Matches strings, including multiline strings, as well as heredocs, with or without
  // interpolation.
  stringToken() {
    let i;
    const [quote] = STRING_START.exec(this.chunk) || [];
    if (!quote) { return 0; }

    // If the preceding token is `from` and this is an import or export statement,
    // properly tag the `from`.
    const prev = this.prev();
    if (prev && (this.value() === 'from') && (this.seenImport || this.seenExport)) {
      prev[0] = 'FROM';
    }

    const regex = (() => { switch (quote) {
      case "'":   return STRING_SINGLE;
      case '"':   return STRING_DOUBLE;
      case "'''": return HEREDOC_SINGLE;
      case '"""': return HEREDOC_DOUBLE;
    } })();
    const heredoc = quote.length === 3;

    const {tokens, index: end} = this.matchWithInterpolations(regex, quote);
    const $ = tokens.length - 1;

    const delimiter = quote.charAt(0);
    if (heredoc) {
      // Find the smallest indentation. It will be removed from all lines later.
      let match;
      let indentRegex;
      let indent = null;
      const doc = ((() => {
        const result = [];
        for (i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token[0] === 'NEOSTRING') {
            result.push(token[1]);
          }
        }
        return result;
      })()).join('#{}');
      while ((match = HEREDOC_INDENT.exec(doc))) {
        const attempt = match[1];
        if ((indent === null) || (0 < attempt.length && attempt.length < indent.length)) { indent = attempt; }
      }
      if (indent) { indentRegex = new RegExp(`\\n${indent}`, 'g'); }
      this.mergeInterpolationTokens(tokens, {delimiter}, (value, i) => {
        value = this.formatString(value, {delimiter: quote});
        if (indentRegex) { value = value.replace(indentRegex, '\n'); }
        if (i === 0) { value = value.replace(LEADING_BLANK_LINE,  ''); }
        if (i === $) { value = value.replace(TRAILING_BLANK_LINE, ''); }
        return value;
      });
    } else {
      this.mergeInterpolationTokens(tokens, {delimiter}, (value, i) => {
        value = this.formatString(value, {delimiter: quote});
        value = value.replace(SIMPLE_STRING_OMIT, function(match, offset) {
          if (((i === 0) && (offset === 0)) ||
             ((i === $) && ((offset + match.length) === value.length))) {
            return '';
          } else {
            return ' ';
          }
        });
        return value;
      });
    }

    if (this.atCSXTag()) {
      this.token(',', ',', 0, 0, this.prev);
    }

    return end;
  }

  // Matches and consumes comments. The comments are taken out of the token
  // stream and saved for later, to be reinserted into the output after
  // everything has been parsed and the JavaScript code generated.
  commentToken(chunk) {
    let match;
    let content;
    if (chunk == null) { ({
      chunk
    } = this); }
    if (!(match = chunk.match(COMMENT))) { return 0; }
    const [comment, here] = match;
    let contents = null;
    // Does this comment follow code on the same line?
    const newLine = /^\s*\n+\s*#/.test(comment);
    if (here) {
      const matchIllegal = HERECOMMENT_ILLEGAL.exec(comment);
      if (matchIllegal) {
        this.error(`block comments cannot contain ${matchIllegal[0]}`,
          {offset: matchIllegal.index, length: matchIllegal[0].length});
      }

      // Parse indentation or outdentation as if this block comment didn’t exist.
      chunk = chunk.replace(`###${here}###`, '');
      // Remove leading newlines, like `Rewriter::removeLeadingNewlines`, to
      // avoid the creation of unwanted `TERMINATOR` tokens.
      chunk = chunk.replace(/^\n+/, '');
      this.lineToken(chunk);

      // Pull out the ###-style comment’s content, and format it.
      content = here;
      if (Array.from(content).includes('\n')) {
        content = content.replace(new RegExp(`\\n${repeat(' ', this.indent)}`, 'g'), '\n');
      }
      contents = [content];
    } else {
      // The `COMMENT` regex captures successive line comments as one token.
      // Remove any leading newlines before the first comment, but preserve
      // blank lines between line comments.
      content = comment.replace(/^(\n*)/, '');
      content = content.replace(/^([ |\t]*)#/gm, '');
      contents = content.split('\n');
    }

    const commentAttachments = (() => {
      const result = [];
      for (let i = 0; i < contents.length; i++) {
        content = contents[i];
        result.push({
          content,
          here: (here != null),
          newLine: newLine || (i !== 0) // Line comments after the first one start new lines, by definition.
        });
      }
      return result;
    })();

    const prev = this.prev();
    if (!prev) {
      // If there’s no previous token, create a placeholder token to attach
      // this comment to; and follow with a newline.
      commentAttachments[0].newLine = true;
      this.lineToken(this.chunk.slice(comment.length)); // Set the indent.
      const placeholderToken = this.makeToken('JS', '');
      placeholderToken.generated = true;
      placeholderToken.comments = commentAttachments;
      this.tokens.push(placeholderToken);
      this.newlineToken(0);
    } else {
      attachCommentsToNode(commentAttachments, prev);
    }

    return comment.length;
  }

  // Matches JavaScript interpolated directly into the source via backticks.
  jsToken() {
    let match;
    if ((this.chunk.charAt(0) !== '`') ||
      (!(match = HERE_JSTOKEN.exec(this.chunk) || JSTOKEN.exec(this.chunk)))) { return 0; }
    // Convert escaped backticks to backticks, and escaped backslashes
    // just before escaped backticks to backslashes
    const script = match[1].replace(/\\+(`|$)/g, string => // `string` is always a value like '\`', '\\\`', '\\\\\`', etc.
    // By reducing it to its latter half, we turn '\`' to '`', '\\\`' to '\`', etc.
    string.slice(-Math.ceil(string.length / 2)));
    this.token('JS', script, 0, match[0].length);
    return match[0].length;
  }

  // Matches regular expression literals, as well as multiline extended ones.
  // Lexing regular expressions is difficult to distinguish from division, so we
  // borrow some basic heuristics from JavaScript and Ruby.
  regexToken() {
    let closed, match;
    let body, index, regex, tokens;
    switch (false) {
      case !(match = REGEX_ILLEGAL.exec(this.chunk)):
        this.error(`regular expressions cannot begin with ${match[2]}`,
          {offset: match.index + match[1].length});
        break;
      case !(match = this.matchWithInterpolations(HEREGEX, '///')):
        ({tokens, index} = match);
        var comments = this.chunk.slice(0, index).match(/\s+(#(?!{).*)/g);
        if (comments) { for (let comment of Array.from(comments)) { this.commentToken(comment); } }
        break;
      case !(match = REGEX.exec(this.chunk)):
        [regex, body, closed] = match;
        this.validateEscapes(body, {isRegex: true, offsetInChunk: 1});
        index = regex.length;
        var prev = this.prev();
        if (prev) {
          if (prev.spaced && Array.from(CALLABLE).includes(prev[0])) {
            if (!closed || POSSIBLY_DIVISION.test(regex)) { return 0; }
          } else if (Array.from(NOT_REGEX).includes(prev[0])) {
            return 0;
          }
        }
        if (!closed) { this.error('missing / (unclosed regex)'); }
        break;
      default:
        return 0;
    }

    const [flags] = REGEX_FLAGS.exec(this.chunk.slice(index));
    const end = index + flags.length;
    const origin = this.makeToken('REGEX', null, 0, end);
    switch (false) {
      case !!VALID_FLAGS.test(flags):
        this.error(`invalid regular expression flags ${flags}`, {offset: index, length: flags.length});
        break;
      case !regex && (tokens.length !== 1):
        if (body) {
          body = this.formatRegex(body, { flags, delimiter: '/' });
        } else {
          body = this.formatHeregex(tokens[0][1], { flags });
        }
        this.token('REGEX', `${this.makeDelimitedLiteral(body, {delimiter: '/'})}${flags}`, 0, end, origin);
        break;
      default:
        this.token('REGEX_START', '(', 0, 0, origin);
        this.token('IDENTIFIER', 'RegExp', 0, 0);
        this.token('CALL_START', '(', 0, 0);
        this.mergeInterpolationTokens(tokens, {delimiter: '"', double: true}, str => {
          return this.formatHeregex(str, { flags });
      });
        if (flags) {
          this.token(',', ',', index - 1, 0);
          this.token('STRING', '"' + flags + '"', index - 1, flags.length);
        }
        this.token(')', ')', end - 1, 0);
        this.token('REGEX_END', ')', end - 1, 0);
    }

    return end;
  }

  // Matches newlines, indents, and outdents, and determines which is which.
  // If we can detect that the current line is continued onto the next line,
  // then the newline is suppressed:
  //
  //     elements
  //       .each( ... )
  //       .map( ... )
  //
  // Keeps track of the level of indentation, because a single outdent token
  // can close multiple indents, so we need to know how far in we happen to be.
  lineToken(chunk) {
    let match;
    if (chunk == null) { ({
      chunk
    } = this); }
    if (!(match = MULTI_DENT.exec(chunk))) { return 0; }
    const indent = match[0];

    const prev = this.prev();
    const backslash = (prev != null) && (prev[0] === '\\');
    if (!backslash || !this.seenFor) { this.seenFor = false; }
    if (!this.importSpecifierList) { this.seenImport = false; }
    if (!this.exportSpecifierList) { this.seenExport = false; }

    const size = indent.length - 1 - indent.lastIndexOf('\n');
    const noNewlines = this.unfinished();

    const newIndentLiteral = size > 0 ? indent.slice(-size) : '';
    if (!/^(.?)\1*$/.exec(newIndentLiteral)) {
      this.error('mixed indentation', {offset: indent.length});
      return indent.length;
    }

    const minLiteralLength = Math.min(newIndentLiteral.length, this.indentLiteral.length);
    if (newIndentLiteral.slice(0, minLiteralLength) !== this.indentLiteral.slice(0, minLiteralLength)) {
      this.error('indentation mismatch', {offset: indent.length});
      return indent.length;
    }

    if ((size - this.indebt) === this.indent) {
      if (noNewlines) { this.suppressNewlines(); } else { this.newlineToken(0); }
      return indent.length;
    }

    if (size > this.indent) {
      if (noNewlines) {
        this.indebt = size - this.indent;
        this.suppressNewlines();
        return indent.length;
      }
      if (!this.tokens.length) {
        this.baseIndent = (this.indent = size);
        this.indentLiteral = newIndentLiteral;
        return indent.length;
      }
      const diff = (size - this.indent) + this.outdebt;
      this.token('INDENT', diff, indent.length - size, size);
      this.indents.push(diff);
      this.ends.push({tag: 'OUTDENT'});
      this.outdebt = (this.indebt = 0);
      this.indent = size;
      this.indentLiteral = newIndentLiteral;
    } else if (size < this.baseIndent) {
      this.error('missing indentation', {offset: indent.length});
    } else {
      this.indebt = 0;
      this.outdentToken(this.indent - size, noNewlines, indent.length);
    }
    return indent.length;
  }

  // Record an outdent token or multiple tokens, if we happen to be moving back
  // inwards past several recorded indents. Sets new @indent value.
  outdentToken(moveOut, noNewlines, outdentLength) {
    let dent;
    let decreasedIndent = this.indent - moveOut;
    while (moveOut > 0) {
      const lastIndent = this.indents[this.indents.length - 1];
      if (!lastIndent) {
        this.outdebt = (moveOut = 0);
      } else if (this.outdebt && (moveOut <= this.outdebt)) {
        this.outdebt -= moveOut;
        moveOut   = 0;
      } else {
        dent = this.indents.pop() + this.outdebt;
        if (outdentLength && Array.from(INDENTABLE_CLOSERS).includes(this.chunk[outdentLength])) {
          decreasedIndent -= dent - moveOut;
          moveOut = dent;
        }
        this.outdebt = 0;
        // pair might call outdentToken, so preserve decreasedIndent
        this.pair('OUTDENT');
        this.token('OUTDENT', moveOut, 0, outdentLength);
        moveOut -= dent;
      }
    }
    if (dent) { this.outdebt -= moveOut; }
    this.suppressSemicolons();

    if ((this.tag() !== 'TERMINATOR') && !noNewlines) { this.token('TERMINATOR', '\n', outdentLength, 0); }
    this.indent = decreasedIndent;
    this.indentLiteral = this.indentLiteral.slice(0, decreasedIndent);
    return this;
  }

  // Matches and consumes non-meaningful whitespace. Tag the previous token
  // as being “spaced”, because there are some cases where it makes a difference.
  whitespaceToken() {
    let match, nline;
    if ((!(match = WHITESPACE.exec(this.chunk))) &&
                    (!(nline = this.chunk.charAt(0) === '\n'))) { return 0; }
    const prev = this.prev();
    if (prev) { prev[match ? 'spaced' : 'newLine'] = true; }
    if (match) { return match[0].length; } else { return 0; }
  }

  // Generate a newline token. Consecutive newlines get merged together.
  newlineToken(offset) {
    this.suppressSemicolons();
    if (this.tag() !== 'TERMINATOR') { this.token('TERMINATOR', '\n', offset, 0); }
    return this;
  }

  // Use a `\` at a line-ending to suppress the newline.
  // The slash is removed here once its job is done.
  suppressNewlines() {
    const prev = this.prev();
    if (prev[1] === '\\') {
      if (prev.comments && (this.tokens.length > 1)) {
        // `@tokens.length` should be at least 2 (some code, then `\`).
        // If something puts a `\` after nothing, they deserve to lose any
        // comments that trail it.
        attachCommentsToNode(prev.comments, this.tokens[this.tokens.length - 2]);
      }
      this.tokens.pop();
    }
    return this;
  }

  // CSX is like JSX but for CoffeeScript.
  csxToken() {
    let csxTag, match, origin, token;
    const firstChar = this.chunk[0];
    // Check the previous token to detect if attribute is spread.
    const prevChar = this.tokens.length > 0 ? this.tokens[this.tokens.length - 1][0] : '';
    if (firstChar === '<') {
      let prev;
      match = CSX_IDENTIFIER.exec(this.chunk.slice(1)) || CSX_FRAGMENT_IDENTIFIER.exec(this.chunk.slice(1));
      if (!match || (
        !(this.csxDepth > 0) &&
        // Not the right hand side of an unspaced comparison (i.e. `a<b`).
        !!(prev = this.prev()) &&
        !prev.spaced &&
        Array.from(COMPARABLE_LEFT_SIDE).includes(prev[0])
      )) { return 0; }
      const [input, id, colon] = match;
      origin = this.token('CSX_TAG', id, 1, id.length);
      this.token('CALL_START', '(');
      this.token('[', '[');
      this.ends.push({tag: '/>', origin, name: id});
      this.csxDepth++;
      return id.length + 1;
    } else if (csxTag = this.atCSXTag()) {
      if (this.chunk.slice(0, 2) === '/>') {
        this.pair('/>');
        this.token(']', ']', 0, 2);
        this.token('CALL_END', ')', 0, 2);
        this.csxDepth--;
        return 2;
      } else if (firstChar === '{') {
        if (prevChar === ':') {
          token = this.token('(', '(');
          this.csxObjAttribute[this.csxDepth] = false;
        } else {
          token = this.token('{', '{');
          this.csxObjAttribute[this.csxDepth] = true;
        }
        this.ends.push({tag: '}', origin: token});
        return 1;
      } else if (firstChar === '>') {
        // Ignore terminators inside a tag.
        this.pair('/>'); // As if the current tag was self-closing.
        origin = this.token(']', ']');
        this.token(',', ',');
        const {tokens, index: end} =
          this.matchWithInterpolations(INSIDE_CSX, '>', '</', CSX_INTERPOLATION);
        this.mergeInterpolationTokens(tokens, {delimiter: '"'}, (value, i) => {
          return this.formatString(value, {delimiter: '>'});
        });
        match = CSX_IDENTIFIER.exec(this.chunk.slice(end)) || CSX_FRAGMENT_IDENTIFIER.exec(this.chunk.slice(end));
        if (!match || (match[1] !== csxTag.name)) {
          this.error(`expected corresponding CSX closing tag for ${csxTag.name}`,
            csxTag.origin[2]);
        }
        const afterTag = end + csxTag.name.length;
        if (this.chunk[afterTag] !== '>') {
          this.error("missing closing > after tag name", {offset: afterTag, length: 1});
        }
        // +1 for the closing `>`.
        this.token('CALL_END', ')', end, csxTag.name.length + 1);
        this.csxDepth--;
        return afterTag + 1;
      } else {
        return 0;
      }
    } else if (this.atCSXTag(1)) {
      if (firstChar === '}') {
        this.pair(firstChar);
        if (this.csxObjAttribute[this.csxDepth]) {
          this.token('}', '}');
          this.csxObjAttribute[this.csxDepth] = false;
        } else {
          this.token(')', ')');
        }
        this.token(',', ',');
        return 1;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  }

  atCSXTag(depth) {
    if (depth == null) { depth = 0; }
    if (this.csxDepth === 0) { return false; }
    let i = this.ends.length - 1;
    while (((this.ends[i] != null ? this.ends[i].tag : undefined) === 'OUTDENT') || (depth-- > 0)) { i--; } // Ignore indents.
    const last = this.ends[i];
    return ((last != null ? last.tag : undefined) === '/>') && last;
  }

  // We treat all other single characters as a token. E.g.: `( ) , . !`
  // Multi-character operators are also literal tokens, so that Jison can assign
  // the proper order of operations. There are some symbols that we tag specially
  // here. `;` and newlines are both treated as a `TERMINATOR`, we distinguish
  // parentheses that indicate a method call from regular parentheses, and so on.
  literalToken() {
    let match, needle, origin, value;
    if (match = OPERATOR.exec(this.chunk)) {
      [value] = match;
      if (CODE.test(value)) { this.tagParameters(); }
    } else {
      value = this.chunk.charAt(0);
    }
    let tag  = value;
    let prev = this.prev();

    if (prev && (needle = value, ['=', ...COMPOUND_ASSIGN].includes(needle))) {
      let skipToken = false;
      if ((value === '=') && ['||', '&&'].includes(prev[1]) && !prev.spaced) {
        prev[0] = 'COMPOUND_ASSIGN';
        prev[1] += '=';
        prev = this.tokens[this.tokens.length - 2];
        skipToken = true;
      }
      if (prev && (prev[0] !== 'PROPERTY')) {
        origin = prev.origin != null ? prev.origin : prev;
        const message = isUnassignable(prev[1], origin[1]);
        if (message) { this.error(message, origin[2]); }
      }
      if (skipToken) { return value.length; }
    }

    if ((value === '{') && this.seenImport) {
      this.importSpecifierList = true;
    } else if (this.importSpecifierList && (value === '}')) {
      this.importSpecifierList = false;
    } else if ((value === '{') && ((prev != null ? prev[0] : undefined) === 'EXPORT')) {
      this.exportSpecifierList = true;
    } else if (this.exportSpecifierList && (value === '}')) {
      this.exportSpecifierList = false;
    }

    if (value === ';') {
      let needle1;
      if ((needle1 = prev != null ? prev[0] : undefined, ['=', ...UNFINISHED].includes(needle1))) { this.error('unexpected ;'); }
      this.seenFor = (this.seenImport = (this.seenExport = false));
      tag = 'TERMINATOR';
    } else if ((value === '*') && ((prev != null ? prev[0] : undefined) === 'EXPORT')) {
      tag = 'EXPORT_ALL';
    } else if (Array.from(MATH).includes(value)) {            tag = 'MATH';
    } else if (Array.from(COMPARE).includes(value)) {         tag = 'COMPARE';
    } else if (Array.from(COMPOUND_ASSIGN).includes(value)) { tag = 'COMPOUND_ASSIGN';
    } else if (Array.from(UNARY).includes(value)) {           tag = 'UNARY';
    } else if (Array.from(UNARY_MATH).includes(value)) {      tag = 'UNARY_MATH';
    } else if (Array.from(SHIFT).includes(value)) {           tag = 'SHIFT';
    } else if ((value === '?') && (prev != null ? prev.spaced : undefined)) { tag = 'BIN?';
    } else if (prev) {
      if ((value === '(') && !prev.spaced && Array.from(CALLABLE).includes(prev[0])) {
        if (prev[0] === '?') { prev[0] = 'FUNC_EXIST'; }
        tag = 'CALL_START';
      } else if ((value === '[') && ((Array.from(INDEXABLE).includes(prev[0]) && !prev.spaced) ||
         (prev[0] === '::'))) { // `.prototype` can’t be a method you can call.
        tag = 'INDEX_START';
        switch (prev[0]) {
          case '?':  prev[0] = 'INDEX_SOAK'; break;
        }
      }
    }
    const token = this.makeToken(tag, value);
    switch (value) {
      case '(': case '{': case '[': this.ends.push({tag: INVERSES[value], origin: token}); break;
      case ')': case '}': case ']': this.pair(value); break;
    }
    this.tokens.push(this.makeToken(tag, value));
    return value.length;
  }

  // Token Manipulators
  // ------------------

  // A source of ambiguity in our grammar used to be parameter lists in function
  // definitions versus argument lists in function calls. Walk backwards, tagging
  // parameters specially in order to make things easier for the parser.
  tagParameters() {
    let tok;
    if (this.tag() !== ')') { return this; }
    const stack = [];
    const {tokens} = this;
    let i = tokens.length;
    const paramEndToken = tokens[--i];
    paramEndToken[0] = 'PARAM_END';
    while ((tok = tokens[--i])) {
      switch (tok[0]) {
        case ')':
          stack.push(tok);
          break;
        case '(': case 'CALL_START':
          if (stack.length) { stack.pop();
          } else if (tok[0] === '(') {
            tok[0] = 'PARAM_START';
            return this;
          } else {
            paramEndToken[0] = 'CALL_END';
            return this;
          }
          break;
      }
    }
    return this;
  }

  // Close up all remaining open blocks at the end of the file.
  closeIndentation() {
    return this.outdentToken(this.indent);
  }

  // Match the contents of a delimited token and expand variables and expressions
  // inside it using Ruby-like notation for substitution of arbitrary
  // expressions.
  //
  //     "Hello #{name.capitalize()}."
  //
  // If it encounters an interpolation, this method will recursively create a new
  // Lexer and tokenize until the `{` of `#{` is balanced with a `}`.
  //
  //  - `regex` matches the contents of a token (but not `delimiter`, and not
  //    `#{` if interpolations are desired).
  //  - `delimiter` is the delimiter of the token. Examples are `'`, `"`, `'''`,
  //    `"""` and `///`.
  //  - `closingDelimiter` is different from `delimiter` only in CSX
  //  - `interpolators` matches the start of an interpolation, for CSX it's both
  //    `{` and `<` (i.e. nested CSX tag)
  //
  // This method allows us to have strings within interpolations within strings,
  // ad infinitum.
  matchWithInterpolations(regex, delimiter, closingDelimiter, interpolators) {
    let index;
    if (closingDelimiter == null) { closingDelimiter = delimiter; }
    if (interpolators == null) { interpolators = /^#\{/; }

    const tokens = [];
    let offsetInChunk = delimiter.length;
    if (this.chunk.slice(0, offsetInChunk) !== delimiter) { return null; }
    let str = this.chunk.slice(offsetInChunk);
    while (true) {
      var close, match, nested, open;
      const [strPart] = regex.exec(str);

      this.validateEscapes(strPart, {isRegex: delimiter.charAt(0) === '/', offsetInChunk});

      // Push a fake `'NEOSTRING'` token, which will get turned into a real string later.
      tokens.push(this.makeToken('NEOSTRING', strPart, offsetInChunk));

      str = str.slice(strPart.length);
      offsetInChunk += strPart.length;

      if (!(match = interpolators.exec(str))) { break; }
      const [interpolator] = match;

      // To remove the `#` in `#{`.
      const interpolationOffset = interpolator.length - 1;
      const [line, column] = this.getLineAndColumnFromChunk(offsetInChunk + interpolationOffset);
      const rest = str.slice(interpolationOffset);
      ({tokens: nested, index} =
        new Lexer().tokenize(rest, {line, column, untilBalanced: true}));
      // Account for the `#` in `#{`
      index += interpolationOffset;

      const braceInterpolator = str[index - 1] === '}';
      if (braceInterpolator) {
        // Turn the leading and trailing `{` and `}` into parentheses. Unnecessary
        // parentheses will be removed later.
        open = nested[0], close = nested[nested.length - 1];
        open[0]  = (open[1]  = '(');
        close[0] = (close[1] = ')');
        close.origin = ['', 'end of interpolation', close[2]];
      }

      // Remove leading `'TERMINATOR'` (if any).
      if ((nested[1] != null ? nested[1][0] : undefined) === 'TERMINATOR') { nested.splice(1, 1); }

      if (!braceInterpolator) {
        // We are not using `{` and `}`, so wrap the interpolated tokens instead.
        open = this.makeToken('(', '(', offsetInChunk, 0);
        close = this.makeToken(')', ')', offsetInChunk + index, 0);
        nested = [open, ...nested, close];
      }

      // Push a fake `'TOKENS'` token, which will get turned into real tokens later.
      tokens.push(['TOKENS', nested]);

      str = str.slice(index);
      offsetInChunk += index;
    }

    if (str.slice(0, closingDelimiter.length) !== closingDelimiter) {
      this.error(`missing ${closingDelimiter}`, {length: delimiter.length});
    }

    const firstToken = tokens[0], lastToken = tokens[tokens.length - 1];
    firstToken[2].first_column -= delimiter.length;
    if (lastToken[1].substr(-1) === '\n') {
      lastToken[2].last_line += 1;
      lastToken[2].last_column = closingDelimiter.length - 1;
    } else {
      lastToken[2].last_column += closingDelimiter.length;
    }
    if (lastToken[1].length === 0) { lastToken[2].last_column -= 1; }

    return {tokens, index: offsetInChunk + closingDelimiter.length};
  }

  // Merge the array `tokens` of the fake token types `'TOKENS'` and `'NEOSTRING'`
  // (as returned by `matchWithInterpolations`) into the token stream. The value
  // of `'NEOSTRING'`s are converted using `fn` and turned into strings using
  // `options` first.
  mergeInterpolationTokens(tokens, options, fn) {
    let lparen, token;
    if (tokens.length > 1) {
      lparen = this.token('STRING_START', '(', 0, 0);
    }

    const firstIndex = this.tokens.length;
    for (let i = 0; i < tokens.length; i++) {
      var locationToken, tokensToPush;
      var firstEmptyStringIndex;
      token = tokens[i];
      const [tag, value] = token;
      switch (tag) {
        case 'TOKENS':
          if (value.length === 2) {
            // Optimize out empty interpolations (an empty pair of parentheses).
            var placeholderToken;
            if (!value[0].comments && !value[1].comments) { continue; }
            // There are comments (and nothing else) in this interpolation.
            if (this.csxDepth === 0) {
              // This is an interpolated string, not a CSX tag; and for whatever
              // reason `` `a${/*test*/}b` `` is invalid JS. So compile to
              // `` `a${/*test*/''}b` `` instead.
              placeholderToken = this.makeToken('STRING', "''");
            } else {
              placeholderToken = this.makeToken('JS', '');
            }
            // Use the same location data as the first parenthesis.
            placeholderToken[2] = value[0][2];
            for (let val of Array.from(value)) {
              if (val.comments) {
                if (placeholderToken.comments == null) { placeholderToken.comments = []; }
                placeholderToken.comments.push(...val.comments);
              }
            }
            value.splice(1, 0, placeholderToken);
          }
          // Push all the tokens in the fake `'TOKENS'` token. These already have
          // sane location data.
          locationToken = value[0];
          tokensToPush = value;
          break;
        case 'NEOSTRING':
          // Convert `'NEOSTRING'` into `'STRING'`.
          var converted = fn.call(this, token[1], i);
          // Optimize out empty strings. We ensure that the tokens stream always
          // starts with a string token, though, to make sure that the result
          // really is a string.
          if (converted.length === 0) {
            if (i === 0) {
              firstEmptyStringIndex = this.tokens.length;
            } else {
              continue;
            }
          }
          // However, there is one case where we can optimize away a starting
          // empty string.
          if ((i === 2) && (firstEmptyStringIndex != null)) {
            this.tokens.splice(firstEmptyStringIndex, 2); // Remove empty string and the plus.
          }
          token[0] = 'STRING';
          token[1] = this.makeDelimitedLiteral(converted, options);
          locationToken = token;
          tokensToPush = [token];
          break;
      }
      if (this.tokens.length > firstIndex) {
        // Create a 0-length "+" token.
        const plusToken = this.token('+', '+');
        plusToken[2] = {
          first_line:   locationToken[2].first_line,
          first_column: locationToken[2].first_column,
          last_line:    locationToken[2].first_line,
          last_column:  locationToken[2].first_column
        };
      }
      this.tokens.push(...tokensToPush);
    }

    if (lparen) {
      const lastToken = tokens[tokens.length - 1];
      lparen.origin = ['STRING', null, {
        first_line:   lparen[2].first_line,
        first_column: lparen[2].first_column,
        last_line:    lastToken[2].last_line,
        last_column:  lastToken[2].last_column
      }
      ];
      lparen[2] = lparen.origin[2];
      const rparen = this.token('STRING_END', ')');
      return rparen[2] = {
        first_line:   lastToken[2].last_line,
        first_column: lastToken[2].last_column,
        last_line:    lastToken[2].last_line,
        last_column:  lastToken[2].last_column
      };
    }
  }

  // Pairs up a closing token, ensuring that all listed pairs of tokens are
  // correctly balanced throughout the course of the token stream.
  pair(tag) {
    let wanted;
    const prev = this.ends[this.ends.length - 1];
    if (tag !== (wanted = prev != null ? prev.tag : undefined)) {
      if ('OUTDENT' !== wanted) { this.error(`unmatched ${tag}`); }
      // Auto-close `INDENT` to support syntax like this:
      //
      //     el.click((event) ->
      //       el.hide())
      //
      const lastIndent = this.indents[this.indents.length - 1];
      this.outdentToken(lastIndent, true);
      return this.pair(tag);
    }
    return this.ends.pop();
  }

  // Helpers
  // -------

  // Returns the line and column number from an offset into the current chunk.
  //
  // `offset` is a number of characters into `@chunk`.
  getLineAndColumnFromChunk(offset) {
    let string;
    if (offset === 0) {
      return [this.chunkLine, this.chunkColumn];
    }

    if (offset >= this.chunk.length) {
      string = this.chunk;
    } else {
      string = this.chunk.slice(0, +(offset-1) + 1 || undefined);
    }

    const lineCount = count(string, '\n');

    let column = this.chunkColumn;
    if (lineCount > 0) {
      const array = string.split('\n'), lastLine = array[array.length - 1];
      column = lastLine.length;
    } else {
      column += string.length;
    }

    return [this.chunkLine + lineCount, column];
  }

  // Same as `token`, except this just returns the token without adding it
  // to the results.
  makeToken(tag, value, offsetInChunk, length) {
    if (offsetInChunk == null) { offsetInChunk = 0; }
    if (length == null) { ({
      length
    } = value); }
    const locationData = {};
    [locationData.first_line, locationData.first_column] =
      this.getLineAndColumnFromChunk(offsetInChunk);

    // Use length - 1 for the final offset - we're supplying the last_line and the last_column,
    // so if last_column == first_column, then we're looking at a character of length 1.
    const lastCharacter = length > 0 ? (length - 1) : 0;
    [locationData.last_line, locationData.last_column] =
      this.getLineAndColumnFromChunk(offsetInChunk + lastCharacter);

    const token = [tag, value, locationData];

    return token;
  }

  // Add a token to the results.
  // `offset` is the offset into the current `@chunk` where the token starts.
  // `length` is the length of the token in the `@chunk`, after the offset.  If
  // not specified, the length of `value` will be used.
  //
  // Returns the new token.
  token(tag, value, offsetInChunk, length, origin) {
    const token = this.makeToken(tag, value, offsetInChunk, length);
    if (origin) { token.origin = origin; }
    this.tokens.push(token);
    return token;
  }

  // Peek at the last tag in the token stream.
  tag() {
    const token = this.tokens[this.tokens.length - 1];
    return (token != null ? token[0] : undefined);
  }

  // Peek at the last value in the token stream.
  value(useOrigin) {
    if (useOrigin == null) { useOrigin = false; }
    const token = this.tokens[this.tokens.length - 1];
    if (useOrigin && ((token != null ? token.origin : undefined) != null)) {
      return (token.origin != null ? token.origin[1] : undefined);
    } else {
      return (token != null ? token[1] : undefined);
    }
  }

  // Get the previous token in the token stream.
  prev() {
    return this.tokens[this.tokens.length - 1];
  }

  // Are we in the midst of an unfinished expression?
  unfinished() {
    let needle;
    return LINE_CONTINUER.test(this.chunk) ||
    (needle = this.tag(), Array.from(UNFINISHED).includes(needle));
  }

  formatString(str, options) {
    return this.replaceUnicodeCodePointEscapes(str.replace(STRING_OMIT, '$1'), options);
  }

  formatHeregex(str, options) {
    return this.formatRegex(str.replace(HEREGEX_OMIT, '$1$2'), merge(options, {delimiter: '///'}));
  }

  formatRegex(str, options) {
    return this.replaceUnicodeCodePointEscapes(str, options);
  }

  unicodeCodePointToUnicodeEscapes(codePoint) {
    const toUnicodeEscape = function(val) {
      const str = val.toString(16);
      return `\\u${repeat('0', 4 - str.length)}${str}`;
    };
    if (codePoint < 0x10000) { return toUnicodeEscape(codePoint); }
    // surrogate pair
    const high = Math.floor((codePoint - 0x10000) / 0x400) + 0xD800;
    const low = ((codePoint - 0x10000) % 0x400) + 0xDC00;
    return `${toUnicodeEscape(high)}${toUnicodeEscape(low)}`;
  }

  // Replace `\u{...}` with `\uxxxx[\uxxxx]` in regexes without `u` flag
  replaceUnicodeCodePointEscapes(str, options) {
    const shouldReplace = (options.flags != null) && !Array.from(options.flags).includes('u');
    return str.replace(UNICODE_CODE_POINT_ESCAPE, (match, escapedBackslash, codePointHex, offset) => {
      if (escapedBackslash) { return escapedBackslash; }

      const codePointDecimal = parseInt(codePointHex, 16);
      if (codePointDecimal > 0x10ffff) {
        this.error("unicode code point escapes greater than \\u{10ffff} are not allowed", {
          offset: offset + options.delimiter.length,
          length: codePointHex.length + 4
        }
        );
      }
      if (!shouldReplace) { return match; }

      return this.unicodeCodePointToUnicodeEscapes(codePointDecimal);
    });
  }

  // Validates escapes in strings and regexes.
  validateEscapes(str, options) {
    if (options == null) { options = {}; }
    const invalidEscapeRegex =
      options.isRegex ?
        REGEX_INVALID_ESCAPE
      :
        STRING_INVALID_ESCAPE;
    const match = invalidEscapeRegex.exec(str);
    if (!match) { return; }
    const array = match[0], before = match[1], octal = match[2], hex = match[3], unicodeCodePoint = match[4], unicode = match[5];
    const message =
      octal ?
        "octal escape sequences are not allowed"
      :
        "invalid escape sequence";
    const invalidEscape = `\\${octal || hex || unicodeCodePoint || unicode}`;
    return this.error(`${message} ${invalidEscape}`, {
      offset: (options.offsetInChunk != null ? options.offsetInChunk : 0) + match.index + before.length,
      length: invalidEscape.length
    }
    );
  }

  // Constructs a string or regex by escaping certain characters.
  makeDelimitedLiteral(body, options) {
    if (options == null) { options = {}; }
    if ((body === '') && (options.delimiter === '/')) { body = '(?:)'; }
    const regex = new RegExp(`\
(\\\\\\\\)\
|(\\\\0(?=[1-7]))\
|\\\\?(${options.delimiter})\
|\\\\?(?:(\\n)|(\\r)|(\\u2028)|(\\u2029))\
|(\\\\.)\
`, 'g');
    body = body.replace(regex, function(match, backslash, nul, delimiter, lf, cr, ls, ps, other) { switch (false) {
      // Ignore escaped backslashes.
      case !backslash: if (options.double) { return backslash + backslash; } else { return backslash; }
      case !nul:       return '\\x00';
      case !delimiter: return `\\${delimiter}`;
      case !lf:        return '\\n';
      case !cr:        return '\\r';
      case !ls:        return '\\u2028';
      case !ps:        return '\\u2029';
      case !other:     if (options.double) { return `\\${other}`; } else { return other; }
    }
     });
    return `${options.delimiter}${body}${options.delimiter}`;
  }

  suppressSemicolons() {
    return (() => {
      const result = [];
      while (this.value() === ';') {
        var needle;
        this.tokens.pop();
        if ((needle = __guard__(this.prev(), x => x[0]), ['=', ...UNFINISHED].includes(needle))) { result.push(this.error('unexpected ;')); } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  // Throws an error at either a given offset from the current chunk or at the
  // location of a token (`token[2]`).
  error(message, options) {
    if (options == null) { options = {}; }
    const location =
      (() => {
      if ('first_line' in options) {
        return options;
      } else {
        const [first_line, first_column] = this.getLineAndColumnFromChunk(options.offset != null ? options.offset : 0);
        return {first_line, first_column, last_column: (first_column + (options.length != null ? options.length : 1)) - 1};
      }
    })();
    return throwSyntaxError(message, location);
  }
});

// Helper functions
// ----------------

var isUnassignable = function(name, displayName) { let needle;
if (displayName == null) { displayName = name; } switch (false) {
  case (needle = name, ![...JS_KEYWORDS, ...COFFEE_KEYWORDS].includes(needle)):
    return `keyword '${displayName}' can't be assigned`;
  case !Array.from(STRICT_PROSCRIBED).includes(name):
    return `'${displayName}' can't be assigned`;
  case !Array.from(RESERVED).includes(name):
    return `reserved word '${displayName}' can't be assigned`;
  default:
    return false;
} };

exports.isUnassignable = isUnassignable;

// `from` isn’t a CoffeeScript keyword, but it behaves like one in `import` and
// `export` statements (handled above) and in the declaration line of a `for`
// loop. Try to detect when `from` is a variable identifier and when it is this
// “sometimes” keyword.
var isForFrom = function(prev) {
  if (prev[0] === 'IDENTIFIER') {
    // `for i from from`, `for from from iterable`
    if (prev[1] === 'from') {
      prev[1][0] = 'IDENTIFIER';
      true;
    }
    // `for i from iterable`
    return true;
  // `for from…`
  } else if (prev[0] === 'FOR') {
    return false;
  // `for {from}…`, `for [from]…`, `for {a, from}…`, `for {a: from}…`
  } else if (['{', '[', ',', ':'].includes(prev[1])) {
    return false;
  } else {
    return true;
  }
};

// Constants
// ---------

// Keywords that CoffeeScript shares in common with JavaScript.
var JS_KEYWORDS = [
  'true', 'false', 'null', 'this',
  'new', 'delete', 'typeof', 'in', 'instanceof',
  'return', 'throw', 'break', 'continue', 'debugger', 'yield', 'await',
  'if', 'else', 'switch', 'for', 'while', 'do', 'try', 'catch', 'finally',
  'class', 'extends', 'super',
  'import', 'export', 'default'
];

// CoffeeScript-only keywords.
var COFFEE_KEYWORDS = [
  'undefined', 'Infinity', 'NaN',
  'then', 'unless', 'until', 'loop', 'of', 'by', 'when'
];

var COFFEE_ALIAS_MAP = {
  and  : '&&',
  or   : '||',
  is   : '==',
  isnt : '!=',
  not  : '!',
  yes  : 'true',
  no   : 'false',
  on   : 'true',
  off  : 'false'
};

var COFFEE_ALIASES  = ((() => {
  const result = [];
  for (let key in COFFEE_ALIAS_MAP) {
    result.push(key);
  }
  return result;
})());
COFFEE_KEYWORDS = COFFEE_KEYWORDS.concat(COFFEE_ALIASES);

// The list of keywords that are reserved by JavaScript, but not used, or are
// used by CoffeeScript internally. We throw an error when these are encountered,
// to avoid having a JavaScript error at runtime.
var RESERVED = [
  'case', 'function', 'var', 'void', 'with', 'const', 'let', 'enum',
  'native', 'implements', 'interface', 'package', 'private',
  'protected', 'public', 'static'
];

var STRICT_PROSCRIBED = ['arguments', 'eval'];

// The superset of both JavaScript keywords and reserved words, none of which may
// be used as identifiers or properties.
exports.JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED).concat(STRICT_PROSCRIBED);

// The character code of the nasty Microsoft madness otherwise known as the BOM.
var BOM = 65279;

// Token matching regexes.
var IDENTIFIER = new RegExp(`^\
(?!\\d)\
((?:(?!\\s)[$\\w\\x7f-\\uffff])+)\
([^\\n\\S]*:(?!:))?\
`);

var CSX_IDENTIFIER = new RegExp(`^\
(?![\\d<])\
((?:(?!\\s)[\\.\\-$\\w\\x7f-\\uffff])+)\
`);

// Fragment: <></>
var CSX_FRAGMENT_IDENTIFIER = new RegExp(`^\
()>\
`);

var CSX_ATTRIBUTE = new RegExp(`^\
(?!\\d)\
((?:(?!\\s)[\\-$\\w\\x7f-\\uffff])+)\
([^\\S]*=(?!=))?\
`);

var NUMBER     = new RegExp(`\
^0b[01]+|\
^0o[0-7]+|\
^0x[\\da-f]+|\
^\\d*\\.?\\d+(?:e[+-]?\\d+)?\
`, 'i');

var OPERATOR   = new RegExp(`^(\
?:[-=]>\
|[-+*/%<>&|^!?=]=\
|>>>=?\
|([-+:])\\1\
|([&|<>*/%])\\2=?\
|\\?(\\.|::)\
|\\.{2,3}\
)`);

var WHITESPACE = /^[^\n\S]+/;

var COMMENT    = /^\s*###([^#][\s\S]*?)(?:###[^\n\S]*|###$)|^(?:\s*#(?!##[^#]).*)+/;

var CODE       = /^[-=]>/;

var MULTI_DENT = /^(?:\n[^\n\S]*)+/;

var JSTOKEN      = new RegExp(`^\`(?!\`\`)((?:[^\`\\\\]|\\\\[\\s\\S])*)\``);
var HERE_JSTOKEN = new RegExp(`^\`\`\`((?:[^\`\\\\]|\\\\[\\s\\S]|\`(?!\`\`))*)\`\`\``);

// String-matching-regexes.
var STRING_START   = /^(?:'''|"""|'|")/;

var STRING_SINGLE  = new RegExp(`^(?:[^\\\\']|\\\\[\\s\\S])*`);
var STRING_DOUBLE  = new RegExp(`^(?:[^\\\\"#]|\\\\[\\s\\S]|\\#(?!\\{))*`);
var HEREDOC_SINGLE = new RegExp(`^(?:[^\\\\']|\\\\[\\s\\S]|'(?!''))*`);
var HEREDOC_DOUBLE = new RegExp(`^(?:[^\\\\"#]|\\\\[\\s\\S]|"(?!"")|\\#(?!\\{))*`);

var INSIDE_CSX = new RegExp(`^(?:\
[^\
\\{\
<\
]\
)*`); // Similar to `HEREDOC_DOUBLE` but there is no escaping.
var CSX_INTERPOLATION = new RegExp(`^(?:\
\\{\
|<(?!/)\
)`);

var STRING_OMIT    = new RegExp(`\
((?:\\\\\\\\)+)\
|\\\\[^\\S\\n]*\\n\\s*\
`, 'g');
var SIMPLE_STRING_OMIT = /\s*\n\s*/g;
var HEREDOC_INDENT     = /\n+([^\n\S]*)(?=\S)/g;

// Regex-matching-regexes.
var REGEX = new RegExp(`^\
/(?!/)((\
?:[^[/\\n\\\\]\
|\\\\[^\\n]\
|\\[\
(?:\\\\[^\\n]|[^\\]\\n\\\\])*\
\\]\
)*)(/)?\
`);

var REGEX_FLAGS  = /^\w*/;
var VALID_FLAGS  = /^(?!.*(.).*\1)[imguy]*$/;

var HEREGEX      = new RegExp(`^\
(?:\
\
[^\\\\/#\\s]\
\
|\\\\[\\s\\S]\
\
|/(?!//)\
\
|\\#(?!\\{)\
\
|\\s+(?:#(?!\\{).*)?\
)*\
`);

var HEREGEX_OMIT = new RegExp(`\
((?:\\\\\\\\)+)\
|\\\\(\\s)\
|\\s+(?:#.*)?\
`, 'g');

var REGEX_ILLEGAL = new RegExp(`^(/|/{3}\\s*)(\\*)`);

var POSSIBLY_DIVISION   = new RegExp(`^/=?\\s`);

// Other regexes.
var HERECOMMENT_ILLEGAL = /\*\//;

var LINE_CONTINUER      = new RegExp(`^\\s*(?:,|\\??\\.(?![.\\d])|::)`);

var STRING_INVALID_ESCAPE = new RegExp(`\
((?:^|[^\\\\])(?:\\\\\\\\)*)\
\\\\(\
?:(0[0-7]|[1-7])\
|(x(?![\\da-fA-F]{2}).{0,2})\
|(u\\{(?![\\da-fA-F]{1,}\\})[^}]*\\}?)\
|(u(?!\\{|[\\da-fA-F]{4}).{0,4})\
)\
`);
var REGEX_INVALID_ESCAPE = new RegExp(`\
((?:^|[^\\\\])(?:\\\\\\\\)*)\
\\\\(\
?:(0[0-7])\
|(x(?![\\da-fA-F]{2}).{0,2})\
|(u\\{(?![\\da-fA-F]{1,}\\})[^}]*\\}?)\
|(u(?!\\{|[\\da-fA-F]{4}).{0,4})\
)\
`);

var UNICODE_CODE_POINT_ESCAPE = new RegExp(`\
(\\\\\\\\)\
|\
\\\\u\\{([\\da-fA-F]+)\\}\
`, 'g');

var LEADING_BLANK_LINE  = /^[^\n\S]*\n/;
var TRAILING_BLANK_LINE = /\n[^\n\S]*$/;

var TRAILING_SPACES     = /\s+$/;

// Compound assignment tokens.
var COMPOUND_ASSIGN = [
  '-=', '+=', '/=', '*=', '%=', '||=', '&&=', '?=', '<<=', '>>=', '>>>=',
  '&=', '^=', '|=', '**=', '//=', '%%='
];

// Unary tokens.
var UNARY = ['NEW', 'TYPEOF', 'DELETE', 'DO'];

var UNARY_MATH = ['!', '~'];

// Bit-shifting tokens.
var SHIFT = ['<<', '>>', '>>>'];

// Comparison tokens.
var COMPARE = ['==', '!=', '<', '>', '<=', '>='];

// Mathematical tokens.
var MATH = ['*', '/', '%', '//', '%%'];

// Relational tokens that are negatable with `not` prefix.
var RELATION = ['IN', 'OF', 'INSTANCEOF'];

// Boolean tokens.
const BOOL = ['TRUE', 'FALSE'];

// Tokens which could legitimately be invoked or indexed. An opening
// parentheses or bracket following these tokens will be recorded as the start
// of a function invocation or indexing operation.
var CALLABLE  = ['IDENTIFIER', 'PROPERTY', ')', ']', '?', '@', 'THIS', 'SUPER'];
var INDEXABLE = CALLABLE.concat([
  'NUMBER', 'INFINITY', 'NAN', 'STRING', 'STRING_END', 'REGEX', 'REGEX_END',
  'BOOL', 'NULL', 'UNDEFINED', '}', '::'
]);

// Tokens which can be the left-hand side of a less-than comparison, i.e. `a<b`.
var COMPARABLE_LEFT_SIDE = ['IDENTIFIER', ')', ']', 'NUMBER'];

// Tokens which a regular expression will never immediately follow (except spaced
// CALLABLEs in some cases), but which a division operator can.
//
// See: http://www-archive.mozilla.org/js/language/js20-2002-04/rationale/syntax.html#regular-expressions
var NOT_REGEX = INDEXABLE.concat(['++', '--']);

// Tokens that, when immediately preceding a `WHEN`, indicate that the `WHEN`
// occurs at the start of a line. We disambiguate these from trailing whens to
// avoid an ambiguity in the grammar.
var LINE_BREAK = ['INDENT', 'OUTDENT', 'TERMINATOR'];

// Additional indent in front of these is ignored.
var INDENTABLE_CLOSERS = [')', '}', ']'];

// Tokens that, when appearing at the end of a line, suppress a following TERMINATOR/INDENT token
var UNFINISHED = ['\\', '.', '?.', '?::', 'UNARY', 'MATH', 'UNARY_MATH', '+', '-',
           '**', 'SHIFT', 'RELATION', 'COMPARE', '&', '^', '|', '&&', '||',
           'BIN?', 'EXTENDS'];

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}