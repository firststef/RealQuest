let url = require('url');

class Router{
    constructor(){
        this.routes = [];
    }

    get(path, controller, args){
        this.routes.push({
            path: path,
            controller: controller,
            args,
            method: 'GET'
        });
    }

    post(path, controller, args){
        this.routes.push({
            path: path,
            controller: controller,
            args,
            method: 'POST'
        });
    }

    reject(res){
        res.writeHead(404);
        res.write('Not found');
        res.end();
    }

    callRoute(req, res){
        for (let route of this.routes){
            let _url = url.parse(req.url);
            if (route.path === _url.pathname && req.method === route.method){
                if (route.args !== undefined){
                    route.controller(req, res, ...route.args);
                }
                else {
                    route.controller(req, res);
                }
                return;
            }
        }
        this.reject(res);
    }
}

module.exports = Router;