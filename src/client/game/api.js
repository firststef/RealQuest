/* CONFIGURATION API */
function getGameConfiguration(){
    let configRequest = ORIGIN + "/api/configuration";
    fetch(configRequest).
    then((response) => {
        return response.json();
    }).then((data)=> {

        // console.log('===========================');
        // console.log(data);
        // console.log('===========================');
        if (data.maxNrOfMonsters !== undefined){
            maxNrOfMonsters=data.maxNrOfMonsters;
        }

        if (data.isNight !== undefined) { //data.staysNight
            weatherLoader.addCallback(setNightOverlay, data.isNight);
            // setNightOverlay(data.isNight);
        }
        if (data.rain === true) {
            weatherLoader.addCallback(setWeatherOverlay, "Rain");
            // setWeatherOverlay("Rain");
        }
        if (data.snow === true) {
            weatherLoader.addCallback(setWeatherOverlay, "Snow");
            // setWeatherOverlay("Snow");
        }
        if (data.playerMaxHealth !== undefined) {
            playerMaxHealth=data.playerMaxHealth;
            playerHealth=playerMaxHealth;
        }
        if (data.leaderBoardCount !== undefined){
            leaderBoardCount=data.leaderBoardCount;
        }
        if (data.displacement !== undefined){
            displacement=data.displacement;
        }
        if (data.moneyPowerUpValue !== undefined){
            moneyPowerUpValue=data.moneyPowerUpValue;
        }
        if (data.speedDisplacement !== undefined){
            speedDisplacement=data.speedDisplacement*displacement;
        }
        if (data.scale !== undefined) {
            scale=data.scale;
            offsetx = windowWidth / (2*scale);
            offsety = windowHeight / (2*scale);
            deleteLimitW = windowWidth/scale*1.4;
            deleteLimitH = windowHeight/scale*1.4;
            stage.scaleX = scale;
            stage.scaleY = scale;
        }

        pageLoader.notifyCompleted('loadGameConfiguration');

    });

}

/* GEO TIME FUNCTIONS */

function getServerTimeAndWeather(){
    let timeRequest= ORIGIN + "/api/environment?lat="+Player.pos.y+"&long="+Player.pos.x;
    fetch(timeRequest).
    then((response) => {
        return response.json();
    }).then((data) => {
        gameStartTime=data.time;
        gameWeather=data.weather;
        //console.log("gameStartTime", gameStartTime);
        //console.log("gameWeather", gameWeather);
        document.getElementById("loadTimeAndWeatherWheel").innerHTML = "&#x2714;";
        document.getElementById("loadTimeAndWeatherWheel").className = "";
        pageLoader.notifyCompleted('loadTimeAndWeather');
    });
}

/* GEO MAP FUNCTIONS */

function setMap() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11?optimize=true',
        center: [Player.pos.x, Player.pos.y],
        zoom: 19
    });
    map.on('load', function() {
        map.getCanvas().addEventListener(
            'keydown',
            function(e) {
                e.preventDefault();
            },
            true
        );
        let searchCallback = function() {
            document.getElementById("map").hidden = false;
            let features = map.queryRenderedFeatures({/*sourceLayer: ["road", "building"]*/ });
            document.getElementById("map").hidden = true;
            features.forEach(function (feature) {
                if (buildingsLayer !== undefined && roadsLayer !== undefined && validateAndAddId(feature.geometry)) {
                    drawFeature(feature);
                    feature.geometry.collidable=true;
                    if (ticks<120)
                        feature.geometry.collidable=false;
                    if (feature.sourceLayer === "building") {
                        buildings.push(buildingAdder(feature.geometry));
                    }
                }
            });
        };
        document.getElementById("loadMapWheel").innerHTML = "&#x2714;";
        document.getElementById("loadMapWheel").className = "";
        pageLoader.notifyCompleted('loadMap');
        searchCallback();
        setInterval(searchCallback, 1000); //TODO: request doar cand se paraseste view-portul curent
    });
    map["keyboard"].disable();
}

function downloadLeaderboard(){
    fetch(ORIGIN + "/api/leaderboards?count=10&myScore=0")
        .then((response) => {
            return response.json();
        })
        .then(response => {
            let csvText = '';
            response.players.forEach(player => { csvText += (player.username + ',' + player.score + '\n');})
            return csvText;
        })
        .then(text => {
            let filename = "leaderboard.csv";
            createFile(text,filename);
        });
}