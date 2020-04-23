var longitude;
var lat;
var username;
var attemptedPreviouslyToGetLocation = false;

//Entry point
function load() {
    //Get last username
    if (isLocalStorageSupported()){
        let localUser = localStorage.getItem("RealQuestUsername");
        if (localUser !== null){
            document.getElementById("username_input").value = localUser;
        }
    }
}

function formValidation(lat, longitude, username) {
    let val2 = parseFloat(longitude);
    let val1 = parseFloat(lat);
    console.log(val1 + " " + val2);
    return !isNaN(val1) && val1 <= 90 && val1 >= -90 && !isNaN(val2) && val2 <= 180 && val2 >= -180 && username.length > 4 && username.length < 10;
}

function startGame() {
    longitude = document.getElementById("longitude_button").value;
    lat = document.getElementById("latitude_button").value;
    username = document.getElementById("username_input").value;
    let button = document.getElementById("submit_button");

    if (formValidation(lat, longitude, username)) {
        if (attemptedPreviouslyToGetLocation === false) {
            if (navigator.geolocation) {
                button.value = "Getting location...";
                button._onclickev = button.onclick;
                button.onclick = null;
                navigator.geolocation.getCurrentPosition(successGetLocation, failGetLocation);
            }
            attemptedPreviouslyToGetLocation = true;
        } else {
            jumpToGame();
        }
    }
    else{
        document.getElementById("formMessage").style.display = 'block';
        let str = "Invalid coordinates or username too short";
        document.getElementById("formMessage").innerHTML = str.fontcolor("red");
    }
}

function successGetLocation(position) {
    longitude = position.coords.longitude;
    lat = position.coords.latitude;
    jumpToGame();
}

function failGetLocation(){
    document.getElementById("latitude_button").style.display = 'inline-block';
    document.getElementById("longitude_button").style.display = 'inline-block';
    document.getElementById("formMessage").style.display = 'block';
    document.getElementById("formMessage").innerHTML = "Your location could not be found. Where do you want to start?";

    let button = document.getElementById("submit_button");
    button.value = "Start playing!";
    button.onclick = button._onclickev;
    button._onclickev = null;
}

function jumpToGame(){
    if (isLocalStorageSupported()){
        localStorage.setItem("RealQuestUsername", username);
        localStorage.setItem("RealQuestLatitude", lat);
        localStorage.setItem("RealQuestLongitude", longitude);
        window.location.href = "/game.html";
    }
    else{
        window.location.href = "/game.html?latitude=" + lat + "&longitude=" + longitude + "&username=" + username;
    }
}

function isLocalStorageSupported() {
    try {
        const key = "__some_random_key__";
        localStorage.setItem(key, key);
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
}
