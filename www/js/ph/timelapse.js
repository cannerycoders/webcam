/* global app */
import {PageHandler} from "./ph.js";

class Timelapse extends PageHandler
{
    constructor()
    {
        super();
        this.modalDiv = document.getElementById("modalDiv");
        this.caption = document.getElementById("modalCaption");
        this.modalContainer = document.getElementById("modalContainer");
        this.modalClose = document.getElementById("modalClose");
        this.modalClose.onclick = function()
        {
            this.modalDiv.style.display = "none";
        }.bind(this);
    }

    GetId()
    {
        return "timelapse";
    }

    GetLabel()
    {
        return "Timelapse";
    }

    BuildPage(contentdiv, navextra, daystr, searchParams)
    {  
        app.setDateVisibility(false);
        this.modalDiv.style.display = "none";

        // timelapse results in file list of two forms:
        //  2019_06_12.jpg
        //  2019_06_12.mp4
        app.sendGetRequest(`/api/gettimelapse`, (ret) => {
            let dir = ret.dir;
            let files = ret.files;
            let html = "";
            for(let i=0;i<files.length;i++)
            {
                let f = files[i];
                if(f.indexOf(".jpg") == -1) continue;
                let fp = `${dir}/${f}`;
                html += "<div>";
                html += `<img class='thumbnail hoverable clk' src='${fp}'/>`;
                html += "<div class='caption'>" +
                            `${f.split(".")[0].replace(/_/g, "/")}`+
                        "</div>";
                html += "</div>";
            }
            contentdiv.innerHTML = html;

            document.querySelectorAll(".clk").forEach((i) =>
            {
                i.onclick = this.onClick.bind(this, i);
            });
        });
    }

    onClick(i)
    {
        let vidurl = i.src.replace(/.jpg/, ".mp4");
        let j = vidurl.lastIndexOf("/") + 1; // 0 if fail, which is good
        let filenm = vidurl.slice(j); // XXX: fixup day in year
        //  2019_06_12.jpg
        let fields = filenm.split(".")[0].split("_");
        let date = new Date(fields.join("/"))
        let caption = date.toDateString();
        this.modalContainer.innerHTML = 
            `<video class='modal-content' controls>` + 
                `<source src='${vidurl}' type='video/mp4'>` +
            "</video>";
        this.caption.innerHTML = caption;
        this.modalDiv.style.display = "block";
    }

}

export default Timelapse;
