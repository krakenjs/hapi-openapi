'use strict';

const Hoek = require('@hapi/hoek');
const Store = require('../lib/store');

module.exports = {
    get: function (req, h) {
        return Store.all();
    },
    post: function (req, h) {
        return Store.get(Store.put(Hoek.reach(req.payload, 'value')));
    }
};
