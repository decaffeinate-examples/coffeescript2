/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Parser
// ---------

test("operator precedence for logical operators", function() {
  const source = `\
a or b and c\
`;
  const block = CoffeeScript.nodes(source);
  const [expression] = block.expressions;
  eq(expression.first.base.value, 'a');
  eq(expression.operator, '||');
  eq(expression.second.first.base.value, 'b');
  eq(expression.second.operator, '&&');
  return eq(expression.second.second.base.value, 'c');
});

test("operator precedence for bitwise operators", function() {
  const source = `\
a | b ^ c & d\
`;
  const block = CoffeeScript.nodes(source);
  const [expression] = block.expressions;
  eq(expression.first.base.value, 'a');
  eq(expression.operator, '|');
  eq(expression.second.first.base.value, 'b');
  eq(expression.second.operator, '^');
  eq(expression.second.second.first.base.value, 'c');
  eq(expression.second.second.operator, '&');
  return eq(expression.second.second.second.base.value, 'd');
});

test("operator precedence for binary ? operator", function() {
  const source = `\
a ? b and c\
`;
  const block = CoffeeScript.nodes(source);
  const [expression] = block.expressions;
  eq(expression.first.base.value, 'a');
  eq(expression.operator, '?');
  eq(expression.second.first.base.value, 'b');
  eq(expression.second.operator, '&&');
  return eq(expression.second.second.base.value, 'c');
});

test("new calls have a range including the new", function() {
  const source = `\
a = new B().c(d)\
`;
  const block = CoffeeScript.nodes(source);

  const assertColumnRange = function(node, firstColumn, lastColumn) {
    eq(node.locationData.first_line, 0);
    eq(node.locationData.first_column, firstColumn);
    eq(node.locationData.last_line, 0);
    return eq(node.locationData.last_column, lastColumn);
  };

  const [assign] = block.expressions;
  const outerCall = assign.value;
  const innerValue = outerCall.variable;
  const innerCall = innerValue.base;

  assertColumnRange(assign, 0, 15);
  assertColumnRange(outerCall, 4, 15);
  assertColumnRange(innerValue, 4, 12);
  return assertColumnRange(innerCall, 4, 10);
});

test("location data is properly set for nested `new`", function() {
  const source = `\
new new A()()\
`;
  const block = CoffeeScript.nodes(source);

  const assertColumnRange = function(node, firstColumn, lastColumn) {
    eq(node.locationData.first_line, 0);
    eq(node.locationData.first_column, firstColumn);
    eq(node.locationData.last_line, 0);
    return eq(node.locationData.last_column, lastColumn);
  };

  const [outerCall] = block.expressions;
  const innerCall = outerCall.variable;

  assertColumnRange(outerCall, 0, 12);
  return assertColumnRange(innerCall, 4, 10);
});
