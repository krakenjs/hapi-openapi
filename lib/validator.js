'use strict';

function inputvalidator(validators) {

    function run(validator, request, reply) {
        var parameter, validate, value, isPath;

        parameter = validator.parameter;
        validate = validator.validate;

        switch (parameter.in) {
            case 'path':
            case 'query':
                isPath = true;
                value = request.params[parameter.name];
                break;
            case 'header':
                value = request.header(parameter.name);
                break;
            case 'body':
            case 'form':
                value = request.payload;
                break;
        }

        validate(value, function oncomplete(error, newvalue) {
            if (error) {
                reply(error.message).code(400).takeover();
                return;
            }

            if (isPath) {
                request.params[parameter.name] = newvalue;
            }

            reply();
        });
    }

    return function validateInput(request, reply) {
        for (var i = 0; i < validators.length; i++) {
            run(validators[i], request, reply);
        }
    };
}

module.exports = inputvalidator;
