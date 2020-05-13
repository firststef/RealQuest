let logger = require('../utils/logger');
const fs = require('fs');

class ResourceController {
    plainFileExport(req, res, path, type){
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        let data;
        if (path !== undefined && type !== undefined) {
            try {
                data = fs.readFileSync(path);
                res.statusCode = 200;
                res.setHeader('Content-Type', type);

                res.write(data);
                res.end();
                return;
            } catch (e) {
                logger("File not read:" + req.url);
            }
        } else {
            logger("Arguments invalid:" + req.url);
        }
        res.writeHead(404);
        res.write('Not found');
        res.end();
    }
}

let resourceController = new ResourceController();

module.exports = resourceController;