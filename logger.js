class Logger
{
    constructor(nmspace=null)
    {
        this.lvl = // this must precede any logging calls
        {
            ERROR: 1,   1: "Error    ",
            WARNING: 2, 2: "Warning  ",
            NOTICE: 3,  3: "Notice   ",
            INFO: 4,    4: "Info     ",
            DEBUG: 5,   5: "Debug    "
        };
        this.logLevel = 5;
        this.logStash = {
            debug: console.debug,
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error, 
        };
        if(nmspace)
            this.logprefix = `${nmspace} `;
        else
            this.logprefix = "";

        console.debug = this.debug.bind(this);
        console.info = this.info.bind(this);
        console.log = this.notice.bind(this);
        console.warn = this.warning.bind(this);
        console.error = this.error.bind(this);

	}

    debug(msg)
    {
        this._logMsg("DEBUG", msg);
    }

    info(msg)
    {
        this._logMsg("INFO", msg);
    }

    notice(msg)
    {
        this._logMsg("NOTICE", msg);
    }

    warning(msg)
    {
        this._logMsg("WARNING", msg);
    }

    error(msg)
    {
        this._logMsg("ERROR", msg);
    }

    logMsg(msg, level="NOTICE") // glue to ../vesselwatch
    {
        this._logMsg(level, msg);
    }

    _logMsg(level, msg)
    {
        if(typeof level === "string")
            level = this.lvl[level];
        if(level <= this.logLevel)
        {
            this.logStash.log(
            `${this.logprefix}${this.timeStamp()} ${this.lvl[level]} ${msg}`);
        }
    }

    timeStamp(date, nopad)
    {
        if(date == undefined)
            date = new Date();
        return this.getTimeString(date, nopad);
    }

    getTimeString(date, nopad)
    {
        // hours are [0-23]
        //  0: 12
        //  1->12  untouched
        //  13-23 -> 1->11
        var hours = date.getHours();
        var xm;
        if(hours <= 11)
        {
            xm = "a";
            if(hours === 0) hours = 12;
        }
        else
        {
            if(hours > 12)
                hours -= 12;
            xm = "p";
        }
        return "" + this.spacePad(hours, 2, nopad) +  ":"
            + this.zeroPad(date.getMinutes()) + xm;
    }

    zeroPad(str, len)
    {
        if(len == undefined)
            len = 2;
        return ("0000" + str).slice(-len);
    }

    spacePad(str, len, nopad)
    {
        if(len == undefined)
            len = 2;
        if(nopad)
            return str;
        else
            return ("    " + str).slice(-len);
    }
}

module.exports = Logger;
