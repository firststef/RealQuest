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
9.NOTES
*/
/* --------------------------------------------------------------------------------------------------------- CONSTANTS AND GLOBALS*/
const DEBUG = true;

const defaultPos = [27.598505, 47.162098];
const ZOOM = 1000000;
const scale = 4; // world pixel scale - every logical pixel is represented by (scale) number of pixels on the screen
const windowWidth =  window.innerWidth;
const windowHeight =  window.innerHeight;
const offsetx = windowWidth / (2*scale); //used for offsetting the "camera" center
const offsety = windowHeight / (2*scale);
const playerWidth = 20;
const playerRadius = 10; //radius of the player collision
const collisionDelta=5;
const projectileRadius = 4;
const monsterRadius = 10;
const maxNrOfMonsters = 5;
const displacement = 0.000002; // collision is checked by offsetting the position with this amount and checking for contact
const playerMaxHealth = 100;

//Palette
const groundColor = "#379481";
const buildingsColor = "#956c6c";
const roadsColor = "#d3d3d3";
const waterColor = "blue";

var pageLoader;
var resourceLoader; // resource loader
var stage; // the master object, contains all the objects in the game
var Key;

//Layers - from bottom to top:
//var background - object
var camera;
var roadsLayer; // contains all roads
var waterLayer; // contains all water polygons
var buildingsLayer; // contains all the buildings
var baseLayer; // contains the player and other movable objects - projectiles, monsters
var monsterLayer;
var projectileLayer; // contains all the projectiles
//var weatherOverlay - object
var luminosityOverlay;
var uiScreen;

var polygonShapesIdSet = new Set(); // used to retain the hashId for buildings, roads and water shapes - for optimization
var buildings = [];

//Api
var gameWeather;
var gameStartTime=-1;
var map;

//Game Vars
var player;
var playerPos = defaultPos;
var playerHealth = playerMaxHealth;
var gameOver = false;

var monsterSheet;
var monsterSpawnTime=100;
var nrOfMonsters=0;

//UI vars
var playerLifeBar;

//GPX vars
var GPXString = "";
var GPXInterval;

/* --------------------------------------------------------------------------------------------------------- GAME INIT FUNCTIONS */

// entry point -> load() called by the canvas element on page load

