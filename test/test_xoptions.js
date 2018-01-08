'use strict';

const Test = require('tape');
const Path = require('path');
const OpenAPI = require('../lib');
const Hapi = require('hapi');


Test('x-hapi-options', function (t) {

    t.test('overrides', async function (t) {
        t.plan(1);

        try {
            const server = new Hapi.Server();

            await server.register({
                plugin: OpenAPI,
                options: {
                    api: Path.join(__dirname, './fixtures/defs/form_xoptions.json'),
                    handlers: {
                        upload: {
                            post: function (req, h) {
                                return  {
                                    upload: req.payload.toString()
                                };
                            }
                        }
                    }
                }
            });

            const response = await server.inject({
                method: 'POST',
                url: '/v1/forms/upload',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                payload: 'name=thing&upload=data'
            });

            t.strictEqual(response.statusCode, 404, `${response.request.path} not found due to isInternal.`);
        }
        catch (error) {
            t.fail(error.message);
        }

    });

});
