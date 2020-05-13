const fs = require('fs');

function logToFile(msg){
    msg = JSON.stringify(msg);
    fs.appendFile('twlogs/twproj-' + (new Date()).toString()
        .replace(/ /g, "_")
        .replace(/:/g, "_") + '.log', msg, function (err) {
        if (err)
            throw err;
        console.log(msg);
    });
}
process.on('uncaughtException', function (err) {
    logToFile('Caught exception: ' + err.toString() + err.stack.toString());
});

module.exports = logToFile;