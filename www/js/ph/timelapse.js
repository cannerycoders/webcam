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

        app.sendGetRequest(`/api/gettimelapse`, (ret) => {
            let dir = ret.dir;
            let files = ret.files;
            let html = "";
            for(let i=0;i<files.length;i++)
            {
                let f = files[i];
                if(f.indexOf(".thumb") != -1) continue;
                let fp = `${dir}/${f}`;
                let fpt = fp + ".thumb";
                html += "<div>";
                html += `<img class='thumbnail hoverable clk' src='${fpt}'/>`;
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
        let vidurl = i.src.replace(/.thumb/, ".mp4");
        let i = vidurl.lastIndexOf("/") + 1; // 0 if fail, which is good
        let caption = vidurl.slice(i); // XXX: fixup day in year
        this.modalDiv.style.display = "block";
        this.modalContainer.innerHTML = 
            `<video class='modal-content' controls>` + 
                `<source src='${vidurl}' type='video/mp4'>` +
            "</video>";
        this.caption.innerHTML = caption;
    }

}

export default Timelapse;
