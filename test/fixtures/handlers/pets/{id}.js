'use strict';

var Store = require('../../lib/store');

module.exports = {
    get: [
        function (req, h) {
            return Store.get(req.params.id);
        },
        function handler(req, h) {
            return req.pre.p1;
        }
    ],
    delete: function (req, h) {
        Store.delete(req.params.id);
        return Store.all();
    }
};
