'use strict';

var Store = require('../lib/store');

module.exports = {
    get: function (req, reply) {
        reply(Store.all());
    },
    post: function (req, reply) {
        reply(Store.get(Store.put(req.payload)));
    }
};
