/** prepare forced weather configuration */

var weatherLoader = new WeatherLoader();

/** prepares the page */

function load(){
    getGameParameters();
    let canvas = document.getElementById("gameCanvas");
    canvas.focus();

    //Put a temporary background until load
    stage = new createjs.Stage(canvas);
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    stage.scaleX = scale;
    stage.scaleY = scale;

    let background = new createjs.Shape();
    background.graphics.beginFill("white");
    background.graphics.drawRect(0, 0, windowWidth, windowHeight);
    background.graphics.endFill();
    background.name = "Background";
    stage.addChild(background);
    stage.update();

    pageLoader = new PageLoader(
        {
            loadGameConfiguration: getGameConfiguration,
            loadResources: loadImages,
            loadTimeAndWeather: getServerTimeAndWeather,
            loadMap: setMap

        },
        loadComplete
    );
    pageLoader.loadPage();
}

/** Loads needed resources before running the game */
function loadImages() {
    resourceLoader = new createjs.LoadQueue(false);
    resourceLoader.loadFile({id:"players", src:"../sprites/players.png"});
    resourceLoader.loadFile({id:"projectiles", src:"../sprites/lofiProjs.png"});
    resourceLoader.loadFile({id:"monsters", src:"../sprites/eyeFly.png"});
    resourceLoader.loadFile({id:"weather", src:"../sprites/weather.png"});
    resourceLoader.addEventListener("complete", function () {
        document.getElementById("loadResourcesWheel").className = "";
        document.getElementById("loadResourcesWheel").innerHTML = "&#x2714;";
        pageLoader.notifyCompleted('loadResources');
    });
}

