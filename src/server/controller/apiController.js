let model = require('../model/index');
let logger = require('../utils/logger');

class ApiController {
    reject(res, e){
        res.writeHead(404);
        logger(e);
        res.write('Not found');
        res.end();
    }

    resolve(res, content, type){
        res.statusCode = 200;
        res.setHeader('Content-Type', type);
        res.write(JSON.stringify(content));
        res.end();
    }

    //Live scores api
    sendBackLiveScores(req, res) {
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.query.count !== undefined && parsedUrl.query.count > 0) {
            let count = parsedUrl.query.count;
            let liveScores = model.getLiveScores(count);

            this.resolve(res, liveScores, 'text/json');
            return;
        }

        this.reject(res);
    }

    //Leader Board Api
    sendBackLeaderBoards(req, res) {
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.query.count !== undefined) {

            let count = parsedUrl.query.count;
            let myScore = parsedUrl.query.myScore;

            if (myScore === undefined)
                myScore = 0;
            myScore = parseFloat(myScore);

            model.getLeaderBoards(
            myScore,
            count,
            (obj) => {
                this.resolve(res, obj, 'text/json');
            },
            (e) => {
                this.reject(res, e);
            });

            return;
        }

        this.reject(res);
    }

    sendBackWeatherAndTime(req, res) {
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.query.long !== undefined && parsedUrl.query.lat !== undefined) {
            let playerPos = [parsedUrl.query.long, parsedUrl.query.lat];

            model.getWeatherAndTime(
                playerPos,
                (obj) => this.resolve(res, obj, 'text/json'),
                (e) => this.reject(res, e)
            );

            return;
        }

        this.reject(res);
    }

    sendBackNearbyMessage(req, res){
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.query.long !== undefined && parsedUrl.query.lat !== undefined) {
            let playerPos = {longitude: parsedUrl.query.long, latitude: parsedUrl.query.lat};

            model.getNearbyMessage(
                playerPos,
                (obj) => this.resolve(res, obj, 'text/json'),
                (e) => this.reject(res, e)
            );

            return;
        }

        this.reject(res);
    }
}

let apiController = new ApiController();

module.exports = apiController;