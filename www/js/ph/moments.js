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
        this.modalLeft = document.getElementById("modalLeft");
        this.modalRight = document.getElementById("modalRight");
        this.modalClose = document.getElementById("modalClose");
        this.modalClose.onclick  = () =>
        {
            this.modalDiv.style.display = "none";
        }
        this.modalLeft.onclick = this.onNext.bind(this, "left");
        this.modalRight.onclick = this.onNext.bind(this, "right");
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
            this.dir = ret.dir;
            this.files = ret.files.filter(fn=>fn.indexOf(".thumb") == -1); 
            let html = "";
            for(let i=0;i<this.files.length;i++)
            {
                let f = this.files[i];
                let fp = `${this.dir}/${f}`;
                let fpt = fp + ".thumb";
                html += "<div>";
                html += `<img class='thumbnail hoverable clk' id='img${i}' src='${fpt}'/>`;
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
        let id = Number(i.id.slice(3));
        this.loadModalImg(imgurl, id);
    }

    onNext(dir)
    {
        if(this.currentId != undefined)
        {
            let id;
            if(dir == "left")
                id = this.currentId - 1;
            else
                id = this.currentId + 1;
            if(id >= 0 && id < this.files.length)
            {
                let fp = `${this.dir}/${this.files[id]}`;
                this.loadModalImg(fp, id);
            }
        }
    }

    loadModalImg(imgurl, id)
    {
        let imgi = imgurl.lastIndexOf("/") + 1; // 0 if fail, which is good
        let imgcaption = imgurl.slice(imgi)
                            .split(".")[0]
                            .replace(/_/, ":");
        this.modalDiv.style.display = "block";
        this.modalContainer.innerHTML = 
                    `<img class='modal-content' src='${imgurl}' />`;
        this.caption.innerHTML = imgcaption;
        this.currentId = id; 
    }

}

export default Moments;
