const {execFile} = require("child_process");

class ImgCmp
{
    constructor()
    {
        this.cmd = "./bin/perceptualdiff";
        this.args = [
            "--down-sample", 3,
            "--threshold", 15000, // pixels
        ];
        this.execOpts = {}; // cwd?
    }

    Compare(filea, fileb, cb) // cb(isdiff)
    {
        let args = [filea, fileb];
        args.push(...this.args);
        // console.log(`${this.cmd} ${args}`);
        execFile(this.cmd, args, this.execOpts,
            (error, stdout, stderr) => {
                // perceptualdiff sets an error status when it 
                // says images aren't the same
                let diff = true; // means don't remove (safe default)
                let err = 0;
                if(error)
                {
                    // Two kinds of errors, both mean diff == true.
                    if(error.code == 1 || stdout.length)
                    {
                        // success: images aren't equal
                        // here stdout tells us interesting stats
                        console.info("imgcmp: " + stdout.replace(/\n/g, ", "));
                    }
                    else
                    {
                        console.error("imgcmp: " + JSON.stringify(error));
                    }
                }
                else
                {
                    // console.info("imgcmp no error, no diff");
                    diff = false;
                }
                cb(diff);
            });
    }
}

module.exports = ImgCmp;
