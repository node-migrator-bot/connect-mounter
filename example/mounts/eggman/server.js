(function () {
  "use strict";

  module.exports = require('connect')().use(function (req, res, next) {
    res.end('"[' + new Date().toISOString() + '] I am the eggman"\n');
  });
}());
