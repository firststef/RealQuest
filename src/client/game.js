/*
SECTIONS:
1.CONSTANTS AND GLOBALS
2.GAME INIT FUNCTIONS
3.GAME LOGIC FUNCTIONS & CLASSES
4.API FUNCTIONS
5.GAME MAP FUNCTIONS
6.GAME COLLISIONS FUNCTIONS
7.UI FUNCTIONS
8.UTILS
*/
/* --------------------------------------------------------------------------------------------------------- CONSTANTS AND GLOBALS*/
const DEBUG = false;
//const ORIGIN = 'https://firststef.tools';
const ORIGIN = 'http://localhost';

const defaultPos = [27.598505, 47.162098];
const ZOOM = 1000000;

const windowWidth =  window.innerWidth;
const windowHeight =  window.innerHeight;
const buildingsBoxX=windowWidth*1.5; //thinking outside of box is not good
const buildingsBoxY=windowHeight*1.5;

const playerWidth = 20;
const playerRadius = 10; //radius of the player collision
const collisionDelta=2;
const projectileRadius = 4;
const monsterRadius = 8 ;
const projectileScale = 0.5;
const MAX_COORDINATE=180;
const initialDisplacement=0.000002;


const joyStickScreenMaxSize = 1000;

//Palette
const groundColor = "#379481";
const buildingsColor = "#956c6c";
const buildingsColor2 = "rgba(193,71,190,0.82)";
const buildingsColorMultiPolygon = "rgba(193,74,3,0.82)";
const roadsColor = "#d3d3d3";
const waterColor = "#0892A5";

//Socket
const socketServerAddress = ORIGIN;
//const socketServerAddress = ORIGIN;
const slowUpdateDelta = 1000;
const fastUpdateDelta = 1000/30;

var playerName = "player";

var pageLoader;
var resourceLoader; // resource loader
var stage; // the master object, contains all the objects in the game
var Key;
var spriteSheet;

//Layers - from bottom to top:
//var background - object
var camera;
var roadsLayer; // contains all roads
var waterLayer; // contains all water polygons
var buildingsLayer; // contains all the buildings
var otherBaseLayer;
var baseLayer; // contains the player and other movable objects - projectiles, monsters
var monsterLayer;
var projectileLayer; // contains all the projectiles
var weatherOverlay;
var luminosityOverlay;
var uiScreen;

var polygonShapesIdSet = new Set(); // used to retain the hashId for buildings, roads and water shapes - for optimization
var buildings = [];

//Api
var gameWeather;
var gameStartTime=-1;
var currentTime;
var map;
var weatherSheet;

//Game Vars
var scale = 2.5; // world pixel scale - every logical pixel is represented by (scale) number of pixels on the screen
var offsetx = windowWidth / (2*scale); //used for offsetting the "camera" center
var offsety = windowHeight / (2*scale);
var deleteLimitW = windowWidth/scale*1.4;
var deleteLimitH = windowHeight/scale*1.4;

var playerMaxHealth = 100;
var moneyPowerUpValue = 50;

var leaderBoardCount = 8;
var player;
var playerPos = defaultPos;
var playerHealth = playerMaxHealth;
var gameOver = false;
var displacement = initialDisplacement; // collision is checked by offsetting the position with this amount and checking for contact

var maxNrOfMonsters = 0; //made var from const to increase it as game goes on.
var monsterSheet;
var monsterSpawnTime=100;
var nrOfMonsters=0;
var ticks=0;
var monsterSpawner=3600;
var projectileSpawnTime=1000;

//Power-ups
var currentBox;
var speedTimeout;
var speedDisplacement=1.4*displacement;
var smashesLeft=0;
const mayRemove=1;

//UI vars
var playerLifeBar;
var playerTotalPoints;
var scoreBoards;

var nearbyMessageDescTop;
var nearbyMessageDescBottom;
var nearbyMessageName;
var yourCoordinates;
var consoleText;
var textBox;

var leftStick;
var rightStick;
var isStickEnabled;

//GPX vars
var GPXString = "";
var GPXInterval;
var writing = false;

//projectile vars
var projectileSheet;
const projectileCoolDown = 200;
var projectileCoolDownFlag = true;

//points vars
var monstersKilled=0;
var totalPoints=0;

//Socket
var socket;
var socketUpdateTimeout;
var updateSocketCallback;
var currentUpdateDelta = slowUpdateDelta;

/* --------------------------------------------------------------------------------------------------------- GAME INIT FUNCTIONS */

// entry point -> load() called by the canvas element on page load

/* prepare forced weather configuration */
class WeatherLoader{
    constructor(){
        this.callbacks = [];
        this.callbackArguments = [];
    }
    addCallback(callback, callbackArgument){
        this.callbacks.push(callback);
        this.callbackArguments.push(callbackArgument);
    }
    loadCallbacks(){
        for (let i =0; i<this.callbacks.length; i++){
            this.callbacks[i](this.callbackArguments[i]);
        }
    }
}
var weatherLoader = new WeatherLoader();


/** prepares the page */
class PageLoader{
    constructor(callbackObject, onCallbackEnd) {
        this.callbackObject = callbackObject;
        this.completedCallbacks = [];
        this.onCallbackEnd = onCallbackEnd;
        this.alreadyLoaded = false;
    }

    loadPage(){
        Object.values(this.callbackObject).forEach((callback) => callback());
    }

    notifyCompleted(callbackKey){
        this.completedCallbacks.push(callbackKey);
        this.handleCompleted();
    }

    isFinished(){
        return Object.keys(this.callbackObject).every((key) => this.completedCallbacks.includes(key));
    }

    isAlreadyLoaded(){
        return this.alreadyLoaded;
    }

    handleCompleted(){
        if (this.isFinished() && !this.alreadyLoaded){
            this.onCallbackEnd();
            this.alreadyLoaded = true;
        }
    }
}

