/* global app */
import {PageHandler} from "./ph.js";

class Now extends PageHandler
{
    constructor()
    {
        super();
        this.streamStart = null;
    }

    GetId()
    {
        return "now";
    }

    GetLabel()
    {
        return "Now";
    }

    OnIdle(now)
    {
        if(this.streamStart != null)
        {
            this.statusElem.innerText = now.toLocaleTimeString();
        }
    }

    Cleanup()
    {
        this._onStop();
    }

    BuildPage(page, navextra, searchParams)
    {  
        app.setDateVisibility(false);

        // here we defeat the grid entirely
        page.innerHTML = 
        "<div style='grid-column-end:span 100;grid-row-end:span 100'>" +
            "<div>"+
            "<button type='button' id='streamControl'>Start Stream</button>" +
            "<span id='streamStatus'></span>" +
            "</div>" +
            "<canvas id='videocanvas'></canvas>" +
        "</div>";
        navextra.innerHTML = "";

        this.buttonElem = document.getElementById("streamControl");
        this.buttonElem.onclick = this._onStartStop.bind(this);
        this.canvasElem = document.getElementById("videocanvas");
        this.statusElem = document.getElementById("streamStatus");
    }

    _onStartStop()
    {
        console.log("stream start");
        if(!this.wsplayer || this.streamStart == null)
        {
            this.buttonElem.innerText = "Stop Stream";
            if(!this.wsplayer)
                this.wsplayer = new WSAvcPlayer(this.canvasElem, "webgl",1,35);
            this.streamStart = new Date();
            let url = "ws://"+window.location.hostname+":"+window.location.port;
            this.wsplayer.connect(url, this._onWSEvent.bind(this));
            this.wsplayer.on("canvasReady", this._onWSCanvasReady.bind(this));
        }
        else
        {
            this.buttonElem.innerText = "Start Stream";
            this._onStop();
        }
    }

    _onStop() // called from cleanup
    {
        console.log("stream stop");
        if(this.wsplayer)
        {
            this.wsplayer.disconnect();
            this.wsplayer.running = false;
        }
        this.streamStart = null;
    }

    _onWSEvent(evt)
    {
        console.log("_onWSEvent " + evt);
        this.statusElem.textContent = (evt == "onclose") ? "" : evt;
        switch(evt)
        {
        case "onopen":
            this.wsplayer.playStream(
                    "raspivid -t 0 -b 1500000 -o - -w 640 -h 480 "+
                    " -fps 30 -pf baseline");
            break;
        case "onclose":
            break;
        default:
            console.warn("unknown ws event: " + evt);
            break;
        }
    }

    _onWSCanvasReady(w, h)
    {
        this.statusElem.textContent = `canvas ready ${w}x${h}`;
        this.canvasElem.className = "cameraViewImg";
    }

    _onReset()
    {
        console.log("stream reset");
    }
}

export default Now;
