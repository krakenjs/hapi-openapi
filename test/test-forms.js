'use strict';

const Test = require('tape');
const Path = require('path');
const Swaggerize = require('../lib');
const Hapi = require('hapi');

Test('form data', function (t) {
    var server;

    t.test('success', function (t) {
        t.plan(3);

        server = new Hapi.Server();

        server.connection({});

        server.register({
            register: Swaggerize,
            options: {
                api: Path.join(__dirname, './fixtures/defs/pets.json'),
                handlers: {
                    upload: {
                        $post: function (req, reply) {
                            t.strictEqual(typeof req.payload, 'object');
                            reply();
                        }
                    }
                }
            }
        }, function (err) {
            t.error(err, 'No error.');
        });

        server.inject({
            method: 'POST',
            url: '/v1/petstore/upload',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            payload: 'name=thing&upload=data'
        }, function (response) {
            t.strictEqual(response.statusCode, 200, 'OK status.');
        });
    });

    t.test('bad content type', function (t) {
        t.plan(1);

        server.inject({
            method: 'POST',
            url: '/v1/petstore/upload',
            payload: 'name=thing&upload=data'
        }, function (response) {
            t.strictEqual(response.statusCode, 400, '400 status.');
        });
    });

    t.test('invalid payload', function (t) {
        t.plan(1);

        server.inject({
            method: 'POST',
            url: '/v1/petstore/upload',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            payload: 'name=thing&upload='
        }, function (response) {
            t.strictEqual(response.statusCode, 400, '400 status.');
        });
    });
});
