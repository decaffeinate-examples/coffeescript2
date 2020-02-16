/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// `nodes.coffee` contains all of the node classes for the syntax tree. Most
// nodes are created as the result of actions in the [grammar](grammar.html),
// but some are created by other nodes as a method of code generation. To convert
// the syntax tree into a string of JavaScript code, call `compile()` on the root.

let Access, Arr, Assign, AwaitReturn, Base, Block, BooleanLiteral, Call, Class, Code, CodeFragment, ComputedPropertyName, CSXTag, Elision, ExecutableClassBody, Existence, Expansion, ExportAllDeclaration, ExportDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExportSpecifierList, Extends, For, FuncGlyph, HereComment, HoistTarget, IdentifierLiteral, If, ImportClause, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, ImportSpecifierList, In, Index, InfinityLiteral, LineComment, Literal, ModuleDeclaration, ModuleSpecifier, ModuleSpecifierList, NaNLiteral, NullLiteral, NumberLiteral, Obj, Op, Param, Parens, PassthroughLiteral, PropertyName, Range, RegexLiteral, RegexWithInterpolations, Return, Slice, Splat, StatementLiteral, StringLiteral, StringWithInterpolations, Super, SuperCall, Switch, TaggedTemplateCall, ThisLiteral, Throw, Try, UndefinedLiteral, Value, While, YieldReturn;
Error.stackTraceLimit = Infinity;

const {Scope} = require('./scope');
const {isUnassignable, JS_FORBIDDEN} = require('./lexer');

// Import the helpers we plan to use.
const {compact, flatten, extend, merge, del, starts, ends, some,
addDataToNode, attachCommentsToNode, locationDataToString,
throwSyntaxError} = require('./helpers');

// Functions required by parser.
exports.extend = extend;
exports.addDataToNode = addDataToNode;

// Constant functions for nodes that don’t need customization.
const YES     = () => true;
const NO      = () => false;
const THIS    = function() { return this; };
const NEGATE  = function() { this.negated = !this.negated; return this; };

//### CodeFragment

// The various nodes defined below all compile to a collection of **CodeFragment** objects.
// A CodeFragments is a block of generated code, and the location in the source file where the code
// came from. CodeFragments can be assembled together into working code just by catting together
// all the CodeFragments' `code` snippets, in order.
exports.CodeFragment = (CodeFragment = class CodeFragment {
  constructor(parent, code) {
    this.code = `${code}`;
    this.type = __guard__(parent != null ? parent.constructor : undefined, x => x.name) || 'unknown';
    this.locationData = parent != null ? parent.locationData : undefined;
    this.comments = parent != null ? parent.comments : undefined;
  }

  toString() {
    // This is only intended for debugging.
    return `${this.code}${this.locationData ? ": " + locationDataToString(this.locationData) : ''}`;
  }
});

// Convert an array of CodeFragments into a string.
const fragmentsToText = fragments => (Array.from(fragments).map((fragment) => fragment.code)).join('');

//### Base

// The **Base** is the abstract base class for all nodes in the syntax tree.
// Each subclass implements the `compileNode` method, which performs the
// code generation for that node. To compile a node to JavaScript,
// call `compile` on it, which wraps `compileNode` in some generic extra smarts,
// to know when the generated code needs to be wrapped up in a closure.
// An options hash is passed and cloned throughout, containing information about
// the environment from higher in the tree (such as if a returned value is
// being requested by the surrounding function), information about the current
// scope, and indentation level.
exports.Base = (Base = (function() {
  Base = class Base {
    static initClass() {
  
      // Default implementations of the common node properties and methods. Nodes
      // will override these with custom logic, if needed.
  
      // `children` are the properties to recurse into when tree walking. The
      // `children` list *is* the structure of the AST. The `parent` pointer, and
      // the pointer to the `children` are how you can traverse the tree.
      this.prototype.children = [];
  
      // `isStatement` has to do with “everything is an expression”. A few things
      // can’t be expressions, such as `break`. Things that `isStatement` returns
      // `true` for are things that can’t be used as expressions. There are some
      // error messages that come from `nodes.coffee` due to statements ending up
      // in expression position.
      this.prototype.isStatement = NO;
  
      // Track comments that have been compiled into fragments, to avoid outputting
      // them twice.
      this.prototype.compiledComments = [];
  
      // `includeCommentFragments` lets `compileCommentFragments` know whether this node
      // has special awareness of how to handle comments within its output.
      this.prototype.includeCommentFragments = NO;
  
      // `jumps` tells you if an expression, or an internal part of an expression
      // has a flow control construct (like `break`, or `continue`, or `return`,
      // or `throw`) that jumps out of the normal flow of control and can’t be
      // used as a value. This is important because things like this make no sense;
      // we have to disallow them.
      this.prototype.jumps = NO;
  
      // If `node.shouldCache() is false`, it is safe to use `node` more than once.
      // Otherwise you need to store the value of `node` in a variable and output
      // that variable several times instead. Kind of like this: `5` need not be
      // cached. `returnFive()`, however, could have side effects as a result of
      // evaluating it more than once, and therefore we need to cache it. The
      // parameter is named `shouldCache` rather than `mustCache` because there are
      // also cases where we might not need to cache but where we want to, for
      // example a long expression that may well be idempotent but we want to cache
      // for brevity.
      this.prototype.shouldCache = YES;
  
      this.prototype.isChainable = NO;
      this.prototype.isAssignable = NO;
      this.prototype.isNumber = NO;
  
      this.prototype.unwrap = THIS;
      this.prototype.unfoldSoak = NO;
  
      // Is this node used to assign a certain variable?
      this.prototype.assigns = NO;
    }

    compile(o, lvl) {
      return fragmentsToText(this.compileToFragments(o, lvl));
    }

    // Occasionally a node is compiled multiple times, for example to get the name
    // of a variable to add to scope tracking. When we know that a “premature”
    // compilation won’t result in comments being output, set those comments aside
    // so that they’re preserved for a later `compile` call that will result in
    // the comments being included in the output.
    compileWithoutComments(o, lvl, method) {
      if (method == null) { method = 'compile'; }
      if (this.comments) {
        this.ignoreTheseCommentsTemporarily = this.comments;
        delete this.comments;
      }
      const unwrapped = this.unwrapAll();
      if (unwrapped.comments) {
        unwrapped.ignoreTheseCommentsTemporarily = unwrapped.comments;
        delete unwrapped.comments;
      }

      const fragments = this[method](o, lvl);

      if (this.ignoreTheseCommentsTemporarily) {
        this.comments = this.ignoreTheseCommentsTemporarily;
        delete this.ignoreTheseCommentsTemporarily;
      }
      if (unwrapped.ignoreTheseCommentsTemporarily) {
        unwrapped.comments = unwrapped.ignoreTheseCommentsTemporarily;
        delete unwrapped.ignoreTheseCommentsTemporarily;
      }

      return fragments;
    }

    compileNodeWithoutComments(o, lvl) {
      return this.compileWithoutComments(o, lvl, 'compileNode');
    }

    // Common logic for determining whether to wrap this node in a closure before
    // compiling it, or to compile directly. We need to wrap if this node is a
    // *statement*, and it's not a *pureStatement*, and we're not at
    // the top level of a block (which would be unnecessary), and we haven't
    // already been asked to return the result (because statements know how to
    // return results).
    compileToFragments(o, lvl) {
      o        = extend({}, o);
      if (lvl) { o.level  = lvl; }
      const node     = this.unfoldSoak(o) || this;
      node.tab = o.indent;

      const fragments = (o.level === LEVEL_TOP) || !node.isStatement(o) ?
        node.compileNode(o)
      :
        node.compileClosure(o);
      this.compileCommentFragments(o, node, fragments);
      return fragments;
    }

    compileToFragmentsWithoutComments(o, lvl) {
      return this.compileWithoutComments(o, lvl, 'compileToFragments');
    }

    // Statements converted into expressions via closure-wrapping share a scope
    // object with their parent closure, to preserve the expected lexical scope.
    compileClosure(o) {
      let argumentsNode, jumpNode;
      if (jumpNode = this.jumps()) {
        jumpNode.error('cannot use a pure statement in an expression');
      }
      o.sharedScope = true;
      let func = new Code([], Block.wrap([this]));
      let args = [];
      if (this.contains((node => node instanceof SuperCall))) {
        func.bound = true;
      } else if ((argumentsNode = this.contains(isLiteralArguments)) || this.contains(isLiteralThis)) {
        let meth;
        args = [new ThisLiteral];
        if (argumentsNode) {
          meth = 'apply';
          args.push(new IdentifierLiteral('arguments'));
        } else {
          meth = 'call';
        }
        func = new Value(func, [new Access(new PropertyName(meth))]);
      }
      const parts = (new Call(func, args)).compileNode(o);

      switch (false) {
        case !func.isGenerator && !(func.base != null ? func.base.isGenerator : undefined):
          parts.unshift(this.makeCode("(yield* "));
          parts.push(this.makeCode(")"));
          break;
        case !func.isAsync && !(func.base != null ? func.base.isAsync : undefined):
          parts.unshift(this.makeCode("(await "));
          parts.push(this.makeCode(")"));
          break;
      }
      return parts;
    }

    compileCommentFragments(o, node, fragments) {
      if (!node.comments) { return fragments; }
      // This is where comments, that are attached to nodes as a `comments`
      // property, become `CodeFragment`s. “Inline block comments,” e.g.
      // `/* */`-delimited comments that are interspersed within code on a line,
      // are added to the current `fragments` stream. All other fragments are
      // attached as properties to the nearest preceding or following fragment,
      // to remain stowaways until they get properly output in `compileComments`
      // later on.
      const unshiftCommentFragment = function(commentFragment) {
        if (commentFragment.unshift) {
          // Find the first non-comment fragment and insert `commentFragment`
          // before it.
          return unshiftAfterComments(fragments, commentFragment);
        } else {
          if (fragments.length !== 0) {
            const precedingFragment = fragments[fragments.length - 1];
            if (commentFragment.newLine && (precedingFragment.code !== '') &&
               !/\n\s*$/.test(precedingFragment.code)) {
              commentFragment.code = `\n${commentFragment.code}`;
            }
          }
          return fragments.push(commentFragment);
        }
      };

      for (let comment of Array.from(node.comments)) {
        if (!Array.from(this.compiledComments).includes(comment)) {var commentFragment;
        
          this.compiledComments.push(comment); // Don’t output this comment twice.
          // For block/here comments, denoted by `###`, that are inline comments
          // like `1 + ### comment ### 2`, create fragments and insert them into
          // the fragments array.
          // Otherwise attach comment fragments to their closest fragment for now,
          // so they can be inserted into the output later after all the newlines
          // have been added.
          if (comment.here) { // Block comment, delimited by `###`.
            commentFragment = new HereComment(comment).compileNode(o);
          } else { // Line comment, delimited by `#`.
            commentFragment = new LineComment(comment).compileNode(o);
          }
          if ((commentFragment.isHereComment && !commentFragment.newLine) ||
             node.includeCommentFragments()) {
            // Inline block comments, like `1 + /* comment */ 2`, or a node whose
            // `compileToFragments` method has logic for outputting comments.
            unshiftCommentFragment(commentFragment);
          } else {
            if (fragments.length === 0) { fragments.push(this.makeCode('')); }
            if (commentFragment.unshift) {
              if (fragments[0].precedingComments == null) { fragments[0].precedingComments = []; }
              fragments[0].precedingComments.push(commentFragment);
            } else {
              var name;
              if (fragments[name = fragments.length - 1].followingComments == null) { fragments[name].followingComments = []; }
              fragments[fragments.length - 1].followingComments.push(commentFragment);
            }
          }
        }
      }
      return fragments;
    }

    // If the code generation wishes to use the result of a complex expression
    // in multiple places, ensure that the expression is only ever evaluated once,
    // by assigning it to a temporary variable. Pass a level to precompile.
    //
    // If `level` is passed, then returns `[val, ref]`, where `val` is the compiled value, and `ref`
    // is the compiled reference. If `level` is not passed, this returns `[val, ref]` where
    // the two values are raw nodes which have not been compiled.
    cache(o, level, shouldCache) {
      let ref;
      const complex = (shouldCache != null) ? shouldCache(this) : this.shouldCache();
      if (complex) {
        ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
        const sub = new Assign(ref, this);
        if (level) { return [sub.compileToFragments(o, level), [this.makeCode(ref.value)]]; } else { return [sub, ref]; }
      } else {
        ref = level ? this.compileToFragments(o, level) : this;
        return [ref, ref];
      }
    }

    // Occasionally it may be useful to make an expression behave as if it was 'hoisted', whereby the
    // result of the expression is available before its location in the source, but the expression's
    // variable scope corresponds the source position. This is used extensively to deal with executable
    // class bodies in classes.
    //
    // Calling this method mutates the node, proxying the `compileNode` and `compileToFragments`
    // methods to store their result for later replacing the `target` node, which is returned by the
    // call.
    hoist() {
      this.hoisted = true;
      const target   = new HoistTarget(this);

      const {
        compileNode
      } = this;
      const {
        compileToFragments
      } = this;

      this.compileNode = o => target.update(compileNode, o);

      this.compileToFragments = o => target.update(compileToFragments, o);

      return target;
    }

    cacheToCodeFragments(cacheValues) {
      return [fragmentsToText(cacheValues[0]), fragmentsToText(cacheValues[1])];
    }

    // Construct a node that returns the current node's result.
    // Note that this is overridden for smarter behavior for
    // many statement nodes (e.g. If, For)...
    makeReturn(res) {
      const me = this.unwrapAll();
      if (res) {
        return new Call(new Literal(`${res}.push`), [me]);
      } else {
        return new Return(me);
      }
    }

    // Does this node, or any of its children, contain a node of a certain kind?
    // Recursively traverses down the *children* nodes and returns the first one
    // that verifies `pred`. Otherwise return undefined. `contains` does not cross
    // scope boundaries.
    contains(pred) {
      let node = undefined;
      this.traverseChildren(false, function(n) {
        if (pred(n)) {
          node = n;
          return false;
        }
      });
      return node;
    }

    // Pull out the last node of a node list.
    lastNode(list) {
      if (list.length === 0) { return null; } else { return list[list.length - 1]; }
    }

    // `toString` representation of the node, for inspecting the parse tree.
    // This is what `coffee --nodes` prints out.
    toString(idt, name) {
      if (idt == null) { idt = ''; }
      if (name == null) { ({
        name
      } = this.constructor); }
      let tree = '\n' + idt + name;
      if (this.soak) { tree += '?'; }
      this.eachChild(node => tree += node.toString(idt + TAB));
      return tree;
    }

    // Passes each child to a function, breaking when the function returns `false`.
    eachChild(func) {
      if (!this.children) { return this; }
      for (let attr of Array.from(this.children)) {
        if (this[attr]) {
          for (let child of Array.from(flatten([this[attr]]))) {
            if (func(child) === false) { return this; }
          }
        }
      }
      return this;
    }

    traverseChildren(crossScope, func) {
      return this.eachChild(function(child) {
        const recur = func(child);
        if (recur !== false) { return child.traverseChildren(crossScope, func); }
      });
    }

    // `replaceInContext` will traverse children looking for a node for which `match` returns
    // true. Once found, the matching node will be replaced by the result of calling `replacement`.
    replaceInContext(match, replacement) {
      if (!this.children) { return false; }
      for (let attr of Array.from(this.children)) {
        var children;
        if ((children = this[attr])) {
          if (Array.isArray(children)) {
            for (let i = 0; i < children.length; i++) {
              const child = children[i];
              if (match(child)) {
                children.splice(i, i - i + 1, ...[].concat(replacement(child, this)));
                return true;
              } else {
                if (child.replaceInContext(match, replacement)) { return true; }
              }
            }
          } else if (match(children)) {
            this[attr] = replacement(children, this);
            return true;
          } else {
            if (children.replaceInContext(match, replacement)) { return true; }
          }
        }
      }
    }

    invert() {
      return new Op('!', this);
    }

    unwrapAll() {
      let node = this;
      while (node !== (node = node.unwrap())) { continue; }
      return node;
    }

    // For this node and all descendents, set the location data to `locationData`
    // if the location data is not already set.
    updateLocationDataIfMissing(locationData) {
      if (this.locationData && !this.forceUpdateLocation) { return this; }
      delete this.forceUpdateLocation;
      this.locationData = locationData;

      return this.eachChild(child => child.updateLocationDataIfMissing(locationData));
    }

    // Throw a SyntaxError associated with this node’s location.
    error(message) {
      return throwSyntaxError(message, this.locationData);
    }

    makeCode(code) {
      return new CodeFragment(this, code);
    }

    wrapInParentheses(fragments) {
      return [this.makeCode('('), ...fragments, this.makeCode(')')];
    }

    wrapInBraces(fragments) {
      return [this.makeCode('{'), ...fragments, this.makeCode('}')];
    }

    // `fragmentsList` is an array of arrays of fragments. Each array in fragmentsList will be
    // concatenated together, with `joinStr` added in between each, to produce a final flat array
    // of fragments.
    joinFragmentArrays(fragmentsList, joinStr) {
      let answer = [];
      for (let i = 0; i < fragmentsList.length; i++) {
        const fragments = fragmentsList[i];
        if (i) { answer.push(this.makeCode(joinStr)); }
        answer = answer.concat(fragments);
      }
      return answer;
    }
  };
  Base.initClass();
  return Base;
})());

//### HoistTarget

// A **HoistTargetNode** represents the output location in the node tree for a hoisted node.
// See Base#hoist.
exports.HoistTarget = (HoistTarget = class HoistTarget extends Base {
  // Expands hoisted fragments in the given array
  static expand(fragments) {
    for (let i = fragments.length - 1; i >= 0; i--) {
      const fragment = fragments[i];
      if (fragment.fragments) {
        fragments.splice(i, i - i + 1, ...[].concat(this.expand(fragment.fragments)));
      }
    }
    return fragments;
  }

  constructor(source) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.source = source;
    super();

    // Holds presentational options to apply when the source node is compiled.
    this.options = {};

    // Placeholder fragments to be replaced by the source node’s compilation.
    this.targetFragments = { fragments: [] };
  }

  isStatement(o) {
    return this.source.isStatement(o);
  }

  // Update the target fragments with the result of compiling the source.
  // Calls the given compile function with the node and options (overriden with the target
  // presentational options).
  update(compile, o) {
    return this.targetFragments.fragments = compile.call(this.source, merge(o, this.options));
  }

  // Copies the target indent and level, and returns the placeholder fragments
  compileToFragments(o, level) {
    this.options.indent = o.indent;
    this.options.level  = level != null ? level : o.level;
    return [ this.targetFragments ];
  }

  compileNode(o) {
    return this.compileToFragments(o);
  }

  compileClosure(o) {
    return this.compileToFragments(o);
  }
});

//### Block

