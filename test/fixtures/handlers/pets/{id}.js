'use strict';

var store = require('../../lib/store');

module.exports = {
    get: function (req, reply) {
        reply(store.get(req.params.id));
    },
    delete: function (req, reply) {
        store.delete(req.params.id);
        reply(store.all());
    }
};
