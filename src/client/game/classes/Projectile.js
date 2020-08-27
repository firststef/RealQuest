/**
 *  On creation a projectile is added to the projectileLayer with the given sprite, at the x,y origin and an angle - following
 * a trajectory with a given velocity until timeToLive is expired
 */
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