// The block is the list of expressions that forms the body of an
// indented block of code -- the implementation of a function, a clause in an
// `if`, `switch`, or `try`, and so on...
exports.Block = (Block = (function() {
  Block = class Block extends Base {
    static initClass() {
  
      this.prototype.children = ['expressions'];
    }
    constructor(nodes) {
      super();

      this.expressions = compact(flatten(nodes || []));
    }

    // Tack an expression on to the end of this expression list.
    push(node) {
      this.expressions.push(node);
      return this;
    }

    // Remove and return the last expression of this expression list.
    pop() {
      return this.expressions.pop();
    }

    // Add an expression at the beginning of this expression list.
    unshift(node) {
      this.expressions.unshift(node);
      return this;
    }

    // If this Block consists of just a single node, unwrap it by pulling
    // it back out.
    unwrap() {
      if (this.expressions.length === 1) { return this.expressions[0]; } else { return this; }
    }

    // Is this an empty block of code?
    isEmpty() {
      return !this.expressions.length;
    }

    isStatement(o) {
      for (let exp of Array.from(this.expressions)) {
        if (exp.isStatement(o)) {
          return true;
        }
      }
      return false;
    }

    jumps(o) {
      for (let exp of Array.from(this.expressions)) {
        var jumpNode;
        if (jumpNode = exp.jumps(o)) { return jumpNode; }
      }
    }

    // A Block node does not return its entire body, rather it
    // ensures that the final expression is returned.
    makeReturn(res) {
      let len = this.expressions.length;
      while (len--) {
        const expr = this.expressions[len];
        this.expressions[len] = expr.makeReturn(res);
        if (expr instanceof Return && !expr.expression) { this.expressions.splice(len, 1); }
        break;
      }
      return this;
    }

    // A **Block** is the only node that can serve as the root.
    compileToFragments(o, level) {
      if (o == null) { o = {}; }
      if (o.scope) { return super.compileToFragments(o, level); } else { return this.compileRoot(o); }
    }

    // Compile all expressions within the **Block** body. If we need to return
    // the result, and it’s an expression, simply return it. If it’s a statement,
    // ask the statement to do so.
    compileNode(o) {
      let answer;
      this.tab  = o.indent;
      const top   = o.level === LEVEL_TOP;
      const compiledNodes = [];

      for (let index = 0; index < this.expressions.length; index++) {
        let node = this.expressions[index];
        if (node.hoisted) {
          // This is a hoisted expression.
          // We want to compile this and ignore the result.
          node.compileToFragments(o);
          continue;
        }
        node = (node.unfoldSoak(o) || node);
        if (node instanceof Block) {
          // This is a nested block. We don’t do anything special here like
          // enclose it in a new scope; we just compile the statements in this
          // block along with our own.
          compiledNodes.push(node.compileNode(o));
        } else if (top) {
          node.front = true;
          let fragments = node.compileToFragments(o);
          if (!node.isStatement(o)) {
            fragments = indentInitial(fragments, this);
            const lastFragment = fragments[fragments.length - 1];
            if ((lastFragment.code !== '') && !lastFragment.isComment) {
              fragments.push(this.makeCode(';'));
            }
          }
          compiledNodes.push(fragments);
        } else {
          compiledNodes.push(node.compileToFragments(o, LEVEL_LIST));
        }
      }
      if (top) {
        if (this.spaced) {
          return [].concat(this.joinFragmentArrays(compiledNodes, '\n\n'), this.makeCode('\n'));
        } else {
          return this.joinFragmentArrays(compiledNodes, '\n');
        }
      }
      if (compiledNodes.length) {
        answer = this.joinFragmentArrays(compiledNodes, ', ');
      } else {
        answer = [this.makeCode('void 0')];
      }
      if ((compiledNodes.length > 1) && (o.level >= LEVEL_LIST)) { return this.wrapInParentheses(answer); } else { return answer; }
    }

    // If we happen to be the top-level **Block**, wrap everything in a safety
    // closure, unless requested not to. It would be better not to generate them
    // in the first place, but for now, clean up obvious double-parentheses.
    compileRoot(o) {
      o.indent  = o.bare ? '' : TAB;
      o.level   = LEVEL_TOP;
      this.spaced   = true;
      o.scope   = new Scope(null, this, null, o.referencedVars != null ? o.referencedVars : []);
      // Mark given local variables in the root scope as parameters so they don’t
      // end up being declared on this block.
      for (let name of Array.from(o.locals || [])) { o.scope.parameter(name); }
      let fragments = this.compileWithDeclarations(o);
      HoistTarget.expand(fragments);
      fragments = this.compileComments(fragments);
      if (o.bare) { return fragments; }
      return [].concat(this.makeCode("(function() {\n"), fragments, this.makeCode("\n}).call(this);\n"));
    }

    // Compile the expressions body for the contents of a function, with
    // declarations of all inner variables pushed up to the top.
    compileWithDeclarations(o) {
      let i, spaced;
      let fragments = [];
      let post = [];
      for (i = 0; i < this.expressions.length; i++) {
        let exp = this.expressions[i];
        exp = exp.unwrap();
        if (!(exp instanceof Literal)) { break; }
      }
      o = merge(o, {level: LEVEL_TOP});
      if (i) {
        const rest = this.expressions.splice(i, 9e9);
        [spaced,    this.spaced] = [this.spaced, false];
        [fragments, this.spaced] = [this.compileNode(o), spaced];
        this.expressions = rest;
      }
      post = this.compileNode(o);
      const {scope} = o;
      if (scope.expressions === this) {
        const declars = o.scope.hasDeclarations();
        const assigns = scope.hasAssignments;
        if (declars || assigns) {
          if (i) { fragments.push(this.makeCode('\n')); }
          fragments.push(this.makeCode(`${this.tab}var `));
          if (declars) {
            const declaredVariables = scope.declaredVariables();
            for (let declaredVariablesIndex = 0; declaredVariablesIndex < declaredVariables.length; declaredVariablesIndex++) {
              const declaredVariable = declaredVariables[declaredVariablesIndex];
              fragments.push(this.makeCode(declaredVariable));
              if (Object.prototype.hasOwnProperty.call(o.scope.comments, declaredVariable)) {
                fragments.push(...o.scope.comments[declaredVariable]);
              }
              if (declaredVariablesIndex !== (declaredVariables.length - 1)) {
                fragments.push(this.makeCode(', '));
              }
            }
          }
          if (assigns) {
            if (declars) { fragments.push(this.makeCode(`,\n${this.tab + TAB}`)); }
            fragments.push(this.makeCode(scope.assignedVariables().join(`,\n${this.tab + TAB}`)));
          }
          fragments.push(this.makeCode(`;\n${this.spaced ? '\n' : ''}`));
        } else if (fragments.length && post.length) {
          fragments.push(this.makeCode("\n"));
        }
      }
      return fragments.concat(post);
    }

    compileComments(fragments) {
      let commentFragment;
      for (let fragmentIndex = 0; fragmentIndex < fragments.length; fragmentIndex++) {
        // Insert comments into the output at the next or previous newline.
        // If there are no newlines at which to place comments, create them.
        var code, fragmentIndent, indent, newLineIndex;
        var fragment = fragments[fragmentIndex];
        if (fragment.precedingComments) {
          // Determine the indentation level of the fragment that we are about
          // to insert comments before, and use that indentation level for our
          // inserted comments. At this point, the fragments’ `code` property
          // is the generated output JavaScript, and CoffeeScript always
          // generates output indented by two spaces; so all we need to do is
          // search for a `code` property that begins with at least two spaces.
          var pastFragment;
          fragmentIndent = '';
          const iterable = fragments.slice(0, (fragmentIndex + 1));
          for (let i = iterable.length - 1; i >= 0; i--) {
            pastFragment = iterable[i];
            indent = /^ {2,}/m.exec(pastFragment.code);
            if (indent) {
              fragmentIndent = indent[0];
              break;
            } else if (Array.from(pastFragment.code).includes('\n')) {
              break;
            }
          }
          code = `\n${fragmentIndent}` + ((() => {
            const result = [];
            
              for (commentFragment of Array.from(fragment.precedingComments)) {
              if (commentFragment.isHereComment && commentFragment.multiline) {
                result.push(multident(commentFragment.code, fragmentIndent, false));
              } else {
                result.push(commentFragment.code);
              }
            }
            
            return result;
          })()).join(`\n${fragmentIndent}`).replace(/^(\s*)$/gm, '');
          const iterable1 = fragments.slice(0, (fragmentIndex + 1));
          for (let pastFragmentIndex = iterable1.length - 1; pastFragmentIndex >= 0; pastFragmentIndex--) {
            pastFragment = iterable1[pastFragmentIndex];
            newLineIndex = pastFragment.code.lastIndexOf('\n');
            if (newLineIndex === -1) {
              // Keep searching previous fragments until we can’t go back any
              // further, either because there are no fragments left or we’ve
              // discovered that we’re in a code block that is interpolated
              // inside a string.
              if (pastFragmentIndex === 0) {
                pastFragment.code = '\n' + pastFragment.code;
                newLineIndex = 0;
              } else if (pastFragment.isStringWithInterpolations && (pastFragment.code === '{')) {
                code = code.slice(1) + '\n'; // Move newline to end.
                newLineIndex = 1;
              } else {
                continue;
              }
            }
            delete fragment.precedingComments;
            pastFragment.code = pastFragment.code.slice(0, newLineIndex) +
              code + pastFragment.code.slice(newLineIndex);
            break;
          }
        }

        // Yes, this is awfully similar to the previous `if` block, but if you
        // look closely you’ll find lots of tiny differences that make this
        // confusing if it were abstracted into a function that both blocks share.
        if (fragment.followingComments) {
          // Does the first trailing comment follow at the end of a line of code,
          // like `; // Comment`, or does it start a new line after a line of code?
          var upcomingFragment;
          const {
            trail
          } = fragment.followingComments[0];
          fragmentIndent = '';
          // Find the indent of the next line of code, if we have any non-trailing
          // comments to output. We need to first find the next newline, as these
          // comments will be output after that; and then the indent of the line
          // that follows the next newline.
          if (!trail || (fragment.followingComments.length !== 1)) {
            let onNextLine = false;
            for (upcomingFragment of Array.from(fragments.slice(fragmentIndex))) {
              if (!onNextLine) {
                if (Array.from(upcomingFragment.code).includes('\n')) {
                  onNextLine = true;
                } else {
                  continue;
                }
              } else {
                indent = /^ {2,}/m.exec(upcomingFragment.code);
                if (indent) {
                  fragmentIndent = indent[0];
                  break;
                } else if (Array.from(upcomingFragment.code).includes('\n')) {
                  break;
                }
              }
            }
          }
          // Is this comment following the indent inserted by bare mode?
          // If so, there’s no need to indent this further.
          code = (fragmentIndex === 1) && /^\s+$/.test(fragments[0].code) ?
            ''
          : trail ?
            ' '
          :
            `\n${fragmentIndent}`;
          // Assemble properly indented comments.
          code += ((() => {
            const result1 = [];
            
              for (commentFragment of Array.from(fragment.followingComments)) {
              if (commentFragment.isHereComment && commentFragment.multiline) {
                result1.push(multident(commentFragment.code, fragmentIndent, false));
              } else {
                result1.push(commentFragment.code);
              }
            }
            
            return result1;
          })()).join(`\n${fragmentIndent}`).replace(/^(\s*)$/gm, '');
          const iterable2 = fragments.slice(fragmentIndex);
          for (let upcomingFragmentIndex = 0; upcomingFragmentIndex < iterable2.length; upcomingFragmentIndex++) {
            upcomingFragment = iterable2[upcomingFragmentIndex];
            newLineIndex = upcomingFragment.code.indexOf('\n');
            if (newLineIndex === -1) {
              // Keep searching upcoming fragments until we can’t go any
              // further, either because there are no fragments left or we’ve
              // discovered that we’re in a code block that is interpolated
              // inside a string.
              if (upcomingFragmentIndex === (fragments.length - 1)) {
                upcomingFragment.code = upcomingFragment.code + '\n';
                newLineIndex = upcomingFragment.code.length;
              } else if (upcomingFragment.isStringWithInterpolations && (upcomingFragment.code === '}')) {
                code = `${code}\n`;
                newLineIndex = 0;
              } else {
                continue;
              }
            }
            delete fragment.followingComments;
            // Avoid inserting extra blank lines.
            if (upcomingFragment.code === '\n') { code = code.replace(/^\n/, ''); }
            upcomingFragment.code = upcomingFragment.code.slice(0, newLineIndex) +
              code + upcomingFragment.code.slice(newLineIndex);
            break;
          }
        }
      }

      return fragments;
    }

    // Wrap up the given nodes as a **Block**, unless it already happens
    // to be one.
    static wrap(nodes) {
      if ((nodes.length === 1) && nodes[0] instanceof Block) { return nodes[0]; }
      return new Block(nodes);
    }
  };
  Block.initClass();
  return Block;
})());

//### Literal

// `Literal` is a base class for static values that can be passed through
// directly into JavaScript without translation, such as: strings, numbers,
// `true`, `false`, `null`...
exports.Literal = (Literal = (function() {
  Literal = class Literal extends Base {
    static initClass() {
  
      this.prototype.shouldCache = NO;
    }
    constructor(value) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.value = value;
      super();
    }

    assigns(name) {
      return name === this.value;
    }

    compileNode(o) {
      return [this.makeCode(this.value)];
    }

    toString() {
      // This is only intended for debugging.
      return ` ${this.isStatement() ? super.toString() : this.constructor.name}: ${this.value}`;
    }
  };
  Literal.initClass();
  return Literal;
})());

exports.NumberLiteral = (NumberLiteral = class NumberLiteral extends Literal {});

exports.InfinityLiteral = (InfinityLiteral = class InfinityLiteral extends NumberLiteral {
  compileNode() {
    return [this.makeCode('2e308')];
  }
});

exports.NaNLiteral = (NaNLiteral = class NaNLiteral extends NumberLiteral {
  constructor() {
    super('NaN');
  }

  compileNode(o) {
    const code = [this.makeCode('0/0')];
    if (o.level >= LEVEL_OP) { return this.wrapInParentheses(code); } else { return code; }
  }
});

exports.StringLiteral = (StringLiteral = class StringLiteral extends Literal {
  compileNode(o) {
    let res;
    return res = this.csx ? [this.makeCode(this.unquote(true, true))] : super.compileNode();
  }

  unquote(doubleQuote, newLine) {
    if (doubleQuote == null) { doubleQuote = false; }
    if (newLine == null) { newLine = false; }
    let unquoted = this.value.slice(1, -1);
    if (doubleQuote) { unquoted = unquoted.replace(/\\"/g, '"'); }
    if (newLine) { unquoted = unquoted.replace(/\\n/g, '\n'); }
    return unquoted;
  }
});

exports.RegexLiteral = (RegexLiteral = class RegexLiteral extends Literal {});

exports.PassthroughLiteral = (PassthroughLiteral = class PassthroughLiteral extends Literal {});

exports.IdentifierLiteral = (IdentifierLiteral = (function() {
  IdentifierLiteral = class IdentifierLiteral extends Literal {
    static initClass() {
      this.prototype.isAssignable = YES;
    }

    eachName(iterator) {
      return iterator(this);
    }
  };
  IdentifierLiteral.initClass();
  return IdentifierLiteral;
})());

exports.CSXTag = (CSXTag = class CSXTag extends IdentifierLiteral {});

exports.PropertyName = (PropertyName = (function() {
  PropertyName = class PropertyName extends Literal {
    static initClass() {
      this.prototype.isAssignable = YES;
    }
  };
  PropertyName.initClass();
  return PropertyName;
})());

exports.ComputedPropertyName = (ComputedPropertyName = class ComputedPropertyName extends PropertyName {
  compileNode(o) {
    return [this.makeCode('['), ...this.value.compileToFragments(o, LEVEL_LIST), this.makeCode(']')];
  }
});

exports.StatementLiteral = (StatementLiteral = (function() {
  StatementLiteral = class StatementLiteral extends Literal {
    static initClass() {
      this.prototype.isStatement = YES;
  
      this.prototype.makeReturn = THIS;
    }

    jumps(o) {
      if ((this.value === 'break') && !((o != null ? o.loop : undefined) || (o != null ? o.block : undefined))) { return this; }
      if ((this.value === 'continue') && !(o != null ? o.loop : undefined)) { return this; }
    }

    compileNode(o) {
      return [this.makeCode(`${this.tab}${this.value};`)];
    }
  };
  StatementLiteral.initClass();
  return StatementLiteral;
})());

exports.ThisLiteral = (ThisLiteral = class ThisLiteral extends Literal {
  constructor() {
    super('this');
  }

  compileNode(o) {
    const code = (o.scope.method != null ? o.scope.method.bound : undefined) ? o.scope.method.context : this.value;
    return [this.makeCode(code)];
  }
});

exports.UndefinedLiteral = (UndefinedLiteral = class UndefinedLiteral extends Literal {
  constructor() {
    super('undefined');
  }

  compileNode(o) {
    return [this.makeCode(o.level >= LEVEL_ACCESS ? '(void 0)' : 'void 0')];
  }
});

exports.NullLiteral = (NullLiteral = class NullLiteral extends Literal {
  constructor() {
    super('null');
  }
});

exports.BooleanLiteral = (BooleanLiteral = class BooleanLiteral extends Literal {});

//### Return

// A `return` is a *pureStatement*—wrapping it in a closure wouldn’t make sense.
exports.Return = (Return = (function() {
  Return = class Return extends Base {
    static initClass() {
  
      this.prototype.children = ['expression'];
  
      this.prototype.isStatement =     YES;
      this.prototype.makeReturn =      THIS;
      this.prototype.jumps =           THIS;
    }
    constructor(expression) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.expression = expression;
      super();
    }

    compileToFragments(o, level) {
      const expr = this.expression != null ? this.expression.makeReturn() : undefined;
      if (expr && !(expr instanceof Return)) { return expr.compileToFragments(o, level); } else { return super.compileToFragments(o, level); }
    }

    compileNode(o) {
      let answer = [];
      // TODO: If we call `expression.compile()` here twice, we’ll sometimes
      // get back different results!
      if (this.expression) {
        answer = this.expression.compileToFragments(o, LEVEL_PAREN);
        unshiftAfterComments(answer, this.makeCode(`${this.tab}return `));
        // Since the `return` got indented by `@tab`, preceding comments that are
        // multiline need to be indented.
        for (let fragment of Array.from(answer)) {
          if (fragment.isHereComment && Array.from(fragment.code).includes('\n')) {
            fragment.code = multident(fragment.code, this.tab);
          } else if (fragment.isLineComment) {
            fragment.code = `${this.tab}${fragment.code}`;
          } else {
            break;
          }
        }
      } else {
        answer.push(this.makeCode(`${this.tab}return`));
      }
      answer.push(this.makeCode(';'));
      return answer;
    }
  };
  Return.initClass();
  return Return;
})());

// `yield return` works exactly like `return`, except that it turns the function
// into a generator.
exports.YieldReturn = (YieldReturn = class YieldReturn extends Return {
  compileNode(o) {
    if (o.scope.parent == null) {
      this.error('yield can only occur inside functions');
    }
    return super.compileNode(o);
  }
});

exports.AwaitReturn = (AwaitReturn = class AwaitReturn extends Return {
  compileNode(o) {
    if (o.scope.parent == null) {
      this.error('await can only occur inside functions');
    }
    return super.compileNode(o);
  }
});


//### Value

// A value, variable or literal or parenthesized, indexed or dotted into,
// or vanilla.
exports.Value = (Value = (function() {
  Value = class Value extends Base {
    static initClass() {
  
      this.prototype.children = ['base', 'properties'];
    }
    constructor(base, props, tag, isDefaultValue) {
      if (isDefaultValue == null) { isDefaultValue = false; }
      super();
      if (!props && base instanceof Value) { return base; }
      // When `Parens` block includes a `StatementLiteral` (e.g. `(b; break) for a in arr`),
      // it won't compile since `Parens` (`(b; break)`) is compiled as `Value` and
      // pure statement (`break`) can't be used in an expression.
      // For this reasons, we return `Block` instead of `Parens`.
      if (base instanceof Parens && base.contains(n => n instanceof StatementLiteral)) { return base.unwrap(); }
      this.base           = base;
      this.properties     = props || [];
      if (tag) { this[tag]          = true; }
      this.isDefaultValue = isDefaultValue;
      // If this is a `@foo =` assignment, if there are comments on `@` move them
      // to be on `foo`.
      if ((this.base != null ? this.base.comments : undefined) && this.base instanceof ThisLiteral && ((this.properties[0] != null ? this.properties[0].name : undefined) != null)) {
        moveComments(this.base, this.properties[0].name);
      }
    }

    // Add a property (or *properties* ) `Access` to the list.
    add(props) {
      this.properties = this.properties.concat(props);
      this.forceUpdateLocation = true;
      return this;
    }

    hasProperties() {
      return this.properties.length !== 0;
    }

    bareLiteral(type) {
      return !this.properties.length && this.base instanceof type;
    }

    // Some boolean checks for the benefit of other nodes.
    isArray() { return this.bareLiteral(Arr); }
    isRange() { return this.bareLiteral(Range); }
    shouldCache() { return this.hasProperties() || this.base.shouldCache(); }
    isAssignable() { return this.hasProperties() || this.base.isAssignable(); }
    isNumber() { return this.bareLiteral(NumberLiteral); }
    isString() { return this.bareLiteral(StringLiteral); }
    isRegex() { return this.bareLiteral(RegexLiteral); }
    isUndefined() { return this.bareLiteral(UndefinedLiteral); }
    isNull() { return this.bareLiteral(NullLiteral); }
    isBoolean() { return this.bareLiteral(BooleanLiteral); }
    isAtomic() {
      for (let node of Array.from(this.properties.concat(this.base))) {
        if (node.soak || node instanceof Call) { return false; }
      }
      return true;
    }

    isNotCallable() { return this.isNumber() || this.isString() || this.isRegex() ||
                        this.isArray() || this.isRange() || this.isSplice() || this.isObject() ||
                        this.isUndefined() || this.isNull() || this.isBoolean(); }

    isStatement(o)    { return !this.properties.length && this.base.isStatement(o); }
    assigns(name) { return !this.properties.length && this.base.assigns(name); }
    jumps(o)    { return !this.properties.length && this.base.jumps(o); }

    isObject(onlyGenerated) {
      if (this.properties.length) { return false; }
      return (this.base instanceof Obj) && (!onlyGenerated || this.base.generated);
    }

    isElision() {
      if (!(this.base instanceof Arr)) { return false; }
      return this.base.hasElision();
    }

    isSplice() {
      const lastProp = this.properties[this.properties.length - 1];
      return lastProp instanceof Slice;
    }

    looksStatic(className) {
      return (this.this || this.base instanceof ThisLiteral || (this.base.value === className)) &&
        (this.properties.length === 1) && ((this.properties[0].name != null ? this.properties[0].name.value : undefined) !== 'prototype');
    }

    // The value can be unwrapped as its inner node, if there are no attached
    // properties.
    unwrap() {
      if (this.properties.length) { return this; } else { return this.base; }
    }

    // A reference has base part (`this` value) and name part.
    // We cache them separately for compiling complex expressions.
    // `a()[b()] ?= c` -> `(_base = a())[_name = b()] ? _base[_name] = c`
    cacheReference(o) {
      let bref, nref;
      let name = this.properties[this.properties.length - 1];
      if ((this.properties.length < 2) && !this.base.shouldCache() && !(name != null ? name.shouldCache() : undefined)) {
        return [this, this];  // `a` `a.b`
      }
      let base = new Value(this.base, this.properties.slice(0, -1));
      if (base.shouldCache()) {  // `a().b`
        bref = new IdentifierLiteral(o.scope.freeVariable('base'));
        base = new Value(new Parens(new Assign(bref, base)));
      }
      if (!name) { return [base, bref]; }  // `a()`
      if (name.shouldCache()) {  // `a[b()]`
        nref = new IdentifierLiteral(o.scope.freeVariable('name'));
        name = new Index(new Assign(nref, name.index));
        nref = new Index(nref);
      }
      return [base.add(name), new Value(bref || base.base, [nref || name])];
    }

    // We compile a value to JavaScript by compiling and joining each property.
    // Things get much more interesting if the chain of properties has *soak*
    // operators `?.` interspersed. Then we have to take care not to accidentally
    // evaluate anything twice when building the soak chain.
    compileNode(o) {
      let fragments;
      this.base.front = this.front;
      const props = this.properties;
      if (props.length && (this.base.cached != null)) {
        // Cached fragments enable correct order of the compilation,
        // and reuse of variables in the scope.
        // Example:
        // `a(x = 5).b(-> x = 6)` should compile in the same order as
        // `a(x = 5); b(-> x = 6)`
        // (see issue #4437, https://github.com/jashkenas/coffeescript/issues/4437)
        fragments = this.base.cached;
      } else {
        fragments = this.base.compileToFragments(o, (props.length ? LEVEL_ACCESS : null));
      }
      if (props.length && SIMPLENUM.test(fragmentsToText(fragments))) {
        fragments.push(this.makeCode('.'));
      }
      for (let prop of Array.from(props)) {
        fragments.push(...(prop.compileToFragments(o)));
      }

      return fragments;
    }

    // Unfold a soak into an `If`: `a?.b` -> `a.b if a?`
    unfoldSoak(o) {
      return this.unfoldedSoak != null ? this.unfoldedSoak : (this.unfoldedSoak = (() => {
        const ifn = this.base.unfoldSoak(o);
        if (ifn) {
          ifn.body.properties.push(...this.properties);
          return ifn;
        }
        for (let i = 0; i < this.properties.length; i++) {
          const prop = this.properties[i];
          if (prop.soak) {
            prop.soak = false;
            let fst = new Value(this.base, this.properties.slice(0, i));
            const snd = new Value(this.base, this.properties.slice(i));
            if (fst.shouldCache()) {
              const ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
              fst = new Parens(new Assign(ref, fst));
              snd.base = ref;
            }
            return new If(new Existence(fst), snd, {soak: true});
          }
        }
        return false;
      })());
    }

    eachName(iterator) {
      if (this.hasProperties()) {
        return iterator(this);
      } else if (this.base.isAssignable()) {
        return this.base.eachName(iterator);
      } else {
        return this.error('tried to assign to unassignable value');
      }
    }
  };
  Value.initClass();
  return Value;
})());

//### HereComment

// Comment delimited by `###` (becoming `/* */`).
exports.HereComment = (HereComment = class HereComment extends Base {
  constructor({ content, newLine, unshift }) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.content = content;
    this.newLine = newLine;
    this.unshift = unshift;
    super();
  }

  compileNode(o) {
    const multiline = Array.from(this.content).includes('\n');
    const hasLeadingMarks = /\n\s*[#|\*]/.test(this.content);
    if (hasLeadingMarks) { this.content = this.content.replace(/^([ \t]*)#(?=\s)/gm, ' *'); }

    // Unindent multiline comments. They will be reindented later.
    if (multiline) {
      let leadingWhitespace;
      let largestIndent = '';
      for (let line of Array.from(this.content.split('\n'))) {
        leadingWhitespace = /^\s*/.exec(line)[0];
        if (leadingWhitespace.length > largestIndent.length) {
          largestIndent = leadingWhitespace;
        }
      }
      this.content = this.content.replace(new RegExp(`^(${leadingWhitespace})`, 'gm'), '');
    }

    this.content = `/*${this.content}${hasLeadingMarks ? ' ' : ''}*/`;
    const fragment = this.makeCode(this.content);
    fragment.newLine = this.newLine;
    fragment.unshift = this.unshift;
    fragment.multiline = multiline;
    // Don’t rely on `fragment.type`, which can break when the compiler is minified.
    fragment.isComment = (fragment.isHereComment = true);
    return fragment;
  }
});

//### LineComment

// Comment running from `#` to the end of a line (becoming `//`).
exports.LineComment = (LineComment = class LineComment extends Base {
  constructor({ content, newLine, unshift }) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.content = content;
    this.newLine = newLine;
    this.unshift = unshift;
    super();
  }

  compileNode(o) {
    const fragment = this.makeCode(/^\s*$/.test(this.content) ? '' : `//${this.content}`);
    fragment.newLine = this.newLine;
    fragment.unshift = this.unshift;
    fragment.trail = !this.newLine && !this.unshift;
    // Don’t rely on `fragment.type`, which can break when the compiler is minified.
    fragment.isComment = (fragment.isLineComment = true);
    return fragment;
  }
});

//### Call

// Node for a function invocation.
exports.Call = (Call = (function() {
  Call = class Call extends Base {
    static initClass() {
  
      this.prototype.children = ['variable', 'args'];
    }
    constructor(variable, args, soak, token) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.variable = variable;
      if (args == null) { args = []; }
      this.args = args;
      this.soak = soak;
      this.token = token;
      super();

      this.isNew = false;
      if (this.variable instanceof Value && this.variable.isNotCallable()) {
        this.variable.error("literal is not a function");
      }

      this.csx = this.variable.base instanceof CSXTag;

      // `@variable` never gets output as a result of this node getting created as
      // part of `RegexWithInterpolations`, so for that case move any comments to
      // the `args` property that gets passed into `RegexWithInterpolations` via
      // the grammar.
      if (((this.variable.base != null ? this.variable.base.value : undefined) === 'RegExp') && (this.args.length !== 0)) {
        moveComments(this.variable, this.args[0]);
      }
    }

    // When setting the location, we sometimes need to update the start location to
    // account for a newly-discovered `new` operator to the left of us. This
    // expands the range on the left, but not the right.
    updateLocationDataIfMissing(locationData) {
      if (this.locationData && this.needsUpdatedStartLocation) {
        this.locationData.first_line = locationData.first_line;
        this.locationData.first_column = locationData.first_column;
        const base = (this.variable != null ? this.variable.base : undefined) || this.variable;
        if (base.needsUpdatedStartLocation) {
          this.variable.locationData.first_line = locationData.first_line;
          this.variable.locationData.first_column = locationData.first_column;
          base.updateLocationDataIfMissing(locationData);
        }
        delete this.needsUpdatedStartLocation;
      }
      return super.updateLocationDataIfMissing(locationData);
    }

    // Tag this invocation as creating a new instance.
    newInstance() {
      const base = (this.variable != null ? this.variable.base : undefined) || this.variable;
      if (base instanceof Call && !base.isNew) {
        base.newInstance();
      } else {
        this.isNew = true;
      }
      this.needsUpdatedStartLocation = true;
      return this;
    }

    // Soaked chained invocations unfold into if/else ternary structures.
    unfoldSoak(o) {
      let ifn;
      if (this.soak) {
        let left, rite;
        if (this.variable instanceof Super) {
          left = new Literal(this.variable.compile(o));
          rite = new Value(left);
          if (this.variable.accessor == null) { this.variable.error("Unsupported reference to 'super'"); }
        } else {
          if (ifn = unfoldSoak(o, this, 'variable')) { return ifn; }
          [left, rite] = new Value(this.variable).cacheReference(o);
        }
        rite = new Call(rite, this.args);
        rite.isNew = this.isNew;
        left = new Literal(`typeof ${ left.compile(o) } === \"function\"`);
        return new If(left, new Value(rite), {soak: true});
      }
      let call = this;
      const list = [];
      while (true) {
        if (call.variable instanceof Call) {
          list.push(call);
          call = call.variable;
          continue;
        }
        if (!(call.variable instanceof Value)) { break; }
        list.push(call);
        if (!((call = call.variable.base) instanceof Call)) { break; }
      }
      for (call of Array.from(list.reverse())) {
        if (ifn) {
          if (call.variable instanceof Call) {
            call.variable = ifn;
          } else {
            call.variable.base = ifn;
          }
        }
        ifn = unfoldSoak(o, call, 'variable');
      }
      return ifn;
    }

    // Compile a vanilla function call.
    compileNode(o) {
      let arg;
      if (this.csx) { return this.compileCSX(o); }
      if (this.variable != null) {
        this.variable.front = this.front;
      }
      const compiledArgs = [];
      // If variable is `Accessor` fragments are cached and used later
      // in `Value::compileNode` to ensure correct order of the compilation,
      // and reuse of variables in the scope.
      // Example:
      // `a(x = 5).b(-> x = 6)` should compile in the same order as
      // `a(x = 5); b(-> x = 6)`
      // (see issue #4437, https://github.com/jashkenas/coffeescript/issues/4437)
      const varAccess = __guard__(this.variable != null ? this.variable.properties : undefined, x => x[0]) instanceof Access;
      const argCode = ((() => {
        const result = [];
        for (arg of Array.from((this.args || []))) {           if (arg instanceof Code) {
            result.push(arg);
          }
        }
        return result;
      })());
      if ((argCode.length > 0) && varAccess && !this.variable.base.cached) {
        const [cache] = this.variable.base.cache(o, LEVEL_ACCESS, () => false);
        this.variable.base.cached = cache;
      }

      for (let argIndex = 0; argIndex < this.args.length; argIndex++) {
        arg = this.args[argIndex];
        if (argIndex) { compiledArgs.push(this.makeCode(", ")); }
        compiledArgs.push(...(arg.compileToFragments(o, LEVEL_LIST)));
      }

      const fragments = [];
      if (this.isNew) {
        if (this.variable instanceof Super) { this.variable.error("Unsupported reference to 'super'"); }
        fragments.push(this.makeCode('new '));
      }
      fragments.push(...this.variable.compileToFragments(o, LEVEL_ACCESS));
      fragments.push(this.makeCode('('), ...compiledArgs, this.makeCode(')'));
      return fragments;
    }

    compileCSX(o) {
      let tag;
      const [attributes, content] = this.args;
      attributes.base.csx = true;
      if (content != null) {
        content.base.csx = true;
      }
      const fragments = [this.makeCode('<')];
      fragments.push(...(tag = this.variable.compileToFragments(o, LEVEL_ACCESS)));
      if (attributes.base instanceof Arr) {
        for (let obj of Array.from(attributes.base.objects)) {
          const attr = obj.base;
          const attrProps = (attr != null ? attr.properties : undefined) || [];
          // Catch invalid CSX attributes: <div {a:"b", props} {props} "value" />
          if (!(attr instanceof Obj || attr instanceof IdentifierLiteral) || (attr instanceof Obj && !attr.generated && ((attrProps.length > 1) || !(attrProps[0] instanceof Splat)))) {
            obj.error(`\
Unexpected token. Allowed CSX attributes are: id="val", src={source}, {props...} or attribute.\
`
            );
          }
          if (obj.base instanceof Obj) { obj.base.csx = true; }
          fragments.push(this.makeCode(' '));
          fragments.push(...obj.compileToFragments(o, LEVEL_PAREN));
        }
      }
      if (content) {
        fragments.push(this.makeCode('>'));
        fragments.push(...content.compileNode(o, LEVEL_LIST));
        fragments.push(...[this.makeCode('</'), ...tag, this.makeCode('>')]);
      } else {
        fragments.push(this.makeCode(' />'));
      }
      return fragments;
    }
  };
  Call.initClass();
  return Call;
})());

//### Super

// Takes care of converting `super()` calls into calls against the prototype's
// function of the same name.
// When `expressions` are set the call will be compiled in such a way that the
// expressions are evaluated without altering the return value of the `SuperCall`
// expression.
exports.SuperCall = (SuperCall = (function() {
  SuperCall = class SuperCall extends Call {
    static initClass() {
      this.prototype.children = Call.prototype.children.concat(['expressions']);
    }

    isStatement(o) {
      return (this.expressions != null ? this.expressions.length : undefined) && (o.level === LEVEL_TOP);
    }

    compileNode(o) {
      if (!(this.expressions != null ? this.expressions.length : undefined)) { return super.compileNode(o); }

      let superCall   = new Literal(fragmentsToText(super.compileNode(o)));
      const replacement = new Block(this.expressions.slice());

      if (o.level > LEVEL_TOP) {
        // If we might be in an expression we need to cache and return the result
        let ref;
        [superCall, ref] = superCall.cache(o, null, YES);
        replacement.push(ref);
      }

      replacement.unshift(superCall);
      return replacement.compileToFragments(o, o.level === LEVEL_TOP ? o.level : LEVEL_LIST);
    }
  };
  SuperCall.initClass();
  return SuperCall;
})());

exports.Super = (Super = (function() {
  Super = class Super extends Base {
    static initClass() {
  
      this.prototype.children = ['accessor'];
    }
    constructor(accessor) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.accessor = accessor;
      super();
    }

    compileNode(o) {
      let name, salvagedComments;
      const method = o.scope.namedMethod();
      if (!(method != null ? method.isMethod : undefined)) { this.error('cannot use super outside of an instance method'); }

      if ((method.ctor == null) && (this.accessor == null)) {
        let nref, variable;
        ({name, variable} = method);
        if (name.shouldCache() || (name instanceof Index && name.index.isAssignable())) {
          nref = new IdentifierLiteral(o.scope.parent.freeVariable('name'));
          name.index = new Assign(nref, name.index);
        }
        this.accessor = (nref != null) ? new Index(nref) : name;
      }

      if (__guard__(this.accessor != null ? this.accessor.name : undefined, x => x.comments)) {
        // A `super()` call gets compiled to e.g. `super.method()`, which means
        // the `method` property name gets compiled for the first time here, and
        // again when the `method:` property of the class gets compiled. Since
        // this compilation happens first, comments attached to `method:` would
        // get incorrectly output near `super.method()`, when we want them to
        // get output on the second pass when `method:` is output. So set them
        // aside during this compilation pass, and put them back on the object so
        // that they’re there for the later compilation.
        salvagedComments = this.accessor.name.comments;
        delete this.accessor.name.comments;
      }
      const fragments = (new Value((new Literal('super')), this.accessor ? [ this.accessor ] : []))
      .compileToFragments(o);
      if (salvagedComments) { attachCommentsToNode(salvagedComments, this.accessor.name); }
      return fragments;
    }
  };
  Super.initClass();
  return Super;
})());