/** initializes the game, runs after all resources have been loaded */
function loadComplete(){
    stage.removeAllChildren();
    document.getElementById("uiScreen").hidden = false;

    createjs.DisplayObject.prototype.centerX = function() {
        try {
            return this.x + this.getBounds().width*this.scaleX*Math.sqrt(2)/2*Math.cos((this.rotation+45) * Math.PI / 180);
        }
        catch (e) {
            return this.x;
        }
    };
    createjs.DisplayObject.prototype.centerY = function() {
        try{
            return  this.y + this.getBounds().height*this.scaleY*Math.sqrt(2)/2*Math.sin((this.rotation+45) * Math.PI / 180);
        }
        catch (e) {
            return this.y;
        }
    };
    createjs.DisplayObject.prototype.reverseCenterX = function(centerX) {
        try {
            return centerX - this.getBounds().width*this.scaleX*Math.sqrt(2)/2*Math.cos((this.rotation+45) * Math.PI / 180);
        }
        catch (e) {
            return centerX;
        }
    };
    createjs.DisplayObject.prototype.reverseCenterY = function(centerY) {
        try {
            return centerY - this.getBounds().height * this.scaleY * Math.sqrt(2) / 2 * Math.sin((this.rotation + 45) * Math.PI / 180);
        }
        catch (e) {
            return centerY;
        }
    };

    playerLifeBar = document.getElementById('lifebar');
    playerTotalPoints = document.getElementById('totalPoints');
    scoreBoards = document.getElementById('scoreBoards');

    nearbyMessageDescTop = document.getElementById("placeDescriptionTop");
    nearbyMessageDescBottom = document.getElementById("placeDescriptionBottom");

    nearbyMessageName = document.getElementById("placeName");
    yourCoordinates = document.getElementById("yourCoordinates");
    consoleText = document.getElementById("consoleText");
    textBox = document.getElementById("consoleInput");
    textBox.onfocus = () => {writing = true};
    textBox.onblur = () => {writing = false};

    //GPX
    GPXString = GPXString.concat("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n<gpx xmlns=\"http://www.topografix.com/GPX/1/1\" xmlns:gpxx=\"http://www.garmin.com/xmlschemas/GpxExtensions/v3\" xmlns:gpxtpx=\"http://www.garmin.com/xmlschemas/TrackPointExtension/v1\" creator=\"mapstogpx.com\" version=\"1.1\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd\">\n\n<trk>\n\t<trkseg>\n");
    GPXInterval = setInterval(function() {
        if(gameOver === false)
            GPXString = GPXString.concat("\t<trkpt lat=\"" + map.transform._center.lat + "\" lon=\"" + map.transform._center.lng + "\">\n\t</trkpt>\n");
    },1000);

    //Spritesheets
    spriteSheet = new createjs.SpriteSheet({
        framerate: 8,
        "images": [resourceLoader.getResult("players")],
        "frames": {"height": 32, "width": 32, "regX": 0, "regY":0, "spacing":5, "margin":0},
        "animations": {
            "idle": 0,
            "runSideways": [0, 1, "idle", 1],
            "runDown": {
                frames: [4,5,4,6],
                next: "idleDown",
                speed: 1
            },
            "idleDown": 4,
            "runUp": {
                frames: [9,10,9,11],
                next: "idleUp",
                speed: 1
            },
            "idleUp":9
        }
    });
    projectileSheet = new createjs.SpriteSheet({
        framerate: 8,
        "images": [resourceLoader.getResult("projectiles")],
        "frames": {"height": 32, "width": 32, "regX": 0, "regY":0, "spacing":5, "margin":0},
        "animations": {
            "purple_attack": 70,
            "blue_attack": 4,
            "money": 125,
            "speedBoost": 126,
            "smashBuilding": 127
        }
    });
    monsterSheet = new createjs.SpriteSheet({
        framerate: 8,
        "images": [resourceLoader.getResult("monsters")],
        "frames": {"height": 32, "width": 32, "regX": 0, "regY":0, "spacing":10, "margin":0},
        "animations": {
            "moveRed": {
                frames: [0,1,2],
                next: "moveRed",
                speed: 1
            },
            "moveGreen": {
                frames: [3,4,5],
                next: "moveGreen",
                speed: 1
            }
        }
    });

    //Layer initialization
    let background = new createjs.Shape();
    background.graphics.beginFill(groundColor);
    background.graphics.drawRect(0, 0, windowWidth, windowHeight);
    background.graphics.endFill();
    background.name = "Background";

    camera = new createjs.Container();
    camera.x = stage.x;
    camera.y = stage.y;

    roadsLayer = new createjs.Container();
    roadsLayer.x = stage.x;
    roadsLayer.y = stage.y;

    waterLayer = new createjs.Container();
    waterLayer.x = stage.x;
    waterLayer.y = stage.y;

    buildingsLayer = new createjs.Container();
    buildingsLayer.x = stage.x;
    buildingsLayer.y = stage.y;

    baseLayer = new createjs.Container();
    baseLayer.x = stage.x;
    baseLayer.y = stage.y;

    otherBaseLayer = new createjs.Container();
    otherBaseLayer.x = stage.x;
    otherBaseLayer.y = stage.y;

    projectileLayer = new createjs.Container();
    projectileLayer.x = stage.x;
    projectileLayer.y = stage.y;

    monsterLayer = new createjs.Container();
    monsterLayer.x = stage.x;
    monsterLayer.y = stage.y;

    uiScreen = new createjs.DOMElement("uiScreen");
    uiScreen.name = "uiScreen";
    uiScreen.scale = 1/scale;

    //Sprites init
    let playerSprite = new createjs.Sprite(spriteSheet, "idle");
    playerSprite.scaleX = 0.5;
    playerSprite.scaleY = 0.5;
    playerSprite.x = playerSprite.reverseCenterX(playerGetPos()[0]);
    playerSprite.y = playerSprite.reverseCenterY(playerGetPos()[1]);
    playerSprite.name = "player";
    let playerRect;
    if (DEBUG === true) {
        playerRect = new createjs.Shape();
        playerRect.graphics.beginStroke("green");
        playerRect.name = "playerRect";
        playerRect.graphics.beginFill("green");
        playerRect.graphics.drawCircle(playerSprite.centerX(), playerSprite.centerY(), playerRadius);
    }

    //Adding Layers to the tree
    stage.addChild(background);
    stage.addChild(camera);
    camera.addChild(roadsLayer);
    camera.addChild(waterLayer);
    camera.addChild(buildingsLayer);
    camera.addChild(otherBaseLayer);
    camera.addChild(baseLayer);
    camera.addChild(projectileLayer);
    camera.addChild(monsterLayer);
    stage.addChild(weatherOverlay);
    stage.addChild(luminosityOverlay);
    stage.addChild(uiScreen);



    updateWeatherOverlay(weatherLoader);
    setInterval(updateWeatherOverlay, 600000);

    //Adding Sprites to the tree
    if (DEBUG === true) {
        baseLayer.addChild(playerRect);
    }
    baseLayer.addChild(playerSprite);
    player = baseLayer.getChildByName("player");

    // GameEvents init
    stage.addEventListener("stagemousedown", (evt) => {
        document.getElementById("consoleInput").blur();
        shootProjectile(evt.stageX - offsetx*scale, -(evt.stageY - offsety*scale));
    });

    //Input init
    Key = loadKeyHandler();
    window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
    window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);

    //Stick movement
    isStickEnabled = windowWidth <= joyStickScreenMaxSize;
    if (isStickEnabled){
        initStickDisplay();
    }

    //Server communication
    socket = io(socketServerAddress, {secure: true, query: {username: playerName}});
    socket.on('connect', function () {
        socket.on('other_player', function (obj) {
            obj = JSON.parse(obj);
            otherBaseLayer.removeAllChildren();

            if (obj.length > 0){
                currentUpdateDelta = fastUpdateDelta;
            }
            else {
                currentUpdateDelta = slowUpdateDelta;
            }

            obj.forEach((otherP) => {
                let otherPlayerContainer = new createjs.Container();

                let otherPlayer = new createjs.Sprite(spriteSheet, "idle");
                otherPlayer.scaleX = Math.sign(otherP.scaleX)* 0.5;
                otherPlayer.scaleY = 0.5;
                otherPlayer.x = 0;
                otherPlayer.y = 0;
                otherPlayer.name = otherP.username;
                otherPlayer.currentFrame = otherP.currentFrame;
                otherPlayer.currentAnimation  = otherP.currentAnimation;
                otherPlayer.gotoAndPlay(otherP.currentAnimation);
                otherPlayer.currentAnimationFrame = otherP.currentAnimationFrame;
                if (DEBUG === true) {
                    let otherPlayerCollider = new createjs.Shape();
                    otherPlayerCollider.graphics.beginStroke("green");
                    otherPlayerCollider.name = otherP.username + "_collider";
                    otherPlayerCollider.graphics.beginFill("green");
                    otherPlayerCollider.graphics.drawCircle(otherPlayer.centerX(), otherPlayer.centerY(), playerRadius);
                    otherPlayerContainer.addChild(otherPlayerCollider);
                }
                otherPlayerContainer.addChild(otherPlayer);
                let playerText = new createjs.Text(otherP.username, "7px Comic Sans MS", "#FF0000");
                playerText.x = otherPlayer.centerX() - playerText.getBounds().width/2;
                playerText.y = 0;
                playerText.textBaseline = "alphabetic";
                otherPlayerContainer.addChild(playerText);


                otherBaseLayer.addChild(otherPlayerContainer);
                otherPlayerContainer.x = otherPlayer.reverseCenterX(getCoordinateX(otherP.coordinates[0]));
                otherPlayerContainer.y = otherPlayer.reverseCenterY(getCoordinateY(otherP.coordinates[1]));
            });
        });
        socket.on('chat-message', function (obj) {
            let str = '<p><span class=\"console-name\">' + obj.user + '</span>:' + obj.message + '</p>';
            consoleText.innerHTML += str;
        });
    });
    updateSocketCallback = function () {
        let sendObj = {
            coordinates: [map.transform._center.lng, map.transform._center.lat],
            currentPoints: parseFloat((totalPoints/600).toFixed(2)),
            currentFrame: player.currentFrame,
            currentAnimation : player.currentAnimation,
            currentAnimationFrame : player.currentAnimationFrame,
            scaleX: player.scaleX
        };

        socket.emit('coordonate', sendObj);
        if (!gameOver) {
            socketUpdateTimeout = setTimeout(updateSocketCallback, currentUpdateDelta);
        }
    };
    socketUpdateTimeout = setTimeout(updateSocketCallback, slowUpdateDelta);

    let input = document.getElementById("consoleInput");
    input.addEventListener("keyup", function(event) {
        if (event.code === 'Enter') {
            event.preventDefault();
            if (input.value !== ''){
                socket.emit('new_message',{message:input.value,user:playerName});
            }
            input.value = '';
        }
    });

    //CleanFarAwayBuildings
    setInterval(cleanFarAwayBuildings, 3000);

    //UpdateLeaderBoards
    setInterval(updateScoreBoard, 3000);

    //UpdatePlayerScore
    setInterval(updatePlayerTotalPoints, 300);

    //UpdateStreet
    updateNearbyMessage();
    setInterval(updateNearbyMessage, 2000);

    //Create powerUps
    setInterval(createPowerUps, 3000);

    //Remove LoadingScreen
    document.getElementById("initializingWheel").className = "";
    document.getElementById("initializingWheel").innerHTML = "&#x2714;";
    document.getElementById("loadingScreen").style.display = 'none';
    document.getElementById("gameCanvas").focus();

    //Tick settings
    createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
    createjs.Ticker.framerate = 60;
    createjs.Ticker.addEventListener("tick", tick);
}

/** sets the initial player position */
function getGameParameters(){
    if (isLocalStorageSupported()){
        let lat = localStorage.getItem("RealQuestLatitude");
        let lng = localStorage.getItem("RealQuestLongitude");
        let username = localStorage.getItem("RealQuestUsername");

        //TODO: temporary replace with if (lat != null || lng != null || username !== null) => redirect to index
        if (lat != null && lng != null){
            playerPos = [lng, lat];
        }
        if (username !== null){
            playerName = username;
        }
    }
    else {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        let lat = urlParams.get("latitude");
        let lng = urlParams.get("longitude");
        let username = urlParams.get("username");

        //Temporarily
        if (lat != null && lng != null){
            playerPos = [lng, lat];
        }
        if (username !== null){
            playerName = username;
        }
    }
}