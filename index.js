let express = require("express");
let path = require("path");
let Logger = require("./logger.js");
let Picam = require("./picam.js");
let ImgCmp = require("./imgcmp.js");
let fs = require("fs");

const Port = 8180;
const AppName = "webcam";
const IdleInterval = 5 * 60 * 1000; // every five minutes
const CaptureRoot = "/mnt/thumb1/capture";
const Prefix = "201Eakin";

class App extends Logger
{
    constructor()
    {
        super();
        this.exp = express();
        this.exp.use(express.static("www"));
        this.exp.use("/capture", express.static(CaptureRoot));
        this.picam = new Picam();
        this.imgcmp = new ImgCmp();
        this.lastFile = null;
    }

    go()
    {
        this.exp.listen(Port, () =>
        {
            this.notice(`${AppName} listening on port ${Port}`);
            // this.debug(` node ${process.version}`);
            this.onIdle();
        });
    }

    onIdle()
    {
        // perform a snapshot, compare it with last frame
        let filename = this.buildFilename();
        this.picam.Capture(filename)
            .then((result) => {
                this.keepTidy(filename);
            })
            .catch((error) => {
                console.error("picam error: " + error);
            });
        setTimeout(this.onIdle.bind(this), IdleInterval);
    }

    keepTidy(filename)
    {
        // don't prune a file if
        if(this.lastFile != null)
        {
            this.imgcmp.Compare(filename, this.lastFile, (diff) => {
                if(diff)
                {
                    console.info(path.basename(filename) + " saved");
                    this.lastFile = filename;
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
            this.lastFile = filename;
        }
    }
    
    buildFilename()
    {
        // organize our capture subdirs
        //  Capture/Prefix/Fullyear/Month/Day/Hour24:Minute60.jpg
        let now = new Date();
        let year = now.getFullYear(); 
        let month = ("00" + (now.getMonth()+1)).slice(-2);
        let day = ("00" + now.getDate()).slice(-2);
        let dir = `${CaptureRoot}/${Prefix}/${year}/${month}/${day}`;
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

        if(now.getMinutes() < 3)
            this.lastFile = null; // ensure that we get at least one file/hour
        return file;
    }
}


global.app = new App();
app.go();