//### RegexWithInterpolations

// Regexes with interpolations are in fact just a variation of a `Call` (a
// `RegExp()` call to be precise) with a `StringWithInterpolations` inside.
exports.RegexWithInterpolations = (RegexWithInterpolations = class RegexWithInterpolations extends Call {
  constructor(args) {
    if (args == null) { args = []; }
    super((new Value(new IdentifierLiteral('RegExp'))), args, false);
  }
});

//### TaggedTemplateCall

exports.TaggedTemplateCall = (TaggedTemplateCall = class TaggedTemplateCall extends Call {
  constructor(variable, arg, soak) {
    if (arg instanceof StringLiteral) { arg = new StringWithInterpolations(Block.wrap([ new Value(arg) ])); }
    super(variable, [ arg ], soak);
  }

  compileNode(o) {
    return this.variable.compileToFragments(o, LEVEL_ACCESS).concat(this.args[0].compileToFragments(o, LEVEL_LIST));
  }
});

//### Extends

// Node to extend an object's prototype with an ancestor object.
// After `goog.inherits` from the
// [Closure Library](https://github.com/google/closure-library/blob/master/closure/goog/base.js).
exports.Extends = (Extends = (function() {
  Extends = class Extends extends Base {
    static initClass() {
  
      this.prototype.children = ['child', 'parent'];
    }
    constructor(child, parent) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.child = child;
      this.parent = parent;
      super();
    }

    // Hooks one constructor into another's prototype chain.
    compileToFragments(o) {
      return new Call(new Value(new Literal(utility('extend', o))), [this.child, this.parent]).compileToFragments(o);
    }
  };
  Extends.initClass();
  return Extends;
})());

//### Access

// A `.` access into a property of a value, or the `::` shorthand for
// an access into the object's prototype.
exports.Access = (Access = (function() {
  Access = class Access extends Base {
    static initClass() {
  
      this.prototype.children = ['name'];
  
      this.prototype.shouldCache = NO;
    }
    constructor(name, tag) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.name = name;
      super();
      this.soak  = tag === 'soak';
    }

    compileToFragments(o) {
      const name = this.name.compileToFragments(o);
      const node = this.name.unwrap();
      if (node instanceof PropertyName) {
        return [this.makeCode('.'), ...name];
      } else {
        return [this.makeCode('['), ...name, this.makeCode(']')];
      }
    }
  };
  Access.initClass();
  return Access;
})());

//### Index

// A `[ ... ]` indexed access into an array or object.
exports.Index = (Index = (function() {
  Index = class Index extends Base {
    static initClass() {
  
      this.prototype.children = ['index'];
    }
    constructor(index) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.index = index;
      super();
    }

    compileToFragments(o) {
      return [].concat(this.makeCode("["), this.index.compileToFragments(o, LEVEL_PAREN), this.makeCode("]"));
    }

    shouldCache() {
      return this.index.shouldCache();
    }
  };
  Index.initClass();
  return Index;
})());

//### Range

// A range literal. Ranges can be used to extract portions (slices) of arrays,
// to specify a range for comprehensions, or as a value, to be expanded into the
// corresponding array of integers at runtime.
exports.Range = (Range = (function() {
  Range = class Range extends Base {
    static initClass() {
  
      this.prototype.children = ['from', 'to'];
    }

    constructor(from, to, tag) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.from = from;
      this.to = to;
      super();

      this.exclusive = tag === 'exclusive';
      this.equals = this.exclusive ? '' : '=';
    }

    // Compiles the range's source variables -- where it starts and where it ends.
    // But only if they need to be cached to avoid double evaluation.
    compileVariables(o) {
      let step;
      o = merge(o, {top: true});
      const shouldCache = del(o, 'shouldCache');
      [this.fromC, this.fromVar] = this.cacheToCodeFragments(this.from.cache(o, LEVEL_LIST, shouldCache));
      [this.toC, this.toVar]     = this.cacheToCodeFragments(this.to.cache(o, LEVEL_LIST, shouldCache));
      if (step = del(o, 'step')) { [this.step, this.stepVar]  = this.cacheToCodeFragments(step.cache(o, LEVEL_LIST, shouldCache)); }
      this.fromNum = this.from.isNumber() ? Number(this.fromVar) : null;
      this.toNum   = this.to.isNumber()   ? Number(this.toVar)   : null;
      return this.stepNum = (step != null ? step.isNumber() : undefined) ? Number(this.stepVar) : null;
    }

    // When compiled normally, the range returns the contents of the *for loop*
    // needed to iterate over the values in the range. Used by comprehensions.
    compileNode(o) {
      if (!this.fromVar) { this.compileVariables(o); }
      if (!o.index) { return this.compileArray(o); }

      // Set up endpoints.
      const known    = (this.fromNum != null) && (this.toNum != null);
      const idx      = del(o, 'index');
      const idxName  = del(o, 'name');
      const namedIndex = idxName && (idxName !== idx);
      let varPart  =
        known && !namedIndex ?
          `var ${idx} = ${this.fromC}`
        :
          `${idx} = ${this.fromC}`;
      if (this.toC !== this.toVar) { varPart += `, ${this.toC}`; }
      if (this.step !== this.stepVar) { varPart += `, ${this.step}`; }
      const [lt, gt] = [`${idx} <${this.equals}`, `${idx} >${this.equals}`];

      // Generate the condition.
      const [from, to] = [this.fromNum, this.toNum];
      // Always check if the `step` isn't zero to avoid the infinite loop.
      const stepCond = this.stepNum ? `${this.stepNum} !== 0` : `${this.stepVar} !== 0`;
      const condPart =
        (() => {
        let lowerBound, upperBound;
        if (known) {
          if (this.step == null) {
            if (from <= to) { return `${lt} ${to}`; } else { return `${gt} ${to}`; }
          } else {
            // from < to
            lowerBound = `${from} <= ${idx} && ${lt} ${to}`;
            // from > to
            upperBound = `${from} >= ${idx} && ${gt} ${to}`;
            if (from <= to) { return `${stepCond} && ${lowerBound}`; } else { return `${stepCond} && ${upperBound}`; }
          }
        } else {
          // from < to
          lowerBound = `${this.fromVar} <= ${idx} && ${lt} ${this.toVar}`;
          // from > to
          upperBound = `${this.fromVar} >= ${idx} && ${gt} ${this.toVar}`;
          return `${stepCond} && (${this.fromVar} <= ${this.toVar} ? ${lowerBound} : ${upperBound})`;
        }
      })();

      const cond = this.stepVar ? `${this.stepVar} > 0` : `${this.fromVar} <= ${this.toVar}`;

      // Generate the step.
      let stepPart = this.stepVar ?
        `${idx} += ${this.stepVar}`
      : known ?
        namedIndex ?
          from <= to ? `++${idx}` : `--${idx}`
        :
          from <= to ? `${idx}++` : `${idx}--`
      :
        namedIndex ?
          `${cond} ? ++${idx} : --${idx}`
        :
          `${cond} ? ${idx}++ : ${idx}--`;

      if (namedIndex) { varPart  = `${idxName} = ${varPart}`; }
      if (namedIndex) { stepPart = `${idxName} = ${stepPart}`; }

      // The final loop body.
      return [this.makeCode(`${varPart}; ${condPart}; ${stepPart}`)];
    }


    // When used as a value, expand the range into the equivalent array.
    compileArray(o) {
      let args, body;
      const known = (this.fromNum != null) && (this.toNum != null);
      if (known && (Math.abs(this.fromNum - this.toNum) <= 20)) {
        const range = __range__(this.fromNum, this.toNum, true);
        if (this.exclusive) { range.pop(); }
        return [this.makeCode(`[${ range.join(', ') }]`)];
      }
      const idt    = this.tab + TAB;
      const i      = o.scope.freeVariable('i', {single: true, reserve: false});
      const result = o.scope.freeVariable('results', {reserve: false});
      const pre    = `\n${idt}var ${result} = [];`;
      if (known) {
        o.index = i;
        body    = fragmentsToText(this.compileNode(o));
      } else {
        const vars    = `${i} = ${this.fromC}` + (this.toC !== this.toVar ? `, ${this.toC}` : '');
        const cond    = `${this.fromVar} <= ${this.toVar}`;
        body    = `var ${vars}; ${cond} ? ${i} <${this.equals} ${this.toVar} : ${i} >${this.equals} ${this.toVar}; ${cond} ? ${i}++ : ${i}--`;
      }
      const post   = `{ ${result}.push(${i}); }\n${idt}return ${result};\n${o.indent}`;
      const hasArgs = node => node != null ? node.contains(isLiteralArguments) : undefined;
      if (hasArgs(this.from) || hasArgs(this.to)) { args   = ', arguments'; }
      return [this.makeCode(`(function() {${pre}\n${idt}for (${body})${post}}).apply(this${args != null ? args : ''})`)];
    }
  };
  Range.initClass();
  return Range;
})());

//### Slice

// An array slice literal. Unlike JavaScript's `Array#slice`, the second parameter
// specifies the index of the end of the slice, just as the first parameter
// is the index of the beginning.
exports.Slice = (Slice = (function() {
  Slice = class Slice extends Base {
    static initClass() {
  
      this.prototype.children = ['range'];
    }

    constructor(range) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.range = range;
      super();
    }

    // We have to be careful when trying to slice through the end of the array,
    // `9e9` is used because not all implementations respect `undefined` or `1/0`.
    // `9e9` should be safe because `9e9` > `2**32`, the max array length.
    compileNode(o) {
      let toStr;
      let compiled;
      let {to, from} = this.range;
      // Handle an expression in the property access, e.g. `a[!b in c..]`.
      if (from != null ? from.shouldCache() : undefined) {
        from = new Value(new Parens(from));
      }
      if (to != null ? to.shouldCache() : undefined) {
        to = new Value(new Parens(to));
      }
      const fromCompiled = (from != null ? from.compileToFragments(o, LEVEL_PAREN) : undefined) || [this.makeCode('0')];
      if (to) {
        compiled     = to.compileToFragments(o, LEVEL_PAREN);
        const compiledText = fragmentsToText(compiled);
        if (!(!this.range.exclusive && (+compiledText === -1))) {
          toStr = ', ' + (() => {
            if (this.range.exclusive) {
            return compiledText;
          } else if (to.isNumber()) {
            return `${+compiledText + 1}`;
          } else {
            compiled = to.compileToFragments(o, LEVEL_ACCESS);
            return `+${fragmentsToText(compiled)} + 1 || 9e9`;
          }
          })();
        }
      }
      return [this.makeCode(`.slice(${ fragmentsToText(fromCompiled) }${ toStr || '' })`)];
    }
  };
  Slice.initClass();
  return Slice;
})());

//### Obj

