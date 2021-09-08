import Store from '../lib/store.js';

export default {
    get: function (req, h) {
        return Store.all();
    },
    post: function (req, h) {
        return Store.get(Store.put(req.payload));
    }
};
