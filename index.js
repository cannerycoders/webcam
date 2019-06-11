let Logger = require("./logger.js");
let express = require("express");

const Port = 8180;
const AppName = "webcam";
const IdleInterval = 5 * 60 * 1000; // every five minutes

class App extends Logger
{
    constructor()
    {
        super();
        this.exp = express();
        this.exp.use(express.static("www"));
        this.exp.use("/capture", express.static("/mnt/thumb1/capture"));
    }

    go()
    {
        this.exp.listen(Port, () =>
        {
            this.notice(`${AppName} listening on port ${Port}`);
            this.debug(` node ${process.version}`);
        });
        this.onIdle();
    }

    onIdle()
    {
        // perform a snapshot, compare it with last frame
        setTimeout(this.onIdle.bind(this), IdleInterval);
    }
}


global.app = new App();
app.go();
