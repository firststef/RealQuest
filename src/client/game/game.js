/*
SECTIONS:
1.CONSTANTS AND GLOBALS > moved to constants.js
2.GAME INIT FUNCTIONS > moved to load.js
3.GAME LOGIC FUNCTIONS
4.GAME CLASSES > moved to /classes/
4.API FUNCTIONS > moved to api.js
5.GAME MAP FUNCTIONS > moved to /functions/map.js
6.GAME COLLISIONS FUNCTIONS > moved to /functions/collision.js
7.UI FUNCTIONS > moved to /functions/ui.js
8.UTILS > moved to /functions/utils.js
*/

/* --------------------------------------------------------------------------------------------------------- GAME LOGIC FUNCTIONS */

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

function shootProjectile(x, y){
    let arrowSprite = new createjs.Sprite(projectileSheet, "blue_attack");
    arrowSprite.scaleX = 0.3;
    arrowSprite.scaleY = 0.3;
    let angle = Math.atan2(x, y);
    arrowSprite.rotation = angle * (180/Math.PI) - 90;
    new Projectile(
        arrowSprite,
        arrowSprite.reverseCenterX(playerGetPos()[0] + Math.sin(angle) * playerRadius),
        arrowSprite.reverseCenterY(playerGetPos()[1] - Math.cos(angle) * playerRadius),
        angle  - Math.PI / 2,
        4,
        3000
    );
}

function createPowerUp(name, playerPos) {
    let xRand = Math.random();
    let yRand = Math.random();
    let object = new createjs.Sprite(projectileSheet, name);

    object.type=name;
    object.name = (this[name + "Id"]++).toString();

    object.isPowerUp = true;
    object.scaleX = 0.3;
    object.scaleY = 0.3;
    object.x = playerPos[0] + (Math.floor(xRand*100%2)===0 ? 1 : -1) * (2* xRand) * offsetx;
    object.y = playerPos[1] + (Math.floor(yRand*100%2)===0 ? 1 : -1) * (2* yRand) * offsety;

    baseLayer.addChild(object);
}

function createPowerUps() {
    if (Math.random() > 0.5){
        return;
    }
    if (this.moneyId === undefined){
        this.moneyId = 0;
    }
    if (this.speedBoostId === undefined){
        this.speedBoostId = 0;
    }
    if (this.smashBuilding === undefined){
        this.smashBuildingId = 0;
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
        if (Math.random() > 0.01){
            createPowerUp("money", playerPos);
        }
        if (Math.random() > 0.01){
            createPowerUp("speedBoost", playerPos);
        }
        if (Math.random() > 0.01){
            createPowerUp("smashBuilding", playerPos);
        }
    }
}