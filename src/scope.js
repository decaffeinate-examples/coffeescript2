/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// The **Scope** class regulates lexical scoping within CoffeeScript. As you
// generate code, you create a tree of scopes in the same shape as the nested
// function bodies. Each scope knows about the variables declared within it,
// and has a reference to its parent enclosing scope. In this way, we know which
// variables are new and need to be declared with `var`, and which are shared
// with external scopes.
let Scope;
exports.Scope = (Scope = class Scope {

// Initialize a scope with its parent, for lookups up the chain,
// as well as a reference to the **Block** node it belongs to, which is
// where it should declare its variables, a reference to the function that
// it belongs to, and a list of variables referenced in the source code
// and therefore should be avoided when generating variables. Also track comments
// that should be output as part of variable declarations.
  constructor(parent, expressions, method, referencedVars) {
    this.parent = parent;
    this.expressions = expressions;
    this.method = method;
    this.referencedVars = referencedVars;
    this.variables = [{name: 'arguments', type: 'arguments'}];
    this.comments  = {};
    this.positions = {};
    if (!this.parent) { this.utilities = {}; }

// The `@root` is the top-level **Scope** object for a given file.
    this.root = (this.parent != null ? this.parent.root : undefined) != null ? (this.parent != null ? this.parent.root : undefined) : this;
  }

// Adds a new variable or overrides an existing one.
  add(name, type, immediate) {
    if (this.shared && !immediate) { return this.parent.add(name, type, immediate); }
    if (Object.prototype.hasOwnProperty.call(this.positions, name)) {
      return this.variables[this.positions[name]].type = type;
    } else {
      return this.positions[name] = this.variables.push({name, type}) - 1;
    }
  }

// When `super` is called, we need to find the name of the current method we're
// in, so that we know how to invoke the same method of the parent class. This
// can get complicated if super is being called from an inner function.
// `namedMethod` will walk up the scope tree until it either finds the first
// function object that has a name filled in, or bottoms out.
  namedMethod() {
    if ((this.method != null ? this.method.name : undefined) || !this.parent) { return this.method; }
    return this.parent.namedMethod();
  }

// Look up a variable name in lexical scope, and declare it if it does not
// already exist.
  find(name, type) {
    if (type == null) { type = 'var'; }
    if (this.check(name)) { return true; }
    this.add(name, type);
    return false;
  }

// Reserve a variable name as originating from a function parameter for this
// scope. No `var` required for internal references.
  parameter(name) {
    if (this.shared && this.parent.check(name, true)) { return; }
    return this.add(name, 'param');
  }

// Just check to see if a variable has already been declared, without reserving,
// walks up to the root scope.
  check(name) {
    return !!(this.type(name) || (this.parent != null ? this.parent.check(name) : undefined));
  }

// Generate a temporary variable name at the given index.
  temporary(name, index, single) {
    if (single == null) { single = false; }
    if (single) {
      const startCode = name.charCodeAt(0);
      const endCode = 'z'.charCodeAt(0);
      const diff = endCode - startCode;
      const newCode = startCode + (index % (diff + 1));
      const letter = String.fromCharCode(newCode);
      const num = Math.floor(index / (diff + 1));
      return `${letter}${num || ''}`;
    } else {
      return `${name}${index || ''}`;
    }
  }

// Gets the type of a variable.
  type(name) {
    for (let v of Array.from(this.variables)) { if (v.name === name) { return v.type; } }
    return null;
  }

// If we need to store an intermediate result, find an available name for a
// compiler-generated variable. `_var`, `_var2`, and so on...
  freeVariable(name, options) {
    let temp;
    if (options == null) { options = {}; }
    let index = 0;
    while (true) {
      temp = this.temporary(name, index, options.single);
      if (!this.check(temp) && !Array.from(this.root.referencedVars).includes(temp)) { break; }
      index++;
    }
    if (options.reserve != null ? options.reserve : true) { this.add(temp, 'var', true); }
    return temp;
  }

// Ensure that an assignment is made at the top of this scope
// (or at the top-level scope, if requested).
  assign(name, value) {
    this.add(name, {value, assigned: true}, true);
    return this.hasAssignments = true;
  }

// Does this scope have any declared variables?
  hasDeclarations() {
    return !!this.declaredVariables().length;
  }

// Return the list of variables first declared in this scope.
  declaredVariables() {
    return (Array.from(this.variables).filter((v) => v.type === 'var').map((v) => v.name)).sort();
  }

// Return the list of assignments that are supposed to be made at the top
// of this scope.
  assignedVariables() {
    return Array.from(this.variables).filter((v) => v.type.assigned).map((v) => `${v.name} = ${v.type.value}`);
  }
});
