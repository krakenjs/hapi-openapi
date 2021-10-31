'use strict';

const Store = require('../lib/store');

module.exports = {
    get: function (req, h) {
        return Store.all();
    },
    post: function (req, h) {
        return Store.get(Store.put(req.payload));
    },
    getFirstPet: function (req, h) {
        return Store.first();
    },
    findPetById: [
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
