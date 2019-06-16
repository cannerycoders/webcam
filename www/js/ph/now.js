/* global app */
import {PageHandler} from "./ph.js";

class Now extends PageHandler
{
    constructor()
    {
        super();
    }

    GetId()
    {
        return "now";
    }

    GetLabel()
    {
        return "Now";
    }

    BuildPage(page, navextra, searchParams)
    {  
        app.setDateVisibility(false);

        // here we defeat the grid entirely
        page.innerHTML = 
        "<div style='grid-column-end:span 100;grid-row-end:span 100'>" +
            "<div>"+
                "<button type='button' id='streamStart'>Start Stream</button>" +
                "<button type='button' id='streamStop'>Stop Stream</button>" +
                "<button type='button' id='streamReset'>Reset Stream</button>" +
                "<span id='streamStatus'>placeholder</span>" +
            "</div>" +
            "<canvas class='cameraViewImg' id='videocanvas'></canvas>" +
        "</div>";
        navextra.innerHTML = "";
        document.getElementById("streamStart").onclick = 
                                    this._onStart.bind(this);
        document.getElementById("streamStop").onclick = 
                                    this._onStop.bind(this);
        document.getElementById("streamReset").onclick = 
                                    this._onReset.bind(this);
    }

    _onStart()
    {
        console.log("stream start");
    }

    _onStop()
    {
        console.log("stream stop");
    }

    _onReset()
    {
        console.log("stream reset");
    }
}

export default Now;
