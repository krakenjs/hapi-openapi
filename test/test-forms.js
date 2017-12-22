'use strict';

const Test = require('tape');
const Path = require('path');
const Swaggerize = require('../lib');
const Hapi = require('hapi');

Test('form data', function (t) {

    t.test('upload', async function (t) {
        t.plan(2);

        try {
            const server = new Hapi.Server();

            await server.register({
                plugin: Swaggerize,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/pets.json'),
                    handlers: {
                        upload: {
                            post: function (req, h) {
                                t.strictEqual(typeof req.payload, 'object', 'read payload.');
                                return '';
                            }
                        }
                    }
                }
            });

            // server.route({
            //     method: 'POST',
            //     path: '/v1/petstore/upload',
            //     handler: function (req, h) {
            //         t.strictEqual(typeof req.payload, 'object', 'read payload.');
            //         return '';
            //     }
            // })

            const response = await server.inject({
                method: 'POST',
                url: '/v1/petstore/upload',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                payload: 'name=thing&upload=data'
            });

            t.strictEqual(response.statusCode, 200, `${response.request.path} OK.`);
        }
        catch (error) {
            //t.fail(error.message);
        }

    });

    // t.test('bad content type', function (t) {
    //     t.plan(1);
    //
    //     server.inject({
    //         method: 'POST',
    //         url: '/v1/petstore/upload',
    //         payload: 'name=thing&upload=data'
    //     }, function (response) {
    //         t.strictEqual(response.statusCode, 400, '400 status.');
    //     });
    // });
    //
    // t.test('invalid payload', function (t) {
    //     t.plan(1);
    //
    //     server.inject({
    //         method: 'POST',
    //         url: '/v1/petstore/upload',
    //         headers: {
    //             'content-type': 'application/x-www-form-urlencoded'
    //         },
    //         payload: 'name=thing&upload='
    //     }, function (response) {
    //         t.strictEqual(response.statusCode, 400, '400 status.');
    //     });
    // });
});