// An object literal, nothing fancy.
exports.Obj = (Obj = (function() {
  Obj = class Obj extends Base {
    static initClass() {
  
      this.prototype.children = ['properties'];
    }
    constructor(props, generated, lhs) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      if (generated == null) { generated = false; }
      this.generated = generated;
      if (lhs == null) { lhs = false; }
      this.lhs = lhs;
      super();

      this.objects = (this.properties = props || []);
    }

    isAssignable() {
      for (let prop of Array.from(this.properties)) {
        // Check for reserved words.
        const message = isUnassignable(prop.unwrapAll().value);
        if (message) { prop.error(message); }

        if (prop instanceof Assign && (prop.context === 'object')) { prop = prop.value; }
        if (!prop.isAssignable()) { return false; }
      }
      return true;
    }

    shouldCache() {
      return !this.isAssignable();
    }

    // Check if object contains splat.
    hasSplat() {
      for (let prop of Array.from(this.properties)) { if (prop instanceof Splat) { return true; } }
      return false;
    }

    compileNode(o) {
      let prop, value;
      const props = this.properties;
      if (this.generated) {
        for (let node of Array.from(props)) {
          if (node instanceof Value) {
            node.error('cannot have an implicit value in an implicit object');
          }
        }
      }

      // Object spread properties. https://github.com/tc39/proposal-object-rest-spread/blob/master/Spread.md
      if (this.hasSplat() && !this.csx) { return this.compileSpread(o); }

      const idt      = (o.indent += TAB);
      const lastNode = this.lastNode(this.properties);

      // CSX attributes <div id="val" attr={aaa} {props...} />
      if (this.csx) { return this.compileCSXAttributes(o); }

      // If this object is the left-hand side of an assignment, all its children
      // are too.
      if (this.lhs) {
        for (prop of Array.from(props)) {
          if (prop instanceof Assign) {
            ({value} = prop);
            const unwrappedVal = value.unwrapAll();
            if (unwrappedVal instanceof Arr || unwrappedVal instanceof Obj) {
              unwrappedVal.lhs = true;
            } else if (unwrappedVal instanceof Assign) {
              unwrappedVal.nestedLhs = true;
            }
          }
        }
      }

      let isCompact = true;
      for (prop of Array.from(this.properties)) {
        if (prop instanceof Assign && (prop.context === 'object')) {
          isCompact = false;
        }
      }

      let answer = [];
      answer.push(this.makeCode(isCompact ? '' : '\n'));
      for (let i = 0; i < props.length; i++) {
        prop = props[i];
        const join = i === (props.length - 1) ?
          ''
        : isCompact ?
          ', '
        : prop === lastNode ?
          '\n'
        :
          ',\n';
        const indent = isCompact ? '' : idt;

        let key = (() => {
          if (prop instanceof Assign && (prop.context === 'object')) {
          return prop.variable;
        } else if (prop instanceof Assign) {
          if (!this.lhs) { prop.operatorToken.error(`unexpected ${prop.operatorToken.value}`); }
          return prop.variable;
        } else {
          return prop;
        }
        })();
        if (key instanceof Value && key.hasProperties()) {
          if ((prop.context === 'object') || !key.this) { key.error('invalid object key'); }
          key  = key.properties[0].name;
          prop = new Assign(key, prop, 'object');
        }
        if (key === prop) {
          if (prop.shouldCache()) {
            [key, value] = prop.base.cache(o);
            if (key instanceof IdentifierLiteral) { key  = new PropertyName(key.value); }
            prop = new Assign(key, value, 'object');
          } else if (key instanceof Value && key.base instanceof ComputedPropertyName) {
            // `{ [foo()] }` output as `{ [ref = foo()]: ref }`.
            if (prop.base.value.shouldCache()) {
              [key, value] = prop.base.value.cache(o);
              if (key instanceof IdentifierLiteral) { key  = new ComputedPropertyName(key.value); }
              prop = new Assign(key, value, 'object');
            } else {
              // `{ [expression] }` output as `{ [expression]: expression }`.
              prop = new Assign(key, prop.base.value, 'object');
            }
          } else if (!(typeof prop.bareLiteral === 'function' ? prop.bareLiteral(IdentifierLiteral) : undefined)) {
            prop = new Assign(prop, prop, 'object');
          }
        }
        if (indent) { answer.push(this.makeCode(indent)); }
        answer.push(...prop.compileToFragments(o, LEVEL_TOP));
        if (join) { answer.push(this.makeCode(join)); }
      }
      answer.push(this.makeCode(isCompact ? '' : `\n${this.tab}`));
      answer = this.wrapInBraces(answer);
      if (this.front) { return this.wrapInParentheses(answer); } else { return answer; }
    }

    assigns(name) {
      for (let prop of Array.from(this.properties)) { if (prop.assigns(name)) { return true; } }
      return false;
    }

    eachName(iterator) {
      return (() => {
        const result = [];
        for (let prop of Array.from(this.properties)) {
          if (prop instanceof Assign && (prop.context === 'object')) { prop = prop.value; }
          prop = prop.unwrapAll();
          if (prop.eachName != null) { result.push(prop.eachName(iterator)); } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }

    // Object spread properties. https://github.com/tc39/proposal-object-rest-spread/blob/master/Spread.md
    // `obj2 = {a: 1, obj..., c: 3, d: 4}` → `obj2 = _extends({}, {a: 1}, obj, {c: 3, d: 4})`
    compileSpread(o) {
      const props = this.properties;
      // Store object spreads.
      let splatSlice = [];
      let propSlices = [];
      const slices = [];
      const addSlice = function() {
        if (propSlices.length) { slices.push(new Obj(propSlices)); }
        if (splatSlice.length) { slices.push(...splatSlice); }
        splatSlice = [];
        return propSlices = [];
      };
      for (let prop of Array.from(props)) {
        if (prop instanceof Splat) {
          splatSlice.push(new Value(prop.name));
          addSlice();
        } else {
          propSlices.push(prop);
        }
      }
      addSlice();
      if (!(slices[0] instanceof Obj)) { slices.unshift(new Obj); }
      const _extends = new Value(new Literal(utility('_extends', o)));
      return (new Call(_extends, slices)).compileToFragments(o);
    }

    compileCSXAttributes(o) {
      const props = this.properties;
      const answer = [];
      for (let i = 0; i < props.length; i++) {
        let prop = props[i];
        prop.csx = true;
        const join = i === (props.length - 1) ? '' : ' ';
        if (prop instanceof Splat) { prop = new Literal(`{${prop.compile(o)}}`); }
        answer.push(...prop.compileToFragments(o, LEVEL_TOP));
        answer.push(this.makeCode(join));
      }
      if (this.front) { return this.wrapInParentheses(answer); } else { return answer; }
    }
  };
  Obj.initClass();
  return Obj;
})());

//### Arr

// An array literal.
exports.Arr = (Arr = (function() {
  Arr = class Arr extends Base {
    static initClass() {
  
      this.prototype.children = ['objects'];
    }
    constructor(objs, lhs) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      if (lhs == null) { lhs = false; }
      this.lhs = lhs;
      super();
      this.objects = objs || [];
    }

    hasElision() {
      for (let obj of Array.from(this.objects)) { if (obj instanceof Elision) { return true; } }
      return false;
    }

    isAssignable() {
      if (!this.objects.length) { return false; }

      for (let i = 0; i < this.objects.length; i++) {
        const obj = this.objects[i];
        if (obj instanceof Splat && ((i + 1) !== this.objects.length)) { return false; }
        if (!obj.isAssignable() || (!!obj.isAtomic && !obj.isAtomic())) { return false; }
      }
      return true;
    }

    shouldCache() {
      return !this.isAssignable();
    }

    compileNode(o) {
      let fragment, needle;
      let obj;
      if (!this.objects.length) { return [this.makeCode('[]')]; }
      o.indent += TAB;
      const fragmentIsElision = fragment => fragmentsToText(fragment).trim() === ',';
      // Detect if `Elisions` at the beginning of the array are processed (e.g. [, , , a]).
      let passedElision = false;

      const answer = [];
      for (let objIndex = 0; objIndex < this.objects.length; objIndex++) {
        obj = this.objects[objIndex];
        const unwrappedObj = obj.unwrapAll();
        // Let `compileCommentFragments` know to intersperse block comments
        // into the fragments created when compiling this array.
        if (unwrappedObj.comments &&
           (unwrappedObj.comments.filter(comment => !comment.here).length === 0)) {
          unwrappedObj.includeCommentFragments = YES;
        }
        // If this array is the left-hand side of an assignment, all its children
        // are too.
        if (this.lhs) {
          if (unwrappedObj instanceof Arr || unwrappedObj instanceof Obj) { unwrappedObj.lhs = true; }
        }
      }

      const compiledObjs = ((() => {
        const result = [];
        for (obj of Array.from(this.objects)) {           result.push(obj.compileToFragments(o, LEVEL_LIST));
        }
        return result;
      })());
      const olen = compiledObjs.length;
      // If `compiledObjs` includes newlines, we will output this as a multiline
      // array (i.e. with a newline and indentation after the `[`). If an element
      // contains line comments, that should also trigger multiline output since
      // by definition line comments will introduce newlines into our output.
      // The exception is if only the first element has line comments; in that
      // case, output as the compact form if we otherwise would have, so that the
      // first element’s line comments get output before or after the array.
      let includesLineCommentsOnNonFirstElement = false;
      for (let index = 0; index < compiledObjs.length; index++) {
        const fragments = compiledObjs[index];
        for (fragment of Array.from(fragments)) {
          if (fragment.isHereComment) {
            fragment.code = fragment.code.trim();
          } else if ((index !== 0) && (includesLineCommentsOnNonFirstElement === false) && hasLineComments(fragment)) {
            includesLineCommentsOnNonFirstElement = true;
          }
        }
        // Add ', ' if all `Elisions` from the beginning of the array are processed (e.g. [, , , a]) and
        // element isn't `Elision` or last element is `Elision` (e.g. [a,,b,,])
        if ((index !== 0) && passedElision && (!fragmentIsElision(fragments) || (index === (olen - 1)))) {
          answer.push(this.makeCode(', '));
        }
        passedElision = passedElision || !fragmentIsElision(fragments);
        answer.push(...fragments);
      }
      if (includesLineCommentsOnNonFirstElement || (needle = '\n', Array.from(fragmentsToText(answer)).includes(needle))) {
        for (let fragmentIndex = 0; fragmentIndex < answer.length; fragmentIndex++) {
          fragment = answer[fragmentIndex];
          if (fragment.isHereComment) {
            fragment.code = `${multident(fragment.code, o.indent, false)}\n${o.indent}`;
          } else if ((fragment.code === ', ') && !(fragment != null ? fragment.isElision : undefined)) {
            fragment.code = `,\n${o.indent}`;
          }
        }
        answer.unshift(this.makeCode(`[\n${o.indent}`));
        answer.push(this.makeCode(`\n${this.tab}]`));
      } else {
        for (fragment of Array.from(answer)) {
          if (fragment.isHereComment) {
            fragment.code = `${fragment.code} `;
          }
        }
        answer.unshift(this.makeCode('['));
        answer.push(this.makeCode(']'));
      }
      return answer;
    }

    assigns(name) {
      for (let obj of Array.from(this.objects)) { if (obj.assigns(name)) { return true; } }
      return false;
    }

    eachName(iterator) {
      return (() => {
        const result = [];
        for (let obj of Array.from(this.objects)) {
          obj = obj.unwrapAll();
          result.push(obj.eachName(iterator));
        }
        return result;
      })();
    }
  };
  Arr.initClass();
  return Arr;
})());

//### Class

// The CoffeeScript class definition.
// Initialize a **Class** with its name, an optional superclass, and a body.

exports.Class = (Class = (function() {
  Class = class Class extends Base {
    static initClass() {
      this.prototype.children = ['variable', 'parent', 'body'];
    }

    constructor(variable, parent, body) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.variable = variable;
      this.parent = parent;
      if (body == null) { body = new Block; }
      this.body = body;
      super();
    }

    compileNode(o) {
      let parentName;
      this.name          = this.determineName();
      const executableBody = this.walkBody();

      // Special handling to allow `class expr.A extends A` declarations
      if (this.parent instanceof Value && !this.parent.hasProperties()) { parentName    = this.parent.base.value; }
      this.hasNameClash = (this.name != null) && (this.name === parentName);

      let node = this;

      if (executableBody || this.hasNameClash) {
        node = new ExecutableClassBody(node, executableBody);
      } else if ((this.name == null) && (o.level === LEVEL_TOP)) {
        // Anonymous classes are only valid in expressions
        node = new Parens(node);
      }

      if (this.boundMethods.length && this.parent) {
        if (this.variable == null) { this.variable = new IdentifierLiteral(o.scope.freeVariable('_class')); }
        if (this.variableRef == null) { [this.variable, this.variableRef] = this.variable.cache(o); }
      }

      if (this.variable) {
        node = new Assign(this.variable, node, null, { moduleDeclaration: this.moduleDeclaration });
      }

      this.compileNode = this.compileClassDeclaration;
      try {
        return node.compileToFragments(o);
      } finally {
        delete this.compileNode;
      }
    }

    compileClassDeclaration(o) {
      if (this.externalCtor || this.boundMethods.length) { if (this.ctor == null) { this.ctor = this.makeDefaultConstructor(); } }
      if (this.ctor != null) {
        this.ctor.noReturn = true;
      }

      if (this.boundMethods.length) { this.proxyBoundMethods(); }

      o.indent += TAB;

      const result = [];
      result.push(this.makeCode("class "));
      if (this.name) { result.push(this.makeCode(this.name)); }
      if ((this.variable != null ? this.variable.comments : undefined) != null) { this.compileCommentFragments(o, this.variable, result); }
      if (this.name) { result.push(this.makeCode(' ')); }
      if (this.parent) { result.push(this.makeCode('extends '), ...this.parent.compileToFragments(o), this.makeCode(' ')); }

      result.push(this.makeCode('{'));
      if (!this.body.isEmpty()) {
        this.body.spaced = true;
        result.push(this.makeCode('\n'));
        result.push(...this.body.compileToFragments(o, LEVEL_TOP));
        result.push(this.makeCode(`\n${this.tab}`));
      }
      result.push(this.makeCode('}'));

      return result;
    }

    // Figure out the appropriate name for this class
    determineName() {
      if (!this.variable) { return null; }
      const tail = this.variable.properties[this.variable.properties.length - 1];
      const node = tail ?
        tail instanceof Access && tail.name
      :
        this.variable.base;
      if (!(node instanceof IdentifierLiteral) && !(node instanceof PropertyName)) {
        return null;
      }
      const name = node.value;
      if (!tail) {
        const message = isUnassignable(name);
        if (message) { this.variable.error(message); }
      }
      if (Array.from(JS_FORBIDDEN).includes(name)) { return `_${name}`; } else { return name; }
    }

    walkBody() {
      let expression;
      this.ctor          = null;
      this.boundMethods  = [];
      const executableBody = null;

      const initializer     = [];
      const { expressions } = this.body;

      let i = 0;
      for (expression of Array.from(expressions.slice())) {
        var initializerExpression;
        if (expression instanceof Value && expression.isObject(true)) {
          var assign;
          var { properties } = expression.base;
          var exprs     = [];
          var end       = 0;
          var start     = 0;
          const pushSlice = function() { if (end > start) { return exprs.push(new Value(new Obj(properties.slice(start, end), true))); } };

          while ((assign = properties[end])) {
            if (initializerExpression = this.addInitializerExpression(assign)) {
              pushSlice();
              exprs.push(initializerExpression);
              initializer.push(initializerExpression);
              start = end + 1;
            }
            end++;
          }
          pushSlice();

          expressions.splice(i, i - i + 1, ...[].concat(exprs));
          i += exprs.length;
        } else {
          if (initializerExpression = this.addInitializerExpression(expression)) {
            initializer.push(initializerExpression);
            expressions[i] = initializerExpression;
          }
          i += 1;
        }
      }

      for (let method of Array.from(initializer)) {
        if (method instanceof Code) {
          if (method.ctor) {
            if (this.ctor) { method.error('Cannot define more than one constructor in a class'); }
            this.ctor = method;
          } else if (method.isStatic && method.bound) {
            method.context = this.name;
          } else if (method.bound) {
            this.boundMethods.push(method);
          }
        }
      }

      if (initializer.length !== expressions.length) {
        this.body.expressions = ((() => {
          const result = [];
          for (expression of Array.from(initializer)) {             result.push(expression.hoist());
          }
          return result;
        })());
        return new Block(expressions);
      }
    }

    // Add an expression to the class initializer
    //
    // This is the key method for determining whether an expression in a class
    // body should appear in the initializer or the executable body. If the given
    // `node` is valid in a class body the method will return a (new, modified,
    // or identical) node for inclusion in the class initializer, otherwise
    // nothing will be returned and the node will appear in the executable body.
    //
    // At time of writing, only methods (instance and static) are valid in ES
    // class initializers. As new ES class features (such as class fields) reach
    // Stage 4, this method will need to be updated to support them. We
    // additionally allow `PassthroughLiteral`s (backticked expressions) in the
    // initializer as an escape hatch for ES features that are not implemented
    // (e.g. getters and setters defined via the `get` and `set` keywords as
    // opposed to the `Object.defineProperty` method).
    addInitializerExpression(node) {
      if (node.unwrapAll() instanceof PassthroughLiteral) {
        return node;
      } else if (this.validInitializerMethod(node)) {
        return this.addInitializerMethod(node);
      } else {
        return null;
      }
    }

    // Checks if the given node is a valid ES class initializer method.
    validInitializerMethod(node) {
      if (!(node instanceof Assign) || !(node.value instanceof Code)) { return false; }
      if ((node.context === 'object') && !node.variable.hasProperties()) { return true; }
      return node.variable.looksStatic(this.name) && (this.name || !node.value.bound);
    }

    // Returns a configured class initializer method
    addInitializerMethod(assign) {
      const { variable, value: method } = assign;
      method.isMethod = true;
      method.isStatic = variable.looksStatic(this.name);

      if (method.isStatic) {
        method.name = variable.properties[0];
      } else {
        const methodName  = variable.base;
        method.name = new (methodName.shouldCache() ? Index : Access)(methodName);
        method.name.updateLocationDataIfMissing(methodName.locationData);
        if (methodName.value === 'constructor') { method.ctor = (this.parent ? 'derived' : 'base'); }
        if (method.bound && method.ctor) { method.error('Cannot define a constructor as a bound (fat arrow) function'); }
      }

      return method;
    }

    makeDefaultConstructor() {
      const ctor = this.addInitializerMethod(new Assign((new Value(new PropertyName('constructor'))), new Code));
      this.body.unshift(ctor);

      if (this.parent) {
        ctor.body.push(new SuperCall(new Super, [new Splat(new IdentifierLiteral('arguments'))]));
      }

      if (this.externalCtor) {
        const applyCtor = new Value(this.externalCtor, [ new Access(new PropertyName('apply')) ]);
        const applyArgs = [ new ThisLiteral, new IdentifierLiteral('arguments') ];
        ctor.body.push(new Call(applyCtor, applyArgs));
        ctor.body.makeReturn();
      }

      return ctor;
    }

    proxyBoundMethods() {
      this.ctor.thisAssignments = (() => {
        const result = [];
        for (let method of Array.from(this.boundMethods)) {
          if (this.parent) { method.classVariable = this.variableRef; }

          const name = new Value(new ThisLiteral, [ method.name ]);
          result.push(new Assign(name, new Call(new Value(name, [new Access(new PropertyName('bind'))]), [new ThisLiteral])));
        }
        return result;
      })();

      return null;
    }
  };
  Class.initClass();
  return Class;
})());

exports.ExecutableClassBody = (ExecutableClassBody = (function() {
  ExecutableClassBody = class ExecutableClassBody extends Base {
    static initClass() {
      this.prototype.children = [ 'class', 'body' ];
  
      this.prototype.defaultClassVariableName = '_Class';
    }

    constructor(class1, body) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.class = class1;
      if (body == null) { body = new Block; }
      this.body = body;
      super();
    }

    compileNode(o) {
      let argumentsNode, jumpNode;
      if (jumpNode = this.body.jumps()) {
        jumpNode.error('Class bodies cannot contain pure statements');
      }
      if (argumentsNode = this.body.contains(isLiteralArguments)) {
        argumentsNode.error("Class bodies shouldn't reference arguments");
      }

      const params  = [];
      const args    = [new ThisLiteral];
      const wrapper = new Code(params, this.body);
      const klass   = new Parens(new Call((new Value(wrapper, [new Access(new PropertyName('call'))])), args));

      this.body.spaced = true;

      o.classScope = wrapper.makeScope(o.scope);

      this.name      = this.class.name != null ? this.class.name : o.classScope.freeVariable(this.defaultClassVariableName);
      const ident      = new IdentifierLiteral(this.name);
      const directives = this.walkBody();
      this.setContext();

      if (this.class.hasNameClash) {
        const parent = new IdentifierLiteral(o.classScope.freeVariable('superClass'));
        wrapper.params.push(new Param(parent));
        args.push(this.class.parent);
        this.class.parent = parent;
      }

      if (this.externalCtor) {
        const externalCtor = new IdentifierLiteral(o.classScope.freeVariable('ctor', {reserve: false}));
        this.class.externalCtor = externalCtor;
        this.externalCtor.variable.base = externalCtor;
      }

      if (this.name !== this.class.name) {
        this.body.expressions.unshift(new Assign((new IdentifierLiteral(this.name)), this.class));
      } else {
        this.body.expressions.unshift(this.class);
      }
      this.body.expressions.unshift(...directives);
      this.body.push(ident);

      return klass.compileToFragments(o);
    }

    // Traverse the class's children and:
    // - Hoist valid ES properties into `@properties`
    // - Hoist static assignments into `@properties`
    // - Convert invalid ES properties into class or prototype assignments
    walkBody() {
      let expr;
      const directives  = [];

      let index = 0;
      while ((expr = this.body.expressions[index])) {
        if (!(expr instanceof Value) || !expr.isString()) { break; }
        if (expr.hoisted) {
          index++;
        } else {
          directives.push(...this.body.expressions.splice(index, 1));
        }
      }

      this.traverseChildren(false, child => {
        if (child instanceof Class || child instanceof HoistTarget) { return false; }

        let cont = true;
        if (child instanceof Block) {
          for (let i = 0; i < child.expressions.length; i++) {
            const node = child.expressions[i];
            if (node instanceof Value && node.isObject(true)) {
              cont = false;
              child.expressions[i] = this.addProperties(node.base.properties);
            } else if (node instanceof Assign && node.variable.looksStatic(this.name)) {
              node.value.isStatic = true;
            }
          }
          child.expressions = flatten(child.expressions);
        }
        return cont;
      });

      return directives;
    }

    setContext() {
      return this.body.traverseChildren(false, node => {
        if (node instanceof ThisLiteral) {
          return node.value   = this.name;
        } else if (node instanceof Code && node.bound && node.isStatic) {
          return node.context = this.name;
        }
      });
    }

    // Make class/prototype assignments for invalid ES properties
    addProperties(assigns) {
      const result = (() => {
        const result1 = [];
        for (let assign of Array.from(assigns)) {
          let {
            variable
          } = assign;
          const base     = variable != null ? variable.base : undefined;
          const {
            value
          } = assign;
          delete assign.context;

          if (base.value === 'constructor') {
            if (value instanceof Code) {
              base.error('constructors must be defined at the top level of a class body');
            }

            // The class scope is not available yet, so return the assignment to update later
            assign = (this.externalCtor = new Assign(new Value, value));
          } else if (!assign.variable.this) {
            const name      = new (base.shouldCache() ? Index : Access)(base);
            const prototype = new Access(new PropertyName('prototype'));
            variable  = new Value(new ThisLiteral(), [ prototype, name ]);

            assign.variable = variable;
          } else if (assign.value instanceof Code) {
            assign.value.isStatic = true;
          }

          result1.push(assign);
        }
        return result1;
      })();
      return compact(result);
    }
  };
  ExecutableClassBody.initClass();
  return ExecutableClassBody;
})());

//### Import and Export

exports.ModuleDeclaration = (ModuleDeclaration = (function() {
  ModuleDeclaration = class ModuleDeclaration extends Base {
    static initClass() {
  
      this.prototype.children = ['clause', 'source'];
  
      this.prototype.isStatement = YES;
      this.prototype.jumps =       THIS;
      this.prototype.makeReturn =  THIS;
    }
    constructor(clause, source) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.clause = clause;
      this.source = source;
      super();
      this.checkSource();
    }

    checkSource() {
      if ((this.source != null) && this.source instanceof StringWithInterpolations) {
        return this.source.error('the name of the module to be imported from must be an uninterpolated string');
      }
    }

    checkScope(o, moduleDeclarationType) {
      if (o.indent.length !== 0) {
        return this.error(`${moduleDeclarationType} statements must be at top-level scope`);
      }
    }
  };
  ModuleDeclaration.initClass();
  return ModuleDeclaration;
})());

exports.ImportDeclaration = (ImportDeclaration = class ImportDeclaration extends ModuleDeclaration {
  compileNode(o) {
    this.checkScope(o, 'import');
    o.importedSymbols = [];

    const code = [];
    code.push(this.makeCode(`${this.tab}import `));
    if (this.clause != null) { code.push(...this.clause.compileNode(o)); }

    if ((this.source != null ? this.source.value : undefined) != null) {
      if (this.clause !== null) { code.push(this.makeCode(' from ')); }
      code.push(this.makeCode(this.source.value));
    }

    code.push(this.makeCode(';'));
    return code;
  }
});

