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
        page.innerHTML = "";
        extra.innerHTML = "";
    }
}

export default Timelapse;

