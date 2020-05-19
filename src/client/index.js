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

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(successGetLocation, () => {console.log("Location could not be found")});
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

    if (formValidation(lat, longitude, username)) {
        jumpToGame();
    }
    else{
        let str = "Invalid coordinates or username(5-9 ch)";
        document.getElementById("formMessage").innerHTML = str.fontcolor("red");
    }
}

function successGetLocation(position) {
    document.getElementById("longitude_button").value = position.coords.longitude;
    document.getElementById("latitude_button").value = position.coords.latitude;
    document.getElementById("formMessage").innerHTML = 'Your location has been copied below';
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
