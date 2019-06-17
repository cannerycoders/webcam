const {execFile, spawn} = require("child_process");
const Splitter = require("stream-split");
const NALbreak = Buffer.from([0,0,0,1]); // NAL break in h264 stream

// difference between exec and execFile: 
//      exec: takes single string command
//      execFile: 
//          takes array of string args (plus a ref to the file)
//          doesn't spawn a shell

class PiCam
{
    constructor()
    {
        this.aspectRatio = 4/3; // mode0 is sensor res, 4:3 
        this.captureCmd = "raspistill";
        this.captureArgs = [
            "--nopreview",
            "--timeout", 25, // ms
            // "--ISO", 400,  // (100-800)
            "--sharpness", 25, // (-100, 100) - 0 is default
            "--exposure", "auto",
            "--metering", "spot",
            "--quality", 75,
            "-o",
            ]
        this.thumbArgs = [
            "--width", 100,
            "--height", Math.round(100*this.aspectRatio),
        ];

        this.StreamSize = [640, 480];
        this.streamCmd = "raspivid";
        this.streamArgs = ["-t", "0",
                    "-b", 2000000,
                    "-o", "-",   // stream to stdout 
                    "-w", this.StreamSize[0],
                    "-h", this.StreamSize[1],
                    "-fps", 30,
                    "-pf", "baseline"];
        this.streamer = null; // a child_process
        this.readStream = null; // may be shared with multiple ws cnx
    }

    Capture(filename, asThumbnail=false)
    {
        return new Promise((resolve, reject) => 
        {
            if(this.IsStreaming())
            {
                reject("currently camera is streaming");
                return;
            }
            let args = this.captureArgs.slice();
            args.push(filename);
            if(asThumbnail)
                args.push(...this.thumbArgs);
            execFile(this.captureCmd, args, {},
                (error, stdout, stderr) => {
                    if(stderr || error)
                        reject(stderr || error);
                    else
                    {
                        resolve(stdout);
                    }
                });
        });
    } 

    AddStreamClient(wss, msg, client)
    {
        // msg include a command-line request.  for now, we
        // ignore it and rely on our hardcoded streamArgs
        if(!this.streamer)
        {
            this.wss = wss; // web socket server keeps list of clients
            this.streamer = spawn(this.streamCmd, this.streamArgs);
            this.streamer.on("exit", function(code) {
                this.streamer = null;
                if(code != null)
                    console.warn("raspivid shutdown failure: " +code);
                else
                    console.warn("raspivid shutdown");
            });
            this.readStream = this.streamer.stdout.pipe(new Splitter(NALbreak));
            this.readStream.on("data", this._broadcast.bind(this));
        }
    }

    RemoveStreamClient(wss, msg, client)
    {
        // remove stream client may be a no-op since we support
        // multiple and these are managed by this.www.clients.
        // We haven't see an actual close unless msg == null.
        console.log("remove stream client " + msg);
        if(this.wss && this.countClients() == 0)
        {
            console.log("picam senses that there are no ws clients");
            this.EndStream();
        }
    }

    countClients()
    {
        let count = 0;
        if(this.wss.clients)
            this.wss.clients.forEach( () => count++ );
        return count;
    }

    IsStreaming()
    {
        return this.streamer != null;
    }

    EndStream()
    {
        if(this.streamer)
        {
            console.log("raspivid endstream");
            this.streamer.kill("SIGKILL");
            this.streamer = null;
        }
    }

    _broadcast(data)
    {
        this.wss.clients.forEach( (socket) => {
            if(socket.buzy) return;
            socket.buzy = true;
            socket.buzy = false;
            socket.send(Buffer.concat([NALbreak, data]), {binary: true},
                    (err) => { socket.buzy = false; });
        });
    }

}


module.exports = PiCam;
