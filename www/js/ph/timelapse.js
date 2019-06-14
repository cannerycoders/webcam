/* global app */
import {PageHandler} from "./ph.js";

class Timelapse extends PageHandler
{
    constructor()
    {
        super();
    }

    GetId()
    {
        return "timelapse";
    }

    GetLabel()
    {
        return "Timelapse";
    }

    BuildPage(page, extra) 
    {
        app.setDateVisibility(true);
        page.innerHTML = "";
        extra.innerHTML = "";
    }
}

export default Timelapse;

