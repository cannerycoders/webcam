let http = require("http");
let express = require("express");
let ws = require("ws");
let fs = require("fs");
let os = require("os");
let {exec, execFile} = require("child_process");

let path = require("path");
let Logger = require("./logger.js");
let Picam = require("./picam.js");
let ImgCmp = require("./imgcmp.js");
let Mailer = require("./mailer.js");

const DefaultServerConfig = 
{
    port: 8180,
    serverroot: "/mnt/thumb1",
    captureroot: "/mnt/thumb1/capture",
    subdir: "CanneryCove",
    title: "Cannery Cove",
    pantilt: false,
};

const AppName = "webcam";
const IdleMinutes = 3;
const IdleInterval = IdleMinutes * 60 * 1000;

class App extends Logger
{
    constructor()
    {
        super(os.hostname());
        this.hostname = os.hostname();
        try
        {
            let sc = fs.readFileSync("serverconfig.json");
            let serverconfigs = JSON.parse(sc);
            this.config = serverconfigs[this.hostname];
        }
        catch(err)
        {
            console.error("invalid serverconfig: " + err);
            this.config = DefaultServerConfig;
        }
        this.notice("Using config\n" + JSON.stringify(this.config, null, 2));

        this.captureRoot = this.config.captureroot;
        this.subdir = this.config.subdir;
        this.timelapseDir = 
                `${this.captureRoot}/${this.subdir}/timelapse`;
        try
        {
            fs.mkdirSync(this.timelapseDir, {recursive: true});
        }
        catch(err)
        {
            app.error(err);
        }

        this.picam = new Picam();
        this.imgcmp = new ImgCmp();
        this.mailer = new Mailer();
        this.nightlyDone = false; // reset at midnight
        this.lastFileName = null;
        this.panTiltProcesss = null;
        try
        {
            let sc = fs.readFileSync("mailconfig.json");
            this.mailconfig = JSON.parse(sc);
        }
        catch(err)
        {
            console.error("invalid/missing mailconfig.json: " + err);
            this.mailconfig = null;
        }
        this.mailer = new Mailer(this.mailconfig);
        this.lastFileName = null;
        this.exp = express();
        this.exp.use(express.static("www"));
        this.exp.use("/capture", express.static(this.captureRoot));
        this.exp.get("/api/getday*", this.getinfo.bind(this));
        this.exp.get("/api/gettimelapse", this.getinfo.bind(this));
        this.exp.get("/api/gettitle", this.getinfo.bind(this)); // deprecated
        this.exp.get("/api/getinfo", this.getinfo.bind(this));
        this.exp.get("/api/movecam", this.setinfo.bind(this));
        this.server = http.createServer(this.exp);

        this.wss = new ws.Server({server: this.server});
        this.wss.on("connection", (ws, cnx) => {
            ws.send(JSON.stringify({
                action: "init",
                width: this.picam.StreamSize[0],
                height: this.picam.StreamSize[1],
            }));
            ws.on("message", msg => {
                let args = msg.split(" ");
                let action = args[0];
                console.log("ws: incoming action " + action);
                switch(action)
                {
                case "REQUESTSTREAM":
                    this.picam.AddStreamClient(this.wss, msg, ws);
                    break;
                case "STOPSTREAM":
                case "RESET":
                    this.picam.RemoveStreamClient(this.wss, msg, ws);
                    break;
                default:
                    console.warn("ws: unexpected message " + action);
                }
            });
            ws.on("close", () => {
                this.picam.RemoveStreamClient(this.wss, null, ws);
            });
            ws.on("error", err => {
                console.error("ws error: ", err);
            });
            if(cnx)
            {
                let datestr = new Date().toLocaleString();
                let msg = `ws connection url: ${cnx.url} ` +
                          `from: ${cnx.connection.remoteAddress} ` +
                          `on: ${datestr}`;
                 console.log(msg);
            }
        });
    }

    go()
    {
        this.server.listen(this.config.port, () =>
        {
            this.notice(`${AppName} listening on port ${this.config.port}`);
            let routine = process.argv[2]; // node index.js nightly
            if(!routine)
                routine = "startup";
            this.performScheduledTasks(routine, new Date());
            this.onIdle();
        });
    }

