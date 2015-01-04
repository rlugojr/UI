var urls      = require("../../urls");
var url       = require("url");
var path      = require("path");
var fs        = require("fs");
var Immutable = require("immutable");

/**
 * @type {Immutable.Set}
 */
var validUrls   = Immutable.OrderedSet('/');
var timestamp;

/**
 * @type {{plugin: Function, plugin:name: string, markup: string}}
 */
module.exports = {
    /**
     * @param cp
     * @param bs
     */
    "plugin": function (cp, bs) {

        var sockets = bs.io.of("/browser-sync-cp");
        var clients = bs.io.of("/browser-sync");

        clients.on("connection", function (client) {
            client.on("urls:client:connected", function (data) {
                var temp = validUrls.add(url.parse(data.path).path);
                if (!Immutable.is(validUrls, temp)) {
                    validUrls = temp;
                    sendUpdatedUrls(sockets, validUrls);
                }
            });
        });

        sockets.on("connection", function (client) {

            sendUpdatedUrls(sockets, validUrls);

            client.on("urls:browser:reload",   reloadAll.bind(bs));
            client.on("urls:browser:url",      sendToUrl.bind(bs, bs.getOption("urls.local")));


            client.on("cp:get:visited", function (req) {
                sockets.emit("cp:receive:visited", decorateUrls(validUrls));
            });
        });
    },
    /**
     * Hooks
     */
    "hooks": {
        "markup": fs.readFileSync(path.join(__dirname, "history.html")),
        "client:js": require("fs").readFileSync(__dirname + "/history.client.js"),
        "templates": [
            path.join(__dirname, "/history.directive.html")
        ],
        "page": {
            path: "/history",
            title: "History",
            template: "history.html",
            controller: "HistoryController",
            order: 3,
            icon: "book_2"
        }
    },
    /**
     * Plugin name
     */
    "plugin:name": "History"
};

/**
 *
 */
function sendUpdatedUrls (sockets, urls) {
    sockets.emit("cp:urls:update", decorateUrls(urls));
}

/**
 * @param {Immutable.Set} urls
 * @returns {Array}
 */
function decorateUrls (urls) {
    var count = 0;
    return urls.map(function (value, i) {
        count += 1;
        return {
            path: value,
            key: count
        };
    }).toJS();
}

/**
 * Send all browsers to a URL
 */
function sendToUrl (localUrl, data) {

    var parsed = url.parse(data.path);
    var bs = this;
    data.path = parsed.path;
    data.override = true;
    data.url = parsed.href;
    bs.io.sockets.emit("browser:location", data);
}

/**
 * Simple Browser reload
 */
function reloadAll() {
    this.io.sockets.emit("browser:reload");
}
