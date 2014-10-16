'use strict';

var store = require('../../lib/store');


module.exports = {
    get: function (req, reply) {
        reply(store.get(req.param('id')));
    },
    delete: function (req, reply) {
        store.delete(req.param('id'));
        reply(store.all());
    }
};
