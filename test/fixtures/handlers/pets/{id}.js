'use strict';

var Store = require('../../lib/store');

module.exports = {
    get: [
        function (req, reply) {
            reply(Store.get(req.params.id));
        },
        function handler(req, reply) {
            reply(req.pre.p1);
        }
    ],
    delete: function (req, reply) {
        Store.delete(req.params.id);
        reply(Store.all());
    }
};