/** runs when the page is opened, calls PageLoader */
function load() {
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
    //stage.addChild(weatherOverlay);
    //stage.addChild(luminosityOverlay);
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

/* --------------------------------------------------------------------------------------------------------- GAME LOGIC FUNCTIONS & CLASSES */

/** game update loop */
function tick(event) {
    if(gameOver === false) {
        if (player === undefined)
            return;

        //Movement
        if (!writing) {
            let axisX = 0;
            let axisY = 0;

            //Keyboard movement
            if (Key.isDown(Key.W) || (isStickEnabled && rightStick.GetY() > 0)) {
                // up
                if (checkCollisionWithBuildings(playerGetPos(0, displacement)[0], playerGetPos(0, displacement)[1], playerRadius, mayRemove))
                    if (checkPlayerCollisionWithMonsters(playerGetPos(0, displacement)[0], playerGetPos(0, displacement)[1], playerRadius))
                        axisY = 1;

                if (player.currentAnimation !== "runUp" && player.currentAnimation !== "runSideways")
                    player.gotoAndPlay("runUp");

            } else if (Key.isDown(Key.S)|| (isStickEnabled && rightStick.GetY() < 0)) {
                // down
                if (checkCollisionWithBuildings(playerGetPos(0, -displacement)[0], playerGetPos(0, -displacement)[1], playerRadius, mayRemove))
                    if (checkPlayerCollisionWithMonsters(playerGetPos(0, -displacement)[0], playerGetPos(0, -displacement)[1], playerRadius))
                        axisY = -1;

                if (player.currentAnimation !== "runDown" && player.currentAnimation !== "runSideways")
                    player.gotoAndPlay("runDown");
            }
            if (Key.isDown(Key.A) || (isStickEnabled && rightStick.GetX() < 0)) {
                // left
                if (checkCollisionWithBuildings(playerGetPos(-displacement, 0)[0], playerGetPos(-displacement, 0)[1], playerRadius, mayRemove))
                    if (checkPlayerCollisionWithMonsters(playerGetPos(-displacement, 0)[0], playerGetPos(-displacement, 0)[1], playerRadius))
                        axisX = -1;

                if (player.currentAnimation !== "runSideways")
                    player.gotoAndPlay("runSideways");

                player.setTransform(
                    player.x,
                    player.y,
                    (-1) * Math.abs(player.scaleX),
                    player.scaleY,
                    0,
                    0,
                    0,
                    0,
                    0
                );

            } else if (Key.isDown(Key.D) || (isStickEnabled && rightStick.GetX() > 0)) {
                // right
                if (checkCollisionWithBuildings(playerGetPos(displacement, 0)[0], playerGetPos(displacement, 0)[1], playerRadius, mayRemove))
                    if (checkPlayerCollisionWithMonsters(playerGetPos(displacement, 0)[0], playerGetPos(displacement, 0)[1], playerRadius))
                        axisX = 1;

                if (player.currentAnimation !== "runSideways")
                    player.gotoAndPlay("runSideways");

                player.setTransform(
                    player.x,
                    player.y,
                    Math.abs(player.scaleX),
                    player.scaleY,
                    0,
                    0,
                    0,
                    0
                );
            }

            if (axisX !== 0 || axisY !== 0) {
                let directionalDisplacement;
                if (axisX !== 0 && axisY !== 0) {
                    directionalDisplacement = displacement / Math.sqrt(2);
                } else {
                    directionalDisplacement = displacement;
                }

                map.jumpTo({
                    center: [map.transform.center.lng + axisX * directionalDisplacement, map.transform.center.lat + axisY * directionalDisplacement],
                    zoom: map.transform.zoom
                });
            }

            player.setTransform(
                player.reverseCenterX(getCoordinateX(map.transform._center.lng)),
                player.reverseCenterY(getCoordinateY(map.transform._center.lat)),
                player.scaleX,
                player.scaleY,
                0,
                0,
                0,
                player.regX,
                0
            );
            if (DEBUG === true) {
                baseLayer.getChildByName("playerRect").setTransform(player.centerX() - offsetx, player.centerY() - offsety);
            }
            camera.setTransform(-player.centerX() + offsetx, -player.centerY() + offsety);
            yourCoordinates.innerHTML = "Your coordinates: " + map.transform.center.lng.toFixed(2) + "," + map.transform.center.lat.toFixed(2);
        }

        if (isStickEnabled){
            let x = parseInt(leftStick.GetX());
            let y = parseInt(leftStick.GetY());
            if (projectileCoolDownFlag && (x !== 0 || y !== 0)){
                projectileCoolDownFlag = false

                shootProjectile(x, y);

                setTimeout(() => projectileCoolDownFlag = true, projectileCoolDown);
            }
        }

        //Bullet collision
        projectileLayer.children.forEach((sprite) => {
            if (sprite.isProjectile === true) {
                sprite.x += sprite.velocityX;
                sprite.y += sprite.velocityY;
                if (DEBUG === true) {
                    sprite.collider.x += sprite.velocityX;
                    sprite.collider.y += sprite.velocityY;
                }
                if (sprite.faction==="player"){
                    if (checkCollisionWithBuildings(sprite.centerX(), sprite.centerY(), projectileRadius) === false)
                        Projectile.removeProjectileWithId(sprite.name);
                    else if (checkProjectileCollisionWithMonsters(sprite.centerX(), sprite.centerY(), projectileRadius) === false)
                        Projectile.removeProjectileWithId(sprite.name);
                } else if (sprite.faction==="monster"){
/*                    if (checkCollisionWithBuildings(sprite.centerX(), sprite.centerY(), projectileRadius) === false)
                        Projectile.removeProjectileWithId(sprite.name);
                    else*/ if (checkCircleCollisionWithPlayer(sprite.centerX(), sprite.centerY(), projectileRadius)===false){
                        Projectile.removeProjectileWithId(sprite.name);
                        playerHealth -= 10;
                        if (playerHealth < 0) {
                            playerHealth = 0;
                            gameOver = 1;
                            //TODO !!! STOP all the other setIntervals
                        }
                        updatePlayerLifeBar();
                    }
                } else Projectile.removeProjectileWithId(sprite.name);
            }
        });

        //Monster collisions
        monsterLayer.children.forEach((sprite) => {
            if (sprite.isMonster === true) {
                sprite.timeToShoot--;

                let dx = player.x - sprite.x;
                let dy = player.y - sprite.y;
                if (dx>deleteLimitW||dx<-deleteLimitW||dy>deleteLimitH||dy<-deleteLimitH){
                    nrOfMonsters--;
                    Monster.removeMonsterWithId(sprite.name);
                }
                let angle = Math.atan2(dy, dx);
                sprite.x = sprite.x - (sprite.scaleX < 0 ? -sprite.getBounds().width*sprite.scaleX : 0);
                if (dx < 0)
                    sprite.scaleX = -Math.abs(sprite.scaleX);
                else
                    sprite.scaleX = Math.abs(sprite.scaleX);
                sprite.x = sprite.x + (sprite.scaleX < 0 ? -sprite.getBounds().width*sprite.scaleX : 0);

                let velocityX = sprite.velocity * Math.cos(angle);
                let velocityY = sprite.velocity * Math.sin(angle);

                if (sprite.mType === "Red" && sprite.timeToShoot===0){
                    sprite.timeToShoot=sprite.projectileTimer;
                    if (sprite.projectileTimer>35)
                        sprite.projectileTimer=sprite.projectileTimer-3;
                    let arrowSprite = new createjs.Sprite(projectileSheet, "purple_attack");
                    let arrowAngle=Math.atan2(dx, -dy);
                    arrowSprite.scaleX = projectileScale;
                    arrowSprite.scaleY = projectileScale;
                    arrowSprite.rotation = arrowAngle * (180/Math.PI) - 45;
                    new Projectile(
                        arrowSprite,
                        arrowSprite.reverseCenterX(sprite.centerX() + Math.sin(arrowAngle) * monsterRadius),
                        arrowSprite.reverseCenterY(sprite.centerY() - Math.cos(arrowAngle) * monsterRadius),
                        arrowAngle  - Math.PI / 2,
                        4,
                        5000,
                        "monster"
                    );
                }

                if (checkCircleCollisionWithPlayer(sprite.centerX(), sprite.centerY(), monsterRadius, collisionDelta)) {
                    sprite.x += velocityX;
                    sprite.y += velocityY;
                    if (DEBUG === true) {
                        sprite.collider.x += velocityX;
                        sprite.collider.y += velocityY;
                    }
                } else {
                    playerHealth -= 0.1;
                    if (playerHealth < 0) {
                        playerHealth = 0;
                        gameOver = 1;
                    }
                    updatePlayerLifeBar();
                }
            }
        });
        //Monster spawn
        if ((ticks+1)%monsterSpawner===0){
            if (monsterSpawner>600)
                monsterSpawner=monsterSpawner-60;
            maxNrOfMonsters++;
        }
        monsterSpawnTime--;
        totalPoints=totalPoints+(ticks / monsterSpawner + 1);
        if (monsterSpawnTime <= 0 && nrOfMonsters < maxNrOfMonsters) {
            monsterSpawnTime = 100;
            nrOfMonsters++;

            let monsterSprite;
            let mType;
            if (Math.random() > 0.5) {
                monsterSprite = new createjs.Sprite(monsterSheet, "moveRed");
                mType = "Red";
            }
            else {
                monsterSprite = new createjs.Sprite(monsterSheet, "moveGreen");
                mType = "Green";
            }

            monsterSprite.x = playerGetPos()[0];
            monsterSprite.y = playerGetPos()[1];
            monsterSprite.scaleX = 0.5;
            monsterSprite.scaleY = 0.5;

            let xRand = Math.random();
            let yRand = Math.random();

            new Monster(
                monsterSprite,
                playerGetPos()[0] + (Math.floor(xRand*100%2)===0 ? 1 : -1) * (1 + xRand) * offsetx,
                playerGetPos()[1] + (Math.floor(yRand*100%2)===0 ? 1 : -1) * (1 + yRand) * offsety,
                mType === "Red" ? 1 : 2,
                100,
                mType
            );
        }

        //PowerUp Activate
        for (let i = 1 + DEBUG; i < baseLayer.children.length; i++){
            let child = baseLayer.getChildAt(i);
            if (child.isPowerUp){
                if (checkCircleCollisionWithPlayer(child.centerX(), child.centerY(),
                    (child.getBounds().width*child.scaleX)/2) === false){
                    if (child.type==="money")
                        totalPoints += 600*moneyPowerUpValue;
                    else if (child.type === "speedBoost") {
                        clearTimeout(speedTimeout);
                        displacement=speedDisplacement;
                        speedTimeout=setTimeout(function (){
                            displacement=initialDisplacement;
                        }, 5000);
                    }
                    else if (child.type === "smashBuilding"){
                        smashesLeft++;
                    }

                    baseLayer.removeChildAt(i);

                    i--;
                }
            }
        }

        ticks++;
        stage.update(event);
    } else {
        createjs.Ticker.paused = true;
        createjs.Ticker.removeEventListener("tick", tick);
        clearInterval(GPXInterval);

        GPXString = GPXString.concat("\t</trkseg>\n</trk>\n</gpx>");

        let canvas = document.getElementById("gameCanvas");
        let context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById("map").style.display = 'none';

        getLeaderBoards(parseFloat((totalPoints/600).toFixed(2)));
        toggleScreen();
        //let divMap = document.getElementById("map");

        //LogOnce();

        //divMap.style.width='50%';
        //divMap.style.height='50%';

        //map.resize();

        //gameOver=0;
        //playerHealth=playerMaxHealth;
        //createjs.Ticker.paused = false;
        //updatePlayerLifeBar();
    }
}

/* INPUT */
function loadKeyHandler(){
    return {
        _pressed: {},

        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        W:87,
        A:65,
        S:83,
        D:68,

        isDown: function(keyCode) {
            return this._pressed[keyCode];
        },

        onKeydown: function(event) {
            this._pressed[event.key] = true;
            this._pressed[event.keyCode] = true;
        },

        onKeyup: function(event) {
            delete this._pressed[event.key];
            delete this._pressed[event.keyCode];
        }
    };
}

/* On creation a projectile is added to the projectileLayer with the given sprite, at the x,y origin and an angle - following
* a trajectory with a given velocity until timeToLive is expired */
class Projectile {
    constructor(sprite, x, y, angle, velocity, timeToLive, faction="player") {
        if (Number.isInteger(timeToLive) && timeToLive > 0){
            let id = getUniqueId();

            this.isProjectile = true;
            this.sprite = sprite;

            sprite.isProjectile = true;
            sprite.timeToLive = timeToLive;
            sprite.angle = angle;
            sprite.velocityX = velocity * Math.cos(angle);
            sprite.velocityY = velocity * Math.sin(angle); //de pus velocity in loc
            sprite.name = id;
            sprite.x = x;
            sprite.y = y;
            sprite.faction=faction;

            sprite.timeout = setTimeout(function () { // daca a expirat timeToLive stergem proiectilul
                Projectile.removeProjectileWithId(id);
            }, timeToLive);

            if (DEBUG === true){
                let projectileCircle = new createjs.Shape();
                projectileCircle.graphics.beginStroke("green");
                projectileCircle.name = id + "circle";
                projectileCircle.graphics.beginFill("green");
                projectileCircle.graphics.drawCircle(sprite.centerX(), sprite.centerY(), projectileRadius);
                sprite.collider = projectileCircle;
                projectileLayer.addChild(projectileCircle);
            }
            projectileLayer.addChild(sprite);
        }
        else{
            this.isProjectile = false;
        }
    }

    static removeProjectileWithId(id) {
        for (let i = 0; i < projectileLayer.children.length; i++) {
            let sprite = projectileLayer.children[i];
            if (sprite.isProjectile === true && sprite.name === id) {
                clearTimeout(sprite.timeout);
                projectileLayer.removeChildAt(i);
                if (DEBUG === true){
                    projectileLayer.removeChildAt(i-1);
                }
                //console.log('time for me to die ' + id + ' projectileLayer has ' + projectileLayer.children.length + ' children left i had ' + id);
                break;
            }
        }
    }
}

function shootProjectile(x, y){
    let arrowSprite = new createjs.Sprite(projectileSheet, "blue_attack");
    arrowSprite.scaleX = 0.3;
    arrowSprite.scaleY = 0.3;
    let angle = Math.atan2(x, y);
    arrowSprite.rotation = angle * (180/Math.PI) - 90;
    let p = new Projectile(
        arrowSprite,
        arrowSprite.reverseCenterX(playerGetPos()[0] + Math.sin(angle) * playerRadius),
        arrowSprite.reverseCenterY(playerGetPos()[1] - Math.cos(angle) * playerRadius),
        angle  - Math.PI / 2,
        4,
        3000
    );
}

class Monster{
    constructor(sprite, x, y, velocity,hp, type) {
        let id = getUniqueId();

        this.sprite = sprite;
        this.isMonster = true;

        sprite.mType = type;
        if (type === "Red") {
            sprite.projectileTimer = 2 * Math.floor((60 + Math.random() * 120));
            sprite.timeToShoot = sprite.projectileTimer;
        }

        sprite.name = id;
        sprite.isMonster = true;
        sprite.x = x;
        sprite.y = y;
        sprite.monsterHP = hp;
        sprite.velocity = velocity;

        if (DEBUG === true){
            let monsterCircle = new createjs.Shape();
            monsterCircle.graphics.beginStroke("green");
            monsterCircle.name = id + "circle";
            monsterCircle.graphics.beginFill("green");
            monsterCircle.graphics.drawCircle(sprite.centerX(), sprite.centerY(), monsterRadius);
            sprite.collider = monsterCircle;
            monsterLayer.addChild(monsterCircle);
        }
        monsterLayer.addChild(sprite);
    }

    static removeMonsterWithId(id) {
        for (let i = 0; i < monsterLayer.children.length; i++) {
            let sprite = monsterLayer.children[i];
            if (sprite.isMonster === true && sprite.name === id) {
                monsterLayer.removeChildAt(i);
                if (DEBUG === true){
                    monsterLayer.removeChildAt(i-1);
                }
                //console.log('time for me to die ' + id + ' projectileLayer has ' + projectileLayer.children.length + ' children left i had ' + id);
                break;
            }
        }
    }
}


function createPowerUps() {
    if (this.moneyId === undefined){
        this.moneyId = 0;
    }
    if (this.speedId === undefined){
        this.speedId = 0;
    }
    if (this.smashBuilding === undefined){
        this.smashBuilding = 0;
    }

    if (Math.random() > 0.5){
        return;
    }

    let playerPos = playerGetPos();

    let outSideLastBox = false;
    if (currentBox === undefined ||
     playerPos[0] < currentBox.x - currentBox.radius ||
      playerPos[0] > currentBox.x + currentBox.radius ||
        playerPos[1] < currentBox.y - currentBox.radius ||
        playerPos[1] > currentBox.y + currentBox.radius){
        currentBox = {
            x: playerPos[0],
            y: playerPos[1],
            radius: offsetx > offsety ? offsetx : offsety
        };
        outSideLastBox = true;
    }

    if (outSideLastBox) {
        let xRand;
        let yRand;
        if (Math.random() > 0.5) {
            xRand = Math.random();
            yRand = Math.random();
            let money = new createjs.Sprite(projectileSheet, "money");
            money.type="money";
            money.name = (this.moneyId++).toString();
            money.isPowerUp = true;
            money.scaleX = 0.3;
            money.scaleY = 0.3;
            money.x = playerPos[0] + (Math.floor(xRand*100%2)===0 ? 1 : -1) * (2* xRand) * offsetx;
            money.y = playerPos[1] + (Math.floor(yRand*100%2)===0 ? 1 : -1) * (2* yRand) * offsety;

            baseLayer.addChild(money);
        }
        if (Math.random()>0.5) {
            xRand = Math.random();
            yRand = Math.random();
            let speedBoost = new createjs.Sprite(projectileSheet, "speedBoost");
            speedBoost.type="speedBoost";
            speedBoost.name = (this.speedBoost++).toString();
            speedBoost.isPowerUp = true;
            speedBoost.scaleX = 0.3;
            speedBoost.scaleY = 0.3;
            speedBoost.x = playerPos[0] + (Math.floor(xRand*100%2)===0 ? 1 : -1) * (2* xRand) * offsetx;
            speedBoost.y = playerPos[1] + (Math.floor(yRand*100%2)===0 ? 1 : -1) * (2* yRand) * offsety;

            baseLayer.addChild(speedBoost);
        }
        if (Math.random() > 0.5){
            xRand = Math.random();
            yRand = Math.random();
            let smashBuilding = new createjs.Sprite(projectileSheet, "smashBuilding");
            smashBuilding.type="smashBuilding";
            smashBuilding.name = (this.smashBuilding++).toString();
            smashBuilding.isPowerUp = true;
            smashBuilding.scaleX = 0.3;
            smashBuilding.scaleY = 0.3;
            smashBuilding.x = playerPos[0] + (Math.floor(xRand*100%2)===0 ? 1 : -1) * (2* xRand) * offsetx;
            smashBuilding.y = playerPos[1] + (Math.floor(yRand*100%2)===0 ? 1 : -1) * (2* yRand) * offsety;

            baseLayer.addChild(smashBuilding);
        }

    }
}

/* --------------------------------------------------------------------------------------------------------- API FUNCTIONS */

/* CONFIGURATION API */
function getGameConfiguration(){
    let configRequest = ORIGIN + "/api/configuration";
    fetch(configRequest).
    then((response) => {
        return response.json();
    }).then((data)=> {

        // console.log('===========================');
        // console.log(data);
        // console.log('===========================');
        if (data.maxNrOfMonsters !== undefined){
            maxNrOfMonsters=data.maxNrOfMonsters;
        }

        if (data.isNight !== undefined) { //data.staysNight
            weatherLoader.addCallback(setNightOverlay, data.isNight);
            // setNightOverlay(data.isNight);
        }
        if (data.rain === true) {
            weatherLoader.addCallback(setWeatherOverlay, "Rain");
            // setWeatherOverlay("Rain");
        }
        if (data.snow === true) {
            weatherLoader.addCallback(setWeatherOverlay, "Snow");
            // setWeatherOverlay("Snow");
        }
        if (data.playerMaxHealth !== undefined) {
            playerMaxHealth=data.playerMaxHealth;
            playerHealth=playerMaxHealth;
        }
        if (data.leaderBoardCount !== undefined){
            leaderBoardCount=data.leaderBoardCount;
        }
        if (data.displacement !== undefined){
            displacement=data.displacement;
        }
        if (data.moneyPowerUpValue !== undefined){
            moneyPowerUpValue=data.moneyPowerUpValue;
        }
        if (data.speedDisplacement !== undefined){
            speedDisplacement=data.speedDisplacement*displacement;
        }
        if (data.scale !== undefined) {
            scale=data.scale;
            offsetx = windowWidth / (2*scale);
            offsety = windowHeight / (2*scale);
            deleteLimitW = windowWidth/scale*1.4;
            deleteLimitH = windowHeight/scale*1.4;
            stage.scaleX = scale;
            stage.scaleY = scale;
        }

        pageLoader.notifyCompleted('loadGameConfiguration');

    });

}

/* GEO TIME FUNCTIONS */

function getServerTimeAndWeather(){
    let timeRequest= ORIGIN + "/api/environment?lat="+playerPos[1]+"&long="+playerPos[0];
    fetch(timeRequest).
    then((response) => {
        return response.json();
    }).then((data) => {
        gameStartTime=data.time;
        gameWeather=data.weather;
        //console.log("gameStartTime", gameStartTime);
        //console.log("gameWeather", gameWeather);
        document.getElementById("loadTimeAndWeatherWheel").innerHTML = "&#x2714;";
        document.getElementById("loadTimeAndWeatherWheel").className = "";
        pageLoader.notifyCompleted('loadTimeAndWeather');
    });
}

/* GEO MAP FUNCTIONS */

function setMap() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11?optimize=true',
        center: [playerPos[0], playerPos[1]],
        zoom: 18
    });
    map.on('load', function() {
        map.getCanvas().addEventListener(
            'keydown',
            function(e) {
                e.preventDefault();
            },
            true
        );
        let searchCallback = function() {
            document.getElementById("map").hidden = false;
            let features = map.queryRenderedFeatures({/*sourceLayer: ["road", "building"]*/ });
            document.getElementById("map").hidden = true;
            features.forEach(function (feature) {
                if (buildingsLayer !== undefined && roadsLayer !== undefined && validateAndAddId(feature.geometry)) {
                    drawFeature(feature);
                    feature.geometry.collidable=true;
                    if (ticks<120)
                        feature.geometry.collidable=false;
                    if (feature.sourceLayer === "building") {
                        buildings.push(buildingAdder(feature.geometry));
                    }
                }
            });
        };
        document.getElementById("loadMapWheel").innerHTML = "&#x2714;";
        document.getElementById("loadMapWheel").className = "";
        pageLoader.notifyCompleted('loadMap');
        searchCallback();
        setInterval(searchCallback, 3000); //TODO: request doar cand se paraseste view-portul curent
    });
    map["keyboard"].disable();
}

