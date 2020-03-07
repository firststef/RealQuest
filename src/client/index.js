var stage, isRunning;
var playerPos=[27.598505,47.162098];
var ZOOM = 60000;
var offsetx = 160;
var offsety = 90;
isRunning = false;
function getCoordinateX(point){
    return -(playerPos[0]-point)*ZOOM+offsetx;
}
function getCoordinateY(point){
    return (playerPos[1]-point)*ZOOM+ offsety;
}

function drawFeature(feature){
    //TODO check if feature not already drawn
    //if feature.id in our array
    //return
    switch(feature.sourceLayer){
        case "road": {
            drawRoad(feature.geometry, "gray", false);
            break;
        }
        case "building": {
            drawPolygon(feature.geometry, "red", false);
            break;
        }
        case "water": {
            drawPolygon(feature.geometry, "blue", true);
            break;
        }
        default: break;
    }
}
function drawRoad(geometry, color, fill=false){
    let road = new createjs.Shape();
    road.graphics.beginStroke(color);

    if (geometry.type=="MultiLineString"){
        geometry.coordinates.forEach(function (array){
            let line_x=getCoordinateX(array[0][0]);
            let line_y=getCoordinateY(array[0][1]);
            road.graphics.moveTo(line_x, line_y);
            array.forEach(function (point) {
                road.graphics.lineTo(getCoordinateX(point[0]), getCoordinateY(point[1]));
            });
        });

    }
    else{
        let line_x=getCoordinateX(geometry.coordinates[0][0]);
        let line_y=getCoordinateY(geometry.coordinates[0][1]);
        road.graphics.moveTo(line_x,line_y);
        geometry.coordinates.forEach(function (point) {
            road.graphics.lineTo(getCoordinateX(point[0]), getCoordinateY(point[1]));
        });
    }
    stage.addChild(road);
}
function drawPolygon(geometry, color, fill=false){
    let polygonType="MultiPolygon";
    let polygon = new createjs.Shape();
    polygon.graphics.beginStroke(color);

    if (geometry.type==polygonType){
        geometry.coordinates.forEach(function (multiPolygon){
            multiPolygon.forEach(function (figure){
                let figure_x=getCoordinateX(figure[0][0]);
                let figure_y=getCoordinateY(figure[0][1]);
                if (fill)
                    polygon.graphics.moveTo(figure_x, figure_y).beginFill(color);
                else
                    polygon.graphics.moveTo(figure_x, figure_y);
                figure.forEach(function (point) {
                    polygon.graphics.lineTo(getCoordinateX(point[0]), getCoordinateY(point[1]));
                });
            });
        });
    }
    else{
        geometry.coordinates.forEach(function (figure){
            let figure_x=getCoordinateX(figure[0][0]);
            let figure_y=getCoordinateY(figure[0][1]);
            if (fill)
                polygon.graphics.moveTo(figure_x, figure_y).beginFill(color);
            else
                polygon.graphics.moveTo(figure_x, figure_y);
            figure.forEach(function (point) {
                polygon.graphics.lineTo(-(playerPos[0]-point[0])*ZOOM+ offsetx, (playerPos[1]-point[1])*ZOOM+ offsety);
            });
        });
    }
    stage.addChild(polygon);
}



function init() {
    stage = new createjs.Stage("gameCanvas");
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    stage.update();
    stage.scaleX = 4;
    stage.scaleY = 4;

    var data = {
        images: ["./../sprites/spritesheet_grant.png"],
        frames: {width:165, height:292},
        animations: {
            idle:0,
            "run": [0, 25, "run", 1.5],
            "jump": [26, 63, "run"]
        },
        framerate: 30
    };
    var spriteSheet = new createjs.SpriteSheet(data);
    var sprite = new createjs.Sprite(spriteSheet, "idle");
    sprite.name = "player";
    stage.addChild(sprite);

    createjs.Ticker.on("tick", tick);
}

