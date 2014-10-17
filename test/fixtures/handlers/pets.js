'use strict';

var store = require('../lib/store');

module.exports = {
    get: function (req, reply) {
        reply(store.all());
    },
    post: function (req, reply) {
        reply(store.get(store.put(req.payload)));
    }
};
