function getCoordinateX(point){
    return -(Player.pos.x-point)*ZOOM+offsetx;
}
function getCoordinateY(point){
    return (Player.pos.y-point)*ZOOM+ offsety;
}
function getReverseCoordinateX(point){
    return Player.pos.x - ((point - offsetx) / (-ZOOM));
}
function getReverseCoordinateY(point){
    return Player.pos.y - ((point - offsety) / ZOOM);
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
        [getCoordinateX(map.transform._center.lng + x) + z, getCoordinateY(map.transform._center.lat + y) + 2 * Player.radius  + t],
        [getCoordinateX(map.transform._center.lng + x) + 2 * Player.radius + z, getCoordinateY(map.transform._center.lat + y) + 2 * Player.radius + t],
        [getCoordinateX(map.transform._center.lng + x) + 2 * Player.radius  + z,getCoordinateY(map.transform._center.lat + y) + t],
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