function createFile(text, filename){
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function downloadGPX(){
    let text = GPXString;
    let filename = "track.gpx";
    createFile(text,filename);
}

function downloadLeaderboard(){
    fetch(ORIGIN + "/api/leaderboards?count=10&myScore=0")
        .then((response) => {
            return response.json();
        })
        .then(response => {
            let csvText = '';
            response.players.forEach(player => { csvText += (player.username + ',' + player.score + '\n');})
            return csvText;
        })
        .then(text => {
            let filename = "leaderboard.csv";
            createFile(text,filename);
    });
}

/* --------------------------------------------------------------------------------------------------------- GAME MAP FUNCTIONS */

function getCoordinateX(point){
    return -(playerPos[0]-point)*ZOOM+offsetx;
}
function getCoordinateY(point){
    return (playerPos[1]-point)*ZOOM+ offsety;
}
function getReverseCoordinateX(point){
    return playerPos[0] - ((point - offsetx) / (-ZOOM));
}
function getReverseCoordinateY(point){
    return playerPos[1] - ((point - offsety) / ZOOM);
}
function getScreenCoordinates(arr){
    let new_arr = [];
    arr.forEach(point => {
        new_arr.push([getCoordinateX(point[0]), getCoordinateY(point[1])]);
    });
    return new_arr;
}
function getReverseCoordinates(arr){
    let new_arr = [];
    arr.forEach(point => {
        new_arr.push([getReverseCoordinateX(point[0]), getReverseCoordinateY(point[1])]);
    });
    return new_arr;
}

/** parameters (x, y...) are real coordinate values - they are offsets from playerPos */
function playerGetPos(x=0, y=0, z=0, t=0) {
    return [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + t];
}

//TODO: remove if not needed
function playerGetRect(x=0, y=0, z=0, t=0) {
    return [
        [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + t],
        [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + playerWidth  + t],
        [getCoordinateX(map.transform._center.lng + x) + playerWidth + z, getCoordinateY(map.transform._center.lat + y) + playerWidth + t],
        [getCoordinateX(map.transform._center.lng + x) + playerWidth  + z,getCoordinateY(map.transform._center.lat + y) + t],
        [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + t]
    ];
}

function drawPointArray(object, array, fill = false, color = "red") {
    let line_x=getCoordinateX(array[0][0]);
    let line_y=getCoordinateY(array[0][1]);
    let mx = line_x;
    let my = line_y;
    let Mx = line_x;
    let My = line_y;
    if (fill === true)
        object.graphics.moveTo(line_x, line_y).beginFill(color);
    else
        object.graphics.moveTo(line_x, line_y);
    array.forEach(function(point) {
        let x = getCoordinateX(point[0]);
        let y = getCoordinateY(point[1]);
        if (x < mx)
            mx = x;
        else if (x > Mx)
            Mx = x;
        if (y < my)
            my = y;
        else if (y > My)
            My = y;
        object.graphics.lineTo(getCoordinateX(point[0]), getCoordinateY(point[1]));
    });
    object.setBounds(mx, my, Mx-mx, My-my);

    return [mx, my, Mx, My];
}

function drawRoad(geometry, color, name) {
    let road = new createjs.Shape();
    road.tickEnabled = false;
    road.graphics.setStrokeStyle(30,"round").beginStroke(color);
    road.name=name;

    if (geometry.type === "MultiLineString") {
        geometry.coordinates.forEach(function(array) {
            drawPointArray(road, array);
        });
    } else {
        drawPointArray(road, geometry.coordinates);
    }
    roadsLayer.addChild(road);
}

//TODO: rename to instantiate
function drawPolygon(geometry, fill = false, color, name) {
    let polygon = new createjs.Shape();
    polygon.graphics.beginFill(color);
    polygon.tickEnabled = false;
    polygon.name = name;

    if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach(function(multiPolygon) {
            multiPolygon.forEach(function(figure) {
                drawPointArray(polygon, figure, fill, color);
            });
        });
    } else {
        geometry.coordinates.forEach(function(figure) {
            drawPointArray(polygon, figure, fill, color);
            //let limits = drawPointArray(polygon, figure, fill, color);
            //polygon.cache(...limits);
        });
    }
    buildingsLayer.addChild(polygon);
}

