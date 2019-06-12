const {execFile} = require("child_process");

class ImgDiff
{
    constructor()
    {
        this.cmd = "./bin/perceptualdiff";
        this.args = [
            "--down-sample", 3,
            "--threshold", 25000, // pixels
        ];
        this.execOpts = {}; // cwd?
    }

    Diff(filea, fileb, cb) // cb(isdiff)
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
                            console.info("imgdiff\n" + stdout);
                        }
                        else
                        {
                            console.error("imgdiff " + JSON.stringify(error));
                        }
                    }
                    else
                    {
                        // console.info("imgdiff no error, no diff");
                        diff = false;
                    }
                    cb(diff);
                });
    }

}

module.exports = ImgDiff;
