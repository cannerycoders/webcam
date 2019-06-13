let express = require("express");
let path = require("path");
let Logger = require("./logger.js");
let Picam = require("./picam.js");
let ImgCmp = require("./imgcmp.js");
let Mailer = require("./mailer.js");
let fs = require("fs");
let os = require("os");
let {exec} = require("child_process");

const Port = 8180;
const AppName = "webcam";
const IdleMinutes = 5;
const IdleInterval = IdleMinutes * 60 * 1000;
const ServerRoot = "/mnt/thumb1";
const CaptureRoot = "/mnt/thumb1/capture";
const Prefix = "201Eakin";

class App extends Logger
{
    constructor(captureRoot=CaptureRoot, prefix=Prefix)
    {
        super(os.hostname());
        this.hostname = os.hostname();
        this.captureRoot = captureRoot;
        this.prefix = prefix;
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
        this.exp.listen(Port, () =>
        {
            this.notice(`${AppName} listening on port ${Port}`);
            this.performScheduledTasks("startup", new Date());
            this.onIdle();
        });
    }

    // https://expressjs.com/en/api.html#req
    getinfo(req, res)
    {
        // 
        console.log(`path: ${JSON.stringify(req.path)}`); // "/api/getday"
        console.log(`url: ${JSON.stringify(req.url)}`);
        console.log(`query: ${JSON.stringify(req.query)}`);
        console.log(`params: ${JSON.stringify(req.params)}`);
        // console.log(`route: ${JSON.stringify(req.route)}`); // "/day"
        let result = {};
        switch(req.path)
        {
        case "/api/today":
        case "/api/getday":
            {
                let date;
                if(req.path== "/api/today")
                    date = new Date();
                else
                {
                    // DDMMYY -> DD/MM/YY
                    date = new Date(req.query.day.match(/..?/g).join("/"));
                }
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
            if(hours == 3)
            {
                if(a.getDate() == 1)
                    routine = "monthly";
                else
                if(a.getDay() == 0)
                    routine = "weekly";
                else
                    routine = "daily";
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
        case "daily": // fall-thru
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
