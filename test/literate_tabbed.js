/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// # Tabbed Literate CoffeeScript Test
// 
// comment comment
let testsCount = 0; // Track the number of tests run in this file, to make sure they all run

test("basic literate CoffeeScript parsing", function() {
	ok(true);
	return testsCount++;
});

// now with a...
test("broken up indentation", () => // ... broken up ...
(function() {

// ... nested block.
    ok(true);
    return testsCount++;
})());

// Code must be separated from text by a blank line.
test("code blocks must be preceded by a blank line", function() {

// The next line is part of the text and will not be executed.
//     fail()
	ok(true);
	return testsCount++;
});

// Code in `backticks is not parsed` and...
test("comments in indented blocks work", () => ((() => (function() {
    // Regular comment.

    /*
        Block comment.
    */

    ok(true);
    return testsCount++;
})()))());

// Regular [Markdown](http://example.com/markdown) features, like links
// and unordered lists, are fine:
// 
//   * I
// 
//   * Am
// 
//   * A
// 
//   * List
// 
// ---
// keep track of whether code blocks are executed or not
let executed = false;

// <p>
// 
// if true
// 	executed = true # should not execute, this is just HTML para, not code!
// 
// </p>
test("should ignore code blocks inside HTML", function() {
	eq(executed, false);
	return testsCount++;
});

// ---
// 
// *   A list item followed by a code block:
test("basic literate CoffeeScript parsing", function() {
	ok(true);
	return testsCount++;
});

// ---
// 
// *   Lorem ipsum dolor sit amet, consectetuer adipiscing elit.
//     Aliquam hendrerit mi posuere lectus. Vestibulum enim wisi,
//     viverra nec, fringilla in, laoreet vitae, risus.
// 
// *   Donec sit amet nisl. Aliquam semper ipsum sit amet velit.
//     Suspendisse id sem consectetuer libero luctus adipiscing.
// 
// ---
// 
// This is [an example][id] reference-style link.
// [id]: http://example.com/  "Optional Title Here"
// 
// ---
executed = false;

// 1986. What a great season.
executed = true;

// and test...
test("should recognize indented code blocks in lists with empty line as separator", function() {
	ok(executed);
	return testsCount++;
});

// ---
executed = false;

// 1986\. What a great season.
// 				executed = yes
// 
// and test...
test("should ignore indented code in escaped list like number", function() {
	eq(executed, false);
	return testsCount++;
});

// one last test!
test("block quotes should render correctly", function() {
	const quote = `\
foo
		and bar!\
`;
	eq(quote, 'foo\n\t\tand bar!');
	return testsCount++;
});

// and finally, how did we do?
test("all tabbed literate CoffeeScript tests executed", () => eq(testsCount, 9));
