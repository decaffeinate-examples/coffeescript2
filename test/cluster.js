// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS209: Avoid top-level return
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Cluster Module
// ---------

if (typeof testingBrowser !== 'undefined' && testingBrowser !== null) { return; }

const cluster = require('cluster');

if (cluster.isMaster) {
  test("#2737 - cluster module can spawn workers from a coffeescript process", function() {
    cluster.once('exit', (worker, code) => eq(code, 0));

    return cluster.fork();
  });
} else {
  process.exit(0);
}
