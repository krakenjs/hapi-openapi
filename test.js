class Api {
    constructor(authStrategies, routes) {
        this.authStrategies = authStrategies;
        this.routes = routes;
    }
}

class ApiRoute {
    constructor(method, path, vhost, routeOptions) {
        this.method = method;
        this.path = path;
        this.vhost = vhost;
        this.routeOptions = routeOptions;
    }
}