exports.ImportClause = (ImportClause = (function() {
  ImportClause = class ImportClause extends Base {
    static initClass() {
  
      this.prototype.children = ['defaultBinding', 'namedImports'];
    }
    constructor(defaultBinding, namedImports) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.defaultBinding = defaultBinding;
      this.namedImports = namedImports;
      super();
    }

    compileNode(o) {
      const code = [];

      if (this.defaultBinding != null) {
        code.push(...this.defaultBinding.compileNode(o));
        if (this.namedImports != null) { code.push(this.makeCode(', ')); }
      }

      if (this.namedImports != null) {
        code.push(...this.namedImports.compileNode(o));
      }

      return code;
    }
  };
  ImportClause.initClass();
  return ImportClause;
})());

exports.ExportDeclaration = (ExportDeclaration = class ExportDeclaration extends ModuleDeclaration {
  compileNode(o) {
    this.checkScope(o, 'export');

    let code = [];
    code.push(this.makeCode(`${this.tab}export `));
    if (this instanceof ExportDefaultDeclaration) { code.push(this.makeCode('default ')); }

    if (!(this instanceof ExportDefaultDeclaration) &&
       (this.clause instanceof Assign || this.clause instanceof Class)) {
      // Prevent exporting an anonymous class; all exported members must be named
      if (this.clause instanceof Class && !this.clause.variable) {
        this.clause.error('anonymous classes cannot be exported');
      }

      code.push(this.makeCode('var '));
      this.clause.moduleDeclaration = 'export';
    }

    if ((this.clause.body != null) && this.clause.body instanceof Block) {
      code = code.concat(this.clause.compileToFragments(o, LEVEL_TOP));
    } else {
      code = code.concat(this.clause.compileNode(o));
    }

    if ((this.source != null ? this.source.value : undefined) != null) { code.push(this.makeCode(` from ${this.source.value}`)); }
    code.push(this.makeCode(';'));
    return code;
  }
});

exports.ExportNamedDeclaration = (ExportNamedDeclaration = class ExportNamedDeclaration extends ExportDeclaration {});

exports.ExportDefaultDeclaration = (ExportDefaultDeclaration = class ExportDefaultDeclaration extends ExportDeclaration {});

exports.ExportAllDeclaration = (ExportAllDeclaration = class ExportAllDeclaration extends ExportDeclaration {});

exports.ModuleSpecifierList = (ModuleSpecifierList = (function() {
  ModuleSpecifierList = class ModuleSpecifierList extends Base {
    static initClass() {
  
      this.prototype.children = ['specifiers'];
    }
    constructor(specifiers) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.specifiers = specifiers;
      super();
    }

    compileNode(o) {
      const code = [];
      o.indent += TAB;
      const compiledList = (Array.from(this.specifiers).map((specifier) => specifier.compileToFragments(o, LEVEL_LIST)));

      if (this.specifiers.length !== 0) {
        code.push(this.makeCode(`{\n${o.indent}`));
        for (let index = 0; index < compiledList.length; index++) {
          const fragments = compiledList[index];
          if (index) { code.push(this.makeCode(`,\n${o.indent}`)); }
          code.push(...fragments);
        }
        code.push(this.makeCode("\n}"));
      } else {
        code.push(this.makeCode('{}'));
      }
      return code;
    }
  };
  ModuleSpecifierList.initClass();
  return ModuleSpecifierList;
})());

exports.ImportSpecifierList = (ImportSpecifierList = class ImportSpecifierList extends ModuleSpecifierList {});

exports.ExportSpecifierList = (ExportSpecifierList = class ExportSpecifierList extends ModuleSpecifierList {});

exports.ModuleSpecifier = (ModuleSpecifier = (function() {
  ModuleSpecifier = class ModuleSpecifier extends Base {
    static initClass() {
  
      this.prototype.children = ['original', 'alias'];
    }
    constructor(original, alias, moduleDeclarationType) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.original = original;
      this.alias = alias;
      this.moduleDeclarationType = moduleDeclarationType;
      super();

      if (this.original.comments || (this.alias != null ? this.alias.comments : undefined)) {
        this.comments = [];
        if (this.original.comments) { this.comments.push(...this.original.comments); }
        if (this.alias != null ? this.alias.comments : undefined) { this.comments.push(...this.alias.comments); }
      }

      // The name of the variable entering the local scope
      this.identifier = (this.alias != null) ? this.alias.value : this.original.value;
    }

    compileNode(o) {
      o.scope.find(this.identifier, this.moduleDeclarationType);
      const code = [];
      code.push(this.makeCode(this.original.value));
      if (this.alias != null) { code.push(this.makeCode(` as ${this.alias.value}`)); }
      return code;
    }
  };
  ModuleSpecifier.initClass();
  return ModuleSpecifier;
})());

exports.ImportSpecifier = (ImportSpecifier = class ImportSpecifier extends ModuleSpecifier {
  constructor(imported, local) {
    super(imported, local, 'import');
  }

  compileNode(o) {
    // Per the spec, symbols can’t be imported multiple times
    // (e.g. `import { foo, foo } from 'lib'` is invalid)
    if (Array.from(o.importedSymbols).includes(this.identifier) || o.scope.check(this.identifier)) {
      this.error(`'${this.identifier}' has already been declared`);
    } else {
      o.importedSymbols.push(this.identifier);
    }
    return super.compileNode(o);
  }
});

exports.ImportDefaultSpecifier = (ImportDefaultSpecifier = class ImportDefaultSpecifier extends ImportSpecifier {});

exports.ImportNamespaceSpecifier = (ImportNamespaceSpecifier = class ImportNamespaceSpecifier extends ImportSpecifier {});

exports.ExportSpecifier = (ExportSpecifier = class ExportSpecifier extends ModuleSpecifier {
  constructor(local, exported) {
    super(local, exported, 'export');
  }
});

//### Assign

// The **Assign** is used to assign a local variable to value, or to set the
// property of an object -- including within object literals.
exports.Assign = (Assign = (function() {
  Assign = class Assign extends Base {
    static initClass() {
  
      this.prototype.children = ['variable', 'value'];
  
      this.prototype.isAssignable = YES;
    }
    constructor(variable, value, context, options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.variable = variable;
      this.value = value;
      this.context = context;
      if (options == null) { options = {}; }
      super();
      ({param: this.param, subpattern: this.subpattern, operatorToken: this.operatorToken, moduleDeclaration: this.moduleDeclaration} = options);
    }

    isStatement(o) {
      return ((o != null ? o.level : undefined) === LEVEL_TOP) && (this.context != null) && (this.moduleDeclaration || Array.from(this.context).includes("?"));
    }

    checkAssignability(o, varBase) {
      if (Object.prototype.hasOwnProperty.call(o.scope.positions, varBase.value) &&
         (o.scope.variables[o.scope.positions[varBase.value]].type === 'import')) {
        return varBase.error(`'${varBase.value}' is read-only`);
      }
    }

    assigns(name) {
      return this[this.context === 'object' ? 'value' : 'variable'].assigns(name);
    }

    unfoldSoak(o) {
      return unfoldSoak(o, this, 'variable');
    }

    // Compile an assignment, delegating to `compileDestructuring` or
    // `compileSplice` if appropriate. Keep track of the name of the base object
    // we've been assigned to, for correct internal references. If the variable
    // has not been seen yet within the current scope, declare it.
    compileNode(o) {
      const isValue = this.variable instanceof Value;
      if (isValue) {
        // When compiling `@variable`, remember if it is part of a function parameter.
        this.variable.param = this.param;

        // If `@variable` is an array or an object, we’re destructuring;
        // if it’s also `isAssignable()`, the destructuring syntax is supported
        // in ES and we can output it as is; otherwise we `@compileDestructuring`
        // and convert this ES-unsupported destructuring into acceptable output.
        if (this.variable.isArray() || this.variable.isObject()) {
          // This is the left-hand side of an assignment; let `Arr` and `Obj`
          // know that, so that those nodes know that they’re assignable as
          // destructured variables.
          let objDestructAnswer;
          this.variable.base.lhs = true;
          // Check if @variable contains Obj with splats.
          const hasSplat = this.variable.contains(node => node instanceof Obj && node.hasSplat());
          if (!this.variable.isAssignable() || (this.variable.isArray() && hasSplat)) { return this.compileDestructuring(o); }
          // Object destructuring. Can be removed once ES proposal hits Stage 4.
          if (this.variable.isObject() && hasSplat) { objDestructAnswer = this.compileObjectDestruct(o); }
          if (objDestructAnswer) { return objDestructAnswer; }
        }

        if (this.variable.isSplice()) { return this.compileSplice(o); }
        if (['||=', '&&=', '?='].includes(this.context)) { return this.compileConditional(o); }
        if (['**=', '//=', '%%='].includes(this.context)) { return this.compileSpecialMath(o); }
      }

      if (!this.context) {
        const varBase = this.variable.unwrapAll();
        if (!varBase.isAssignable()) {
          this.variable.error(`'${this.variable.compile(o)}' can't be assigned`);
        }

        varBase.eachName(name => {
          if (typeof name.hasProperties === 'function' ? name.hasProperties() : undefined) { return; }

          const message = isUnassignable(name.value);
          if (message) { name.error(message); }

          // `moduleDeclaration` can be `'import'` or `'export'`.
          this.checkAssignability(o, name);
          if (this.moduleDeclaration) {
            return o.scope.add(name.value, this.moduleDeclaration);
          } else if (this.param) {
            return o.scope.add(name.value,
              this.param === 'alwaysDeclare' ?
                'var'
              :
                'param'
            );
          } else {
            o.scope.find(name.value);
            // If this assignment identifier has one or more herecomments
            // attached, output them as part of the declarations line (unless
            // other herecomments are already staged there) for compatibility
            // with Flow typing. Don’t do this if this assignment is for a
            // class, e.g. `ClassName = class ClassName {`, as Flow requires
            // the comment to be between the class name and the `{`.
            if (name.comments && !o.scope.comments[name.value] &&
               !(this.value instanceof Class) &&
               name.comments.every(comment => comment.here && !comment.multiline)) {
              const commentsNode = new IdentifierLiteral(name.value);
              commentsNode.comments = name.comments;
              const commentFragments = [];
              this.compileCommentFragments(o, commentsNode, commentFragments);
              return o.scope.comments[name.value] = commentFragments;
            }
          }
        });
      }

      if (this.value instanceof Code) {
        if (this.value.isStatic) {
          this.value.name = this.variable.properties[0];
        } else if ((this.variable.properties != null ? this.variable.properties.length : undefined) >= 2) {
          const adjustedLength = Math.max(this.variable.properties.length, 2), properties = this.variable.properties.slice(0, adjustedLength - 2), prototype = this.variable.properties[adjustedLength - 2], name = this.variable.properties[adjustedLength - 1];
          if ((prototype.name != null ? prototype.name.value : undefined) === 'prototype') { this.value.name = name; }
        }
      }

      if (this.csx) { this.value.base.csxAttribute = true; }
      const val = this.value.compileToFragments(o, LEVEL_LIST);
      const compiledName = this.variable.compileToFragments(o, LEVEL_LIST);

      if (this.context === 'object') {
        if (this.variable.shouldCache()) {
          compiledName.unshift(this.makeCode('['));
          compiledName.push(this.makeCode(']'));
        }
        return compiledName.concat(this.makeCode(this.csx ? '=' : ': '), val);
      }

      const answer = compiledName.concat(this.makeCode(` ${ this.context || '=' } `), val);
      // Per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Assignment_without_declaration,
      // if we’re destructuring without declaring, the destructuring assignment must be wrapped in parentheses.
      // The assignment is wrapped in parentheses if 'o.level' has lower precedence than LEVEL_LIST (3)
      // (i.e. LEVEL_COND (4), LEVEL_OP (5) or LEVEL_ACCESS (6)), or if we're destructuring object, e.g. {a,b} = obj.
      if ((o.level > LEVEL_LIST) || (isValue && this.variable.base instanceof Obj && !this.nestedLhs && !(this.param === true))) {
        return this.wrapInParentheses(answer);
      } else {
        return answer;
      }
    }

    // Check object destructuring variable for rest elements;
    // can be removed once ES proposal hits Stage 4.
    compileObjectDestruct(o) {
      // Returns a safe (cached) reference to the key for a given property
      let valueRef;
      const getPropKey = function(prop) {
        if (prop instanceof Assign) {
          let key;
          [prop.variable, key] = prop.variable.cache(o);
          return key;
        } else {
          return prop;
        }
      };

      // Returns the name of a given property for use with excludeProps
      // Property names are quoted (e.g. `a: b` -> 'a'), and everything else uses the key reference
      // (e.g. `'a': b -> 'a'`, `"#{a}": b` -> <cached>`)
      const getPropName = function(prop) {
        const key = getPropKey(prop);
        const cached = prop instanceof Assign && (prop.variable !== key);
        if (cached || !key.isAssignable()) {
          return key;
        } else {
          return new Literal(`'${key.compileWithoutComments(o)}'`);
        }
      };

      // Recursive function for searching and storing rest elements in objects.
      // e.g. `{[properties...]} = source`.
      var traverseRest = (properties, source) => {
        const restElements = [];
        let restIndex = undefined;
        if (source.properties == null) { source = new Value(source); }

        for (let index = 0; index < properties.length; index++) {
          var nestedProperties, nestedSource;
          var prop = properties[index];
          let nestedSourceDefault = (nestedSource = (nestedProperties = null));
          if (prop instanceof Assign) {
            // prop is `k: expr`, we need to check `expr` for nested splats
            if (typeof prop.value.isObject === 'function' ? prop.value.isObject() : undefined) {
              // prop is `k = {...} `
              if (prop.context !== 'object') { continue; }
              // prop is `k: {...}`
              nestedProperties = prop.value.base.properties;
            } else if (prop.value instanceof Assign && prop.value.variable.isObject()) {
              // prop is `k: {...} = default`
              nestedProperties = prop.value.variable.base.properties;
              [prop.value.value, nestedSourceDefault] = prop.value.value.cache(o);
            }
            if (nestedProperties) {
              nestedSource = new Value(source.base, source.properties.concat([new Access(getPropKey(prop))]));
              if (nestedSourceDefault) { nestedSource = new Value(new Op('?', nestedSource, nestedSourceDefault)); }
              restElements.push(...traverseRest(nestedProperties, nestedSource));
            }
          } else if (prop instanceof Splat) {
            if (restIndex != null) { prop.error("multiple rest elements are disallowed in object destructuring"); }
            restIndex = index;
            restElements.push({
              name: prop.name.unwrapAll(),
              source,
              excludeProps: new Arr((Array.from(properties).filter((p) => p !== prop).map((p) => getPropName(p))))
            });
          }
        }

        if (restIndex != null) {
          // Remove rest element from the properties after iteration
          properties.splice(restIndex, 1);
        }

        return restElements;
      };

      // Cache the value for reuse with rest elements.
      const valueRefTemp =
        this.value.shouldCache() ?
          new IdentifierLiteral(o.scope.freeVariable('ref', {reserve: false}))
        :
          this.value.base;

      // Find all rest elements.
      const restElements = traverseRest(this.variable.base.properties, valueRefTemp);
      if (!restElements || !(restElements.length > 0)) { return false; }

      [this.value, valueRef] = this.value.cache(o);
      const result = new Block([this]);

      for (let restElement of Array.from(restElements)) {
        const value = new Call(new Value(new Literal(utility('objectWithoutKeys', o))), [restElement.source, restElement.excludeProps]);
        result.push(new Assign(new Value(restElement.name), value, null, {param: this.param ? 'alwaysDeclare' : null}));
      }

      const fragments = result.compileToFragments(o);
      if (o.level === LEVEL_TOP) {
        // Remove leading tab and trailing semicolon
        fragments.shift();
        fragments.pop();
      }

      return fragments;
    }

    // Brief implementation of recursive pattern matching, when assigning array or
    // object literals to a value. Peeks at their properties to assign inner names.
    compileDestructuring(o) {
      let i, obj;
      const top       = o.level === LEVEL_TOP;
      const {value}   = this;
      const {objects} = this.variable.base;
      const olen      = objects.length;

      // Special-case for `{} = a` and `[] = a` (empty patterns).
      // Compile to simply `a`.
      if (olen === 0) {
        const code = value.compileToFragments(o);
        if (o.level >= LEVEL_OP) { return this.wrapInParentheses(code); } else { return code; }
      }
      [obj] = objects;

      // Disallow `[...] = a` for some reason. (Could be equivalent to `[] = a`?)
      if ((olen === 1) && obj instanceof Expansion) {
        obj.error('Destructuring assignment has no target');
      }

      // Count all `Splats`: [a, b, c..., d, e]
      const splats = ((() => {
        let j;
        const result = [];
        for (j = 0, i = j; j < objects.length; j++, i = j) {
          obj = objects[i];
          if (obj instanceof Splat) {
            result.push(i);
          }
        }
        return result;
      })());
      // Count all `Expansions`: [a, b, ..., c, d]
      const expans = ((() => {
        let k;
        const result1 = [];
        for (k = 0, i = k; k < objects.length; k++, i = k) {
          obj = objects[i];
          if (obj instanceof Expansion) {
            result1.push(i);
          }
        }
        return result1;
      })());
      // Combine splats and expansions.
      const splatsAndExpans = [...splats, ...expans];
      // Show error if there is more than one `Splat`, or `Expansion`.
      // Examples: [a, b, c..., d, e, f...], [a, b, ..., c, d, ...], [a, b, ..., c, d, e...]
      if (splatsAndExpans.length > 1) {
        // Sort 'splatsAndExpans' so we can show error at first disallowed token.
        objects[splatsAndExpans.sort()[1]].error("multiple splats/expansions are disallowed in an assignment");
      }

      const isSplat = (splats != null ? splats.length : undefined) > 0;
      const isExpans = (expans != null ? expans.length : undefined) > 0;
      const isObject = this.variable.isObject();
      const isArray = this.variable.isArray();

      let vvar     = value.compileToFragments(o, LEVEL_LIST);
      let vvarText = fragmentsToText(vvar);
      const assigns  = [];

      // At this point, there are several things to destructure. So the `fn()` in
      // `{a, b} = fn()` must be cached, for example. Make vvar into a simple
      // variable if it isn’t already.
      if (!(value.unwrap() instanceof IdentifierLiteral) || this.variable.assigns(vvarText)) {
        const ref = o.scope.freeVariable('ref');
        assigns.push([this.makeCode(ref + ' = '), ...vvar]);
        vvar = [this.makeCode(ref)];
        vvarText = ref;
      }

      const slicer = type => (function(vvar, start, end) {
        if (end == null) { end = false; }
        const args = [new IdentifierLiteral(vvar), new NumberLiteral(start)];
        if (end) { args.push(new NumberLiteral(end)); }
        const slice = new Value((new IdentifierLiteral(utility(type, o))), [new Access(new PropertyName('call'))]);
        return new Value(new Call(slice, args));
      });

      // Helper which outputs `[].slice` code.
      const compSlice = slicer("slice");

      // Helper which outputs `[].splice` code.
      const compSplice = slicer("splice");

      // Check if `objects` array contains object spread (`{a, r...}`), e.g. `[a, b, {c, r...}]`.
      const hasObjSpreads = objs => (() => {
        const result2 = [];
        for (i = 0; i < objs.length; i++) {
          obj = objs[i];
          if (obj.base instanceof Obj && obj.base.hasSplat()) {
            result2.push(i);
          }
        }
        return result2;
      })();

      // Check if `objects` array contains any instance of `Assign`, e.g. {a:1}.
      const hasObjAssigns = objs => (() => {
        const result2 = [];
        for (i = 0; i < objs.length; i++) {
          obj = objs[i];
          if (obj instanceof Assign && (obj.context === 'object')) {
            result2.push(i);
          }
        }
        return result2;
      })();

      // Check if `objects` array contains any unassignable object.
      const objIsUnassignable = function(objs) {
        for (obj of Array.from(objs)) { if (!obj.isAssignable()) { return true; } }
        return false;
      };

      // `objects` are complex when there is object spread ({a...}), object assign ({a:1}),
      // unassignable object, or just a single node.
      const complexObjects = objs => hasObjSpreads(objs).length || hasObjAssigns(objs).length || objIsUnassignable(objs) || (olen === 1);

      // "Complex" `objects` are processed in a loop.
      // Examples: [a, b, {c, r...}, d], [a, ..., {b, r...}, c, d]
      const loopObjects = (objs, vvar, vvarTxt) => {
        const objSpreads = hasObjSpreads(objs);
        return (() => {
          const result2 = [];
          for (i = 0; i < objs.length; i++) {
          // `Elision` can be skipped.
            var vval;
            obj = objs[i];
            if (obj instanceof Elision) { continue; }
            // If `obj` is {a: 1}
            if (obj instanceof Assign && (obj.context === 'object')) {
              let idx;
              ({variable: {base: idx}, value: vvar} = obj);
              if (vvar instanceof Assign) { ({variable: vvar} = vvar); }
              idx =
                vvar.this ?
                  vvar.properties[0].name
                :
                  new PropertyName(vvar.unwrap().value);
              const acc = idx.unwrap() instanceof PropertyName;
              vval = new Value(value, [new (acc ? Access : Index)(idx)]);
            } else {
              // `obj` is [a...], {a...} or a
              vvar = (() => { switch (false) {
                case !(obj instanceof Splat): return new Value(obj.name);
                case !Array.from(objSpreads).includes(i): return new Value(obj.base);
                default: return obj;
              } })();
              vval = (() => { switch (false) {
                case !(obj instanceof Splat): return compSlice(vvarTxt, i);
                default: return new Value(new Literal(vvarTxt), [new Index(new NumberLiteral(i))]);
              } })();
            }
            const message = isUnassignable(vvar.unwrap().value);
            if (message) { vvar.error(message); }
            result2.push(assigns.push(new Assign(vvar, vval, null, {param: this.param, subpattern: true}).compileToFragments(o, LEVEL_LIST)));
          }
          return result2;
        })();
      };

      // "Simple" `objects` can be split and compiled to arrays, [a, b, c] = arr, [a, b, c...] = arr
      const assignObjects = (objs, vvar, vvarTxt) => {
        vvar = new Value(new Arr(objs, true));
        const vval = vvarTxt instanceof Value ? vvarTxt : new Value(new Literal(vvarTxt));
        return assigns.push(new Assign(vvar, vval, null, {param: this.param, subpattern: true}).compileToFragments(o, LEVEL_LIST));
      };

      const processObjects = function(objs, vvar, vvarTxt) {
        if (complexObjects(objs)) {
          return loopObjects(objs, vvar, vvarTxt);
        } else {
          return assignObjects(objs, vvar, vvarTxt);
        }
      };

      // In case there is `Splat` or `Expansion` in `objects`,
      // we can split array in two simple subarrays.
      // `Splat` [a, b, c..., d, e] can be split into  [a, b, c...] and [d, e].
      // `Expansion` [a, b, ..., c, d] can be split into [a, b] and [c, d].
      // Examples:
      // a) `Splat`
      //   CS: [a, b, c..., d, e] = arr
      //   JS: [a, b, ...c] = arr, [d, e] = splice.call(c, -2)
      // b) `Expansion`
      //   CS: [a, b, ..., d, e] = arr
      //   JS: [a, b] = arr, [d, e] = slice.call(arr, -2)
      if (splatsAndExpans.length) {
        const expIdx = splatsAndExpans[0];
        const leftObjs = objects.slice(0, expIdx + (isSplat ? 1 : 0));
        const rightObjs = objects.slice(expIdx + 1);
        if (leftObjs.length !== 0) { processObjects(leftObjs, vvar, vvarText); }
        if (rightObjs.length !== 0) {
          // Slice or splice `objects`.
          let refExp = (() => { switch (false) {
            case !isSplat: return compSplice(objects[expIdx].unwrapAll().value, rightObjs.length * -1);
            case !isExpans: return compSlice(vvarText, rightObjs.length * -1);
          } })();
          if (complexObjects(rightObjs)) {
            const restVar = refExp;
            refExp = o.scope.freeVariable('ref');
            assigns.push([this.makeCode(refExp + ' = '), ...restVar.compileToFragments(o, LEVEL_LIST)]);
          }
          processObjects(rightObjs, vvar, refExp);
        }
      } else {
        // There is no `Splat` or `Expansion` in `objects`.
        processObjects(objects, vvar, vvarText);
      }
      if (!top && !this.subpattern) { assigns.push(vvar); }
      const fragments = this.joinFragmentArrays(assigns, ', ');
      if (o.level < LEVEL_LIST) { return fragments; } else { return this.wrapInParentheses(fragments); }
    }

    // When compiling a conditional assignment, take care to ensure that the
    // operands are only evaluated once, even though we have to reference them
    // more than once.
    compileConditional(o) {
      const [left, right] = this.variable.cacheReference(o);
      // Disallow conditional assignment of undefined variables.
      if (!left.properties.length && left.base instanceof Literal &&
             !(left.base instanceof ThisLiteral) && !o.scope.check(left.base.value)) {
        this.variable.error(`the variable \"${left.base.value}\" can't be assigned with ${this.context} because it has not been declared before`);
      }
      if (Array.from(this.context).includes("?")) {
        o.isExistentialEquals = true;
        return new If(new Existence(left), right, {type: 'if'}).addElse(new Assign(right, this.value, '=')).compileToFragments(o);
      } else {
        const fragments = new Op(this.context.slice(0, -1), left, new Assign(right, this.value, '=')).compileToFragments(o);
        if (o.level <= LEVEL_LIST) { return fragments; } else { return this.wrapInParentheses(fragments); }
      }
    }

    // Convert special math assignment operators like `a **= b` to the equivalent
    // extended form `a = a ** b` and then compiles that.
    compileSpecialMath(o) {
      const [left, right] = this.variable.cacheReference(o);
      return new Assign(left, new Op(this.context.slice(0, -1), right, this.value)).compileToFragments(o);
    }

    // Compile the assignment from an array splice literal, using JavaScript's
    // `Array#splice` method.
    compileSplice(o) {
      let fromDecl, fromRef;
      let {range: {from, to, exclusive}} = this.variable.properties.pop();
      const unwrappedVar = this.variable.unwrapAll();
      if (unwrappedVar.comments) {
        moveComments(unwrappedVar, this);
        delete this.variable.comments;
      }
      const name = this.variable.compile(o);
      if (from) {
        [fromDecl, fromRef] = this.cacheToCodeFragments(from.cache(o, LEVEL_OP));
      } else {
        fromDecl = (fromRef = '0');
      }
      if (to) {
        if ((from != null ? from.isNumber() : undefined) && to.isNumber()) {
          to = to.compile(o) - fromRef;
          if (!exclusive) { to += 1; }
        } else {
          to = to.compile(o, LEVEL_ACCESS) + ' - ' + fromRef;
          if (!exclusive) { to += ' + 1'; }
        }
      } else {
        to = "9e9";
      }
      const [valDef, valRef] = this.value.cache(o, LEVEL_LIST);
      const answer = [].concat(this.makeCode(`${utility('splice', o)}.apply(${name}, [${fromDecl}, ${to}].concat(`), valDef, this.makeCode(")), "), valRef);
      if (o.level > LEVEL_TOP) { return this.wrapInParentheses(answer); } else { return answer; }
    }

    eachName(iterator) {
      return this.variable.unwrapAll().eachName(iterator);
    }
  };
  Assign.initClass();
  return Assign;
})());