function drawFeature(feature) {
    switch (feature.sourceLayer) {
        case "road": {
            drawRoad(feature.geometry, roadsColor, feature.geometry.hash);
            break;
        }
        case "building": {
            if (ticks<120)
                drawPolygon(feature.geometry, false, buildingsColor2, feature.geometry.hash);
            else
                drawPolygon(feature.geometry, false, buildingsColor, feature.geometry.hash);

            break;
        }
        case "water": {
            drawPolygon(feature.geometry, true, waterColor, feature.geometry.hash);
            break;
        }
        default:
            break;
    }
}

function validateAndAddId(obj){
    let id = hash(obj);
    if (polygonShapesIdSet.has(id))
        return false;
    polygonShapesIdSet.add(id);
    obj.hash=id;
    return true;
}


function buildingAdder(building){
    let mx=MAX_COORDINATE; let my=MAX_COORDINATE;
    let Mx=-MAX_COORDINATE; let My=-MAX_COORDINATE;
    if (building.type==="Polygon")
        building.coordinates[0].forEach(point => {
            if (point[0]>Mx) Mx=point[0];
            if (point[0]<mx) mx=point[0];
            if (point[1]>My) My=point[1];
            if (point[1]<my) my=point[1];
        });
    else
        building.coordinates.forEach(polygon =>{
            polygon[0].forEach(point => {
                if (point[0]>Mx) Mx=point[0];
                if (point[0]<mx) mx=point[0];
                if (point[1]>My) My=point[1];
                if (point[1]<my) my=point[1];
            });
        });
    building.Mx=Mx;
    building.My=My;
    building.mx=mx;
    building.my=my;
    return building;
}

