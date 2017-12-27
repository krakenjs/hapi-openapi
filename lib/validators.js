'use strict';

const Enjoi = require('enjoi');
const Hoek = require('hoek');
const Joi = require('joi');
const Entries = require('entries');
const Util = require('util');

const create = function (options = {}) {
    const types = {
        file: Enjoi({
            type: 'object',
            properties: {
                value: {
                    type: 'string',
                    minLength: 0,
                    required: true
                },
                consumes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: /multipart\/form-data|application\/x-www-form-urlencoded/
                    },
                    required: true
                },
                in: {
                    type: 'string',
                    pattern: /formData/,
                    required: true
                }
            }
        })
    };

    const makeValidator = function (parameter, consumes) {
        const coerce = coercion(parameter, consumes);

        let schema;

        if ((parameter.in === 'body' || parameter.in === 'formData') && parameter.schema) {
            schema = Enjoi(parameter.schema, { types });
        }
        else {
            const template = {
                required: parameter.required,
                enum: parameter.enum,
                type: normalizetype(parameter.type),
                schema: parameter.schema,
                items: parameter.items,
                properties: parameter.properties,
                pattern: parameter.pattern,
                format: parameter.format,
                allowEmptyValue: parameter.allowEmptyValue,
                collectionFormat: parameter.collectionFormat,
                default: parameter.default,
                maximum: parameter.maximum,
                minimum: parameter.minimum,
                maxLength: parameter.maxLength,
                minLength: parameter.minLength,
                maxItems: parameter.maxItems,
                minItems: parameter.minItems,
                uniqueItems: parameter.uniqueItems,
                multipleOf: parameter.multipleOf
            };

            schema = Enjoi(template, { types });
        }

        if (parameter.type === 'array') {
            schema = schema.single(true);
        }

        if (parameter.required) {
            schema = schema.required();
        }

        if (parameter.in !== 'body' && parameter.allowEmptyValue){
            schema = schema.allow('').optional();
        }

        return {
            parameter,
            schema,
            validate: async function (value) {
                const data = coerce && value && coerce(value);
                const result = await schema.validate(data);

                if (result.error) {

                    result.error.message = result.error.message.replace('value', parameter.name);

                    result.error.details.forEach((detail) => {
                        detail.message = detail.message.replace('value', parameter.name);
                        detail.path = [parameter.name];
                    });

                    throw result.error;
                }

                return result;
            }
        };
    };

    const makeResponseValidator = function (operation) {
        const schemas = {};

        for (const [code, response] of Entries(operation.responses)) {
            if (!isNaN(code)) {
                if (response.schema) {
                    const schema = Enjoi(response.schema);
                    if (response.schema.type === 'array') {
                        schema.single(true);
                    }
                    schemas[code] = schema;
                }
            }
        }
        
        return schemas;
    };

    const makeAll = function (operation) {
        const validate = {};
        const formValidators = {};
        let headers = {};

        const formValidator = async function (value) {
            const result = await this.validate(value);

            if (result.error) {
                throw result.error;
            }

            return value;
        };

        for (const parameter of operation.parameters) {
            const validator = makeValidator(parameter, operation.consumes || options.api.consumes);

            switch (validator.parameter.in) {
                case 'header':
                    headers = headers || {};
                    headers[validator.parameter.name] = validator.schema;
                    break;
                case 'query':
                    validate.query = validate.query || {};
                    validate.query[validator.parameter.name] = validator.schema;
                    break;
                case 'path':
                    validate.params = validate.params || {};
                    validate.params[validator.parameter.name] = validator.schema;
                    break;
                case 'body':
                    validate.payload = validator.validate;
                    break;
                case 'formData':
                    formValidators[validator.parameter.name] = formValidator.bind(validator);
                    break;
                default:
                    break;
            }

            if (headers && Object.keys(headers).length > 0) {
                validate.headers = Joi.object(headers).options({ allowUnknown: true });
            }

            if (!validate.payload && Object.keys(formValidators).length > 0) {
                validate.payload = async function (value) {
                    for (const [param, data] of Entries(value)) {
                        await formValidators[param](data);
                    }
                };
            }
        }

        return validate;
    };

    return {
        makeAll,
        makeValidator,
        makeResponseValidator
    };
};

const pathsep = function (format) {
    switch (format) {
        case 'csv':
            return ',';
        case 'ssv':
            return ' ';
        case 'tsv':
            return '\t';
        case 'pipes':
            return '|';
        case 'multi':
            return '&';
    }
};

const coercion = function (parameter, consumes) {
    let fn;

    switch (parameter.type) {
        case 'array'  :
            fn = function (data) {
                if (Array.isArray(data)) {
                    return data;
                }
                const sep = pathsep(parameter.collectionFormat || 'csv');
                return data.split(sep);
            };
            break;
        case 'integer':
        case 'float':
        case 'long':
        case 'double':
            fn = function (data) {
                if (isNaN(data)) {
                    return data;
                }
                return Number(data);
            };
            break;
        case 'string':
            fn = String;
            break;
        case 'byte':
            fn = function (data) {
                return isNaN(data) ? new Buffer(data)[0] : Number(data);
            };
            break;
        case 'boolean':
            fn = function (data) {
                return (data === 'true') || (data === '1') || (data === true);
            };
            break;
        case 'date':
        case 'dateTime':
            fn = Date.parse;
            break;
        case 'file': {
            fn = function (data) {
                return {
                    value: data,
                    consumes,
                    in: parameter.in
                };
            };
            break;
        }
    }

    if (!fn && parameter.schema) {
        fn = function (data) {
            if (Util.isObject(data) && !Object.keys(data).length) {
                return undefined;
            }
            return data;
        };
    }

    return fn;
};

const normalizetype = function (type) {
    switch (type) {
        case 'long':
        case 'byte':
            return 'integer';
        case 'float':
        case 'double':
            return 'number';
        case 'date':
        case 'dateTime':
            return 'string';
        default:
            return type;
    }
};

module.exports = { create };
