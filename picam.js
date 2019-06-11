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
        this.args = [
            "--nopreview",
            "--exposure=auto",
        this.pdiff = "/home/pi/bin/perceptualdiff";
    }

    capture(filename)
    {
        return new Promise((resolve, reject) => 
        {
            exec(this.captureCmd, (error, stdout, stderr)=> {
                if(stderr || error)
                    reject(stderr || error);
                resolve(stdout);
            });
        });
    } 
}


module.exports = PiCam;