function cleanFarAwayBuildings(){

    for (let i=0; i<buildings.length; i++){
        if (!buildingSquareCollision(playerGetPos()[0], playerGetPos()[1], buildingsBoxX, buildingsBoxY, buildings[i])) {
            buildingsLayer.removeChild(buildingsLayer.getChildByName(buildings[i].hash))
            polygonShapesIdSet.delete(buildings[i].hash);
            buildings.splice(i, 1);
        }
    }
}

/* --------------------------------------------------------------------------------------------------------- GAME COLLISIONS FUNCTIONS */

//TODO: remove this if not needed
function isPolygonCollidingWithBuildings(target){

    return false;
}


function distanceBetweenPoints(x1, y1, x2, y2){
    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
}

function checkIfPointOnLine(x, y, x1, y1, x2, y2){
    let precision = 6;
    return parseFloat((distanceBetweenPoints(x, y, x1, y1) + distanceBetweenPoints(x, y, x2, y2)).toFixed(precision)) ===
        parseFloat(distanceBetweenPoints(x1, y1, x2, y2).toFixed(precision));

}
function pointLineDistance(x0, y0, a, b, c){
    return [(b*(b*x0-a*y0)-a*c)/(a*a+b*b), (a*(-b*x0+a*y0)-b*c)/(a*a+b*b)];
}
function distance(x1, y1, x2, y2, x3, y3){
/*    let x=0, y=0;
    let val1=0, val2=0, val3=0;*/
    if (x2===x3){
        if (y1<=Math.max(y2, y3)&&y1>=Math.min(y2, y3))
            return Math.abs(x1-x3);
        return Math.min(distanceBetweenPoints(x1, y1, x2, y2), distanceBetweenPoints(x1, y1, x3, y3));
    }
    let m=(y3-y2)/(x3-x2);//ax+by+c=0, y-y1=m(x-x1)
    let d=pointLineDistance(x1, y1, m, -1, y2-m*x2);
    if (checkIfPointOnLine(d[0], d[1], x2, y2, x3, y3))
        return distanceBetweenPoints(x1, y1, d[0], d[1]);
    return Math.min(distanceBetweenPoints(x1, y1, x2, y2), distanceBetweenPoints(x1, y1, x3, y3));
}

