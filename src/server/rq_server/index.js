const url = require('url');
const http = require('http');

const defaultPos = [27.598505, 47.162098];

const mbxClient = require('@mapbox/mapbox-sdk');
const mbxStyles = require('@mapbox/mapbox-sdk/services/styles');
const mbxTileQuery = require('@mapbox/mapbox-sdk/services/tilequery');

const baseClient = mbxClient({ accessToken: 'sk.eyJ1IjoiZmlyc3RzdGVmIiwiYSI6ImNrOHV4azR3czBkMjMzaW13czkyejRlZzIifQ.R58VleooI1CLm82K7GipLw' });
const stylesService = mbxStyles(baseClient);
const tilesetsService = mbxTileQuery(baseClient);

const app = http.createServer((request, response) => {

    // List tilesets.
        tilesetsService.listFeatures({
            mapIds: ['mapbox.mapbox-streets-v8'],
            coordinates: [27.598505,47.162098],
            geometry: 'polygon',
            layers: ['building', 'road'],
            radius: 30
        }).send()
            .then(re => {
                var cache = [];
                let json = JSON.stringify(re, function(key, value) {
                    if (typeof value === 'object' && value !== null) {
                        if (cache.indexOf(value) !== -1) {
                            // Duplicate reference found, discard key
                            return;
                        }
                        // Store value in our collection
                        cache.push(value);
                    }
                    return value;
                });
                cache = null;

                response.write(json);
                response.end();
            }, error => {
                response.write(error.toString());
                response.end();
            })
});

app.listen(3000);