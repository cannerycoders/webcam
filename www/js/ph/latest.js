import {PageHandler} from "./ph.js";

class Latest extends PageHandler
{
    constructor()
    {
        super();
    }

    GetId()
    {
        return "latest";
    }

    GetLabel()
    {
        return "Latest";
    }

    BuildPage(cb) 
    {
        return cb(""); 
    }

}

export default Latest;