    // https://expressjs.com/en/api.html#req
    getinfo(req, res)
    {
        // 
        // console.log(`path: ${JSON.stringify(req.path)}`); 
        //  "/api/getday"
        // console.log(`url: ${JSON.stringify(req.url)}`);
        //  "/api/getday?day=061219
        // console.log(`query: ${JSON.stringify(req.query)}`);
        //  {"day": "061319"}
        // console.log(`params: ${JSON.stringify(req.params)}`);
        //  {"0": ""}
        let result = {};
        switch(req.path)
        {
        case "/api/gettitle":
        case "/api/getinfo":
            result.query = req.path;
            result.title = this.config.title;
            result.pantilt = this.config.pantilt;
            if(result.pantilt)
            {
                this.doPanTilt(-1, -1, (err, msg) => {
                    if(err)
                    {
                        result.err = true;
                        result.msg = msg;
                    }
                    else
                    {
                        // expect message of form:
                        //   pan  0 -> 0 (pw pw)
                        //  tilt  0 -> 0 (pw pw)
                        let lines = msg.split("\n");
                        result.pan = lines[0].split(" ")[1];
                        result.tilt = lines[1].split(" ")[1];
                    }
                    res.json(result);
                });
            }
            else
                res.json(result);
            break;
        case "/api/gettimelapse":
            {   
                let files = fs.readdirSync(this.timelapseDir);
                result.query = req.path;
                result.dir = this.timelapseDir.slice(
                                this.config.serverroot.length);
                result.files = files;
                res.json(result);
            }
            break;
        case "/api/today":
        case "/api/getday":
            {
                let date;
                if(req.path == "/api/getday")
                {
                    // DDMMYY -> DD/MM/YY
                    if(req.query.day)
                        date = new Date(req.query.day.match(/..?/g).join("/"));
                    else
                    {
                        console.warn("invalid getday " +
                                    JSON.stringify(req.query));
                    }
                }
                if(!date)
                    date = new Date(); // now
                let dir = this.buildCaptureDir(date);
                let files = fs.readdirSync(dir);
                result.query = req.path;
                result.dir = dir.slice(this.config.serverroot.length);
                result.files = files;
                res.json(result);
            }
            break; 
        default:
            console.error("invalid getinfo request " + msg);
            res.json(result);
            break; 
        }
    }

    setinfo(req, res)
    {
        let result = {};
        if(this.config.pantilt)
        {
            let val = req.query.value;
            switch(req.path)
            {
            case "/api/movecam":
                if(req.query.pan && req.query.tilt)
                { 
                    this.doPanTilt(req.query.pan, req.query.tilt, (err, msg)=>{
                        result.query = req.path;
                        result.err = err;
                        result.msg = msg;
                        res.json(result);
                    });
                }
                else
                {
                    console.warn("invalid movecam "+JSON.stringify(req.query));
                    result.err = true;
                    result.msg("invalid movecam");
                    res.json(result);
                }
                break;
            default:
                res.json(result);
                break;
            }
        }
        // else we didn't write to res so error
        else
            res.json(result);
    }

    onIdle()
    {
        let now = new Date();
        let hours = now.getHours();
        let min = now.getMinutes();
        if(min < IdleMinutes*1.25) 
        {
            // top of the hour --------------------------
            let routine;
            if(hours == 0)
                this.nightlyDone = false;
            else
            if(hours == 2 && !this.nightlyDone)
            {
                this.nightlyDone = true;
                routine = "nightly";
            }
            else
            if(hours == 3)
            {
                if(now.getDate() == 1)
                    routine = "monthly";
                else
                if(now.getDay() == 0)
                    routine = "weekly";
            }
            if(routine)
                this.performScheduledTasks(routine, now);

            // we get at least one file/hour by defeating the imgdiff
            this.lastFileName = null; 
        }
        // perform a snapshot, compare it with last frame
        this.doCapture();
        setTimeout(this.onIdle.bind(this), IdleInterval);
    }

    doCapture(asThumbnail=false)
    {
        let filename = this.buildFilename(asThumbnail);
        console.debug("doCapture: " + filename);
        if(asThumbnail)
            console.info("buildThumbnail: " + path.basename(filename));
        this.picam.Capture(filename, asThumbnail)
            .then((result) => {
                if(!asThumbnail) 
                    this.keepTidy(filename); // may invoke doCapture(true)
                // else don't keepTidy thumbnails
            })
            .catch((error) => {
                console.error("picam error: " + error);
            });
    }

    // called to compare newly acquired file with lastmost successful
    // acquisition.  If images are "the same", we delete the new one.
    keepTidy(filename)
    {
        // don't prune a file if
        let makeThumbnail = false;
        if(this.lastFileName != null)
        {
            if(this.lastFileName == filename)
                console.error("invalid state: " + filename);
            else
                this.imgcmp.Compare(filename, this.lastFileName, 
                    (diff) => {
                        if(diff)
                        {
                            console.info(path.basename(filename) + " saved");
                            this.lastFileName = filename;
                            this.doCapture(true); // make thumbnail
                        }
                        else
                        {
                            console.info(path.basename(filename) + " skipped");
                            fs.unlink(filename, (err) => {
                                if(err)
                                    console.error(err);
                            });
                        }
                    });
        }
        else
        {
            console.info(path.basename(filename) + " saved [init]");
            this.lastFileName = filename;
            this.doCapture(true); // make thumbnail
        }
    }

