/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Boolean Literals
// ----------------

// TODO: add method invocation tests: true.toString() is "true"

test("#764 Booleans should be indexable", function() {
  const {
    toString
  } = Boolean.prototype;

  eq(toString, true['toString']);
  eq(toString, false['toString']);
  eq(toString, true['toString']);
  eq(toString, false['toString']);
  eq(toString, true['toString']);
  eq(toString, false['toString']);

  eq(toString, true.toString);
  eq(toString, false.toString);
  eq(toString, true.toString);
  eq(toString, false.toString);
  eq(toString, true.toString);
  return eq(toString, false.toString);
});
