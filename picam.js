const {execFile} = require("child_process");

// difference between exec and execFile: 
//      exec: takes single string command
//      execFile: 
//          takes array of string args (plus a ref to the file)
//          doesn't spawn a shell

class PiCam
{
    constructor()
    {
        this.captureCmd = "raspistill";
        this.args = [
            "--nopreview",
            "--timeout", 250, // ms
            "--ISO", 400,  // (100-800)
            "--sharpness", 25, // (-100, 100) - 0 is default
            "--exposure", "auto",
            "--metering", "spot",
            "--quality", 75,
            "-o",
            ]
        this.execOpts = {};
    }

    Capture(filename)
    {
        return new Promise((resolve, reject) => 
        {
            let args = this.args.slice();
            args.push(filename);
            execFile(this.captureCmd, args, this.execOpts, 
                (error, stdout, stderr) => {
                    if(stderr || error)
                        reject(stderr || error);
                    else
                        resolve(stdout);
                });
        });
    } 
}


module.exports = PiCam;
