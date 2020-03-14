const defaultPos = [27.598505, 47.162098];//to rename to center pos
var playerPos = defaultPos;

function parseParameters(){
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let lat = urlParams.get("latitude");
    let lng = urlParams.get("longitude");

    if (lat != null && lng != null){
        playerPos = [lat, lng];
    }
}

parseParameters();

var stage;
var radius=10;
var displacement=0.000002;
/*
* setTransform() muta jucatorul fata de pozitia lui initiala - cea la care se afla cand a fost introdus sub parintele lui
* 1) coordonatele 200,200
* 2) add child
*  3) set transform (10,0)
*  => l-a mutat 10 px in drepta
* */


const playerWidth = 20;
var ZOOM = 1000000;
var scale = 4;
var offsetx = window.innerWidth / (2*scale);
var offsety = window.innerHeight / (2 * scale);

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

var idSet = new Set();
var buildings = [];

//Map
var map;
const deltaDistance = 250/10; // pixels the map pans when the up or down arrow is clicked
const deltaDegrees = 12.5/10; // degrees the map rotates when the left or right arrow is clicked
mapboxgl.accessToken = 'pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA';

function getScreenCoordinates(arr){
    let new_arr = [];
    arr.forEach(point => {
       new_arr.push([getCoordinateX(point[0]), getCoordinateY(point[1])]);
    });
    return new_arr;
}

/**
 *
 * @param x, y real coordinate values - they are offsets from playerPos
 * @returns {*[]}
 */
var playerGetPos = (x=0, y=0, z=0, t=0) => {
    return [
        [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + t],
        [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + playerWidth  + t],
        [getCoordinateX(map.transform._center.lng + x) + playerWidth + z, getCoordinateY(map.transform._center.lat + y) + playerWidth + t],
        [getCoordinateX(map.transform._center.lng + x) + playerWidth  + z,getCoordinateY(map.transform._center.lat + y) + t],
        [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + t]
    ];
};

function getReverseCoordinates(arr){
    let new_arr = [];
    arr.forEach(point => {
        new_arr.push([getReverseCoordinateX(point[0]), getReverseCoordinateY(point[1])]);
    });
    return new_arr;
}

//initializing objects
function init() {
    stage = new createjs.Stage("gameCanvas");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    stage.update();
    stage.scaleX = scale;
    stage.scaleY = scale;

    let playerRect = new createjs.Shape();
    playerRect.graphics.beginStroke("green");
    playerRect.name = "playerRect";

    playerRect.graphics.beginFill("green");
    playerRect.graphics.drawCircle(playerGetPos()[0][0], playerGetPos()[0][1], radius);

    stage.addChild(playerRect);

    createjs.Ticker.on("tick", tick);
}


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

//update()
function tick(event) {
    if (stage.getChildByName("playerRect") != null) {
        stage.getChildByName("playerRect").setTransform(getCoordinateX(map.transform._center.lng)-offsetx, getCoordinateY(map.transform._center.lat)-offsety);
    }

    console.log(isPolygonCollidingWithBuildings(playerGetPos()));

    stage.update(event); // important!!
}

function easing(t) {
    return t;
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

function validateId(obj){
    let id = hash(obj);
    if (idSet.has(id))
        return false;
    idSet.add(id);
    return true;
}

/**
 *
 * >>>>>>>>>>> Functia checkCollisions ar trebuii ca pentru 4 linii reprexentate de punctele
 * (map.transform._center.lng, map.transform._center.lat)
 * (map.transform._center.lng+x, map.transform._center.lat)
 * (map.transform._center.lat +x, map.transform._center.lat + y)
 * (map.transform._center.lat, map.transform._center.lat + y)
 *
 *
 * sa verifice daca aceste 4 linii se intersecteaza cu liniile oricarui poligon.
 * Ma voi ocupa EU de aceasta operatie, functiile de mai jos fac acest lucru doar pentru un punct, nu pentru 4 linii.
 *
 * Varianta punct este corecta cu conditia ca sa fie terminata functia isInside
 *
 * 
 */
function min(a, b){
    if(a<b)
        return a;
    return b;
}
function max(a, b){
    if (a<b)
        return b;
    return a;
}
function fabs(a){
    if (a<0)
        return -a;
    return a;
}
function distanceBetweenPoints(x1, y1, x2, y2){
    return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
}

function checkIfPointOnLine(x, y, x1, y1, x2, y2){
    let precision = 6;
    if (parseFloat((distanceBetweenPoints(x, y, x1, y1)+distanceBetweenPoints(x, y, x2, y2)).toFixed(precision))===
        parseFloat(distanceBetweenPoints(x1, y1, x2, y2).toFixed(precision))) {
        console.log(parseFloat((distanceBetweenPoints(x, y, x1, y1)+distanceBetweenPoints(x, y, x2, y2)).toFixed(precision)),
            parseFloat(distanceBetweenPoints(x1, y1, x2, y2).toFixed(precision)));
        return true;
    }
    return false;
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
        if (y1<=max(y2, y3)&&y1>=min(y2, y3))
            return fabs(x1-x3);
        return min(distanceBetweenPoints(x1, y1, x2, y2), distanceBetweenPoints(x1, y1, x3, y3));
    }
    let m=(y3-y2)/(x3-x2);//ax+by+c=0, y-y1=m(x-x1)
    let d=pointLineDistance(x1, y1, m, -1, y2-m*x2);
    if (checkIfPointOnLine(d[0], d[1], x2, y2, x3, y3))
        return distanceBetweenPoints(x1, y1, d[0], d[1]);
    return min(distanceBetweenPoints(x1, y1, x2, y2), distanceBetweenPoints(x1, y1, x3, y3));
}

