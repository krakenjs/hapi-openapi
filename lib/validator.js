'use strict';

function inputvalidator(validators) {
    var pre = [];

    function make(validator) {
        var handler, parameter, validate;

        parameter = validator.parameter;
        validate = validator.validate;

        return function inputvalidator(request, reply) {
            var value, isPath;

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
        };
    }

    for (var i = 0; i < validators.length; i++) {
        var method, name;

        name = validators[i].parameter.name;
        method = make(validators[i]);

        pre.push({
            assign: name,
            method: method
        });
    }

    return pre;
}

module.exports = inputvalidator;
