class ResourceController {
    plainFileExport(req, res, type){
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        let data;
        let resource = config.resources[parsedUrl.pathname];
        if (resource !== undefined) {
            try {
                data = fs.readFileSync(resource.path);
                res.statusCode = 200;
                res.setHeader('Content-Type', resource.type);

                if (resource.isTemplated){
                    let d = model.get_all();
                    data = view.render(data, d);
                }
                res.write(data);
                res.end();
                return;
            } catch (e) {
                logToFile("File not read:" + req.url);
            }
        } else {
            logToFile("Path not registered:" + req.url);
        }
        res.writeHead(404);
        res.write('Not found');
        res.end();
    }
}

let resourceController = new ResourceController();

module.exports = resourceController;