function isInside(x, y, radius, coords) {
    for (let i=1; i<coords.length; i++){
        if (distance(x, y, getCoordinateX(coords[i-1][0]), getCoordinateY(coords[i-1][1]), getCoordinateX(coords[i][0]),
            getCoordinateY(coords[i][1]))<radius)
            return true;
    }
    if (distance(x, y, getCoordinateX(coords[0][0]), getCoordinateY(coords[0][1]), getCoordinateX(coords[coords.length-1][0]),
        getCoordinateY(coords[coords.length-1][1]))<radius)
        return true;
    return false;
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

function checkCollisions(x, y, radius){
    for (let i=0; i<buildings.length; i++){
        let coords=buildings[i].geometry.coordinates;
        if (collision(x, y, radius, coords, buildings[i].geometry.type))
            return false;
    }
    return true;
}

function setMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [playerPos[0], playerPos[1]],
        zoom: 20
    });
    map.on('load', function() {
        map.getCanvas().focus();
        map.getCanvas().addEventListener(
            'keydown',
            function(e) {
                //console.log(buildings);
                //console.log(map.transform._center);
                e.preventDefault();
                let code;

                if (e.key !== undefined) {
                    code = e.key;
                } else if (e.keyIdentifier !== undefined) {
                    code = e.keyIdentifier;
                } else if (e.keyCode !== undefined) {
                    code = e.keyCode;
                }

                if (e.which === 38 ) {
                    // up

                    //if (!isPolygonCollidingWithBuildings(playerGetPos(0, displacement)))
                        if (checkCollisions(playerGetPos(0, displacement)[0][0], playerGetPos(0, displacement)[0][1], radius))
                        map.jumpTo({center: [map.transform.center.lng, map.transform.center.lat + displacement], zoom: map.transform.zoom});

                } else if (e.which === 40) {
                    // down
                    //if (!isPolygonCollidingWithBuildings(playerGetPos(0, - displacement))&&!isPolygonCollidingWithBuildings
                    //(playerGetPos(0, - displacement, 0, 0)))
                    if (checkCollisions(playerGetPos(0, -displacement)[0][0], playerGetPos(0, -displacement)[0][1], radius))
                        map.jumpTo({center: [map.transform.center.lng, map.transform.center.lat - displacement], zoom: map.transform.zoom});
                } else if (e.which === 37) {
                    // left
                    //if (!isPolygonCollidingWithBuildings(playerGetPos(-displacement, 0)))
                    if (checkCollisions(playerGetPos(-displacement, 0)[0][0], playerGetPos(-displacement, 0)[0][1], radius))
                        map.jumpTo({center: [map.transform.center.lng - displacement, map.transform.center.lat], zoom: map.transform.zoom});
                } else if (e.which === 39) {
                    // right
                    //if (!isPolygonCollidingWithBuildings(playerGetPos(displacement, 0))&&
                       // !isPolygonCollidingWithBuildings(playerGetPos(displacement, 0, 0, 0)))
                    if (checkCollisions(playerGetPos(displacement, 0)[0][0], playerGetPos(displacement, 0)[0][1], radius))
                        map.jumpTo({center: [map.transform.center.lng + displacement, map.transform.center.lat], zoom: map.transform.zoom});
                }
            },
            true
        );
    });
    map["keyboard"].disable();

    setInterval(function() {

        var features = map.queryRenderedFeatures({
            /*sourceLayer: ["road", "building"]*/ }); // This is where I get building

        features.forEach(function(feature) {
            if (validateId(feature.geometry)){
                drawFeature(feature);
                if (feature.sourceLayer === "building"){
                    buildings.push(feature);
                }
            }

            //console.log(feature.properties.height); // this is the building height
            //console.log(feature.properties.min_height); // this is the building part elevation from groung (e.g. a bridge)
        });
    }, 1000);

}

function drawPointArray(object, array, fill = false, color = 0) {
    let line_x=getCoordinateX(array[0][0]);
    let line_y=getCoordinateY(array[0][1]);
    if (fill === true)
        object.graphics.moveTo(line_x, line_y).beginFill(color);
    else
        object.graphics.moveTo(line_x, line_y);
    array.forEach(function(point) {
        object.graphics.lineTo(getCoordinateX(point[0]), getCoordinateY(point[1]));
    });
}

function drawRoad(geometry, color) {
    let road = new createjs.Shape();
    road.graphics.setStrokeStyle(30,"round").beginStroke(color);

    if (geometry.type === "MultiLineString") {
        geometry.coordinates.forEach(function(array) {
            drawPointArray(road, array);
        });
    } else {
        drawPointArray(road, geometry.coordinates);
    }
    stage.addChild(road);
}

//TODO: rename to instantiate
// Polygon has this format: Main[ Array[ Point[], Point[]... ], ...]
// MultiPolygon has this format: Main[ Polygon[Array[ Point[], Point[]... ], ...], ...]
function drawPolygon(geometry, fill = false, color) {
    let polygon = new createjs.Shape();
    polygon.graphics.beginStroke(color);

    if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach(function(multiPolygon) {
            multiPolygon.forEach(function(figure) {
                drawPointArray(polygon, figure, fill, color);
            });
        });
    } else {
        geometry.coordinates.forEach(function(figure) {
            drawPointArray(polygon, figure, fill, color);
        });
    }
    stage.addChild(polygon);
}

function drawFeature(feature) {
    stage.setChildIndex( stage.getChildByName("playerRect"), stage.getNumChildren()-1);
    switch (feature.sourceLayer) {
        case "road": {
            drawRoad(feature.geometry, "gray");
            break;
        }
        case "building": {
            drawPolygon(feature.geometry, false, "red");
            break;
        }
        case "water": {
            drawPolygon(feature.geometry, true, "blue");
            break;
        }
        default:
            break;
    }
}