function isInside(x, y, radius, coords) {
    for (let i=1; i<coords.length; i++){
        if (distance(x, y, getCoordinateX(coords[i-1][0]), getCoordinateY(coords[i-1][1]), getCoordinateX(coords[i][0]),
            getCoordinateY(coords[i][1]))<radius)
            return true;
    }
    return distance(
        x,
        y,
        getCoordinateX(coords[0][0]),
        getCoordinateY(coords[0][1]),
        getCoordinateX(coords[coords.length - 1][0]),
        getCoordinateY(coords[coords.length - 1][1])
    ) < radius;
}

function collision(x, y, radius, coords, type){
    if (type==="MultiPolygon"){
        for (let i=0; i<coords.length; i++)
            if (isInside(x, y, radius, coords[i][0]))//TODO check if coords[i][0] or coords[i]
                return true;
    }else
        return isInside(x, y, radius, coords[0]);

    return false;
}

/** returns true if there is no collision */
function checkCollisionWithBuildings(x, y, radius, remove=0){
    for (let i=0; i<buildings.length; i++){
        if (!buildingSquareCollision(x,y,radius,radius,buildings[i])||buildings[i].collidable===false)
            continue;
        let coords=buildings[i].coordinates;
        if (collision(x, y, radius, coords, buildings[i].type)) {
            if (remove === 1 && smashesLeft>0) {
                smashesLeft--;
                buildings[i].collidable = false;
                buildingsLayer.getChildByName(buildings[i].hash).graphics._fill.style=buildingsColor2;
                return true;
            }
            return false;
        }
    }
    return true;
}

