function showForm(value) {
    document.getElementById("form").hidden = value;
    document.getElementById("showForm").hidden = !value;
}
var longitude;
var lat;


function getFormInput() {
     longitude = document.getElementById("longitude").value;
     lat = document.getElementById("latitude").value;
    if (formValidation(lat, longitude)) {
        //setMap(longitude, lat);
        //init();
        document.getElementById("formMessage").innerHTML = "Enter coordinates: ";
        //showForm(true);
    } else {
        let str = "Enter valid coordinates: ";
        document.getElementById("formMessage").innerHTML = str.fontcolor("red");
    }
}

function formValidation(lat, longitude) {
    console.log(lat);
    let val2 = parseFloat(longitude);
    let val1 = parseFloat(lat);
    console.log(val1 + " " + val2);
    if (!isNaN(val1) && val1 <= 90 && val1 >= -90 && !isNaN(val2) && val2 <= 180 && val2 >= -180)
        return true;
    else
        return false;
}