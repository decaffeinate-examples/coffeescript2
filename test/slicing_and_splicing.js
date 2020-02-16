/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS201: Simplify complex destructure assignments
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Slicing and Splicing
// --------------------

// * Slicing
// * Splicing

// shared array
const shared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Slicing

test("basic slicing", function() {
  arrayEq([7, 8, 9]   , shared.slice(7, 10));
  arrayEq([2, 3]      , shared.slice(2, 4));
  return arrayEq([2, 3, 4, 5], shared.slice(2, 6));
});

test("slicing with variables as endpoints", function() {
  const [a, b] = [1, 4];
  arrayEq([1, 2, 3, 4], shared.slice(a, +b + 1 || undefined));
  return arrayEq([1, 2, 3]   , shared.slice(a, b));
});

test("slicing with expressions as endpoints", function() {
  const [a, b] = [1, 3];
  arrayEq([2, 3, 4, 5, 6], shared.slice((a+1), +(2*b) + 1 || undefined));
  return arrayEq([2, 3, 4, 5]   , shared.slice(a+1, (2*b)));
});

test("unbounded slicing", function() {
  let a;
  let asc, end;
  let asc1, end1, start;
  arrayEq([7, 8, 9]   , shared.slice(7));
  arrayEq([8, 9]      , shared.slice(-2));
  arrayEq([9]         , shared.slice(-1));
  arrayEq([0, 1, 2]   , shared.slice(0, 3));
  arrayEq([0, 1, 2, 3], shared.slice(0, +-7 + 1 || undefined));

  arrayEq(shared      , shared.slice(0));
  arrayEq(shared.slice(0, 9), shared.slice(0, -1));

  for (a = -shared.length, end = shared.length, asc = -shared.length <= end; asc ? a <= end : a >= end; asc ? a++ : a--) {
    arrayEq(shared.slice(a) , shared.slice(a));
  }
  for (start = -shared.length+1, a = start, end1 = shared.length, asc1 = start <= end1; asc1 ? a < end1 : a > end1; asc1 ? a++ : a--) {
    arrayEq(shared.slice(0, +a + 1 || undefined).slice(0, -1) , shared.slice(0, a));
  }

  return arrayEq([1, 2, 3], [1, 2, 3].slice());
});

test("#930, #835, #831, #746 #624: inclusive slices to -1 should slice to end", function() {
  arrayEq(shared, shared.slice(0));
  arrayEq(shared, shared.slice(0));
  return arrayEq(shared.slice(1,shared.length), shared.slice(1));
});

test("string slicing", function() {
  const str = "abcdefghijklmnopqrstuvwxyz";
  ok(str.slice(1, 1) === "");
  ok(str.slice(1, 2) === "b");
  ok(str.slice(1, 5) === "bcde");
  ok(str.slice(0, 5) === "abcde");
  return ok(str.slice(-5) === "vwxyz");
});

test("#1722: operator precedence in unbounded slice compilation", function() {
  const list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const n = 2; // some truthy number in `list`
  arrayEq(__range__(0, n, true), list.slice(0, +n + 1 || undefined));
  arrayEq(__range__(0, n, true), list.slice(0, +(n || 0) + 1 || undefined));
  return arrayEq(__range__(0, n, true), list.slice(0, +(n ? n : 0) + 1 || undefined));
});

test("#2349: inclusive slicing to numeric strings", () => arrayEq([0, 1], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, +"1" + 1 || undefined)));

test("#4631: slicing with space before and/or after the dots", function() {
  const a = s => s;
  const b = [4, 5, 6];
  const c = [7, 8, 9];
  arrayEq([2, 3, 4], shared.slice(2 ,  5));
  arrayEq([3, 4, 5], shared.slice(3,  6));
  arrayEq([4, 5, 6], shared.slice(4 , 7));
  arrayEq(shared.slice((a(...b)), (a(...c)))  , shared.slice((a(...b)), (a(...c))));
  arrayEq(shared.slice((a(...b)) ,  (a(...c))), shared.slice((a(...b)) ,  (a(...c))));
  arrayEq(shared.slice((a(...b)),  (a(...c))) , shared.slice((a(...b)),  (a(...c))));
  return arrayEq(shared.slice((a(...b)) , (a(...c))) , shared.slice((a(...b)) , (a(...c))));
});


