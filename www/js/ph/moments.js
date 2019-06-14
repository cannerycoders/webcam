/* global app */
import {PageHandler} from "./ph.js";

class Moments extends PageHandler
{
    constructor()
    {
        super();
        this.modalDiv = document.getElementById("imgmodalDiv");
        this.caption = document.getElementById("imgmodalCaption");
        this.modalImg = document.getElementById("imgmodal");
        this.modalClose = document.getElementById("imgmodalClose");
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
        // getday returns list of files
        app.setDateVisibility(true);

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
                html += `<img class='thumbnail hoverable clickable' src='${fpt}'/>`;
                html += "</div>";
            }
            contentdiv.innerHTML = html;

            document.querySelectorAll(".clickable").forEach((i) =>
            {
                i.onclick = this.imgClick.bind(this, i);
            });
        });
    }

    imgClick(i)
    {
        this.modalDiv.style.display = "block";
        this.modalImg.src = i.src.replace(/.thumb/, "");
        this.caption.innerHTML = this.modalImg.src;
    }

}

export default Moments;
