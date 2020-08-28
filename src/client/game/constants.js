const DEBUG = false;
const LOCAL = true;
const ORIGIN = LOCAL ? 'http://localhost' : 'https://firststef.tools';

const defaultPos = [27.598505, 47.162098];
const ZOOM = 1000000;

const windowWidth =  window.innerWidth;
const windowHeight =  window.innerHeight;
const buildingsBoxX=windowWidth*1.5; //thinking outside of box is not good
const buildingsBoxY=windowHeight*1.5;

const collisionDelta=2;
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
const slowUpdateDelta = 1000;
const fastUpdateDelta = 1000/30;

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