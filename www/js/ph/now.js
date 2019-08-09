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
        if(app.serverInfo.pantilt)
        {
            navextra.innerHTML = "<span id='panTxt'>pan 000</span>"+
                                 "<input id='panSlider' type='range'/> " +
                                 "<span id='tiltTxt'>tilt 000</span>"+
                                 "<input id='tiltSlider' type='range'/>"+
                                 "<br >(58,100) or (95,39)";

            this.panTxt = document.getElementById("panTxt");
            this.panSlider = document.getElementById("panSlider");
            this.tiltTxt = document.getElementById("tiltTxt");
            this.tiltSlider = document.getElementById("tiltSlider");
            this._updatePanTilt(app.serverInfo.pan, app.serverInfo.tilt);

            panSlider.oninput = (evt) => {
                panTxt.innerText = "pan "+("000"+evt.target.value).slice(-3);
            }
            panSlider.onchange = (evt) => {
                this._changePanTilt(evt.target.value, -1);
            };
            tiltSlider.oninput = (evt) => {
                tiltTxt.innerText = "tilt "+("000"+evt.target.value).slice(-3);
            };
            tiltSlider.onchange = (evt) => {
                this._changePanTilt(-1, evt.target.value);
            };
        }
        else
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


    _updatePanTilt(pan, tilt, updateSlider=true)
    {
        if(pan >= 0)
        {
            this.panTxt.innerText = "pan "+
                                ("00"+(100-pan)).slice(-3);
            if(updateSlider)
                this.panSlider.value = pan;
        }
        if(tilt >= 0)
        {
            this.tiltTxt.innerText = "tilt "+
                               ("00" + tilt).slice(-3);
            if(updateSlider)
                this.tiltSlider.value = tilt;
        }
    }

    _changePanTilt(pan, tilt)
    {
        if(pan != -1)
            pan = (100 - pan);
        app.sendGetRequest(`/api/movecam?pan=${pan}&tilt=${tilt}&`, (ret) => {
            console.log(JSON.stringify(ret));
        });
    }
}

export default Now;
