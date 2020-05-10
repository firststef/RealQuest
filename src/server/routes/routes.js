let Router = require('../utils/router');
let apiController = require('../controller/apiController');
let resourceController = require('../controller/resourceController');

let router = new Router();
router.get('/api/livescores', apiController.sendBackLeaderBoards);
router.get('/api/leaderboards', apiController.sendBackLiveScores);
router.get('/api/environment', apiController.sendBackWeatherAndTime);
router.get('/api/nearbymessage', apiController.sendBackNearbyMessage);
router.get('/index.html', resourceController.plainFileExport, 'index.html');

module.exports = router;
