[![Build Status](https://travis-ci.org/krakenjs/swaggerize-hapi.png)](https://travis-ci.org/krakenjs/swaggerize-hapi) [![NPM version](https://badge.fury.io/js/swaggerize-hapi.png)](http://badge.fury.io/js/swaggerize-hapi)

# Swaggerize-Hapi

`swaggerize-hapi` is a design-first approach to building RESTful services with [Swagger](http://swagger.io) and [Hapi](http://hapijs.com).

### Usage

```javascript
var Hapi = require('hapi'),
    Swaggerize = require('swaggerize-hapi');

var server = new Hapi.Server();

server.pack.register({
    plugin: Swaggerize,
    options: {
        api: require('./config/pets.json'),
        handlers: Path.join(__dirname, './handlers')
    }
});
```

### Hapi Plugin

The plugin will be registered as `swagger` on `server.plugins` with the following exposed:

- `api` - the Swagger document.
- `setHost(host)` - a helper function for setting the `host` property on the `api`.

### Configuration Options

- `api` - a valid Swagger 2.0 document.
- `docspath` - the path to expose api docs for swagger-ui, etc. Defaults to `/`.
- `handlers` - either a directory structure for route handlers.
- `vhost` - *optional* domain string (see [hapi route options](https://github.com/hapijs/hapi/blob/master/docs/Reference.md#route-options)).

### Mount Path

Api `path` values will be prefixed with the swagger document's `basePath` value.

### Handlers Directory

```
handlers
  |--foo
  |    |--bar.js
  |--foo.js
  |--baz.js
```

Routes as:

```
foo.js => /foo
foo/bar.js => /foo/bar
baz.js => /baz
```

### Path Parameters

The file and directory names in the handlers directory can represent path parameters.

For example, to represent the path `/users/{id}`:

```
handlers
  |--users
  |    |--{id}.js
```

This works with sub-resources as well:

```
handlers
  |--users
  |    |--{id}.js
  |    |--{id}
  |        |--foo.js
```

To represent `/users/{id}/foo`.

### Handlers File

Each provided javascript file should follow the format of:

```javascript
module.exports = {
    get: function (req, reply) { ... },
    put: function (req, reply) { ... },
    ...
}
```

Where each http method has a handler.

Optionally, `pre` handlers can be used by providing an array of handlers for a method:

```javascript
module.exports = {
    get: [
        function p1(req, reply) { ... },
        function handler(req, reply) { ... }
    ],
}
```
