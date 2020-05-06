let config = JSON.parse(require('./config.json'));
let controller = require('../controller/index');

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

    execute(path, callback){

    }

    callRoute(req, res){
        for (let route of this.routes){
            if (route.name === req.url){
                this.route.controller(req, res, route);
            }
        }
    }
}

// router.get(ROUTE, CONTROLLER) => ROUTE = un nume de identificare pentru o functionalitate din controller care vrem sa o apelam
// PATH = o resursa care este incarcata de controller cand functionalitatea are nevoie de ea

let router = new Router();
for (let resource of config.resources){
    router.get(resource, controller.get);
}
router.execute('/api/leaderboards', getLeaderBoards);

module.exports = router;
