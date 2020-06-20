const Test = require('tape');
const Validators = require('../lib/validators');
const { toDto } = require('../lib/api-dto-mapper');

Test('validator special types', function(t) {

    const validator = Validators.create();

    const schemas = {};
    schemas.oas2 = {
        swagger: '2.0',
        info: {
            title: 'Minimal',
            version: '1.0.0'
        },
        paths: {
            '/test': {
                get: {
                    description: '',
                    parameters: [
                        {
                            name: 'dateTime',
                            in: 'query',
                            required: false,
                            type: 'string',
                            format: 'date-time'
                        }
                    ],
                    responses: {
                        200: {
                            description: 'default response'
                        }
                    }
                },
                post: {
                    description: '',
                    parameters: [
                        {
                            name: 'payload',
                            in: 'body',
                            required: true,
                            schema: {
                                type: 'object',
                                required: ['requiredProperty'],
                                properties: {
                                    requiredProperty: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            '/test/{foo*}': {
                get: {
                    description: '',
                    parameters: [
                        {
                            name: 'foo*',
                            in: 'path',
                            required: true,
                            type: 'string'
                        }
                    ],
                    responses: {
                        200: {
                            description: 'default response'
                        }
                    }
                }
            }
        }
    };

    schemas.oas3 = {
        openapi: '3.0.0',
        info: {
            title: 'Minimal',
            version: '1.0.0'
        },
        paths: {
            '/test': {
                get: {
                    description: '',
                    parameters: [
                        {
                            name: 'dateTime',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'string',
                                format: 'date-time'
                            }
                        }
                    ],
                    responses: {
                        200: {
                            description: 'default response'
                        }
                    }
                },
                post: {
                    description: '',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['requiredProperty'],
                                    properties: {
                                        requiredProperty: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/test/{foo*}': {
                get: {
                    description: '',
                    parameters: [
                        {
                            name: 'foo*',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'string'
                            }
                        }
                    ],
                    responses: {
                        200: {
                            description: 'default response'
                        }
                    }
                }
            }
        }
    };

    for (const schemaVersion of ['oas2', 'oas3']) {

        const api = toDto(schemas[schemaVersion]);

        t.test('valid date-time', async function(t) {
            t.plan(1);

            const { validate } = validator.makeValidator(
                api.getOperation('get', '/test').parameters[0]
            );

            try {
                validate('1995-09-07T10:40:52Z');
                t.pass(`${schemaVersion} valid date-time`);
            } catch (error) {
                t.fail(error.message);
            }
        });

        t.test('invalid date-time', async function(t) {
            t.plan(1);

            const { validate } = validator.makeValidator(
                api.getOperation('get', '/test').parameters[0]
            );

            const timestamp = Date.now();

            try {
                validate(timestamp);
                t.fail(`${schemaVersion} ${timestamp} should be invalid.`);
            } catch (error) {
                t.pass(`${schemaVersion} ${timestamp} is invalid.`);
            }
        });

        t.test('validate multi-segment paths', async function(t) {
            t.plan(1);

            const v = validator.makeAll(api.getOperation('get', '/test/{foo*}').parameters);

            const keys = Object.keys(v.validate.params.describe().keys);

            if (keys.length === 1 && keys[0] === 'foo') {
                return t.pass(`${schemaVersion} ${keys.join(', ')} are valid.`);
            }
                t.fail(`${schemaVersion} ${keys.join(', ')} are invalid.`);
        });


        t.test('validate missing body parameter', async function(t) {
            t.plan(1);

            const { validate } = validator.makeValidator(api.getOperation('post', '/test').parameters[0]);

            try {
                validate();
                t.fail(`${schemaVersion} "undefined" should be invalid`);
            } catch (error) {
                t.equal(error.message, '"payload" is required', `${schemaVersion} received expected payload error message`);
            }
        });

        t.test('validate empty object with required property', async function(t) {
            t.plan(1);

            const { validate } = validator.makeValidator(api.getOperation('post', '/test').parameters[0]);

            try {
                validate({});
                t.fail(`${schemaVersion} "undefined" should be invalid`);
            } catch (error) {
                t.match(error.message, /"requiredProperty" is required/, `${schemaVersion} received expected property error message`);
            }
        });
    }
});