/** returns true if the player is inside the building's square */
function buildingSquareCollision(x,y, radiusX, radiusY,  building){
    // console.log("mx", getCoordinateX(building.mx), "x", x, "Mx", getCoordinateX(building.Mx));
    // console.log("my", getCoordinateY(building.my), "y", y, "My", getCoordinateY(building.My));
    return !(x > getCoordinateX(building.Mx) + radiusX || x < getCoordinateX(building.mx) - radiusX || y < getCoordinateY(building.My) - radiusY || y > getCoordinateY(building.my) + radiusY);
}

function checkProjectileCollisionWithMonsters(x,y,radius){
    for (let i=0; i<monsterLayer.children.length; i++) {
        let sprite = monsterLayer.children[i];
        if (sprite.isMonster === true) {
            if (Math.pow((x - sprite.centerX()),2) + Math.pow((y - sprite.centerY()),2) <= Math.pow(monsterRadius + radius, 2)) {
                sprite.monsterHP -= 25;
                if (sprite.monsterHP <= 0) {
                    nrOfMonsters--;
                    Monster.removeMonsterWithId(sprite.name);
                    monstersKilled++;
                    totalPoints=totalPoints+5*600*(ticks/monsterSpawner+1);
                    updatePlayerTotalPoints();
                }
                return false;
            }
        }
    }
    return true;
}

function checkPlayerCollisionWithMonsters(x,y,radius){
    for (let i=0; i<monsterLayer.children.length; i++) {
        let sprite = monsterLayer.children[i];
        if (sprite.isMonster === true) {
            if (Math.pow((x - sprite.centerX()),2) + Math.pow((y - sprite.centerY()),2) <= Math.pow(monsterRadius + radius, 2)) {
                return false;
            }
        }
    }
    return true;
}

/** Returns false if (x,y) is closer than radius to player */
function checkCircleCollisionWithPlayer(x,y, radius, collisionDelta=0){
    return Math.pow(playerGetPos()[0] - x, 2) + Math.pow(playerGetPos()[1] - y, 2) > Math.pow(radius + playerRadius + collisionDelta, 2);
}

/* --------------------------------------------------------------------------------------------------------- UI FUNCTIONS */

function updatePlayerLifeBar() {
    let percent = Math.trunc(playerHealth / playerMaxHealth * 100);
    if (percent < 0)
        percent = 0;
    playerLifeBar.style.width = percent.toString() + '%';
}

function updatePlayerTotalPoints() {
    let points=(totalPoints/600).toFixed(2);
    playerTotalPoints.innerText= 'HeroPoints: ' + points.toString();
}

function updateScoreBoard() {
    fetch(ORIGIN + "/api/livescores?count=7")
        .then((response) => {
            return response.json();
        })
        .then((playerList) => {
            let domString = "<table class=\"topazCells\">";
            playerList.forEach((player) => {
                domString = domString + "<tr><td>" + player.username + "</td><td>"+ player.currentPoints.toString() +"</td></tr>";
            });
            domString += "</table>";
            scoreBoards.innerHTML = domString;
        });
}

