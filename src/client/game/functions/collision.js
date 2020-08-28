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
            if (Math.pow((x - sprite.centerX()),2) + Math.pow((y - sprite.centerY()),2) <= Math.pow(Monster.radius + radius, 2)) {
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
            if (Math.pow((x - sprite.centerX()),2) + Math.pow((y - sprite.centerY()),2) <= Math.pow(Monster.radius + radius, 2)) {
                return false;
            }
        }
    }
    return true;
}

/** Returns false if (x,y) is closer than radius to player */
function checkCircleCollisionWithPlayer(x,y, radius, collisionDelta=0){
    return distanceBetweenPoints(playerGetPos()[0],playerGetPos()[1],x,y) > radius+Player.radius+collisionDelta; //TODO check if expressions are the same
    //return Math.pow(playerGetPos()[0] - x, 2) + Math.pow(playerGetPos()[1] - y, 2) > Math.pow(radius + playerRadius + collisionDelta, 2);
}