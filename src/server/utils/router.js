class Router{
    constructor(){
        this.routes = [];
    }

    get(path, controller){
        this.routes.push({
            path: path,
            controller: controller,
            method: 'GET'
        });
    }

    post(path, controller){
        this.routes.push({
            path: path,
            controller: controller,
            method: 'POST'
        });
    }

    callRoute(req, res){
        for (let route of this.routes){
            if (route.name === req.url && res.method === route.method){
                this.route.controller(req, res, route);
            }
        }
    }
}

module.exports = Router;