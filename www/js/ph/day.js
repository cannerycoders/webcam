/* global app */
import {PageHandler} from "./ph.js";

class DayView extends PageHandler
{
    constructor()
    {
        super();
    }

    GetId()
    {
        return "dayview";
    }

    GetLabel()
    {
        return "Day View";
    }

    BuildPage(cb)  // expect list of files
    {
        app.sendGetRequest("/api/gettoday", (ret) => {
            let dir = ret.dir;
            let files = ret.files;
            let html = "";
            for(let i=0;i<files.length;i++)
            {
                let f = files[i];
                let fp = `${dir}/${f}`;
                html += "<div class='thumbnail'>";
                html += `<a href='${fp}'><img src='${fp}' width='100px'/></a>`;
                html += "</div>";
            }
            return cb(html); 
        });
    }
}

export default DayView;