function tick(event) {
    var g = new createjs.Graphics();
    g.setStrokeStyle(1);
    g.beginStroke(createjs.Graphics.getRGB(0,0,0));
    g.beginFill(createjs.Graphics.getRGB(0,255,0));
    g.drawCircle(0,0,3);

    var s = new createjs.Shape(g);
    s.x = 5000;
    s.y = 10000;
    s.name = "playerdot";

    stage.addChild(s);

    stage.getChildByName("player").setTransform(130, 30, 0.2, 0.2);
    if (isRunning) {
        if (stage.getChildByName("player").currentAnimation !== "run")
            stage.getChildByName("player").gotoAndPlay("run");
    }
    else{
        if (stage.getChildByName("player").currentAnimation !== "idle")
            stage.getChildByName("player").gotoAndPlay("idle");
    }

    if (stage.getChildByName("playerdot") != null) {
        stage.getChildByName("playerdot").setTransform(-(playerPos[0] - map.transform._center.lng) * ZOOM + offsetx, (playerPos[1] - map.transform._center.lat) * ZOOM + offsety);
    }

    stage.update(event); // important!!
}

mapboxgl.accessToken = 'pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA';


// pixels the map pans when the up or down arrow is clicked
const deltaDistance = 500;

// degrees the map rotates when the left or right arrow is clicked
const deltaDegrees = 25;

function easing(t) {
    return t * (2 - t);
}



var mySource;
var map ;
function setMap(lat=27.598505, long=47.162098){
    playerPos[0]=lat;
    playerPos[1]=long;
    map =new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [playerPos[0],playerPos[1]],
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
                        'features': [
                            {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [0, 0]
                                }
                            }
                        ]
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
                isRunning = true;
                if (e.which === 38) {
                    // up
                    map.panBy([0, -deltaDistance], {
                        easing: easing
                    });

                } else if (e.which === 40) {
                    // down
                    map.panBy([0, deltaDistance], {
                        easing: easing
                    });
                } else if (e.which === 37) {
                    // left
                    map.easeTo({
                        bearing: map.getBearing() - deltaDegrees,
                        easing: easing
                    });
                } else if (e.which === 39) {
                    // right
                    map.easeTo({
                        bearing: map.getBearing() + deltaDegrees,
                        easing: easing
                    });
                }

            },
            true
        );
    });


    setInterval( function(){

        var features = map.queryRenderedFeatures(
            {/*sourceLayer: ["road", "building"]*/}); // This is where I get building

        features.forEach(function(feature){
            //console.log(feature.geometry);  // feature.geometry getter returns building shape points (basement)
            drawFeature(feature);
            // Polygon has this format: Main[ Array[ Point[], Point[]... ], ...]
            // MultiPolygon has this format: Main[ Polygon[Array[ Point[], Point[]... ], ...], ...]
            //console.log(feature.properties.height); // this is the building height
            //console.log(feature.properties.min_height); // this is the building part elevation from groung (e.g. a bridge)
        });
    }, 1000);

}

function formValidation(lat, long){
    let val2= parseFloat(long);
    let val1 = parseFloat(lat);
    if (!isNaN(val1) && val1 <= 90 && val1 >= -90 && !isNaN(val2) && val2 <= 180 && val2 >= -180)
        return true;
    else
        return false;
}
function getFormInput() {
    let long=document.getElementById("longitude").value;
    let lat=document.getElementById("latitude").value;
    if (formValidation(lat, long)){
        setMap(long, lat);
        init();
        let str="Enter coordinates: ";
        document.getElementById("formMessage").innerHTML=str;
        showForm(true);
    }
    else{
        let str = "Enter valid coordinates: ";
        let result = str.fontcolor("red");
        document.getElementById("formMessage").innerHTML=result;
    }
}
function showForm(value){
    document.getElementById("form").hidden=value;
    document.getElementById("showForm").hidden=!value;
}