    buildCaptureDir(date=null)
    {
        let year, month, day;
        if(date == null)
            date = new Date();
        year = date.getFullYear(); 
        month = ("00" + (date.getMonth()+1)).slice(-2);
        day = ("00" + date.getDate()).slice(-2);
        return `${this.captureRoot}/${this.subdir}/${year}/${month}/${day}`;
    }
    
    buildFilename(asThumbnail=false)
    {
        if(asThumbnail && this.lastFileName) // thumbnails
            return this.lastFileName + ".thumb";

        // organize our capture subdirs
        //  Capture/Prefix/Fullyear/Month/Day/Hour24:Minute60.jpg

        let now = new Date();
        let dir = this.buildCaptureDir(now);
        try
        {
            fs.mkdirSync(dir, {recursive: true});
        }
        catch(err)
        {
            app.error(err);
        }
        // make sure dir exists
        let hour = ("00" + now.getHours()).slice(-2);
        let min = ("00" + now.getMinutes()).slice(-2);
        let file = `${dir}/${hour}_${min}.jpg`;
        return file;
    }

    /*-------------------------------------------------------------*/
    performScheduledTasks(routine, d)
    {
        switch(routine)
        {
        case "startup":
            this.generateReport(routine);
            break;
        case "nightly":  // happens *every* night
            {
                let yesterday = new Date(d);
                yesterday.setDate(d.getDate() - 1);
                this.generateTimelapse(yesterday, 
                            this.generateReport.bind(this, routine));
            }
            break;
        case "weekly": // happens occasionally, one hour after nightly
        case "monthly":
            // could do some disk cleanups, backups, etc
            break;
        }
    }

    generateTimelapse(date, whenDone)
    {
        // exec python buildTimelapse in the background
        // ./buildTimelapse.py \
        //      /mnt/thumb1/capture/201Eakin/2019/06/12 \
        //      /mnt/thumb1/capture/201Eakin/timelapse
        let captureDir = this.buildCaptureDir(date);
        let cmd = "python3"
        let args = ["buildTimelapse.py", captureDir, this.timelapseDir];
        execFile(cmd, args, {}, (error, stdout, stderr) => 
        {
            let xtra = "buildTimelapse\n"+
                                    `  stdout ${stdout}\n  ` +
                                    `  stderr ${stderr}`;
            this.notice(xtra);
            whenDone(xtra);
        });
    }

    generateReport(routine, xtra)
    {
        // for now we ignore detail param
        let cmd = `df -h ${this.captureRoot}`;
        exec(cmd, {}, (error, stdout, stderr) => {
            if(stderr || error)
                console.error(`${error} ${stderr}`);
            else
            {
                let dstr = (new Date()).toLocaleString();
                let msg = `webcam ${this.hostname} report ${dstr}\n\n`;
                msg += `${cmd}\n\n`;
                msg += "<code>\n";
                if(stdout.length)
                    msg += `${stdout}\n\n`;
                if(stderr.length)
                    msg += `### stderr ####\n\n${stderr}\n`;
                msg += "</code>\n";
                if(xtra)
                {
                    msg += "<hr>\n";
                    msg += "<code>\n";
                    msg += xtra;
                    msg += "</code>\n";
                }
                let subject = `webcam ${this.hostname} ${routine} ${dstr}`;
                this.mailer.Send(subject, msg, true);
            }
        });
    }

    doPanTilt(pan, tilt, onDone)
    {
        console.info(`doPanTilt request: ${pan} ${tilt}`);
        if(this.panTiltProcess)
        {
            onDone(true, "panning in progress"); // error
            return;
        }
        let cmd = `./bin/pantilt ${pan} ${tilt}`;
        this.panTiltProcess = exec(cmd, {
            // 8 seconds to get to target (worst-case measured > 5s)
            timeout: 8000, 
            killSignal: "SIGINT",
        }, (error, stdout, stderr) => {
            if(stderr || error)
            {
                if(this.panTiltProcess.killed)
                    console.error(`${error} (killed)`);
                else
                    console.error(`${error} ${stderr}`);
                onDone(true, stderr);
            }
            else
            {
                console.info(`${stdout}`);
                onDone(false, stdout);
            }
            this.panTiltProcess = null;
        });
    }
}


global.app = new App();
app.go();
