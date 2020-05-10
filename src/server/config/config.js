let config = {
    mongoDB: {
        uri: "mongodb+srv://twproj:realquest@realquest-5fa4g.gcp.mongodb.net/test?retryWrites=true&w=majority"
    },
    api: {
        time: {
            domain: "https://dev.virtualearth.net/REST/v1/timezone/",
            key:"AqSqRw1EoXuQEC2NZKEEU3151TB16-jcJK_TiVYSHNd1m51x-JIdI2zMI2b5kwi7"
        },
        weather : {
            domain: "https://api.openweathermap.org/data/2.5/",
            key: "8fbb3329e2b667344c3392d6aea9362e"
        },
        map: {
            domain: "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/",
            key: "pk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrNzRneHkzbTBpaDQzZnBkZDY3dXRjaDQifQ.g6l-GFeBB2cUisg6MqweaA"
        }
    }
}

module.exports = config;