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

[OUTDATED - CURRENTLY BROKEN]

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

- `api` - a valid Swagger 2.0 document.
- `docspath` - the path to expose api docs for swagger-ui, etc. Defaults to `/`.
- `handlers` - either a directory structure for route handlers.
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

Note: the registered `scheme` is responsible for awaiting the `validateFunc` from the `authenticate` method.