/** prepares the page */
class PageLoader{
    constructor(callbackObject, onCallbackEnd) {
        this.callbackObject = callbackObject;
        this.completedCallbacks = [];
        this.onCallbackEnd = onCallbackEnd;
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

    handleCompleted(){
        if (this.isFinished()){
            this.onCallbackEnd();
        }
    }
}

/** runs when the page is opened, calls PageLoader */
function load() {
    parseParameters();

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
            loadResources: loadImages,
            loadWeather: getWeather,
            loadTime: setGameStartTime,
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
    resourceLoader.loadFile({id:"monsters", src:"../sprites/monsters.png"});
    resourceLoader.addEventListener("complete", function () {
        pageLoader.notifyCompleted('loadResources');
    });
}

/** initializes the game, runs after all resources have been loaded */
function loadComplete(){
    stage.removeAllChildren();
    document.getElementById("uiScreen").hidden = false;

    createjs.DisplayObject.prototype.centerX = function() {
        return  this.x + this.getBounds().width*this.scaleX*Math.sqrt(2)/2*Math.cos((this.rotation+45) * Math.PI / 180);
    };
    createjs.DisplayObject.prototype.centerY = function() {
        return  this.y + this.getBounds().height*this.scaleY*Math.sqrt(2)/2*Math.sin((this.rotation+45) * Math.PI / 180);
    };
    createjs.DisplayObject.prototype.reverseCenterX = function(centerX) {
        return  centerX - this.getBounds().width*this.scaleX*Math.sqrt(2)/2*Math.cos((this.rotation+45) * Math.PI / 180);
    };
    createjs.DisplayObject.prototype.reverseCenterY = function(centerY) {
        return  centerY - this.getBounds().height*this.scaleY*Math.sqrt(2)/2*Math.sin((this.rotation+45) * Math.PI / 180);
    };

    playerLifeBar = document.getElementById('lifebar');

    //GameObjects
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

    projectileLayer = new createjs.Container();
    projectileLayer.x = stage.x;
    projectileLayer.y = stage.y;

    monsterLayer = new createjs.Container();
    monsterLayer.x = stage.x;
    monsterLayer.y = stage.y;

    luminosityOverlay = new createjs.Shape();
    if (gameStartTime < 420 || gameStartTime > 600) {
        setNightOverlay();
    }
    luminosityOverlay.name = "luminosityOverlay";

    uiScreen = new createjs.DOMElement("uiScreen");

    stage.addChild(background);
    stage.addChild(camera);
    camera.addChild(roadsLayer);
    camera.addChild(waterLayer);
    camera.addChild(buildingsLayer);
    camera.addChild(baseLayer);
    camera.addChild(projectileLayer);
    camera.addChild(monsterLayer);
    stage.addChild(luminosityOverlay);
    stage.addChild(uiScreen);

    //GPX
    GPXString = GPXString.concat("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n<gpx xmlns=\"http://www.topografix.com/GPX/1/1\" xmlns:gpxx=\"http://www.garmin.com/xmlschemas/GpxExtensions/v3\" xmlns:gpxtpx=\"http://www.garmin.com/xmlschemas/TrackPointExtension/v1\" creator=\"mapstogpx.com\" version=\"1.1\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd\">\n\n<trk>\n\t<trkseg>\n");
    GPXInterval = setInterval(function() {
        if(gameOver === false)
            GPXString = GPXString.concat("\t<trkpt lat=\"" + map.transform._center.lat + "\" lon=\"" + map.transform._center.lng + "\">\n\t</trkpt>\n");
    },1000);

    let spriteSheet = new createjs.SpriteSheet({
        framerate: 8,
        "images": [resourceLoader.getResult("players")],
        "frames": {"height": 32, "width": 32, "regX": 0, "regY":0, "spacing":10, "margin":0, "count":315},
        "animations": {
            "idle": 0,
            "runSideways": [0, 1, "idle", 1.5],
            "runDown": {
                frames: [7,8,7,9],
                next: "idleDown",
                speed: 1.5
            },
            "idleDown": 7,
            "runUp": {
                frames: [14,15,14,16],
                next: "idleUp",
                speed: 1.5
            },
            "idleUp":14
        }
    });
    let projectileSheet = new createjs.SpriteSheet({
        framerate: 8,
        "images": [resourceLoader.getResult("projectiles")],
        "frames": {"height": 8, "width": 8, "regX": 0, "regY":0, "spacing":0, "margin":0},
        "animations": {
            "attack": 70
        }
    });
    monsterSheet = new createjs.SpriteSheet({
        framerate: 8,
        "images": [resourceLoader.getResult("monsters")],
        "frames": {"height": 8, "width": 8, "regX": 0, "regY":0, "spacing":0, "margin":0},
        "animations": {
            "move": {
                frames: [0,1,2,3,4,5,6,7],
                speed: 1
            }
        }
    });

    // GameEvents init
    stage.addEventListener("stagemousedown", (evt) => {
        let arrowSprite = new createjs.Sprite(projectileSheet, "attack");
        arrowSprite.scaleX = 2;
        arrowSprite.scaleY = 2;
        let angle = Math.atan2(evt.stageX - offsetx*scale, -(evt.stageY - offsety*scale) );
        arrowSprite.rotation = angle * (180/Math.PI) - 45;
        let p = new Projectile(
            arrowSprite,
            arrowSprite.reverseCenterX(playerGetPos()[0] + Math.sin(angle) * playerRadius),
            arrowSprite.reverseCenterY(playerGetPos()[1] - Math.cos(angle) * playerRadius),
            angle  - Math.PI / 2,
            4,
            3000
        );
    });

    let playerSprite = new createjs.Sprite(spriteSheet, "idle");
    playerSprite.scaleX = 0.5;
    playerSprite.scaleY = 0.5;
    playerSprite.x = playerSprite.reverseCenterX(playerGetPos()[0]);
    playerSprite.y = playerSprite.reverseCenterY(playerGetPos()[1]);
    playerSprite.name = "player";

    if (DEBUG === true) {
        let playerRect = new createjs.Shape();
        playerRect.graphics.beginStroke("green");
        playerRect.name = "playerRect";
        playerRect.graphics.beginFill("green");
        playerRect.graphics.drawCircle(playerSprite.centerX(), playerSprite.centerY(), playerRadius);
        baseLayer.addChild(playerRect);
    }
    baseLayer.addChild(playerSprite);
    player = baseLayer.getChildByName("player");

    //Input init
    Key = loadKeyHandler();
    window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
    window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);