// Splicing

test("basic splicing", function() {
  let ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  ary.splice(5, 9 - 5 + 1, ...[].concat([0, 0, 0]));
  arrayEq([0, 1, 2, 3, 4, 0, 0, 0], ary);

  ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  ary.splice(2, 8 - 2, ...[].concat([]));
  return arrayEq([0, 1, 8, 9], ary);
});

test("unbounded splicing", function() {
  const ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  ary.splice(3, 9e9, ...[].concat([9, 8, 7]));
  arrayEq([0, 1, 2, 9, 8, 7]. ary);

  ary.splice(0, 3, ...[].concat([7, 8, 9]));
  arrayEq([7, 8, 9, 9, 8, 7], ary);

  ary.splice(0, 9e9, ...[].concat([1, 2, 3]));
  return arrayEq([1, 2, 3], ary);
});

test("splicing with variables as endpoints", function() {
  const [a, b] = [1, 8];

  let ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  ary.splice(a, b - a + 1, ...[].concat([2, 3]));
  arrayEq([0, 2, 3, 9], ary);

  ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  ary.splice(a, b - a, ...[].concat([5]));
  return arrayEq([0, 5, 8, 9], ary);
});

test("splicing with expressions as endpoints", function() {
  let ref, ref1;
  const [a, b] = [1, 3];

  let ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  ary.splice( ref = a+1 ,  ((2*b)+1) - ref + 1 , ...[].concat([4]));
  arrayEq([0, 1, 4, 8, 9], ary);

  ary = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  ary.splice(ref1 = a+1, ((2*b)+1) - ref1, ...[].concat([4]));
  return arrayEq([0, 1, 4, 7, 8, 9], ary);
});

test("splicing to the end, against a one-time function", function() {
  let ary = null;
  const fn = function() {
    if (ary) {
      throw 'err';
    } else {
      return ary = [1, 2, 3];
    }
  };

  fn().splice(0, 9e9, ...[].concat(1));

  return arrayEq(ary, [1]);
});

test("the return value of a splice literal should be the RHS", function() {
  let ary = [0, 0, 0];
  eq(((ary.splice(0, 1 + 1, ...[].concat(2)), 2)), 2);

  ary = [0, 0, 0];
  eq(((ary.splice(0, 9e9, ...[].concat(3)), 3)), 3);

  return arrayEq([(ary.splice(0, 0 + 1, ...[].concat(0)), 0)], [0]);
});

test("#1723: operator precedence in unbounded splice compilation", function() {
  const n = 4; // some truthy number in `list`

  let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  list.splice(0, n + 1, ...[].concat(n));
  arrayEq(__range__(n, 9, true), list);

  list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  list.splice(0, (n || 0) + 1, ...[].concat(n));
  arrayEq(__range__(n, 9, true), list);

  list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  list.splice(0, (n ? n : 0) + 1, ...[].concat(n));
  return arrayEq(__range__(n, 9, true), list);
});

test("#2953: methods on endpoints in assignment from array splice literal", function() {
  let ref;
  const list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  Number.prototype.same = function() { return this; };
  list.splice(ref = (1).same(), (9).same() - ref, ...[].concat(5));
  delete Number.prototype.same;

  return arrayEq([0, 5, 9], list);
});

test("#1726: `Op` expression in property access causes unexpected results", function() {
  const a = [0, 1, 2];
  arrayEq(a, a.slice((Array.from(a).includes(!1))));
  arrayEq(a, a.slice(Array.from(a).includes(!1)));
  return arrayEq(a.slice((Array.from(a).includes(!1))), a.slice((Array.from(a).includes(!1))));
});

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}