//### FuncGlyph

exports.FuncGlyph = (FuncGlyph = class FuncGlyph extends Base {
  constructor(glyph) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.glyph = glyph;
    super();
  }
});

//### Code

// A function definition. This is the only node that creates a new Scope.
// When for the purposes of walking the contents of a function body, the Code
// has no *children* -- they're within the inner scope.
exports.Code = (Code = (function() {
  Code = class Code extends Base {
    static initClass() {
  
      this.prototype.children = ['params', 'body'];
  
      this.prototype.jumps = NO;
    }
    constructor(params, body, funcGlyph, paramStart) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.funcGlyph = funcGlyph;
      this.paramStart = paramStart;
      super();

      this.params      = params || [];
      this.body        = body || new Block;
      this.bound       = (this.funcGlyph != null ? this.funcGlyph.glyph : undefined) === '=>';
      this.isGenerator = false;
      this.isAsync     = false;
      this.isMethod    = false;

      this.body.traverseChildren(false, node => {
        if ((node instanceof Op && node.isYield()) || node instanceof YieldReturn) {
          this.isGenerator = true;
        }
        if ((node instanceof Op && node.isAwait()) || node instanceof AwaitReturn) {
          this.isAsync = true;
        }
        if (this.isGenerator && this.isAsync) {
          return node.error("function can't contain both yield and await");
        }
      });
    }

    isStatement() { return this.isMethod; }

    makeScope(parentScope) { return new Scope(parentScope, this.body, this); }

    // Compilation creates a new scope unless explicitly asked to share with the
    // outer scope. Handles splat parameters in the parameter list by setting
    // such parameters to be the final parameter in the function definition, as
    // required per the ES2015 spec. If the CoffeeScript function definition had
    // parameters after the splat, they are declared via expressions in the
    // function body.
    compileNode(o) {
      let body, i, left, name, splatParamName;
      let param;
      if (this.ctor) {
        if (this.isAsync) { this.name.error('Class constructor may not be async'); }
        if (this.isGenerator) { this.name.error('Class constructor may not be a generator'); }
      }

      if (this.bound) {
        if (o.scope.method != null ? o.scope.method.bound : undefined) { this.context = o.scope.method.context; }
        if (!this.context) { this.context = 'this'; }
      }

      o.scope         = del(o, 'classScope') || this.makeScope(o.scope);
      o.scope.shared  = del(o, 'sharedScope');
      o.indent        += TAB;
      delete o.bare;
      delete o.isExistentialEquals;
      const params           = [];
      const exprs            = [];
      const thisAssignments  = (left = (this.thisAssignments != null ? this.thisAssignments.slice() : undefined)) != null ? left : [];
      const paramsAfterSplat = [];
      let haveSplatParam   = false;
      let haveBodyParam    = false;

      // Check for duplicate parameters and separate `this` assignments.
      const paramNames = [];
      this.eachParamName(function(name, node, param, obj) {
        if (Array.from(paramNames).includes(name)) { node.error(`multiple parameters named '${name}'`); }
        paramNames.push(name);

        if (node.this) {
          name   = node.properties[0].name.value;
          if (Array.from(JS_FORBIDDEN).includes(name)) { name   = `_${name}`; }
          const target = new IdentifierLiteral(o.scope.freeVariable(name, {reserve: false}));
          // `Param` is object destructuring with a default value: ({@prop = 1}) ->
          // In a case when the variable name is already reserved, we have to assign
          // a new variable name to the destructured variable: ({prop:prop1 = 1}) ->
          const replacement =
              param.name instanceof Obj && obj instanceof Assign &&
                  (obj.operatorToken.value === '=') ?
                new Assign((new IdentifierLiteral(name)), target, 'object') //, operatorToken: new Literal ':'
              :
                target;
          param.renameParam(node, replacement);
          return thisAssignments.push(new Assign(node, target));
        }
      });

      // Parse the parameters, adding them to the list of parameters to put in the
      // function definition; and dealing with splats or expansions, including
      // adding expressions to the function body to declare all parameter
      // variables that would have been after the splat/expansion parameter.
      // If we encounter a parameter that needs to be declared in the function
      // body for any reason, for example it’s destructured with `this`, also
      // declare and assign all subsequent parameters in the function body so that
      // any non-idempotent parameters are evaluated in the correct order.
      for (i = 0; i < this.params.length; i++) {
        // Was `...` used with this parameter? (Only one such parameter is allowed
        // per function.) Splat/expansion parameters cannot have default values,
        // so we need not worry about that.
        var ref;
        param = this.params[i];
        if (param.splat || param instanceof Expansion) {
          if (haveSplatParam) {
            param.error('only one splat or expansion parameter is allowed per function definition');
          } else if (param instanceof Expansion && (this.params.length === 1)) {
            param.error('an expansion parameter cannot be the only parameter in a function definition');
          }
          haveSplatParam = true;
          if (param.splat) {
            if (param.name instanceof Arr) {
              // Splat arrays are treated oddly by ES; deal with them the legacy
              // way in the function body. TODO: Should this be handled in the
              // function parameter list, and if so, how?
              splatParamName = o.scope.freeVariable('arg');
              params.push(ref = new Value(new IdentifierLiteral(splatParamName)));
              exprs.push(new Assign(new Value(param.name), ref));
            } else {
              params.push(ref = param.asReference(o));
              splatParamName = fragmentsToText(ref.compileNodeWithoutComments(o));
            }
            if (param.shouldCache()) {
              exprs.push(new Assign(new Value(param.name), ref));
            }
          } else { // `param` is an Expansion
            splatParamName = o.scope.freeVariable('args');
            params.push(new Value(new IdentifierLiteral(splatParamName)));
          }

          o.scope.parameter(splatParamName);

        // Parse all other parameters; if a splat paramater has not yet been
        // encountered, add these other parameters to the list to be output in
        // the function definition.
        } else {
          var condition, ifTrue;
          if (param.shouldCache() || haveBodyParam) {
            param.assignedInBody = true;
            haveBodyParam = true;
            // This parameter cannot be declared or assigned in the parameter
            // list. So put a reference in the parameter list and add a statement
            // to the function body assigning it, e.g.
            // `(arg) => { var a = arg.a; }`, with a default value if it has one.
            if (param.value != null) {
              condition = new Op('===', param, new UndefinedLiteral);
              ifTrue = new Assign(new Value(param.name), param.value);
              exprs.push(new If(condition, ifTrue));
            } else {
              exprs.push(new Assign(new Value(param.name), param.asReference(o), null, {param: 'alwaysDeclare'}));
            }
          }

          // If this parameter comes before the splat or expansion, it will go
          // in the function definition parameter list.
          if (!haveSplatParam) {
            // If this parameter has a default value, and it hasn’t already been
            // set by the `shouldCache()` block above, define it as a statement in
            // the function body. This parameter comes after the splat parameter,
            // so we can’t define its default value in the parameter list.
            if (param.shouldCache()) {
              ref = param.asReference(o);
            } else {
              if ((param.value != null) && !param.assignedInBody) {
                ref = new Assign(new Value(param.name), param.value, null, {param: true});
              } else {
                ref = param;
              }
            }
            // Add this parameter’s reference(s) to the function scope.
            if (param.name instanceof Arr || param.name instanceof Obj) {
              // This parameter is destructured.
              param.name.lhs = true;
              // Compile `foo({a, b...}) ->` to `foo(arg) -> {a, b...} = arg`.
              // Can be removed once ES proposal hits Stage 4.
              if (param.name instanceof Obj && param.name.hasSplat()) {
                splatParamName = o.scope.freeVariable('arg');
                o.scope.parameter(splatParamName);
                ref = new Value(new IdentifierLiteral(splatParamName));
                exprs.push(new Assign(new Value(param.name), ref, null, {param: 'alwaysDeclare'}));
                // Compile `foo({a, b...} = {}) ->` to `foo(arg = {}) -> {a, b...} = arg`.
                if ((param.value != null) && !param.assignedInBody) {
                  ref = new Assign(ref, param.value, null, {param: true});
                }
              } else if (!param.shouldCache()) {
                param.name.eachName(prop => o.scope.parameter(prop.value));
              }
            } else {
              // This compilation of the parameter is only to get its name to add
              // to the scope name tracking; since the compilation output here
              // isn’t kept for eventual output, don’t include comments in this
              // compilation, so that they get output the “real” time this param
              // is compiled.
              const paramToAddToScope = (param.value != null) ? param : ref;
              o.scope.parameter(fragmentsToText(paramToAddToScope.compileToFragmentsWithoutComments(o)));
            }
            params.push(ref);
          } else {
            paramsAfterSplat.push(param);
            // If this parameter had a default value, since it’s no longer in the
            // function parameter list we need to assign its default value
            // (if necessary) as an expression in the body.
            if ((param.value != null) && !param.shouldCache()) {
              condition = new Op('===', param, new UndefinedLiteral);
              ifTrue = new Assign(new Value(param.name), param.value);
              exprs.push(new If(condition, ifTrue));
            }
            // Add this parameter to the scope, since it wouldn’t have been added
            // yet since it was skipped earlier.
            if ((param.name != null ? param.name.value : undefined) != null) { o.scope.add(param.name.value, 'var', true); }
          }
        }
      }

      // If there were parameters after the splat or expansion parameter, those
      // parameters need to be assigned in the body of the function.
      if (paramsAfterSplat.length !== 0) {
        // Create a destructured assignment, e.g. `[a, b, c] = [args..., b, c]`
        exprs.unshift(new Assign(new Value(
            new Arr([new Splat(new IdentifierLiteral(splatParamName)), ...(((() => {
              const result = [];
              for (param of Array.from(paramsAfterSplat)) {                 result.push(param.asReference(o));
              }
              return result;
            })()))])
          ), new Value(new IdentifierLiteral(splatParamName)))
        );
      }

      // Add new expressions to the function body
      const wasEmpty = this.body.isEmpty();
      if (!this.expandCtorSuper(thisAssignments)) { this.body.expressions.unshift(...thisAssignments); }
      this.body.expressions.unshift(...exprs);
      if (this.isMethod && this.bound && !this.isStatic && this.classVariable) {
        const boundMethodCheck = new Value(new Literal(utility('boundMethodCheck', o)));
        this.body.expressions.unshift(new Call(boundMethodCheck, [new Value(new ThisLiteral), this.classVariable]));
      }
      if (!wasEmpty && !this.noReturn) { this.body.makeReturn(); }

      // JavaScript doesn’t allow bound (`=>`) functions to also be generators.
      // This is usually caught via `Op::compileContinuation`, but double-check:
      if (this.bound && this.isGenerator) {
        const yieldNode = this.body.contains(node => node instanceof Op && (node.operator === 'yield'));
        (yieldNode || this).error('yield cannot occur inside bound (fat arrow) functions');
      }

      // Assemble the output
      const modifiers = [];
      if (this.isMethod && this.isStatic) { modifiers.push('static'); }
      if (this.isAsync) { modifiers.push('async'); }
      if (!this.isMethod && !this.bound) {
        modifiers.push(`function${this.isGenerator ? '*' : ''}`);
      } else if (this.isGenerator) {
        modifiers.push('*');
      }

      const signature = [this.makeCode('(')];
      // Block comments between a function name and `(` get output between
      // `function` and `(`.
      if ((this.paramStart != null ? this.paramStart.comments : undefined) != null) {
        this.compileCommentFragments(o, this.paramStart, signature);
      }
      for (i = 0; i < params.length; i++) {
        param = params[i];
        if (i !== 0) { signature.push(this.makeCode(', ')); }
        if (haveSplatParam && (i === (params.length - 1))) { signature.push(this.makeCode('...')); }
        // Compile this parameter, but if any generated variables get created
        // (e.g. `ref`), shift those into the parent scope since we can’t put a
        // `var` line inside a function parameter list.
        const scopeVariablesCount = o.scope.variables.length;
        signature.push(...param.compileToFragments(o));
        if (scopeVariablesCount !== o.scope.variables.length) {
          const generatedVariables = o.scope.variables.splice(scopeVariablesCount);
          o.scope.parent.variables.push(...generatedVariables);
        }
      }
      signature.push(this.makeCode(')'));
      // Block comments between `)` and `->`/`=>` get output between `)` and `{`.
      if ((this.funcGlyph != null ? this.funcGlyph.comments : undefined) != null) {
        for (let comment of Array.from(this.funcGlyph.comments)) { comment.unshift = false; }
        this.compileCommentFragments(o, this.funcGlyph, signature);
      }

      if (!this.body.isEmpty()) { body = this.body.compileWithDeclarations(o); }

      // We need to compile the body before method names to ensure `super`
      // references are handled.
      if (this.isMethod) {
        let methodScope;
        [methodScope, o.scope] = [o.scope, o.scope.parent];
        name = this.name.compileToFragments(o);
        if (name[0].code === '.') { name.shift(); }
        o.scope = methodScope;
      }

      const answer = this.joinFragmentArrays((Array.from(modifiers).map((m) => this.makeCode(m))), ' ');
      if (modifiers.length && name) { answer.push(this.makeCode(' ')); }
      if (name) { answer.push(...name); }
      answer.push(...signature);
      if (this.bound && !this.isMethod) { answer.push(this.makeCode(' =>')); }
      answer.push(this.makeCode(' {'));
      if (body != null ? body.length : undefined) { answer.push(this.makeCode('\n'), ...body, this.makeCode(`\n${this.tab}`)); }
      answer.push(this.makeCode('}'));

      if (this.isMethod) { return indentInitial(answer, this); }
      if (this.front || (o.level >= LEVEL_ACCESS)) { return this.wrapInParentheses(answer); } else { return answer; }
    }

    eachParamName(iterator) {
      return Array.from(this.params).map((param) => param.eachName(iterator));
    }

    // Short-circuit `traverseChildren` method to prevent it from crossing scope
    // boundaries unless `crossScope` is `true`.
    traverseChildren(crossScope, func) {
      if (crossScope) { return super.traverseChildren(crossScope, func); }
    }

    // Short-circuit `replaceInContext` method to prevent it from crossing context boundaries. Bound
    // functions have the same context.
    replaceInContext(child, replacement) {
      if (this.bound) {
        return super.replaceInContext(child, replacement);
      } else {
        return false;
      }
    }

    expandCtorSuper(thisAssignments) {
      if (!this.ctor) { return false; }

      this.eachSuperCall(Block.wrap(this.params), superCall => superCall.error("'super' is not allowed in constructor parameter defaults"));

      const seenSuper = this.eachSuperCall(this.body, superCall => {
        if (this.ctor === 'base') { superCall.error("'super' is only allowed in derived class constructors"); }
        return superCall.expressions = thisAssignments;
      });

      const haveThisParam = thisAssignments.length && (thisAssignments.length !== (this.thisAssignments != null ? this.thisAssignments.length : undefined));
      if ((this.ctor === 'derived') && !seenSuper && haveThisParam) {
        const param = thisAssignments[0].variable;
        param.error("Can't use @params in derived class constructors without calling super");
      }

      return seenSuper;
    }

    // Find all super calls in the given context node;
    // returns `true` if `iterator` is called.
    eachSuperCall(context, iterator) {
      let seenSuper = false;

      context.traverseChildren(true, child => {
        if (child instanceof SuperCall) {
          // `super` in a constructor (the only `super` without an accessor)
          // cannot be given an argument with a reference to `this`, as that would
          // be referencing `this` before calling `super`.
          if (!child.variable.accessor) {
            const childArgs = child.args.filter(arg => !(arg instanceof Class) && (!(arg instanceof Code) || arg.bound));
            Block.wrap(childArgs).traverseChildren(true, node => {
              if (node.this) { return node.error("Can't call super with @params in derived class constructors"); }
            });
          }
          seenSuper = true;
          iterator(child);
        } else if (child instanceof ThisLiteral && (this.ctor === 'derived') && !seenSuper) {
          child.error("Can't reference 'this' before calling super in derived class constructors");
        }

        // `super` has the same target in bound (arrow) functions, so check them too
        return !(child instanceof SuperCall) && (!(child instanceof Code) || child.bound);
      });

      return seenSuper;
    }
  };
  Code.initClass();
  return Code;
})());

//### Param

// A parameter in a function definition. Beyond a typical JavaScript parameter,
// these parameters can also attach themselves to the context of the function,
// as well as be a splat, gathering up a group of parameters into an array.
exports.Param = (Param = (function() {
  Param = class Param extends Base {
    static initClass() {
  
      this.prototype.children = ['name', 'value'];
    }
    constructor(name, value, splat) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.name = name;
      this.value = value;
      this.splat = splat;
      super();

      const message = isUnassignable(this.name.unwrapAll().value);
      if (message) { this.name.error(message); }
      if (this.name instanceof Obj && this.name.generated) {
        const token = this.name.objects[0].operatorToken;
        token.error(`unexpected ${token.value}`);
      }
    }

    compileToFragments(o) {
      return this.name.compileToFragments(o, LEVEL_LIST);
    }

    compileToFragmentsWithoutComments(o) {
      return this.name.compileToFragmentsWithoutComments(o, LEVEL_LIST);
    }

    asReference(o) {
      if (this.reference) { return this.reference; }
      let node = this.name;
      if (node.this) {
        let name = node.properties[0].name.value;
        if (Array.from(JS_FORBIDDEN).includes(name)) { name = `_${name}`; }
        node = new IdentifierLiteral(o.scope.freeVariable(name));
      } else if (node.shouldCache()) {
        node = new IdentifierLiteral(o.scope.freeVariable('arg'));
      }
      node = new Value(node);
      node.updateLocationDataIfMissing(this.locationData);
      return this.reference = node;
    }

    shouldCache() {
      return this.name.shouldCache();
    }

    // Iterates the name or names of a `Param`.
    // In a sense, a destructured parameter represents multiple JS parameters. This
    // method allows to iterate them all.
    // The `iterator` function will be called as `iterator(name, node)` where
    // `name` is the name of the parameter and `node` is the AST node corresponding
    // to that name.
    eachName(iterator, name) {
      if (name == null) { ({
        name
      } = this); }
      const atParam = (obj, originalObj = null) => iterator(`@${obj.properties[0].name.value}`, obj, this, originalObj);
      // * simple literals `foo`
      if (name instanceof Literal) { return iterator(name.value, name, this); }
      // * at-params `@foo`
      if (name instanceof Value) { return atParam(name); }
      for (let obj of Array.from(name.objects != null ? name.objects : [])) {
        // Save original obj.
        const nObj = obj;
        // * destructured parameter with default value
        if (obj instanceof Assign && (obj.context == null)) {
          obj = obj.variable;
        }
        // * assignments within destructured parameters `{foo:bar}`
        if (obj instanceof Assign) {
          // ... possibly with a default value
          if (obj.value instanceof Assign) {
            obj = obj.value.variable;
          } else {
            obj = obj.value;
          }
          this.eachName(iterator, obj.unwrap());
        // * splats within destructured parameters `[xs...]`
        } else if (obj instanceof Splat) {
          const node = obj.name.unwrap();
          iterator(node.value, node, this);
        } else if (obj instanceof Value) {
          // * destructured parameters within destructured parameters `[{a}]`
          if (obj.isArray() || obj.isObject()) {
            this.eachName(iterator, obj.base);
          // * at-params within destructured parameters `{@foo}`
          } else if (obj.this) {
            atParam(obj, nObj);
          // * simple destructured parameters {foo}
          } else { iterator(obj.base.value, obj.base, this); }
        } else if (obj instanceof Elision) {
          obj;
        } else if (!(obj instanceof Expansion)) {
          obj.error(`illegal parameter ${obj.compile()}`);
        }
      }
    }

    // Rename a param by replacing the given AST node for a name with a new node.
    // This needs to ensure that the the source for object destructuring does not change.
    renameParam(node, newNode) {
      const isNode      = candidate => candidate === node;
      const replacement = (node, parent) => {
        if (parent instanceof Obj) {
          let key = node;
          if (node.this) { key = node.properties[0].name; }
          // No need to assign a new variable for the destructured variable if the variable isn't reserved.
          // Examples:
          // `({@foo}) ->`  should compile to `({foo}) { this.foo = foo}`
          // `foo = 1; ({@foo}) ->` should compile to `foo = 1; ({foo:foo1}) { this.foo = foo1 }`
          if (node.this && (key.value === newNode.value)) {
            return new Value(newNode);
          } else {
            return new Assign(new Value(key), newNode, 'object');
          }
        } else {
          return newNode;
        }
      };

      return this.replaceInContext(isNode, replacement);
    }
  };
  Param.initClass();
  return Param;
})());