    //Tick settings
    createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
    createjs.Ticker.framerate = 60;
    createjs.Ticker.addEventListener("tick", tick);
}

/** sets the initial player position */
function parseParameters(){
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let lat = urlParams.get("latitude");
    let lng = urlParams.get("longitude");

    if (lat != null && lng != null){
        playerPos = [lng, lat];
    }
}

/* --------------------------------------------------------------------------------------------------------- GAME LOGIC FUNCTIONS & CLASSES */

/** game update loop */
function tick(event) {
    if(gameOver === false) {
        if (player === undefined)
            return;

        let axisX = 0;
        let axisY = 0;
        if (Key.isDown(Key.W)) {
            // up
            if (checkCollisionWithBuildings(playerGetPos(0, displacement)[0], playerGetPos(0, displacement)[1], playerRadius))
                if (checkPlayerCollisionWithMonsters(playerGetPos(0, displacement)[0], playerGetPos(0, displacement)[1], playerRadius))
                    axisY = 1;

            if (player.currentAnimation !== "runUp" && player.currentAnimation !== "runSideways")
                player.gotoAndPlay("runUp");

        } else if (Key.isDown(Key.S)) {
            // down
            if (checkCollisionWithBuildings(playerGetPos(0, -displacement)[0], playerGetPos(0, -displacement)[1], playerRadius))
                if (checkPlayerCollisionWithMonsters(playerGetPos(0, -displacement)[0], playerGetPos(0, -displacement)[1], playerRadius))
                    axisY = -1;

            if (player.currentAnimation !== "runDown" && player.currentAnimation !== "runSideways")
                player.gotoAndPlay("runDown");
        }
        if (Key.isDown(Key.A)) {
            // left
            if (checkCollisionWithBuildings(playerGetPos(-displacement, 0)[0], playerGetPos(-displacement, 0)[1], playerRadius))
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

        } else if (Key.isDown(Key.D)) {
            // right
            if (checkCollisionWithBuildings(playerGetPos(displacement, 0)[0], playerGetPos(displacement, 0)[1], playerRadius))
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

        //bullet move = hit
        projectileLayer.children.forEach((sprite) => {
            if (sprite.isProjectile === true) {
                sprite.x += sprite.velocityX;
                sprite.y += sprite.velocityY;
                if (DEBUG === true) {
                    sprite.collider.x += sprite.velocityX;
                    sprite.collider.y += sprite.velocityY;
                }
                if (checkCollisionWithBuildings(sprite.centerX(), sprite.centerY(), projectileRadius) === false)
                    Projectile.removeProjectileWithId(sprite.name);
                else if (checkCollisionWithMonsters(sprite.centerX(), sprite.centerY(), projectileRadius) === false)
                    Projectile.removeProjectileWithId(sprite.name);
            }
        });

        monsterLayer.children.forEach((sprite) => {
            if (sprite.isMonster === true) {
                let dx = player.x - sprite.x;
                let dy = player.y - sprite.y;

                let angle = Math.atan2(dy, dx);

                let velocityX = sprite.velocity * Math.cos(angle);
                let velocityY = sprite.velocity * Math.sin(angle);
                if (checkMonsterCollisionWithPlayer(sprite.centerX(), sprite.centerY())) {
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

        monsterSpawnTime--;
        if (monsterSpawnTime <= 0 && nrOfMonsters < maxNrOfMonsters) {
            monsterSpawnTime = 100;
            nrOfMonsters++;
            let monsterSprite = new createjs.Sprite(monsterSheet, "move");

            monsterSprite.x = playerGetPos()[0];
            monsterSprite.y = playerGetPos()[1];
            monsterSprite.scaleX = 3;
            monsterSprite.scaleY = 3;

            let randomX = Math.random() * 200 - 100;
            let randomY = Math.random() * 200 - 100;
            randomX += Math.sign(randomX) * 50;
            randomY += Math.sign(randomY) * 50;

            new Monster(
                monsterSprite,
                playerGetPos()[0] + randomX,
                playerGetPos()[1] + randomY,
                1,
                100
            );
        }

        stage.update(event);
    } else {
        createjs.Ticker.paused = true;
        createjs.Ticker.removeEventListener("tick", tick);
        clearInterval(GPXInterval);

        GPXString = GPXString.concat("\t</trkseg>\n</trk>\n</gpx>");
        console.log(GPXString);

        let canvas = document.getElementById("gameCanvas");
        let context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        let divMap = document.getElementById("map");

        //LogOnce();

        divMap.style.width='50%';
        divMap.style.height='50%';

        map.resize();
        
        //gameOver=0;
        //playerHealth=playerMaxHealth;
        //createjs.Ticker.paused = false;    
        //updatePlayerLifeBar();
    }
}

/* INPUT */
//TODO cross-browser compatible method to get keycode
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
            this._pressed[event.keyCode] = true;
        },

        onKeyup: function(event) {
            delete this._pressed[event.keyCode];
        }
    };
}

/* On creation a projectile is added to the projectileLayer with the given sprite, at the x,y origin and an angle - following
* a trajectory with a given velocity until timeToLive is expired */
class Projectile {
    constructor(sprite, x, y, angle, velocity, timeToLive) {
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

class Monster{
    constructor(sprite, x, y, velocity,hp) {
        let id = getUniqueId();

        this.sprite = sprite;
        this.isMonster = true;

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

/* --------------------------------------------------------------------------------------------------------- API FUNCTIONS */
/* GEO TIME FUNCTIONS */
/**
 * returneaza timpul exact, dinamic, poate duce la variatii dese ale culorii daca se fataie jucatorul la stanga si la dreapta longitudinilor M15
 * @returns {number} = minutul si ora curenta a jocului la coordonatele actuale, pentru a fi eventula afisate intr-o parte a ecranului
 */

function getCurrentTime(){
    let offset=Math.floor(playerPos[0]/15);
    if (offset<0) offset++;
    let d=new Date();
    let n=d.getUTCHours()+offset;
    if (n<0) n=24-n;
    if (n>=24) n=n-24;
    return n*60+d.getUTCMinutes();
}

/**
 * TODO: ora data de API pt new york, washington si alte coordonate cu longitudine negativa nu pare corecta
 * /daca se considera necesar sa se adauge 1 daca Number(timeOffset.split(':')[0]) este mai mic ca 0
 */
function setGameStartTime(){
    //https://dev.virtualearth.net/REST/v1/timezone/61.768335,-158.808765?key=AqSqRw1EoXuQEC2NZKEEU3151TB16-jcJK_TiVYSHNd1m51x-JIdI2zMI2b5kwi7
    let timeRequest="https://dev.virtualearth.net/REST/v1/timezone/"+playerPos[1]+","+playerPos[0]
        +"?key=AqSqRw1EoXuQEC2NZKEEU3151TB16-jcJK_TiVYSHNd1m51x-JIdI2zMI2b5kwi7";
    fetch(timeRequest)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            try{
                let timeOffset=data.resourceSets[0].resources[0].timeZone["utcOffset"];
                var today = new Date();
                today.setHours(today.getUTCHours() + Number(timeOffset.split(':')[0]));
                gameStartTime=today.getHours()*60+today.getMinutes();
            }
            catch (e) {
                gameStartTime=getCurrentTime();
            }
            if (gameStartTime<0||gameStartTime>24*60||isNaN(gameStartTime)||gameStartTime==null){
                gameStartTime=getCurrentTime();
            }
            console.log(gameStartTime);
            pageLoader.notifyCompleted('loadTime');
        });

    /**
     * mai jos se afla varianta mai eficienta de determinare a orii prin cunostinte standard de geografie/google search
     */
    /*
    let offset=Math.floor(playerPos[0]/15);
    if (offset<0) offset++;
    let d=new Date();
    let n=d.getUTCHours()+offset;
    if (n<0) n=24-n;
    if (n>=24) n=n-24;
    gameStartTime=n*60+d.getUTCMinutes(); //am pus minutul de inceput in gameStartTime
    //TODO pentru eventuale operatii mai complexe pe timp, de retinut data completa de inceput a jocului,
    // si de revizuit data de sfarsit a jocului

     */
}

function setNightOverlay(){
    luminosityOverlay.graphics
        .beginRadialGradientFill(["rgba(63, 127, 191, 0.15)", "black"], [0, 1], offsetx, offsety, playerRadius, offsetx, offsety, playerRadius * 8)
        .drawRect(0, 0, windowWidth, windowHeight);
}

/* GEO WEATHER FUNCTIONS */
function getWeather(){
    const openWeatherAccessToken="8fbb3329e2b667344c3392d6aea9362e";
    let weatherRequest="https://api.openweathermap.org/data/2.5/weather?lat="+playerPos[1]+"&lon="+playerPos[0]
        +"&appid="+openWeatherAccessToken;
    fetch(weatherRequest)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            gameWeather=data;
            pageLoader.notifyCompleted('loadWeather');
        });
}

/* GEO MAP FUNCTIONS */

function setMap() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [playerPos[0], playerPos[1]],
        zoom: 20
    });
    map.on('load', function() {
        map.getCanvas().addEventListener(
            'keydown',
            function(e) {
                e.preventDefault();
            },
            true
        );
        //TODO: request doar cand se paraseste view-portul curent
        setInterval(function() {
            let features = map.queryRenderedFeatures({/*sourceLayer: ["road", "building"]*/ });
            if (this.loadedFirstMap === undefined){
                this.loadedFirstMap = true;
                //console.log(features);
                pageLoader.notifyCompleted('loadMap');
            }

            if (!pageLoader.isFinished())
                return;

            features.forEach(function(feature) {
                if (validateAndAddId(feature.geometry)){
                    drawFeature(feature);
                    if (feature.sourceLayer === "building"){
                        buildings.push(feature);
                    }
                }
            });
            //let b = baseLayer.getBounds();
            //baseLayer.cache(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height, scale);
        }, 1000);
    });
    map["keyboard"].disable();
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
        if (x != undefined){
            if (x < mx)
                mx = x;
            if (x > Mx)
                Mx = x;
        }
        else{
            console.log("err on getcordx", point[0]);
        }
        if (y != undefined){
            if (y < my)
                my = y;
            if (y > My)
                My = y;
        }
        else{
            console.log("err on getcordy", point[1]);
        }
        object.graphics.lineTo(getCoordinateX(point[0]), getCoordinateY(point[1]));
    });
    object.setBounds(mx, my, Mx-mx, My-my);

    return [mx, my, Mx, My];
}

