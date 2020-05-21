const http = require('http');
const assert = require('assert').strict;

async function testShouldPass(unitTester, test){
    try{
        let x = 0;
    }catch (e) {
        unitTester.notify(test, {status: 'failed', message: e});
        return;
    }
    unitTester.notify(test, {status: 'success'});
}

async function testShouldFail(unitTester, test){
    try{
        throw 'e';
    }catch (e) {
        unitTester.notify(test, {status: 'success'});
        return;
    }
    unitTester.notify(test, {status: 'failed', message: e});
}

async function testRequestPage(unitTester, test, path) {
    let data = '';
    http.get('http://localhost' + path, (res) => {
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            unitTester.notify(test, {status: 'success'});
        });
    }).on('error', (error) => {
        unitTester.notify(test, {status: 'fatal', message: error});
    });
}

async function testGetIndexPage(unitTester, test) {await testRequestPage(unitTester, test, '/')}
async function testGetGamePage(unitTester, test) {await testRequestPage(unitTester, test, '/game.html')}

async function testNearbyFeatures(unitTester, test) {
    let data = '';
    http.get('http://localhost/api/nearbymessage?long=27.5863&lat=47.1551', (res) => {
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            try{
                let j = JSON.parse(data);
                assert(j['name'] !== undefined, 'No name in feature');
            }
            catch (e) {
                unitTester.notify(test, {status: 'failed', message: e});
                return;
            }

            unitTester.notify(test, {status: 'success'});
        });
    }).on('error', (error) => {
        unitTester.notify(test, {status: 'fatal', message: error});
    });
}

async function testConfig(unitTester, test) {
    let data = '';
    http.get('http://localhost/api/configuration', (res) => {
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            try{
                let j = JSON.parse(data);
                assert(j['maxNrOfMonsters'] !== undefined, 'No maxNrOfMonsters in config');
                assert(j['isNight'] !== undefined, 'No isNight in config');
                assert(j['playerMaxHealth'] !== undefined, 'No playerMaxHealth in config');
            }
            catch (e) {
                unitTester.notify(test, {status: 'failed', message: e});
                return;
            }

            unitTester.notify(test, {status: 'success'});
        });
    }).on('error', (error) => {
        unitTester.notify(test, {status: 'fatal', message: error});
    });
}

module.exports.testShouldPass = testShouldPass;
module.exports.testShouldFail = testShouldFail;
module.exports.testGetIndexPage = testGetIndexPage;
module.exports.testGetGamePage = testGetGamePage;
module.exports.testNearbyFeatures = testNearbyFeatures;
module.exports.testConfig = testConfig;