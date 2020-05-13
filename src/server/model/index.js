const config = require('../config/config');
const ApiLoader = require('../utils/apiLoader');
const https = require('https');
const url = require('url');

const streetMessages=[{topText: "You are travelling on ", bottomText: ""},
    {topText: "", bottomText: " is beneath your feet" },
    {topText: "", bottomText: " is in you sight"},
    {topText: "The ancient place ", bottomText: " calls to you"},
    {topText: "You have entered the cursed land nearby ", bottomText: ""},
    {topText: "You have reached ", bottomText: ""},
    {topText: "The ruins of ", bottomText: " glare upon you" },
    {topText: "You are near ", bottomText: ""}
];
const otherFeatureMessages=[{topText: "", bottomText: " is in you sight"},
    {topText: "The ancient place ", bottomText: " calls to you"},
    {topText: "You have entered the cursed land nearby ", bottomText: ""},
    {topText: "You have reached ", bottomText: ""},
    {topText: "The ruins of ", bottomText: " glare upon you" },
    {topText: "You are near ", bottomText: ""}

];
const radius = 0.5;

class Model {
    constructor() {
        this.mongoClient = require('mongodb').MongoClient;
        this.client = this.mongoClient.connect(config.mongoDB.uri, {useNewUrlParser: true, useUnifiedTopology: true});
        this.playerMap = new Map();
    }

    getMongoClient() {
        return this.client;
    }

    getPlayerMap() {
        return this.playerMap;
    }

