# swaggerize-hapi

[![Build Status](https://travis-ci.org/krakenjs/swaggerize-hapi.svg?branch=master)](https://travis-ci.org/krakenjs/swaggerize-hapi)  
[![NPM version](https://badge.fury.io/js/swaggerize-hapi.png)](http://badge.fury.io/js/swaggerize-hapi)  

`swaggerize-hapi` is a design-driven approach to building RESTful services with [Swagger](http://swagger.io) and [Hapi](http://hapijs.com).

`swaggerize-hapi` provides the following features:

- API schema validation.
- Routes based on the Swagger document.
- API documentation route.
- Input validation.

### Why "Design Driven"

There are already a number of modules that help build RESTful APIs for node with swagger. However,
these modules tend to focus on building the documentation or specification as a side effect of writing
the application business logic.

`swaggerize-hapi` begins with the swagger document first. This facilitates writing APIs that are easier to design, review, and test.

### Quick Start with a Generator

**NOTE:** Currently the generator uses an older version of this module. You can still use it, but you must manually migrate to
this version, which will require rewriting some of the code to support Hapi 17.

This guide will let you go from an `api.json` to a service project in no time flat.

First install `generator-swaggerize` (and `yo` if you haven't already):

```bash
$ npm install -g yo
$ npm install -g generator-swaggerize
```

Now run the generator.

```bash
$ mkdir petstore && cd $_
$ yo swaggerize
```

Follow the prompts (note: make sure to choose `hapi` as your framework choice).

When asked for a swagger document, you can try this one:

```
https://raw.githubusercontent.com/wordnik/swagger-spec/master/examples/v2.0/json/petstore.json
```

You now have a working api and can use something like [Swagger UI](https://github.com/wordnik/swagger-ui) to explore it.

### Manual Usage

```javascript
const Hapi = require('hapi');
const Swaggerize = require('swaggerize-hapi');

const server = new Hapi.Server();

await server.register({
    plugin: Swaggerize,
    options: {
        api: require('./config/pets.json'),
        handlers: Path.join(__dirname, './handlers')
    }
});
```

### Hapi Plugin

The plugin will be registered as `swagger` on `server.plugins` with the following exposed:

- `getApi()` - the resolved Swagger document.
- `setHost(host)` - a helper function for setting the `host` property on the `api`.

### Configuration Options

- `api` - a path to a valid Swagger 2.0 document.
- *deprecated* `docspath` - the path to expose api docs for swagger-ui, etc. Defaults to `/api-docs`.
- `docs` - an object used to configure the api docs route.
    - `path` - the path to expose api docs for swagger-ui, etc. Defaults to `/api-docs`.
    - `auth` - options auth config for this route.
- `handlers` - either a string directory structure for route handlers, object, or not set if using `x-handler`.
- `extensions` - an array of file extension types to use when scanning for handlers. Defaults to `['js']`.
- `vhost` - *optional* domain string (see [hapi route options](http://hapijs.com/api#route-options)).
- `cors` - *optional* cors setting (see [hapi route options](http://hapijs.com/api#route-options)).

### Mount Path

Api `path` values will be prefixed with the swagger document's `basePath` value.

### Handlers Directory

The `options.handlers` option specifies a directory to scan for handlers. These handlers are bound to the api `paths` defined in the swagger document.

```
handlers
  |--foo
  |    |--bar.js
  |--foo.js
  |--baz.js
```

Will route as:

```
foo.js => /foo
foo/bar.js => /foo/bar
baz.js => /baz
```

### Path Parameters

The file and directory names in the handlers directory can also represent path parameters.

For example, to represent the path `/users/{id}`:

```shell
handlers
  |--users
  |    |--{id}.js
```

This works with directory names as well:

```shell
handlers
  |--users
  |    |--{id}.js
  |    |--{id}
  |        |--foo.js
```

To represent `/users/{id}/foo`.

### Handlers File

Each provided javascript file should export an object containing functions with HTTP verbs as keys.

Example:

```javascript
module.exports = {
    get: function (req, h) { ... },
    put: function (req, h) { ... },
    ...
}
```

Optionally, `pre` handlers can be used by providing an array of handlers for a method:

```javascript
module.exports = {
    get: [
        function p1(req, h) { ... },
        function handler(req, h) { ... }
    ],
}
```

### Handlers Object

The directory generation will yield this object, but it can be provided directly as `options.handlers`.

Example:

```javascript
{
    'foo': {
        'get': function (req, h) { ... },
        'bar': {
            'get': function (req, h) { ... },
            'post': function (req, h) { ... }
        }
    }
    ...
}
```

### X-Handlers

Alternatively the API document can set `x-handler` attribute on each defined `paths` element if `handlers` is not defined.

Example:

```
"/pets/{id}": {
    "x-handler": "./routes/pets-by-id.js",
    .
    .
    .
```

This will construct a `handlers` object from the given `x-handler` files.

### Authentication

Support for swagger [security schemes](http://swagger.io/specification/#securitySchemeObject) requires that relevant authentication scheme and strategy are registered before the swaggerize-hapi plugin. See the [hapi docs](http://hapijs.com/tutorials/auth) for information about authentication schemes and strategies.

The name of the hapi authentication strategy is expected to match the name field of the swagger [security requirement object](http://swagger.io/specification/#securityRequirementObject).

Example:

```yaml
securityDefinitions:
  api_key:
    type: apiKey
    name: Authorization
    in: header
paths:
  '/users/':
    get:
      security:
        - api_key: []
```

```javascript
const server = new Hapi.Server();

await server.register({ plugin: AuthTokenScheme });

server.auth.strategy('api_key', 'auth-token-scheme', {
    validateFunc: async function (token) {
      // Implement validation here, return { credentials, artifacts }.
    }
});

await server.register({
    register: Swaggerize,
    options: {
        api: require('./config/pets.json'),
        handlers: Path.join(__dirname, './handlers')
    }
});
```

### X-Auth

Alternatively it may be easier to automatically register a plugin to handle registering the necessary schemes and strategies.

**x-auth-schemes**

The root document can contain an `x-auth-schemes` object specifying different plugins responsible for registering auth schemes.

Example:

```
"x-auth-schemes": {
    "apiKey": "../lib/xauth-scheme.js"
}
```

This plugin will be passed the following options:

- `name` - the auth scheme name, in this example `apiKey`.

**x-auth-strategy**

The `securityDefinitions` entries can contain an `x-auth-strategy` attribute pointing to a plugin responsible for registering auth strategies.

Example:

```
"securityDefinitions": {
  "api_key": {
    "x-auth-strategy": "../lib/xauth-strategy.js",
    "type": "apiKey",
    "name": "authorization",
    "in": "header"
  }
}
```

The plugin will be passed the following options:

- `name` - the `securityDefinitions` entry's key. In this example, `api_key`. This is typically used as the strategy name.
- `scheme` - the `securityDefinitions` `type`. In this example, `apiKey`. This should match a `x-auth-scheme` name.
- `where` - `securityDefinitions` entry `in` attribute. This is search for the `lookup` value; in this example `header`.
- `lookup` - `securityDefinitions` entry `name` attribute. Used as the name to look up against `where`.

The way you can make these play together is that for every `type`, a scheme exists that delegates some lookup or evaluation to the appropriate strategy.

Example:

```javascript
//xauth-scheme.js

const register = function (server, { name  }) {
    server.auth.scheme(name /*apiKey*/, (server, /* options received from the strategy */ { validate }) => {
        return {
            authenticate: async function (request, h) {
                return h.authenticated(await validate(request));
            }
        };
    });
};

module.exports = { register, name: 'x-auth-scheme' };
```

and

```javascript
//xauth-strategy.js

const Boom = require('boom');

const register = function (server, { name, scheme, where, lookup }) {
    server.auth.strategy(name, /* the scheme to use this strategy with */ scheme, {
        //Define a validate function for the scheme above to receive
        validate: async function (request) {
            const token = request.headers[lookup];

            //Some arbitrary example
            if (token === '12345') {
                return { credentials: { scope: ['read'] }, artifacts: { token } };
            }

            throw Boom.unauthorized();
        }
    });
};

module.exports = { register, name: 'x-auth-strategy' };
```
