let express = require("express");
let path = require("path");
let Logger = require("./logger.js");
let Picam = require("./picam.js");
let ImgCmp = require("./imgcmp.js");
let Mailer = require("./mailer.js");
let fs = require("fs");
let os = require("os");
let {exec, execFile} = require("child_process");

const Port = 8180;
const AppName = "webcam";
const IdleMinutes = 3;
const IdleInterval = IdleMinutes * 60 * 1000;
const ServerRoot = "/mnt/thumb1";
const CaptureRoot = "/mnt/thumb1/capture";
const Prefix = "CanneryCove";

class App extends Logger
{
    constructor()
    {
        super(os.hostname());
        this.hostname = os.hostname();
        try
        {
            this.serverconfig = s.readFileSync("serverconfig.json");
            this.config = this.serverconfig[this.hostname];
        }
        catch(err)
        {
            this.config =
            {
                serverroot: ServerRoot,
                captureroot: CaptureRoot,
                prefix: Prefix,
                title: Prefix,
            }
            this.config.serveroot = ServerRoot;
            this.error(err);
        }
        this.captureRoot = this.config.captureroot;
        this.prefix = this.config.prefix;
        this.timelapseDir = 
                `${this.captureRoot}/${this.prefix}/timelapse`;
        this.exp = express();
        this.exp.use(express.static("www"));
        this.exp.use("/capture", express.static(this.captureRoot));
        this.picam = new Picam();
        this.imgcmp = new ImgCmp();
        this.mailer = new Mailer();
        this.lastFileName = null;
    }

    go()
    {
        this.exp.get("/api/getday*", this.getinfo.bind(this));
        this.exp.get("/api/gettimelapse", this.getinfo.bind(this));
        this.exp.get("/api/gettitle", this.getinfo.bind(this));
        this.exp.listen(Port, () =>
        {
            this.notice(`${AppName} listening on port ${Port}`);
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
            result.query = req.path;
            result.title = this.config.title;
            break;
        case "/api/gettimelapse":
            {   
                let files = fs.readdirSync(this.timelapseDir);
                result.query = req.path;
                result.dir = this.timelapseDir.slice(ServerRoot.length);
                result.files = files;
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
                        console.warn("invalid query");
                }
                if(!date)
                    date = new Date(); // now
                let dir = this.buildCaptureDir(date);
                let files = fs.readdirSync(dir);
                result.query = req.path;
                result.dir = dir.slice(ServerRoot.length);
                result.files = files;
            }
            break; 
        default:
            console.error("invalid getinfo request " + msg);
            break; 
        }
        res.json(result);
    }

    onIdle()
    {
        // perform a snapshot, compare it with last frame
        let now = new Date();
        let hours = now.getHours();
        let min = now.getMinutes();

        if(min < IdleMinutes)
        {
            let routine;
            if(hours == 2)
                routine = "nightly";
            else
            if(hours == 3)
            {
                if(now.getDate() == 1)
                    routine = "monthly";
                else
                if(now.getDay() == 0)
                    routine = "weekly";
            }
            else
                routine = "hourly";
            this.performScheduledTasks(routine, now);
        }
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
        return `${this.captureRoot}/${this.prefix}/${year}/${month}/${day}`;
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
        let dstr = d.toLocaleString();
        let subject = `webcam ${this.hostname} ${routine} ${dstr}`;
        console.info(subject);
        switch(routine)
        {
        case "nightly": 
            {
                let yesterday = new Date(d);
                yesterday.setDate(d.getDate() - 1);
                this.generateTimelapse(yesterday);
            }
            // fall-thru
        case "weekly":
        case "monthly":
        case "startup":
            this.generateReport(routine, dstr, (msg) => {
                this.mailer.Send(subject, msg, true);
            });
            break;
        case "hourly":
            // ensure we get at least one file/hour
            this.lastFileName = null; 
            break; // logged above
        }
    }

    generateTimelapse(date)
    {
        // exec python buildTimelapse in the background
        // ./buildTimelapse.py \
        //      /mnt/thumb1/capture/201Eakin/2019/06/12 \
        //      /mnt/thumb1/capture/201Eakin/timelapse
        let captureDir = this.buildCaptureDir(date);
        let cmd = "python3"
        let args = ["buildTimelapse.py", captureDir, this.timelapseDir];
        execFile(cmd, args, {},
                (error, stdout, stderr) => {
                    this.notice("buildTimelapse\n"+
                        `  stdout ${stdout}\n  ` +
                        `  stderr ${stderr}`)
                }
            );
    }

    generateReport(routine, datestr, onDone)
    {
        // for now we ignore detail param
        let cmd = `df -h ${this.captureRoot}`;
        exec(cmd, {}, (error, stdout, stderr) => {
            if(stderr || error)
                console.error(`${error} ${stderr}`);
            else
            {
                let msg = `webcam ${this.hostname} report ${datestr}\n\n`;
                msg += `${cmd}\n\n`;
                msg += "<code>\n";
                if(stdout.length)
                    msg += `${stdout}\n\n`;
                if(stderr.length)
                    msg += `### stderr ####\n\n${stderr}\n`;
                msg += "</code>\n";
                onDone(msg);
            }
        });
    }
}


global.app = new App();
app.go();
