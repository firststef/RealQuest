class Monster{

    static radius=8;

    constructor(sprite, x, y, velocity,hp, type) {
        let id = getUniqueId();

        this.sprite = sprite;

        sprite.mType = type;
        if (type === "Red") {
            sprite.projectileTimer = 2 * Math.floor((60 + Math.random() * 120));
            sprite.timeToShoot = sprite.projectileTimer;
        }

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
            monsterCircle.graphics.drawCircle(sprite.centerX(), sprite.centerY(), Monster.radius);
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