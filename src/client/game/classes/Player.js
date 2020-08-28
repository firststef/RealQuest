const playerRadius=10;

class Player{

    static name = "player";
    static get radius() {
        return playerRadius;
    }

    static pos = {
        x: defaultPos[0],
        y: defaultPos[1]
    };
}