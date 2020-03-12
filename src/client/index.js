function showForm(value) {
    document.getElementById("form").hidden = value;
    document.getElementById("showForm").hidden = !value;
}
var longitude;
var lat;


function getFormInput() {
     longitude = document.getElementById("longitude_button").value;
     lat = document.getElementById("latitude_button").value;
    var ok=formValidation(lat, longitude);
     if (ok) {
        //setMap(longitude, lat);
        //init();
        document.getElementById("form").target="_self";
        document.getElementById("form").action= "game.html";
        document.getElementById("form").method="GET";
        document.getElementById("formMessage").innerHTML = "Enter coordinates: ";
    } else {
        let str = "Enter valid coordinates: ";
        document.getElementById("formMessage").innerHTML = str.fontcolor("red");
    }
    return ok;
}

function formValidation(lat, longitude) {
    let val2 = parseFloat(longitude);
    let val1 = parseFloat(lat);
    console.log(val1 + " " + val2);
    if (!isNaN(val1) && val1 <= 90 && val1 >= -90 && !isNaN(val2) && val2 <= 180 && val2 >= -180)
        return true;
    else
        return false;
}