//### Splat

// A splat, either as a parameter to a function, an argument to a call,
// or as part of a destructuring assignment.
exports.Splat = (Splat = (function() {
  Splat = class Splat extends Base {
    static initClass() {
  
      this.prototype.children = ['name'];
    }
    constructor(name) {
      super();
      this.name = name.compile ? name : new Literal(name);
    }

    isAssignable() {
      return this.name.isAssignable() && (!this.name.isAtomic || this.name.isAtomic());
    }

    assigns(name) {
      return this.name.assigns(name);
    }

    compileNode(o) {
      return [this.makeCode('...'), ...this.name.compileToFragments(o, LEVEL_OP)];
    }

    unwrap() { return this.name; }
  };
  Splat.initClass();
  return Splat;
})());

//### Expansion

// Used to skip values inside an array destructuring (pattern matching) or
// parameter list.
exports.Expansion = (Expansion = (function() {
  Expansion = class Expansion extends Base {
    static initClass() {
  
      this.prototype.shouldCache = NO;
    }

    compileNode(o) {
      return this.error('Expansion must be used inside a destructuring assignment or parameter list');
    }

    asReference(o) {
      return this;
    }

    eachName(iterator) {}
  };
  Expansion.initClass();
  return Expansion;
})());

//### Elision

// Array elision element (for example, [,a, , , b, , c, ,]).
exports.Elision = (Elision = (function() {
  Elision = class Elision extends Base {
    static initClass() {
  
      this.prototype.isAssignable = YES;
  
      this.prototype.shouldCache = NO;
    }

    compileToFragments(o, level) {
      const fragment = super.compileToFragments(o, level);
      fragment.isElision = true;
      return fragment;
    }

    compileNode(o) {
      return [this.makeCode(', ')];
    }

    asReference(o) {
      return this;
    }

    eachName(iterator) {}
  };
  Elision.initClass();
  return Elision;
})());

//### While

// A while loop, the only sort of low-level loop exposed by CoffeeScript. From
// it, all other loops can be manufactured. Useful in cases where you need more
// flexibility or more speed than a comprehension can provide.
exports.While = (While = (function() {
  While = class While extends Base {
    static initClass() {
  
      this.prototype.children = ['condition', 'guard', 'body'];
  
      this.prototype.isStatement = YES;
    }
    constructor(condition, options) {
      super();

      this.condition = (options != null ? options.invert : undefined) ? condition.invert() : condition;
      this.guard     = options != null ? options.guard : undefined;
    }

    makeReturn(res) {
      if (res) {
        return super.makeReturn(res);
      } else {
        this.returns = !this.jumps();
        return this;
      }
    }

    addBody(body) {
      this.body = body;
      return this;
    }

    jumps() {
      const {expressions} = this.body;
      if (!expressions.length) { return false; }
      for (let node of Array.from(expressions)) {
        var jumpNode;
        if (jumpNode = node.jumps({loop: true})) { return jumpNode; }
      }
      return false;
    }

    // The main difference from a JavaScript *while* is that the CoffeeScript
    // *while* can be used as a part of a larger expression -- while loops may
    // return an array containing the computed result of each iteration.
    compileNode(o) {
      let rvar;
      o.indent += TAB;
      let set      = '';
      let {body}   = this;
      if (body.isEmpty()) {
        body = this.makeCode('');
      } else {
        if (this.returns) {
          body.makeReturn(rvar = o.scope.freeVariable('results'));
          set  = `${this.tab}${rvar} = [];\n`;
        }
        if (this.guard) {
          if (body.expressions.length > 1) {
            body.expressions.unshift(new If((new Parens(this.guard)).invert(), new StatementLiteral("continue")));
          } else {
            if (this.guard) { body = Block.wrap([new If(this.guard, body)]); }
          }
        }
        body = [].concat(this.makeCode("\n"), (body.compileToFragments(o, LEVEL_TOP)), this.makeCode(`\n${this.tab}`));
      }
      const answer = [].concat(this.makeCode(set + this.tab + "while ("), this.condition.compileToFragments(o, LEVEL_PAREN),
        this.makeCode(") {"), body, this.makeCode("}"));
      if (this.returns) {
        answer.push(this.makeCode(`\n${this.tab}return ${rvar};`));
      }
      return answer;
    }
  };
  While.initClass();
  return While;
})());

//### Op

// Simple Arithmetic and logical operations. Performs some conversion from
// CoffeeScript operations into their JavaScript equivalents.
exports.Op = (Op = (function() {
  let CONVERSIONS = undefined;
  let INVERSIONS = undefined;
  Op = class Op extends Base {
    static initClass() {
  
      // The map of conversions from CoffeeScript to JavaScript symbols.
      CONVERSIONS = {
        '==':        '===',
        '!=':        '!==',
        'of':        'in',
        'yieldfrom': 'yield*'
      };
  
      // The map of invertible operators.
      INVERSIONS = {
        '!==': '===',
        '===': '!=='
      };
  
      this.prototype.children = ['first', 'second'];
    }
    constructor(op, first, second, flip) {
      super();

      if (op === 'in') { return new In(first, second); }
      if (op === 'do') {
        return Op.prototype.generateDo(first);
      }
      if (op === 'new') {
        let firstCall;
        if ((firstCall = first.unwrap()) instanceof Call && !firstCall.do && !firstCall.isNew) {
          return firstCall.newInstance();
        }
        if ((first instanceof Code && first.bound) || first.do) { first = new Parens(first); }
      }

      this.operator = CONVERSIONS[op] || op;
      this.first    = first;
      this.second   = second;
      this.flip     = !!flip;
      return this;
    }

    isNumber() {
      return this.isUnary() && ['+', '-'].includes(this.operator) &&
        this.first instanceof Value && this.first.isNumber();
    }

    isAwait() {
      return this.operator === 'await';
    }

    isYield() {
      return ['yield', 'yield*'].includes(this.operator);
    }

    isUnary() {
      return !this.second;
    }

    shouldCache() {
      return !this.isNumber();
    }

    // Am I capable of
    // [Python-style comparison chaining](https://docs.python.org/3/reference/expressions.html#not-in)?
    isChainable() {
      return ['<', '>', '>=', '<=', '===', '!=='].includes(this.operator);
    }

    invert() {
      let fst, op;
      if (this.isChainable() && this.first.isChainable()) {
        let allInvertable = true;
        let curr = this;
        while (curr && curr.operator) {
          if (allInvertable) { allInvertable = (curr.operator in INVERSIONS); }
          curr = curr.first;
        }
        if (!allInvertable) { return new Parens(this).invert(); }
        curr = this;
        while (curr && curr.operator) {
          curr.invert = !curr.invert;
          curr.operator = INVERSIONS[curr.operator];
          curr = curr.first;
        }
        return this;
      } else if (op = INVERSIONS[this.operator]) {
        this.operator = op;
        if (this.first.unwrap() instanceof Op) {
          this.first.invert();
        }
        return this;
      } else if (this.second) {
        return new Parens(this).invert();
      } else if ((this.operator === '!') && (fst = this.first.unwrap()) instanceof Op &&
                                    ['!', 'in', 'instanceof'].includes(fst.operator)) {
        return fst;
      } else {
        return new Op('!', this);
      }
    }

    unfoldSoak(o) {
      return ['++', '--', 'delete'].includes(this.operator) && unfoldSoak(o, this, 'first');
    }

    generateDo(exp) {
      let ref;
      const passedParams = [];
      const func = exp instanceof Assign && (ref = exp.value.unwrap()) instanceof Code ?
        ref
      :
        exp;
      for (let param of Array.from(func.params || [])) {
        if (param.value) {
          passedParams.push(param.value);
          delete param.value;
        } else {
          passedParams.push(param);
        }
      }
      const call = new Call(exp, passedParams);
      call.do = true;
      return call;
    }

    compileNode(o) {
      const isChain = this.isChainable() && this.first.isChainable();
      // In chains, there's no need to wrap bare obj literals in parens,
      // as the chained expression is wrapped.
      if (!isChain) { this.first.front = this.front; }
      if ((this.operator === 'delete') && o.scope.check(this.first.unwrapAll().value)) {
        this.error('delete operand may not be argument or var');
      }
      if (['--', '++'].includes(this.operator)) {
        const message = isUnassignable(this.first.unwrapAll().value);
        if (message) { this.first.error(message); }
      }
      if (this.isYield() || this.isAwait()) { return this.compileContinuation(o); }
      if (this.isUnary()) { return this.compileUnary(o); }
      if (isChain) { return this.compileChain(o); }
      switch (this.operator) {
        case '?':  return this.compileExistence(o, this.second.isDefaultValue);
        case '**': return this.compilePower(o);
        case '//': return this.compileFloorDivision(o);
        case '%%': return this.compileModulo(o);
        default:
          var lhs = this.first.compileToFragments(o, LEVEL_OP);
          var rhs = this.second.compileToFragments(o, LEVEL_OP);
          var answer = [].concat(lhs, this.makeCode(` ${this.operator} `), rhs);
          if (o.level <= LEVEL_OP) { return answer; } else { return this.wrapInParentheses(answer); }
      }
    }

    // Mimic Python's chained comparisons when multiple comparison operators are
    // used sequentially. For example:
    //
    //     bin/coffee -e 'console.log 50 < 65 > 10'
    //     true
    compileChain(o) {
      let shared;
      [this.first.second, shared] = this.first.second.cache(o);
      const fst = this.first.compileToFragments(o, LEVEL_OP);
      const fragments = fst.concat(this.makeCode(` ${this.invert ? '&&' : '||'} `),
        (shared.compileToFragments(o)), this.makeCode(` ${this.operator} `), (this.second.compileToFragments(o, LEVEL_OP)));
      return this.wrapInParentheses(fragments);
    }

    // Keep reference to the left expression, unless this an existential assignment
    compileExistence(o, checkOnlyUndefined) {
      let fst, ref;
      if (this.first.shouldCache()) {
        ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
        fst = new Parens(new Assign(ref, this.first));
      } else {
        fst = this.first;
        ref = fst;
      }
      return new If(new Existence(fst, checkOnlyUndefined), ref, {type: 'if'}).addElse(this.second).compileToFragments(o);
    }

    // Compile a unary **Op**.
    compileUnary(o) {
      const parts = [];
      const op = this.operator;
      parts.push([this.makeCode(op)]);
      if ((op === '!') && this.first instanceof Existence) {
        this.first.negated = !this.first.negated;
        return this.first.compileToFragments(o);
      }
      if (o.level >= LEVEL_ACCESS) {
        return (new Parens(this)).compileToFragments(o);
      }
      const plusMinus = ['+', '-'].includes(op);
      if (['new', 'typeof', 'delete'].includes(op) ||
                        (plusMinus && this.first instanceof Op && (this.first.operator === op))) { parts.push([this.makeCode(' ')]); }
      if ((plusMinus && this.first instanceof Op) || ((op === 'new') && this.first.isStatement(o))) {
        this.first = new Parens(this.first);
      }
      parts.push(this.first.compileToFragments(o, LEVEL_OP));
      if (this.flip) { parts.reverse(); }
      return this.joinFragmentArrays(parts, '');
    }

    compileContinuation(o) {
      let needle;
      const parts = [];
      const op = this.operator;
      if (o.scope.parent == null) {
        this.error(`${this.operator} can only occur inside functions`);
      }
      if ((o.scope.method != null ? o.scope.method.bound : undefined) && o.scope.method.isGenerator) {
        this.error('yield cannot occur inside bound (fat arrow) functions');
      }
      if ((needle = 'expression', Array.from(Object.keys(this.first)).includes(needle)) && !(this.first instanceof Throw)) {
        if (this.first.expression != null) { parts.push(this.first.expression.compileToFragments(o, LEVEL_OP)); }
      } else {
        if (o.level >= LEVEL_PAREN) { parts.push([this.makeCode("(")]); }
        parts.push([this.makeCode(op)]);
        if ((this.first.base != null ? this.first.base.value : undefined) !== '') { parts.push([this.makeCode(" ")]); }
        parts.push(this.first.compileToFragments(o, LEVEL_OP));
        if (o.level >= LEVEL_PAREN) { parts.push([this.makeCode(")")]); }
      }
      return this.joinFragmentArrays(parts, '');
    }

    compilePower(o) {
      // Make a Math.pow call
      const pow = new Value(new IdentifierLiteral('Math'), [new Access(new PropertyName('pow'))]);
      return new Call(pow, [this.first, this.second]).compileToFragments(o);
    }

    compileFloorDivision(o) {
      const floor = new Value(new IdentifierLiteral('Math'), [new Access(new PropertyName('floor'))]);
      const second = this.second.shouldCache() ? new Parens(this.second) : this.second;
      const div = new Op('/', this.first, second);
      return new Call(floor, [div]).compileToFragments(o);
    }

    compileModulo(o) {
      const mod = new Value(new Literal(utility('modulo', o)));
      return new Call(mod, [this.first, this.second]).compileToFragments(o);
    }

    toString(idt) {
      return super.toString(idt, this.constructor.name + ' ' + this.operator);
    }
  };
  Op.initClass();
  return Op;
})());

//### In
exports.In = (In = (function() {
  In = class In extends Base {
    static initClass() {
  
      this.prototype.children = ['object', 'array'];
  
      this.prototype.invert = NEGATE;
    }
    constructor(object, array) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.object = object;
      this.array = array;
      super();
    }

    compileNode(o) {
      if (this.array instanceof Value && this.array.isArray() && this.array.base.objects.length) {
        let hasSplat;
        for (let obj of Array.from(this.array.base.objects)) {
          if (obj instanceof Splat) {
            hasSplat = true;
            break;
          }
        }
        // `compileOrTest` only if we have an array literal with no splats
        if (!hasSplat) { return this.compileOrTest(o); }
      }
      return this.compileLoopTest(o);
    }

    compileOrTest(o) {
      const [sub, ref] = this.object.cache(o, LEVEL_OP);
      const [cmp, cnj] = this.negated ? [' !== ', ' && '] : [' === ', ' || '];
      let tests = [];
      for (let i = 0; i < this.array.base.objects.length; i++) {
        const item = this.array.base.objects[i];
        if (i) { tests.push(this.makeCode(cnj)); }
        tests = tests.concat((i ? ref : sub), this.makeCode(cmp), item.compileToFragments(o, LEVEL_ACCESS));
      }
      if (o.level < LEVEL_OP) { return tests; } else { return this.wrapInParentheses(tests); }
    }

    compileLoopTest(o) {
      const [sub, ref] = this.object.cache(o, LEVEL_LIST);
      let fragments = [].concat(this.makeCode(utility('indexOf', o) + ".call("), this.array.compileToFragments(o, LEVEL_LIST),
        this.makeCode(", "), ref, this.makeCode(") " + (this.negated ? '< 0' : '>= 0')));
      if (fragmentsToText(sub) === fragmentsToText(ref)) { return fragments; }
      fragments = sub.concat(this.makeCode(', '), fragments);
      if (o.level < LEVEL_LIST) { return fragments; } else { return this.wrapInParentheses(fragments); }
    }

    toString(idt) {
      return super.toString(idt, this.constructor.name + (this.negated ? '!' : ''));
    }
  };
  In.initClass();
  return In;
})());

//### Try

// A classic *try/catch/finally* block.
exports.Try = (Try = (function() {
  Try = class Try extends Base {
    static initClass() {
  
      this.prototype.children = ['attempt', 'recovery', 'ensure'];
  
      this.prototype.isStatement = YES;
    }
    constructor(attempt, errorVariable, recovery, ensure) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.attempt = attempt;
      this.errorVariable = errorVariable;
      this.recovery = recovery;
      this.ensure = ensure;
      super();
    }

    jumps(o) { return this.attempt.jumps(o) || (this.recovery != null ? this.recovery.jumps(o) : undefined); }

    makeReturn(res) {
      if (this.attempt) { this.attempt  = this.attempt .makeReturn(res); }
      if (this.recovery) { this.recovery = this.recovery.makeReturn(res); }
      return this;
    }

    // Compilation is more or less as you would expect -- the *finally* clause
    // is optional, the *catch* is not.
    compileNode(o) {
      o.indent  += TAB;
      const tryPart   = this.attempt.compileToFragments(o, LEVEL_TOP);

      const catchPart = (() => {
        let generatedErrorVariableName;
        if (this.recovery) {
        generatedErrorVariableName = o.scope.freeVariable('error', {reserve: false});
        const placeholder = new IdentifierLiteral(generatedErrorVariableName);
        if (this.errorVariable) {
          const message = isUnassignable(this.errorVariable.unwrapAll().value);
          if (message) { this.errorVariable.error(message); }
          this.recovery.unshift(new Assign(this.errorVariable, placeholder));
        }
        return [].concat(this.makeCode(" catch ("), placeholder.compileToFragments(o), this.makeCode(") {\n"),
          this.recovery.compileToFragments(o, LEVEL_TOP), this.makeCode(`\n${this.tab}}`));
      } else if (!this.ensure && !this.recovery) {
        generatedErrorVariableName = o.scope.freeVariable('error', {reserve: false});
        return [this.makeCode(` catch (${generatedErrorVariableName}) {}`)];
      } else {
        return [];
      }
      })();

      const ensurePart = this.ensure ? ([].concat(this.makeCode(" finally {\n"), this.ensure.compileToFragments(o, LEVEL_TOP),
        this.makeCode(`\n${this.tab}}`))) : [];

      return [].concat(this.makeCode(`${this.tab}try {\n`),
        tryPart,
        this.makeCode(`\n${this.tab}}`), catchPart, ensurePart);
    }
  };
  Try.initClass();
  return Try;
})());

//### Throw

// Simple node to throw an exception.
exports.Throw = (Throw = (function() {
  Throw = class Throw extends Base {
    static initClass() {
  
      this.prototype.children = ['expression'];
  
      this.prototype.isStatement = YES;
      this.prototype.jumps =       NO;
  
      // A **Throw** is already a return, of sorts...
      this.prototype.makeReturn = THIS;
    }
    constructor(expression) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.expression = expression;
      super();
    }

    compileNode(o) {
      const fragments = this.expression.compileToFragments(o, LEVEL_LIST);
      unshiftAfterComments(fragments, this.makeCode('throw '));
      fragments.unshift(this.makeCode(this.tab));
      fragments.push(this.makeCode(';'));
      return fragments;
    }
  };
  Throw.initClass();
  return Throw;
})());

//### Existence

// Checks a variable for existence -- not `null` and not `undefined`. This is
// similar to `.nil?` in Ruby, and avoids having to consult a JavaScript truth
// table. Optionally only check if a variable is not `undefined`.
exports.Existence = (Existence = (function() {
  Existence = class Existence extends Base {
    static initClass() {
  
      this.prototype.children = ['expression'];
  
      this.prototype.invert = NEGATE;
    }
    constructor(expression, onlyNotUndefined) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.expression = expression;
      if (onlyNotUndefined == null) { onlyNotUndefined = false; }
      super();
      this.comparisonTarget = onlyNotUndefined ? 'undefined' : 'null';
      const salvagedComments = [];
      this.expression.traverseChildren(true, function(child) {
        if (child.comments) {
          for (let comment of Array.from(child.comments)) {
            if (!Array.from(salvagedComments).includes(comment)) { salvagedComments.push(comment); }
          }
          return delete child.comments;
        }
      });
      attachCommentsToNode(salvagedComments, this);
      moveComments(this.expression, this);
    }

    compileNode(o) {
      let cmp;
      this.expression.front = this.front;
      let code = this.expression.compile(o, LEVEL_OP);
      if (this.expression.unwrap() instanceof IdentifierLiteral && !o.scope.check(code)) {
        let cnj;
        [cmp, cnj] = this.negated ? ['===', '||'] : ['!==', '&&'];
        code = `typeof ${code} ${cmp} \"undefined\"` + (this.comparisonTarget !== 'undefined' ? ` ${cnj} ${code} ${cmp} ${this.comparisonTarget}` : '');
      } else {
        // We explicity want to use loose equality (`==`) when comparing against `null`,
        // so that an existence check roughly corresponds to a check for truthiness.
        // Do *not* change this to `===` for `null`, as this will break mountains of
        // existing code. When comparing only against `undefined`, however, we want to
        // use `===` because this use case is for parity with ES2015+ default values,
        // which only get assigned when the variable is `undefined` (but not `null`).
        cmp = this.comparisonTarget === 'null' ?
          this.negated ? '==' : '!='
        : // `undefined`
          this.negated ? '===' : '!==';
        code = `${code} ${cmp} ${this.comparisonTarget}`;
      }
      return [this.makeCode(o.level <= LEVEL_COND ? code : `(${code})`)];
    }
  };
  Existence.initClass();
  return Existence;
})());

//### Parens

// An extra set of parentheses, specified explicitly in the source. At one time
// we tried to clean up the results by detecting and removing redundant
// parentheses, but no longer -- you can put in as many as you please.
//
// Parentheses are a good way to force any statement to become an expression.
exports.Parens = (Parens = (function() {
  Parens = class Parens extends Base {
    static initClass() {
  
      this.prototype.children = ['body'];
    }
    constructor(body) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.body = body;
      super();
    }

    unwrap() { return this.body; }

    shouldCache() { return this.body.shouldCache(); }

    compileNode(o) {
      const expr = this.body.unwrap();
      // If these parentheses are wrapping an `IdentifierLiteral` followed by a
      // block comment, output the parentheses (or put another way, don’t optimize
      // away these redundant parentheses). This is because Flow requires
      // parentheses in certain circumstances to distinguish identifiers followed
      // by comment-based type annotations from JavaScript labels.
      const shouldWrapComment = expr.comments != null ? expr.comments.some(
        comment => comment.here && !comment.unshift && !comment.newLine) : undefined;
      if (expr instanceof Value && expr.isAtomic() && !this.csxAttribute && !shouldWrapComment) {
        expr.front = this.front;
        return expr.compileToFragments(o);
      }
      const fragments = expr.compileToFragments(o, LEVEL_PAREN);
      const bare = (o.level < LEVEL_OP) && !shouldWrapComment && (
          expr instanceof Op || expr.unwrap() instanceof Call ||
          (expr instanceof For && expr.returns)
        ) && ((o.level < LEVEL_COND) || (fragments.length <= 3));
      if (this.csxAttribute) { return this.wrapInBraces(fragments); }
      if (bare) { return fragments; } else { return this.wrapInParentheses(fragments); }
    }
  };
  Parens.initClass();
  return Parens;
})());