function updateNearbyMessage() {
    fetch(ORIGIN + "/api/nearbymessage?lat="+map.transform._center.lat+"&long="+map.transform._center.lng)
        .then((response) => {
            return response.json();
        })
        .then((message) => {
            if (message.name === undefined)
            {
                message.name = '';
            }
            else{
                if (nearbyMessageName.innerHTML === "🙤 " + message.name +" 🙦")
                    return;
                message.name = "&#128612; " + message.name + " &#128614;";

            }
            if (message.topText === undefined)
                message.topText = '';
            if (message.bottomText === undefined)
                message.bottomText = '';

            nearbyMessageDescTop.innerHTML = message.topText;
            nearbyMessageDescBottom.innerHTML = message.bottomText;
            nearbyMessageName.innerHTML = message.name;
        });
}

function getLeaderBoards(myScore) {
    fetch(ORIGIN + "/api/leaderboards?count="+ leaderBoardCount +"&myScore=" + myScore)
        .then((response) => {
            return response.json();
        })
        .then((boards) => {
            let tableContent = '';
            boards.players.forEach((playerObj) => {
                tableContent += `<tr><td>${playerObj.username}</td><td>${playerObj.score}</td></tr>`;
            });
            document.getElementById("leaderBoards").innerHTML = tableContent;
            document.getElementById("yourPlace").innerHTML = "Your place: " + boards.myPlace;
            document.getElementById("yourScore").innerHTML = "Your score: "+ myScore;
        });
}

function toggleScreen() {
    let gameScreen = document.getElementById("gameContainer");
    let endScreen = document.getElementById("endScreenContainer");
    if (gameScreen.style.display === "block") {
        gameScreen.style.display = "none";
        endScreen.style.display = "flex";
    } else {
        gameScreen.style.display = "block";
        endScreen.style.display = "none";
    }
}

function setNightOverlay(on) {
    let nightChild = stage.getChildByName("luminosityOverlay");
    if (nightChild !== null){
        stage.removeChild(nightChild);
    }
    if (on === true) {
        luminosityOverlay = new createjs.Shape();
        luminosityOverlay.graphics
            .beginRadialGradientFill(["rgba(54,118,191,0.15)", "rgba(6,29,41,0.9)"], [0, 1], offsetx, offsety,
                playerRadius, offsetx, offsety, playerRadius * 10)
            .drawRect(0, 0, windowWidth, windowHeight);
        luminosityOverlay.name = "luminosityOverlay";
        stage.addChildAt(luminosityOverlay, 4);
    }
}

function setWeatherOverlay(weather) {
    let weatherChild = stage.getChildByName("weatherOverlay");
    if (weatherChild !== null){
        stage.removeChild(weatherChild);
    }
    weatherSheet = new createjs.SpriteSheet({ //this will be replaced with weather
        framerate: 8,
        "images": [resourceLoader.getResult("weather")],
        "frames": {"height": 32, "width": 32, "regX": 0, "regY": 0, "spacing": 10, "margin": 0},
        "animations": {
            "rain": [0, 12, "rain", 2],
            "snow": [13, 19, "snow", 1]
        }
    });

    if (weather === "Rain") {
        weatherOverlay = new createjs.Sprite(weatherSheet, "rain");
    } else if (weather === "Snow") {
        weatherOverlay = new createjs.Sprite(weatherSheet, "snow");
    }
    else {
        return;
    }
    weatherOverlay.scaleX = 1;
    weatherOverlay.scaleY = 1;
    weatherOverlay.name = "weatherOverlay";

    if (this.offscreenCanvas === undefined) {
        this.offscreenCanvas = document.createElement('canvas');
    }
    this.offscreenCanvas.width = 32;
    this.offscreenCanvas.height = 32;

    let thisRef = this;
    weatherOverlay.draw = function (ctx, ignoreCache) {
        if (this.DisplayObject_draw(ctx, ignoreCache)) {
            return true;
        }
        this._normalizeFrame();
        let o = this.spriteSheet.getFrame(this._currentFrame | 0);
        if (!o) {
            return false;
        }
        let rect = o.rect;
        if (rect.width && rect.height) {
            let offscreenContext = thisRef.offscreenCanvas.getContext('2d');
            offscreenContext.clearRect(0, 0, thisRef.offscreenCanvas.width, thisRef.offscreenCanvas.height);
            offscreenContext.drawImage(o.image, rect.x, rect.y, rect.width, rect.height, -o.regX, -o.regY, rect.width, rect.height);
            ctx.beginPath();
            ctx.rect(0, 0, windowWidth, windowHeight);
            ctx.fillStyle = ctx.createPattern(thisRef.offscreenCanvas, 'repeat');
            ctx.save();
            ctx.translate(-player.centerX(), -player.centerY());
            ctx.fill();
            ctx.restore();
        }
        return true;
    };
    stage.addChildAt(weatherOverlay, 3);
}

function updateWeatherOverlay(weatherLoader){
    if(this.initialDisplay !== undefined){
        getServerTimeAndWeather();
    }
    this.initialDisplay = true;
    setWeatherOverlay(gameWeather.weather[0].main);
    setNightOverlay(gameStartTime < 420 || gameStartTime > 1320);
    if (weatherLoader !== undefined) {
        weatherLoader.loadCallbacks();
    }
}

function initStickDisplay(){
    leftStick = new JoyStick('leftStick', {title: "leftStick"});
    rightStick = new JoyStick('rightStick', {title: "rightStick"});
    setTimeout(() => {
        document.getElementById("leftStick").style.height = "unset"
        document.getElementById("rightStick").style.height = "unset"
    }, 1);
}

/* --------------------------------------------------------------------------------------------------------- UTILS */

function getUniqueId(){
    if( typeof getUniqueId.counter == 'undefined' ) {
        getUniqueId.counter = 0;
    }
    return getUniqueId.counter++;
}

function hash(obj){
    let stringified = JSON.stringify(obj);
    let hash = 0, i, chr;
    if (stringified.length === 0) return hash;
    for (i = 0; i < stringified.length; i++) {
        chr   = stringified.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

function isLocalStorageSupported() {
    try {
        const key = "__some_random_key__";
        localStorage.setItem(key, key);
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
}