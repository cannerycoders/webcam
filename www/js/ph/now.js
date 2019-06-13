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
    }
}

export default Now;
