var stage;
var displacement=0.000002;
/*
* setTransform() muta jucatorul fata de pozitia lui initiala - cea la care se afla cand a fost introdus sub parintele lui
* 1) coordonatele 200,200
* 2) add child
*  3) set transform (10,0)
*  => l-a mutat 10 px in drepta
* */

var playerPos = [27.598505, 47.162098];//to rename to center pos
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

    playerRect.graphics.moveTo((playerGetPos()[0][0]), (playerGetPos()[0][1])).beginFill("green");
    playerGetPos().forEach(point => {
            playerRect.graphics.lineTo(point[0], point[1]);
        }
    );

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

/*
function checkCollisions(x, y) {
    let playerX=map.transform._center.lng+x;
    let playerY=map.transform._center.lat+y;
    for (let i=0; i<buildings.length; i++){
        let coords=buildings[i].geometry.coordinates;
        if (collision(playerX, playerY, coords, buildings[i].geometry.type))
            return false;
    }
    return true;
}

// returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
function intersects(a,b,c,d,p,q,r,s) {
    var det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) {
        return false;
    } else {
        lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
        gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
};

function isInside(x, y, coords){
    let intersections = 0;
    let intpointx = (coords[0][0]+coords[1][0])/2;
    let intpointy = (coords[0][1]+coords[1][1])/2;
    let numberOfSides=coords.length;
    for (let side = 0; side < numberOfSides; side++) {
        // Test if current side intersects with ray.
        // If yes, intersections++;
    }
    if ((intersections & 1) == 1) {
        return true;
    } else {
        return false;
    }
}

function collision(x, y, coords, type){
    if (type==="MultiPolygon"){
        for (let i=0; i<coords.length; i++)
            if (isInside(x, y, coords[i]))
                return true;
    }else
        return isInside(x, y, coords);

    return false;
}
*/








function setMap(lat = 27.598505, long = 47.162098) {
    playerPos[0] = lat;
    playerPos[1] = long;
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [playerPos[0], playerPos[1]],
        zoom: 20
    });
    map.on('load', function() {
        map.loadImage(
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Cat_silhouette.svg/400px-Cat_silhouette.svg.png',
            function(error, image) {
                if (error) throw error;
                map.addImage('cat', image);
                map.addSource('point', {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': [{
                            'type': 'Feature',
                            'geometry': {
                                'type': 'Point',
                                'coordinates': [0, 0]
                            }
                        }]
                    }
                });
                map.addLayer({
                    'id': 'points',
                    'type': 'symbol',
                    'source': 'point',
                    'layout': {
                        'icon-image': 'cat',
                        'icon-size': 0.25
                    }
                });
            }
        );


        map.getCanvas().focus();

        map.getCanvas().addEventListener(
            'keydown',
            function(e) {
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
                    if (!isPolygonCollidingWithBuildings(playerGetPos(0, displacement)))
                        map.jumpTo({center: [map.transform.center.lng, map.transform.center.lat + displacement], zoom: map.transform.zoom});

                } else if (e.which === 40) {
                    // down
                    if (!isPolygonCollidingWithBuildings(playerGetPos(0, - displacement))&&!isPolygonCollidingWithBuildings
                    (playerGetPos(0, - displacement, 0, 0)))
                        map.jumpTo({center: [map.transform.center.lng, map.transform.center.lat - displacement], zoom: map.transform.zoom});
                } else if (e.which === 37) {
                    // left
                    if (!isPolygonCollidingWithBuildings(playerGetPos(-displacement, 0)))
                        map.jumpTo({center: [map.transform.center.lng - displacement, map.transform.center.lat], zoom: map.transform.zoom});
                } else if (e.which === 39) {
                    // right
                    if (!isPolygonCollidingWithBuildings(playerGetPos(displacement, 0))&&
                        !isPolygonCollidingWithBuildings(playerGetPos(displacement, 0, 0, 0)))
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
            //console.log(feature.geometry);  // feature.geometry getter returns building shape points (basement)

            if (validateId(feature.geometry)){
                drawFeature(feature);
            }

            //console.log(feature);

            // Polygon has this format: Main[ Array[ Point[], Point[]... ], ...]
            // MultiPolygon has this format: Main[ Polygon[Array[ Point[], Point[]... ], ...], ...]
            //console.log(feature.properties.height); // this is the building height
            //console.log(feature.properties.min_height); // this is the building part elevation from groung (e.g. a bridge)
        });
    }, 1000);

}

function formValidation(lat, long) {
    let val2 = parseFloat(long);
    let val1 = parseFloat(lat);
    if (!isNaN(val1) && val1 <= 90 && val1 >= -90 && !isNaN(val2) && val2 <= 180 && val2 >= -180)
        return true;
    else
        return false;
}

function getFormInput() {
    let long = document.getElementById("longitude").value;
    let lat = document.getElementById("latitude").value;
    if (formValidation(lat, long)) {
        setMap(long, lat);
        init();
        document.getElementById("formMessage").innerHTML = "Enter coordinates: ";
        showForm(true);
    } else {
        let str = "Enter valid coordinates: ";
        document.getElementById("formMessage").innerHTML = str.fontcolor("red");
    }
}

function showForm(value) {
    document.getElementById("form").hidden = value;
    document.getElementById("showForm").hidden = !value;
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
    //TODO check if feature not already drawn
    //if feature.id in our array
    //return
    stage.setChildIndex( stage.getChildByName("playerRect"), stage.getNumChildren()-1);
    switch (feature.sourceLayer) {
        case "road": {
            drawRoad(feature.geometry, "gray");
            break;
        }
        case "building": {
            buildings.push(feature);
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