//### StringWithInterpolations

exports.StringWithInterpolations = (StringWithInterpolations = (function() {
  StringWithInterpolations = class StringWithInterpolations extends Base {
    static initClass() {
  
      this.prototype.children = ['body'];
    }
    constructor(body) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.body = body;
      super();
    }

    // `unwrap` returns `this` to stop ancestor nodes reaching in to grab @body,
    // and using @body.compileNode. `StringWithInterpolations.compileNode` is
    // _the_ custom logic to output interpolated strings as code.
    unwrap() { return this; }

    shouldCache() { return this.body.shouldCache(); }

    compileNode(o) {
      if (this.csxAttribute) {
        const wrapped = new Parens(new StringWithInterpolations(this.body));
        wrapped.csxAttribute = true;
        return wrapped.compileNode(o);
      }

      // Assumes that `expr` is `Value` » `StringLiteral` or `Op`
      const expr = this.body.unwrap();

      const elements = [];
      const salvagedComments = [];
      expr.traverseChildren(false, function(node) {
        let comment;
        if (node instanceof StringLiteral) {
          if (node.comments) {
            salvagedComments.push(...node.comments);
            delete node.comments;
          }
          elements.push(node);
          return true;
        } else if (node instanceof Parens) {
          if (salvagedComments.length !== 0) {
            for (comment of Array.from(salvagedComments)) {
              comment.unshift = true;
              comment.newLine = true;
            }
            attachCommentsToNode(salvagedComments, node);
          }
          elements.push(node);
          return false;
        } else if (node.comments) {
          // This node is getting discarded, but salvage its comments.
          if ((elements.length !== 0) && !(elements[elements.length - 1] instanceof StringLiteral)) {
            for (comment of Array.from(node.comments)) {
              comment.unshift = false;
              comment.newLine = true;
            }
            attachCommentsToNode(node.comments, elements[elements.length - 1]);
          } else {
            salvagedComments.push(...node.comments);
          }
          delete node.comments;
        }
        return true;
      });

      const fragments = [];
      if (!this.csx) { fragments.push(this.makeCode('`')); }
      for (let element of Array.from(elements)) {
        if (element instanceof StringLiteral) {
          element.value = element.unquote(true, this.csx);
          if (!this.csx) {
            // Backticks and `${` inside template literals must be escaped.
            element.value = element.value.replace(/(\\*)(`|\$\{)/g, function(match, backslashes, toBeEscaped) {
              if ((backslashes.length % 2) === 0) {
                return `${backslashes}\\${toBeEscaped}`;
              } else {
                return match;
              }
            });
          }
          fragments.push(...element.compileToFragments(o));
        } else {
          if (!this.csx) { fragments.push(this.makeCode('$')); }
          let code = element.compileToFragments(o, LEVEL_PAREN);
          if (!this.isNestedTag(element) || code.some(fragment => fragment.comments != null)) {
            code = this.wrapInBraces(code);
            // Flag the `{` and `}` fragments as having been generated by this
            // `StringWithInterpolations` node, so that `compileComments` knows
            // to treat them as bounds. Don’t trust `fragment.type`, which can
            // report minified variable names when this compiler is minified.
            code[0].isStringWithInterpolations = true;
            code[code.length - 1].isStringWithInterpolations = true;
          }
          fragments.push(...code);
        }
      }
      if (!this.csx) { fragments.push(this.makeCode('`')); }
      return fragments;
    }

    isNestedTag(element) {
      const exprs = element.body != null ? element.body.expressions : undefined;
      const call = exprs != null ? exprs[0].unwrap() : undefined;
      return this.csx && exprs && (exprs.length === 1) && call instanceof Call && call.csx;
    }
  };
  StringWithInterpolations.initClass();
  return StringWithInterpolations;
})());

//### For

// CoffeeScript's replacement for the *for* loop is our array and object
// comprehensions, that compile into *for* loops here. They also act as an
// expression, able to return the result of each filtered iteration.
//
// Unlike Python array comprehensions, they can be multi-line, and you can pass
// the current index of the loop as a second parameter. Unlike Ruby blocks,
// you can map and filter in a single pass.
exports.For = (For = (function() {
  For = class For extends While {
    static initClass() {
  
      this.prototype.children = ['body', 'source', 'guard', 'step'];
    }
    constructor(body, source) {
      super();
      ({source: this.source, guard: this.guard, step: this.step, name: this.name, index: this.index} = source);
      this.body    = Block.wrap([body]);
      this.own     = (source.own != null);
      this.object  = (source.object != null);
      this.from    = (source.from != null);
      if (this.from && this.index) { this.index.error('cannot use index with for-from'); }
      if (this.own && !this.object) { source.ownTag.error(`cannot use own with for-${this.from ? 'from' : 'in'}`); }
      if (this.object) { [this.name, this.index] = [this.index, this.name]; }
      if (__guardMethod__(this.index, 'isArray', o => o.isArray()) || __guardMethod__(this.index, 'isObject', o1 => o1.isObject())) { this.index.error('index cannot be a pattern matching expression'); }
      this.range   = this.source instanceof Value && this.source.base instanceof Range && !this.source.properties.length && !this.from;
      this.pattern = this.name instanceof Value;
      if (this.range && this.index) { this.index.error('indexes do not apply to range loops'); }
      if (this.range && this.pattern) { this.name.error('cannot pattern match over range loops'); }
      this.returns = false;
      // Move up any comments in the “`for` line”, i.e. the line of code with `for`,
      // from any child nodes of that line up to the `for` node itself so that these
      // comments get output, and get output above the `for` loop.
      for (var attribute of ['source', 'guard', 'step', 'name', 'index']) {
        if (this[attribute]) {
          this[attribute].traverseChildren(true, node => {
            if (node.comments) {
              // These comments are buried pretty deeply, so if they happen to be
              // trailing comments the line they trail will be unrecognizable when
              // we’re done compiling this `for` loop; so just shift them up to
              // output above the `for` line.
              for (let comment of Array.from(node.comments)) { comment.newLine = (comment.unshift = true); }
              return moveComments(node, this[attribute]);
            }
        });
          moveComments(this[attribute], this);
        }
      }
    }

    // Welcome to the hairiest method in all of CoffeeScript. Handles the inner
    // loop, filtering, stepping, and result saving for array, object, and range
    // comprehensions. Some of the generated code can be shared in common, and
    // some cannot.
    compileNode(o) {
      let forPartFragments, ivar, name, namePart, resultPart, returnResult, rvar, step, stepNum, stepVar, svar;
      let body        = Block.wrap([this.body]);
      const last = body.expressions[body.expressions.length - 1];
      if ((last != null ? last.jumps() : undefined) instanceof Return) { this.returns    = false; }
      const source      = this.range ? this.source.base : this.source;
      const {
        scope
      } = o;
      if (!this.pattern) { name        = this.name  && (this.name.compile(o, LEVEL_LIST)); }
      const index       = this.index && (this.index.compile(o, LEVEL_LIST));
      if (name && !this.pattern) { scope.find(name); }
      if (index && !(this.index instanceof Value)) { scope.find(index); }
      if (this.returns) { rvar        = scope.freeVariable('results'); }
      if (this.from) {
        if (this.pattern) { ivar = scope.freeVariable('x', {single: true}); }
      } else {
        ivar = (this.object && index) || scope.freeVariable('i', {single: true});
      }
      const kvar        = ((this.range || this.from) && name) || index || ivar;
      const kvarAssign  = kvar !== ivar ? `${kvar} = ` : "";
      if (this.step && !this.range) {
        [step, stepVar] = this.cacheToCodeFragments(this.step.cache(o, LEVEL_LIST, shouldCacheOrIsAssignable));
        if (this.step.isNumber()) { stepNum   = Number(stepVar); }
      }
      if (this.pattern) { name        = ivar; }
      let varPart     = '';
      let guardPart   = '';
      let defPart     = '';
      const idt1        = this.tab + TAB;
      if (this.range) {
        forPartFragments = source.compileToFragments(merge(o,
          {index: ivar, name, step: this.step, shouldCache: shouldCacheOrIsAssignable}));
      } else {
        svar    = this.source.compile(o, LEVEL_LIST);
        if ((name || this.own) && !(this.source.unwrap() instanceof IdentifierLiteral)) {
          let ref;
          defPart    += `${this.tab}${(ref = scope.freeVariable('ref'))} = ${svar};\n`;
          svar       = ref;
        }
        if (name && !this.pattern && !this.from) {
          namePart   = `${name} = ${svar}[${kvar}]`;
        }
        if (!this.object && !this.from) {
          let increment, lvar;
          if (step !== stepVar) { defPart += `${this.tab}${step};\n`; }
          const down = stepNum < 0;
          if (!this.step || (stepNum == null) || !down) { lvar = scope.freeVariable('len'); }
          let declare = `${kvarAssign}${ivar} = 0, ${lvar} = ${svar}.length`;
          const declareDown = `${kvarAssign}${ivar} = ${svar}.length - 1`;
          let compare = `${ivar} < ${lvar}`;
          const compareDown = `${ivar} >= 0`;
          if (this.step) {
            if (stepNum != null) {
              if (down) {
                compare = compareDown;
                declare = declareDown;
              }
            } else {
              compare = `${stepVar} > 0 ? ${compare} : ${compareDown}`;
              declare = `(${stepVar} > 0 ? (${declare}) : ${declareDown})`;
            }
            increment = `${ivar} += ${stepVar}`;
          } else {
            increment = `${kvar !== ivar ? `++${ivar}` : `${ivar}++`}`;
          }
          forPartFragments = [this.makeCode(`${declare}; ${compare}; ${kvarAssign}${increment}`)];
        }
      }
      if (this.returns) {
        resultPart   = `${this.tab}${rvar} = [];\n`;
        returnResult = `\n${this.tab}return ${rvar};`;
        body.makeReturn(rvar);
      }
      if (this.guard) {
        if (body.expressions.length > 1) {
          body.expressions.unshift(new If((new Parens(this.guard)).invert(), new StatementLiteral("continue")));
        } else {
          if (this.guard) { body = Block.wrap([new If(this.guard, body)]); }
        }
      }
      if (this.pattern) {
        body.expressions.unshift(new Assign(this.name, this.from ? new IdentifierLiteral(kvar) : new Literal(`${svar}[${kvar}]`)));
      }

      if (namePart) { varPart = `\n${idt1}${namePart};`; }
      if (this.object) {
        forPartFragments = [this.makeCode(`${kvar} in ${svar}`)];
        if (this.own) { guardPart = `\n${idt1}if (!${utility('hasProp', o)}.call(${svar}, ${kvar})) continue;`; }
      } else if (this.from) {
        forPartFragments = [this.makeCode(`${kvar} of ${svar}`)];
      }
      let bodyFragments = body.compileToFragments(merge(o, {indent: idt1}), LEVEL_TOP);
      if (bodyFragments && (bodyFragments.length > 0)) {
        bodyFragments = [].concat(this.makeCode('\n'), bodyFragments, this.makeCode('\n'));
      }

      let fragments = [this.makeCode(defPart)];
      if (resultPart) { fragments.push(this.makeCode(resultPart)); }
      fragments = fragments.concat(this.makeCode(this.tab), this.makeCode( 'for ('),
        forPartFragments, this.makeCode(`) {${guardPart}${varPart}`), bodyFragments,
        this.makeCode(this.tab), this.makeCode('}'));
      if (returnResult) { fragments.push(this.makeCode(returnResult)); }
      return fragments;
    }
  };
  For.initClass();
  return For;
})());

//### Switch

// A JavaScript *switch* statement. Converts into a returnable expression on-demand.
exports.Switch = (Switch = (function() {
  Switch = class Switch extends Base {
    static initClass() {
  
      this.prototype.children = ['subject', 'cases', 'otherwise'];
  
      this.prototype.isStatement = YES;
    }
    constructor(subject, cases, otherwise) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.subject = subject;
      this.cases = cases;
      this.otherwise = otherwise;
      super();
    }

    jumps(o) {
      if (o == null) { o = {block: true}; }
      for (let [conds, block] of Array.from(this.cases)) {
        var jumpNode;
        if (jumpNode = block.jumps(o)) { return jumpNode; }
      }
      return (this.otherwise != null ? this.otherwise.jumps(o) : undefined);
    }

    makeReturn(res) {
      for (let pair of Array.from(this.cases)) { pair[1].makeReturn(res); }
      if (res) { if (!this.otherwise) { this.otherwise = new Block([new Literal('void 0')]); } }
      if (this.otherwise != null) {
        this.otherwise.makeReturn(res);
      }
      return this;
    }

    compileNode(o) {
      const idt1 = o.indent + TAB;
      const idt2 = (o.indent = idt1 + TAB);
      let fragments = [].concat(this.makeCode(this.tab + "switch ("),
        (this.subject ? this.subject.compileToFragments(o, LEVEL_PAREN) : this.makeCode("false")),
        this.makeCode(") {\n"));
      for (let i = 0; i < this.cases.length; i++) {
        var body, cond;
        const [conditions, block] = this.cases[i];
        for (cond of Array.from(flatten([conditions]))) {
          if (!this.subject) { cond  = cond.invert(); }
          fragments = fragments.concat(this.makeCode(idt1 + "case "), cond.compileToFragments(o, LEVEL_PAREN), this.makeCode(":\n"));
        }
        if ((body = block.compileToFragments(o, LEVEL_TOP)).length > 0) { fragments = fragments.concat(body, this.makeCode('\n')); }
        if ((i === (this.cases.length - 1)) && !this.otherwise) { break; }
        const expr = this.lastNode(block.expressions);
        if (expr instanceof Return || expr instanceof Throw || (expr instanceof Literal && expr.jumps() && (expr.value !== 'debugger'))) { continue; }
        fragments.push(cond.makeCode(idt2 + 'break;\n'));
      }
      if (this.otherwise && this.otherwise.expressions.length) {
        fragments.push(this.makeCode(idt1 + "default:\n"), ...(this.otherwise.compileToFragments(o, LEVEL_TOP)), this.makeCode("\n"));
      }
      fragments.push(this.makeCode(this.tab + '}'));
      return fragments;
    }
  };
  Switch.initClass();
  return Switch;
})());

//### If

// *If/else* statements. Acts as an expression by pushing down requested returns
// to the last line of each clause.
//
// Single-expression **Ifs** are compiled into conditional operators if possible,
// because ternaries are already proper expressions, and don’t need conversion.
exports.If = (If = (function() {
  If = class If extends Base {
    static initClass() {
  
      this.prototype.children = ['condition', 'body', 'elseBody'];
    }
    constructor(condition, body, options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.body = body;
      if (options == null) { options = {}; }
      super();
      this.condition = options.type === 'unless' ? condition.invert() : condition;
      this.elseBody  = null;
      this.isChain   = false;
      ({soak: this.soak}    = options);
      if (this.condition.comments) { moveComments(this.condition, this); }
    }

    bodyNode() { return (this.body != null ? this.body.unwrap() : undefined); }
    elseBodyNode() { return (this.elseBody != null ? this.elseBody.unwrap() : undefined); }

    // Rewrite a chain of **Ifs** to add a default case as the final *else*.
    addElse(elseBody) {
      if (this.isChain) {
        this.elseBodyNode().addElse(elseBody);
      } else {
        this.isChain  = elseBody instanceof If;
        this.elseBody = this.ensureBlock(elseBody);
        this.elseBody.updateLocationDataIfMissing(elseBody.locationData);
      }
      return this;
    }

    // The **If** only compiles into a statement if either of its bodies needs
    // to be a statement. Otherwise a conditional operator is safe.
    isStatement(o) {
      return ((o != null ? o.level : undefined) === LEVEL_TOP) ||
        this.bodyNode().isStatement(o) || __guard__(this.elseBodyNode(), x => x.isStatement(o));
    }

    jumps(o) { return this.body.jumps(o) || (this.elseBody != null ? this.elseBody.jumps(o) : undefined); }

    compileNode(o) {
      if (this.isStatement(o)) { return this.compileStatement(o); } else { return this.compileExpression(o); }
    }

    makeReturn(res) {
      if (res) { if (!this.elseBody) { this.elseBody = new Block([new Literal('void 0')]); } }
      if (this.body) { this.body = new Block([this.body.makeReturn(res)]); }
      if (this.elseBody) { this.elseBody = new Block([this.elseBody.makeReturn(res)]); }
      return this;
    }

    ensureBlock(node) {
      if (node instanceof Block) { return node; } else { return new Block([node]); }
    }

    // Compile the `If` as a regular *if-else* statement. Flattened chains
    // force inner *else* bodies into statement form.
    compileStatement(o) {
      const child    = del(o, 'chainChild');
      const exeq     = del(o, 'isExistentialEquals');

      if (exeq) {
        return new If(this.condition.invert(), this.elseBodyNode(), {type: 'if'}).compileToFragments(o);
      }

      const indent   = o.indent + TAB;
      const cond     = this.condition.compileToFragments(o, LEVEL_PAREN);
      const body     = this.ensureBlock(this.body).compileToFragments(merge(o, {indent}));
      const ifPart   = [].concat(this.makeCode("if ("), cond, this.makeCode(") {\n"), body, this.makeCode(`\n${this.tab}}`));
      if (!child) { ifPart.unshift(this.makeCode(this.tab)); }
      if (!this.elseBody) { return ifPart; }
      let answer = ifPart.concat(this.makeCode(' else '));
      if (this.isChain) {
        o.chainChild = true;
        answer = answer.concat(this.elseBody.unwrap().compileToFragments(o, LEVEL_TOP));
      } else {
        answer = answer.concat(this.makeCode("{\n"), this.elseBody.compileToFragments(merge(o, {indent}), LEVEL_TOP), this.makeCode(`\n${this.tab}}`));
      }
      return answer;
    }

    // Compile the `If` as a conditional operator.
    compileExpression(o) {
      const cond = this.condition.compileToFragments(o, LEVEL_COND);
      const body = this.bodyNode().compileToFragments(o, LEVEL_LIST);
      const alt  = this.elseBodyNode() ? this.elseBodyNode().compileToFragments(o, LEVEL_LIST) : [this.makeCode('void 0')];
      const fragments = cond.concat(this.makeCode(" ? "), body, this.makeCode(" : "), alt);
      if (o.level >= LEVEL_COND) { return this.wrapInParentheses(fragments); } else { return fragments; }
    }

    unfoldSoak() {
      return this.soak && this;
    }
  };
  If.initClass();
  return If;
})());

// Constants
// ---------

const UTILITIES = {
  modulo() { return 'function(a, b) { return (+a % (b = +b) + b) % b; }'; },
  objectWithoutKeys() { return `\
function(o, ks) { \
var res = {}; \
for (var k in o) ([].indexOf.call(ks, k) < 0 && {}.hasOwnProperty.call(o, k)) && (res[k] = o[k]); \
return res; \
}\
`; },
  boundMethodCheck() { return `\
function(instance, Constructor) { \
if (!(instance instanceof Constructor)) { \
throw new Error('Bound instance method accessed before binding'); \
} \
}\
`; },
  _extends() { return `\
Object.assign || function (target) { \
for (var i = 1; i < arguments.length; i++) { \
var source = arguments[i]; \
for (var key in source) { \
if (Object.prototype.hasOwnProperty.call(source, key)) { \
target[key] = source[key]; \
} \
} \
} \
return target; \
}\
`; },

  // Shortcuts to speed up the lookup time for native functions.
  hasProp() { return '{}.hasOwnProperty'; },
  indexOf() { return '[].indexOf'; },
  slice() { return '[].slice'; },
  splice() { return '[].splice'; }
};

// Levels indicate a node's position in the AST. Useful for knowing if
// parens are necessary or superfluous.
var LEVEL_TOP    = 1;  // ...;
var LEVEL_PAREN  = 2;  // (...)
var LEVEL_LIST   = 3;  // [...]
var LEVEL_COND   = 4;  // ... ? x : y
var LEVEL_OP     = 5;  // !...
var LEVEL_ACCESS = 6;  // ...[0]

// Tabs are two spaces for pretty printing.
var TAB = '  ';

var SIMPLENUM = /^[+-]?\d+$/;

// Helper Functions
// ----------------

// Helper for ensuring that utility functions are assigned at the top level.
var utility = function(name, o) {
  const {root} = o.scope;
  if (name in root.utilities) {
    return root.utilities[name];
  } else {
    const ref = root.freeVariable(name);
    root.assign(ref, UTILITIES[name](o));
    return root.utilities[name] = ref;
  }
};

var multident = function(code, tab, includingFirstLine) {
  if (includingFirstLine == null) { includingFirstLine = true; }
  const endsWithNewLine = code[code.length - 1] === '\n';
  code = (includingFirstLine ? tab : '') + code.replace(/\n/g, `$&${tab}`);
  code = code.replace(/\s+$/, '');
  if (endsWithNewLine) { code = code + '\n'; }
  return code;
};

// Wherever in CoffeeScript 1 we might’ve inserted a `makeCode "#{@tab}"` to
// indent a line of code, now we must account for the possibility of comments
// preceding that line of code. If there are such comments, indent each line of
// such comments, and _then_ indent the first following line of code.
var indentInitial = function(fragments, node) {
  for (let fragmentIndex = 0; fragmentIndex < fragments.length; fragmentIndex++) {
    const fragment = fragments[fragmentIndex];
    if (fragment.isHereComment) {
      fragment.code = multident(fragment.code, node.tab);
    } else {
      fragments.splice(fragmentIndex, 0, node.makeCode(`${node.tab}`));
      break;
    }
  }
  return fragments;
};

var hasLineComments = function(node) {
  if (!node.comments) { return false; }
  for (let comment of Array.from(node.comments)) {
    if (comment.here === false) { return true; }
  }
  return false;
};

// Move the `comments` property from one object to another, deleting it from
// the first object.
var moveComments = function(from, to) {
  if (!(from != null ? from.comments : undefined)) { return; }
  attachCommentsToNode(from.comments, to);
  return delete from.comments;
};

// Sometimes when compiling a node, we want to insert a fragment at the start
// of an array of fragments; but if the start has one or more comment fragments,
// we want to insert this fragment after those but before any non-comments.
var unshiftAfterComments = function(fragments, fragmentToInsert) {
  let inserted = false;
  for (let fragmentIndex = 0; fragmentIndex < fragments.length; fragmentIndex++) {
    const fragment = fragments[fragmentIndex];
    if (!fragment.isComment) {
      fragments.splice(fragmentIndex, 0, fragmentToInsert);
      inserted = true;
      break;
    }
  }
  if (!inserted) { fragments.push(fragmentToInsert); }
  return fragments;
};

var isLiteralArguments = node => node instanceof IdentifierLiteral && (node.value === 'arguments');

var isLiteralThis = node => node instanceof ThisLiteral || (node instanceof Code && node.bound);

var shouldCacheOrIsAssignable = node => node.shouldCache() || (typeof node.isAssignable === 'function' ? node.isAssignable() : undefined);

// Unfold a node's child if soak, then tuck the node under created `If`
var unfoldSoak = function(o, parent, name) {
  let ifn;
  if (!(ifn = parent[name].unfoldSoak(o))) { return; }
  parent[name] = ifn.body;
  ifn.body = new Value(parent);
  return ifn;
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}