function drawRoad(geometry, color) {
    let road = new createjs.Shape();
    road.tickEnabled = false;
    road.graphics.setStrokeStyle(30,"round").beginStroke(color);

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
            drawRoad(feature.geometry, roadsColor);
            break;
        }
        case "building": {
            drawPolygon(feature.geometry, false, buildingsColor);
            break;
        }
        case "water": {
            drawPolygon(feature.geometry, true, waterColor);
            break;
        }
        default:
            break;
    }
}

/* --------------------------------------------------------------------------------------------------------- GAME COLLISIONS FUNCTIONS */

//TODO: remove this if not needed
function isPolygonCollidingWithBuildings(target){
    if (buildings.length !== 0) {
        for (let i=0; i<buildings.length; i++){
            if (buildings[i].geometry.type === "MultiPolygon"){
                for (let j=0; j<buildings[i].geometry.coordinates.length; j++){
                    for (let k=0; k<buildings[i].geometry.coordinates[j].length; k++){
                        let x = greinerHormann.intersection(getScreenCoordinates(buildings[i].geometry.coordinates[j][k]), target);
                        if (x!=null)
                            return true;
                    }
                }
            }else{
                for (let j=0; j<buildings[i].geometry.coordinates.length; j++){
                    let x=greinerHormann.intersection(getScreenCoordinates(buildings[i].geometry.coordinates[j]), target);
                    if (x!=null)
                        return true;
                }
            }
        }
    }
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
    //console.log("X= "+x0 +" Y= " + y0 +" a= " + a + " b= " + b +"  c= " +c);
    var vec=[(b*(b*x0-a*y0)-a*c)/(a*a+b*b), (a*(-b*x0+a*y0)-b*c)/(a*a+b*b)];
    /*console.log(b*x0);
    console.log(a*y0);
    console.log(b*x0-a*y0);
    console.log(b*(b*x0-a*y0));
    console.log(a*c);
    console.log(b*(b*x0-a*y0)-a*c);
    console.log(a*a+b*b);
    console.log((b*(b*x0-a*y0)-a*c)/(a*a+b*b));
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>");*/
    return [(b*(b*x0-a*y0)-a*c)/(a*a+b*b), (a*(-b*x0+a*y0)-b*c)/(a*a+b*b)];
}
function distance(x1, y1, x2, y2, x3, y3){
    let x=0, y=0;
    let val1=0, val2=0, val3=0;
    if (x2==x3){
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
function checkCollisionWithBuildings(x, y, radius){
    for (let i=0; i<buildings.length; i++){
        let coords=buildings[i].geometry.coordinates;
        if (collision(x, y, radius, coords, buildings[i].geometry.type))
            return false;
    }
    return true;
}

//TODO: the function should be named checkProjectileCollisionWithMonsters
function checkCollisionWithMonsters(x,y,radius){
    for (let i=0; i<monsterLayer.children.length; i++) {
        let sprite = monsterLayer.children[i];
        if (sprite.isMonster === true) {
            if (Math.pow((x - sprite.centerX()),2) + Math.pow((y - sprite.centerY()),2) <= Math.pow(monsterRadius + radius, 2)) {
                sprite.monsterHP -= 25;
                if (sprite.monsterHP <= 0) {
                    nrOfMonsters--;
                    Monster.removeMonsterWithId(sprite.name);
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

function checkMonsterCollisionWithPlayer(x,y){
    return Math.pow(playerGetPos()[0] - x, 2) + Math.pow(playerGetPos()[1] - y, 2) > Math.pow(monsterRadius + playerRadius + collisionDelta, 2);
}

/* --------------------------------------------------------------------------------------------------------- UI FUNCTIONS */

function updatePlayerLifeBar() {
    let percent = Math.trunc(playerHealth / playerMaxHealth * 100);
    if (percent < 0)
        percent = 0;
    playerLifeBar.style.width = percent.toString() + '%';
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

function validateAndAddId(obj){
    let id = hash(obj);
    if (polygonShapesIdSet.has(id))
        return false;
    polygonShapesIdSet.add(id);
    return true;
}

/* --------------------------------------------------------------------------------------------------------- NOTES

//TODO: to rename to center pos - the default spawn position
//TODO: playerWidth seems useless, collision will be made after radius
//TODO: use update in tick() only when something changed
//TODO: make the DrawFeatures functions pass less feature objects, only type and arrays
//todo optimizare verificare schimbare - update() only when the game changes
//todo: on resize event
//TODO: responsive UI
//TODO: monster mini health-bar
//TODO: we might wanna add a function to subtract from player the damage, but in this function we select only the highest damage in the recent seconds
//TODO: add grass
//TODO: add loading screen

Polygon has this format: Main[ Array[ Point[], Point[]... ], ...]
MultiPolygon has this format: Main[ Polygon[Array[ Point[], Point[]... ], ...], ...]

setTransform() muta jucatorul fata de pozitia lui initiala - cea la care se afla cand a fost introdus sub parintele lui
1) coordonatele 200,200
2) add child
3) set transform (10,0)
=> a fost mutat 10 px in drepta

cache functionality was moved to BitmapCache

note: optimization: the player already checks collision with monsters, but monsters check again to see if they can move:
- what if we can return an array with collided monsters ids?

note: querySource features might be of better use

note: event deprecation on internet explorer could be solved with:
https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events#The_old-fashioned_way

*/