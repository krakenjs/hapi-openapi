'use strict';

var thing = require('core-util-is'),
	builder = require('swaggerize-builder');

module.exports = {
    register: function (plugin, options, next) {
		var routes, server;

		routes = builder(options);

		plugin.route({
			method: 'GET',
			path: options.docspath || '/api-docs',
			config: {
				handler: function (request, reply) {
					reply(options.api);
				}
			}
		});

		routes.forEach(function (route) {
			var config;

			config = {
				pre: [],
				handler: undefined
			};

			//Input validation
			config.pre.push({
				assign: 'inputvalidator',
				method: inputvalidator(route.validators || [])
			});

			//Addition before ops supplied in handler file (as array)
			if (thing.isArray(route.handler)) {
	            if (route.handler.length > 1) {
	                Array.prototype.push.apply(config.pre, route.handler.slice(0, route.handler.length - 1));
	            }
	            config.handler = route.handler[route.handler.length - 1];
	        }
			else {
				config.handler = route.handler;
			}

			//Define the route
			plugin.route({
				method: route.method,
				path: route.path,
				config: config
			});
		});

        next();
    }
};

function inputvalidator(validators) {
	var pre = [];

	validators.forEach(function (validator) {
		var parameter, validate;

		parameter = validator.parameter;
		validate = validator.validate;

		pre.push(function (request, callback) {
			var value, isPath;

			switch (parameter.in) {
				case 'path':
				case 'query':
					isPath = true;
					value = request.param(parameter.name);
					break;
				case 'header':
					value = request.header(parameter.name);
					break;
				case 'body':
				case 'form':
					value = request.body;
			}

			validate(value, function (error, newvalue) {
				if (!error && isPath) {
					request.params[parameter.name] = newvalue;
				}
				callback(error);
			});
		});
	});

	return function validateInput(request, reply) {
		var stop = false;

		for (var i = 0; i < pre.length || !stop; i++) {
			pre(request, function (error, newvalue) {
				if (error) {
					reply(error).code(400);
					stop = true;
					return;
				}

				reply();
			});
		}
	};
}

module.exports.register.attributes = {
	pkg: require('../package.json')
};
