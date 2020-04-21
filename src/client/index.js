var longitude;
var lat;
var username;

function getFormInput() {
    longitude = document.getElementById("longitude_button").value;
    lat = document.getElementById("latitude_button").value;
    username = document.getElementById("username_input").value;
    var ok=formValidation(lat, longitude, username);
    if (ok) {
        document.getElementById("form").target="_self";
        document.getElementById("form").action= "game.html";
        document.getElementById("form").method="GET";
        document.getElementById("formMessage").innerHTML = "Enter coordinates: ";
    } else {
        let str = "Invalid coordinates or username too short";
        document.getElementById("formMessage").innerHTML = str.fontcolor("red");
    }
    return ok;
}

function formValidation(lat, longitude, username) {
    let val2 = parseFloat(longitude);
    let val1 = parseFloat(lat);
    console.log(val1 + " " + val2);
    return !isNaN(val1) && val1 <= 90 && val1 >= -90 && !isNaN(val2) && val2 <= 180 && val2 >= -180 && username.length > 4 && username.length < 10;
}
