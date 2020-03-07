var stage, isRunning;
var playerPos = [27.598505, 47.162098];
var ZOOM = 60000;
var offsetx = 160;
var offsety = 90;
isRunning = false;

//Map
var map;
const deltaDistance = 500; // pixels the map pans when the up or down arrow is clicked
const deltaDegrees = 25; // degrees the map rotates when the left or right arrow is clicked
mapboxgl.accessToken = 'pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA';

//initializing objects
function init() {
  stage = new createjs.Stage("gameCanvas");
  stage.canvas.width = window.innerWidth;
  stage.canvas.height = window.innerHeight;
  stage.update();
  stage.scaleX = 4;
  stage.scaleY = 4;

  let data = {
    images: ["./../sprites/spritesheet_grant.png"],
    frames: {
      width: 165,
      height: 292
    },
    animations: {
      idle: 0,
      "run": [0, 25, "run", 1.5],
      "jump": [26, 63, "run"]
    },
    framerate: 30
  };
  let spriteSheet = new createjs.SpriteSheet(data);
  let sprite = new createjs.Sprite(spriteSheet, "idle");
  sprite.name = "player";
  stage.addChild(sprite);

  let g = new createjs.Graphics();
  g.setStrokeStyle(1);
  g.beginStroke(createjs.Graphics.getRGB(0, 0, 0));
  g.beginFill(createjs.Graphics.getRGB(0, 255, 0));
  g.drawCircle(0, 0, 3);

  let s = new createjs.Shape(g);
  s.x = 5000;
  s.y = 10000;
  s.name = "playerdot";

  stage.addChild(s);

  createjs.Ticker.on("tick", tick);
}

//update() 
function tick(event) {
  stage.getChildByName("player").setTransform(130, 30, 0.2, 0.2);
  if (isRunning) {
    if (stage.getChildByName("player").currentAnimation !== "run")
      stage.getChildByName("player").gotoAndPlay("run");
  } else {
    if (stage.getChildByName("player").currentAnimation !== "idle")
      stage.getChildByName("player").gotoAndPlay("idle");
  }

  if (stage.getChildByName("playerdot") != null) {
    stage.getChildByName("playerdot").setTransform(-(playerPos[0] - map.transform._center.lng) * ZOOM + offsetx, (playerPos[1] - map.transform._center.lat) * ZOOM + offsety);
  }

  stage.update(event); // important!!
}

function easing(t) {
  return t * (2 - t);
}

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


  setInterval(function() {

    var features = map.queryRenderedFeatures({
      /*sourceLayer: ["road", "building"]*/ }); // This is where I get building

    features.forEach(function(feature) {
      //console.log(feature.geometry);  // feature.geometry getter returns building shape points (basement)
      drawFeature(feature);
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
  let line_x = -(playerPos[0] - array[0][0]) * ZOOM + offsetx;
  let line_y = (playerPos[1] - array[0][1]) * ZOOM + offsety;
  if (fill === true)
    object.graphics.moveTo(line_x, line_y).beginFill(color);
  else
    object.graphics.moveTo(line_x, line_y);
  array.forEach(function(point) {
    object.graphics.lineTo(-(playerPos[0] - point[0]) * ZOOM + offsetx, (playerPos[1] - point[1]) * ZOOM + offsety);
  });
}

function drawRoad(geometry, color) {
  let road = new createjs.Shape();
  road.graphics.beginStroke(color);

  if (geometry.type === "MultiLineString") {
    geometry.coordinates.forEach(function(array) {
      drawPointArray(road, array);
    });
  } else {
    drawPointArray(road, geometry.coordinates);
  }
  stage.addChild(road);
}

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