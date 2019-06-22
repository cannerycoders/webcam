/* global app */
import {PageHandler} from "./ph.js";

class Moments extends PageHandler
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
        return "moments";
    }

    GetLabel()
    {
        return "Moments";
    }

    BuildPage(contentdiv, navextra, daystr, searchParams)
    {  
        app.setDateVisibility(true);
        this.modalDiv.style.display = "none";

        // getday returns list of files
        app.sendGetRequest(`/api/getday?day=${daystr}`, (ret) => {
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
            navextra.innerHTML = "";
            document.querySelectorAll(".clk").forEach((i) =>
            {
                i.onclick = this.onClick.bind(this, i);
            });
        });
    }

    onClick(i)
    {
        let imgurl = i.src.replace(/.thumb/, "");
        let imgi = imgurl.lastIndexOf("/") + 1; // 0 if fail, which is good
        let imgcaption = imgurl.slice(imgi)
                            .split(".")[0]
                            .replace(/_/, ":");
        this.modalDiv.style.display = "block";
        this.modalContainer.innerHTML = 
                    `<img class='modal-content' src='${imgurl}' />`;
        this.caption.innerHTML = imgcaption;
    }

}

export default Moments;
