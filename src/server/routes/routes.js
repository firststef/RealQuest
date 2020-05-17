let Router = require('../utils/router');
let apiController = require('../controller/apiController');
let resourceController = require('../controller/resourceController');

let router = new Router();
router.get('/api/livescores', apiController.sendBackLiveScores.bind(apiController));
router.get('/api/leaderboards', apiController.sendBackLeaderBoards.bind(apiController));
router.get('/api/environment', apiController.sendBackWeatherAndTime.bind(apiController));
router.get('/api/nearbymessage', apiController.sendBackNearbyMessage.bind(apiController));
router.get('/api/configuration', apiController.sendBackGameConfiguration.bind(apiController));

router.get('/', resourceController.plainFileExport.bind(resourceController), ['../client/index.html', 'text/html']);
router.get('/sprites/rq-icon.ico', resourceController.plainFileExport.bind(resourceController), ['../sprites/rq-icon.ico', 'image/x-icon']);
router.get('/game.html', resourceController.plainFileExport.bind(resourceController), ['../client/game.html', 'text/html']);
router.get('/style.css', resourceController.plainFileExport.bind(resourceController), ['../client/style.css', 'text/css']);
router.get('/gamestyle.css', resourceController.plainFileExport.bind(resourceController), ['../client/gamestyle.css', 'text/css']);
router.get('/index.js', resourceController.plainFileExport.bind(resourceController), ['../client/index.js', 'text/javascript']);
router.get('/game.js', resourceController.plainFileExport.bind(resourceController), ['../client/game.js', 'text/javascript']);
router.get('/joy.min.js', resourceController.plainFileExport.bind(resourceController), ['../client/joy.min.js', 'text/javascript']);
router.get('/sprites/realquest-logo.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/realquest-logo.png', 'image/png']);
router.get('/sprites/players.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/players.png', 'image/png']);
router.get('/sprites/Epichero.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/Epichero.png', 'image/png']);
router.get('/sprites/lofiProjs.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/lofiProjs.png', 'image/png']);
router.get('/sprites/eyeFly.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/eyeFly.png', 'image/png']);
router.get('/sprites/weather.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/weather.png', 'image/png']);
router.get('/sprites/createjs-logo.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/createjs-logo.png', 'image/png']);
router.get('/sprites/mapbox-logo.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/mapbox-logo.png', 'image/png']);
router.get('/sprites/game_screen.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/game_screen.png', 'image/png']);
router.get('/sprites/multi.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/multi.png', 'image/png']);
router.get('/sprites/hero.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/hero.png', 'image/png']);
router.get('/createjs.js', resourceController.plainFileExport.bind(resourceController), ['../client/createjs.js', 'text/javascript']);
router.get('/favicon.ico', resourceController.plainFileExport.bind(resourceController), ['../sprites/realquest-logo.png', 'image/png']);
router.get('/sprites/cursorImg.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/cursorImg.png', 'image/png']);
router.get('/lady_radical.ttf', resourceController.plainFileExport.bind(resourceController), ['../client/lady_radical.ttf', 'plain']);
router.get('/alphbeta.ttf', resourceController.plainFileExport.bind(resourceController), ['../client/alphbeta.ttf', 'plain']);

router.get('/sprites/github-logo.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/github-logo.png', 'image/png']);
router.get('/sprites/scholarly-logo.png', resourceController.plainFileExport.bind(resourceController), ['../sprites/scholarly-logo.png', 'image/png']);
router.get('/ScholarlyHTML.html', resourceController.plainFileExport.bind(resourceController), ['../client/ScholarlyHTML.html', 'text/html']);

module.exports = router;