    distance(point1, point2) {
        return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) + Math.pow((point1[1] - point2[1]), 2));
    }

    getLiveScores(count) {
        let LiveScores = Array();
        this.playerMap.forEach((otherPlayerObj) => {
            LiveScores.push({username: otherPlayerObj.username, currentPoints: otherPlayerObj.currentPoints});
        });
        LiveScores.sort(function (a, b) {
            return b.currentPoints - a.currentPoints;
        });
        LiveScores = LiveScores.slice(0, count);
        return LiveScores;
    }

    getLeaderBoards(myScore, count, resolveCallback, rejectCallback) {
        this.client
            .then(client => client.db("RealQuestDB")
                .collection("leaderboard")
                .find({score: {$gt: myScore}}, {projection: {_id: 0}})
                .sort({score: -1, username: -1})
                .toArray(function (err, docs) {
                    if (err)
                        throw err;

                    let length = docs.length;
                    if (count !== -1 && count > 0) {
                        docs.splice(count, docs.length);
                    }

                    resolveCallback({players: docs, myPlace: length});
                })
            )
            .catch(e => {
                rejectCallback(e);
            });
    }

    getGameStartTime(context, failCallback) {
        let playerPos = context.playerPos;
        let timeRequest = config.api.time.domain + playerPos[1] + "," + playerPos[0] + "?key=" + config.api.time.key;
        let gameStartTime;
        let data = '';
        let apiController = this;
        https.get(timeRequest, res => {
            res.setEncoding("utf8");
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on("end", function () {
                data = JSON.parse(data);
                try {
                    let time = new Date(data.resourceSets[0].resources[0].timeZone["convertedTime"]["localTime"]);
                    gameStartTime = time.getHours() * 60 + time.getMinutes();
                } catch (e) {
                    gameStartTime = apiController.getCurrentTime(playerPos);
                }
                if (gameStartTime < 0 || gameStartTime > 24 * 60 || isNaN(gameStartTime) || gameStartTime == null) {
                    gameStartTime = apiController.getCurrentTime(playerPos);
                }

                context.time = gameStartTime;
                context.apiLoader.notifyCompleted('loadTime');
            });
        }).on('error', (e) => {
            context.apiLoader.notifyFailed(failCallback, e);
        });
    }

    /**
     * returneaza timpul exact, dinamic, poate duce la variatii dese ale culorii daca se fataie jucatorul la stanga si la dreapta longitudinilor M15
     * @returns {number} = minutul si ora curenta a jocului la coordonatele actuale, pentru a fi eventula afisate intr-o parte a ecranului
     */
    getCurrentTime(playerPos) {
        let offset = Math.floor(playerPos[0] / 15);
        if (offset < 0) offset++;
        let d = new Date();
        let n = d.getUTCHours() + offset;
        if (n < 0) n = 24 - n;
        if (n >= 24) n = n - 24;
        return n * 60 + d.getUTCMinutes();
    }

    getWeather(context, failCallback) {
        let playerPos = context.playerPos;
        let weatherRequest = config.api.weather.domain + "weather?lat=" + playerPos[1] + "&lon=" + playerPos[0]
            + "&appid=" + config.api.weather.key;
        let data = '';
        https.get(weatherRequest, res => {
            res.setEncoding("utf8");
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on("end", function () {
                data = JSON.parse(data);
                context.weather = data;
                context.apiLoader.notifyCompleted('loadWeather');
            });
        }).on('error', (e) => {
            context.apiLoader.notifyFailed(failCallback, e);
        });
    }

    getWeatherAndTime(playerPos, resolveCallback, rejectCallback){
        let apiLoader = new ApiLoader(
            {
                loadTime: {
                    callback: this.getGameStartTime,
                    onFail: rejectCallback
                },
                loadWeather: {
                    callback: this.getWeather,
                    onFail: rejectCallback
                }
            },
            (context) => {
                resolveCallback({time: context.time, weather: context.weather});
            }, {
                playerPos: playerPos
            }
        );
        apiLoader.load();
    }

    streetMessage(feature) {
        let position = Math.floor(Math.random() * streetMessages.length);
        feature.topText = streetMessages[position].topText;
        feature.bottomText = streetMessages[position].bottomText;
    }

    otherFeatureMessage(feature) {
        let position = Math.floor(Math.random() * otherFeatureMessages.length);
        feature.topText = otherFeatureMessages[position].topText;
        feature.bottomText = otherFeatureMessages[position].bottomText;
    }

    getBestNearbyMessage(playerPos, features) {
        let bestFeature = {dist: Infinity};
        features.forEach(obj => {
            if (obj["geometry"]["type"] === "Point") {
                if (obj["properties"]["class"] !== undefined && obj["properties"]["name"] !== undefined) {
                    let dist = this.distance([playerPos.latitude, playerPos.longitude], obj["geometry"]["coordinates"]);
                    if (bestFeature.dist !== undefined && bestFeature.dist > dist) {
                        bestFeature.dist = dist;
                        bestFeature.name = obj["properties"]["name"];

                        if (obj["properties"]["class"] === "street" || obj["properties"]["class"] === "primary" ||
                            obj["properties"]["class"] === "secondary") {
                            this.streetMessage(bestFeature);
                        } else {
                            this.otherFeatureMessage(bestFeature);
                        }
                    }
                }
            }
        });

        let returnObj = {};
        if (bestFeature.dist !== Infinity) {
            returnObj.name = bestFeature.name;
            returnObj.topText = bestFeature.topText;
            returnObj.bottomText = bestFeature.bottomText;
        }
        return returnObj;
    }

    getNearbyMessage(playerPos, resolveCallback, rejectCallback) {
        let reqUri = config.api.map.domain + `${playerPos.longitude},${playerPos.latitude}.json?radius=60&limit=8&dedupe&access_token=`
            + config.api.map.key;
        let data = '';
        let apiController = this;
        https.get(reqUri, result => {
            result.setEncoding("utf8");
            result.on('data', function (chunk) {
                data += chunk;
            });
            result.on("end", function () {
                data = JSON.parse(data);
                resolveCallback(apiController.getBestNearbyMessage(playerPos, data["features"]));
            });
        }).on('error', (e) => {
            rejectCallback(e);
        });
    }
}

let model = new Model();

module.exports = model;