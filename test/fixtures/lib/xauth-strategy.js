"use strict";

const Boom = require("@hapi/boom");

const register = function (server, { name, scheme, where, lookup }) {
    server.auth.strategy(name, scheme, {
        validate: async function (request) {
            const token = request.headers[lookup];

            if (token === "12345") {
                return {
                    credentials: { scope: ["read"] },
                    artifacts: { token },
                };
            }

            throw Boom.unauthorized();
        },
    });
};

module.exports = { register, name: "x-auth-strategy" };
