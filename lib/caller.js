'use strict';

/*
 * Copy of Erik's caller module with node 8 support added.
*/

/**
 * Module wrapper of @substack's `caller.js`
 * @original: https://github.com/substack/node-resolve/blob/master/lib/caller.js
 * @blessings: https://twitter.com/eriktoth/statuses/413719312273125377
 * @see https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
 */
module.exports = function (depth) {

    const pst = Error.prepareStackTrace;

    Error.prepareStackTrace = function (e, frames) {
        const stack = frames.map((frame) => {
            return frame.getFileName();
        });

        Error.prepareStackTrace = pst;

        return stack;
    };

    const stack = (new Error()).stack.slice(2);

    let file;

    do {
        file = stack.shift();
    } while (stack.length && file.match(/module\.js?/));

    return file;
};
