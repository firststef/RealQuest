function updatePlayerLifeBar() {
    let percent = Math.trunc(playerHealth / playerMaxHealth * 100);
    if (percent < 0)
        percent = 0;
    playerLifeBar.style.width = percent.toString() + '%';
}

function updatePlayerTotalPoints() {
    let points=(totalPoints/600).toFixed(2);
    playerTotalPoints.innerText= 'HeroPoints: ' + points.toString();
}

function updateScoreBoard() {
    fetch(ORIGIN + "/api/livescores?count=7")
        .then((response) => {
            return response.json();
        })
        .then((playerList) => {
            let domString = "<table class=\"topazCells\">";
            playerList.forEach((player) => {
                domString = domString + "<tr><td>" + player.username + "</td><td>"+ player.currentPoints.toString() +"</td></tr>";
            });
            domString += "</table>";
            scoreBoards.innerHTML = domString;
        });
}

function updateNearbyMessage() {
    fetch(ORIGIN + "/api/nearbymessage?lat="+map.transform._center.lat+"&long="+map.transform._center.lng)
        .then((response) => {
            return response.json();
        })
        .then((message) => {
            if (message.name === undefined)
            {
                message.name = '';
            }
            else{
                if (nearbyMessageName.innerHTML === "🙤 " + message.name +" 🙦")
                    return;
                message.name = "&#128612; " + message.name + " &#128614;";

            }
            if (message.topText === undefined)
                message.topText = '';
            if (message.bottomText === undefined)
                message.bottomText = '';

            nearbyMessageDescTop.innerHTML = message.topText;
            nearbyMessageDescBottom.innerHTML = message.bottomText;
            nearbyMessageName.innerHTML = message.name;
        });
}

function setNightOverlay(on) {
    let nightChild = stage.getChildByName("luminosityOverlay");
    if (nightChild !== null){
        stage.removeChild(nightChild);
    }
    if (on === true) {
        luminosityOverlay = new createjs.Shape();
        luminosityOverlay.graphics
            .beginRadialGradientFill(["rgba(54,118,191,0.15)", "rgba(6,29,41,0.9)"], [0, 1], offsetx, offsety,
                Player.radius, offsetx, offsety, Player.radius * 10)
            .drawRect(0, 0, windowWidth, windowHeight);
        luminosityOverlay.name = "luminosityOverlay";
        stage.addChildAt(luminosityOverlay, 4);
    }
}

function setWeatherOverlay(weather) {
    let weatherChild = stage.getChildByName("weatherOverlay");
    if (weatherChild !== null){
        stage.removeChild(weatherChild);
    }
    weatherSheet = new createjs.SpriteSheet({ //this will be replaced with weather
        framerate: 8,
        "images": [resourceLoader.getResult("weather")],
        "frames": {"height": 32, "width": 32, "regX": 0, "regY": 0, "spacing": 10, "margin": 0},
        "animations": {
            "rain": [0, 12, "rain", 2],
            "snow": [13, 19, "snow", 1]
        }
    });

    if (weather === "Rain") {
        weatherOverlay = new createjs.Sprite(weatherSheet, "rain");
    } else if (weather === "Snow") {
        weatherOverlay = new createjs.Sprite(weatherSheet, "snow");
    }
    else {
        return;
    }
    weatherOverlay.scaleX = 1;
    weatherOverlay.scaleY = 1;
    weatherOverlay.name = "weatherOverlay";

    if (this.offscreenCanvas === undefined) {
        this.offscreenCanvas = document.createElement('canvas');
    }
    this.offscreenCanvas.width = 32;
    this.offscreenCanvas.height = 32;

    let thisRef = this;
    weatherOverlay.draw = function (ctx, ignoreCache) {
        if (this.DisplayObject_draw(ctx, ignoreCache)) {
            return true;
        }
        this._normalizeFrame();
        let o = this.spriteSheet.getFrame(this._currentFrame | 0);
        if (!o) {
            return false;
        }
        let rect = o.rect;
        if (rect.width && rect.height) {
            let offscreenContext = thisRef.offscreenCanvas.getContext('2d');
            offscreenContext.clearRect(0, 0, thisRef.offscreenCanvas.width, thisRef.offscreenCanvas.height);
            offscreenContext.drawImage(o.image, rect.x, rect.y, rect.width, rect.height, -o.regX, -o.regY, rect.width, rect.height);
            ctx.beginPath();
            ctx.rect(0, 0, windowWidth, windowHeight);
            ctx.fillStyle = ctx.createPattern(thisRef.offscreenCanvas, 'repeat');
            ctx.save();
            ctx.translate(-player.centerX(), -player.centerY());
            ctx.fill();
            ctx.restore();
        }
        return true;
    };
    stage.addChildAt(weatherOverlay, 3);
}

function updateWeatherOverlay(){
    if(this.initialDisplay !== undefined){
        getServerTimeAndWeather();
    }
    this.initialDisplay = true;
    setWeatherOverlay(gameWeather.weather[0].main);
    setNightOverlay(gameStartTime < 420 || gameStartTime > 1320);
    if (weatherLoader !== undefined) {
        weatherLoader.loadCallbacks();
    }
}

function initStickDisplay(){
    leftStick = new JoyStick('leftStick', {title: "leftStick"});
    rightStick = new JoyStick('rightStick', {title: "rightStick"});
    setTimeout(() => {
        document.getElementById("leftStick").style.height = "unset"
        document.getElementById("rightStick").style.height = "unset"
    }, 1);
}

function toggleScreen() {
    let gameScreen = document.getElementById("gameContainer");
    let endScreen = document.getElementById("endScreenContainer");
    if (gameScreen.style.display === "block") {
        gameScreen.style.display = "none";
        endScreen.style.display = "flex";
    } else {
        gameScreen.style.display = "block";
        endScreen.style.display = "none";
    }
}

function getLeaderBoards(myScore) {
    fetch(ORIGIN + "/api/leaderboards?count="+ leaderBoardCount +"&myScore=" + myScore)
        .then((response) => {
            return response.json();
        })
        .then((boards) => {
            let tableContent = '';
            boards.players.forEach((playerObj) => {
                tableContent += `<tr><td>${playerObj.username}</td><td>${playerObj.score}</td></tr>`;
            });
            document.getElementById("leaderBoards").innerHTML = tableContent;
            document.getElementById("yourPlace").innerHTML = "Your place: " + boards.myPlace;
            document.getElementById("yourScore").innerHTML = "Your score: "+ myScore;
        });
}