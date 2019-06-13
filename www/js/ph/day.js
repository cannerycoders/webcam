/* global app */
import {PageHandler} from "./ph.js";

class Day extends PageHandler
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
        return "day";
    }

    GetLabel()
    {
        return "Day";
    }

    BuildPage(page, navextra, searchParams)
    {  
        // gettoday returns list of files
        let day;
        if(searchParams && searchParams.has("day"))
        {
            let v = searchParams.get("day");
            // assume day is MMDDYY
            let str = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4,6)}`;
            day = new Date(str);
        }
        else
            day = new Date();
        let daystr = this.formatDate(day, "URL");
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
                html += "<div class='thumbnail'>";
                html += `<img class='hoverable clickable' src='${fpt}'/>`;
                html += "</div>";
            }
            page.innerHTML = html;
            navextra.innerHTML = "<input type='text' id='datepicker'>";
            
            document.querySelectorAll(".clickable").forEach((i) =>
            {
                i.onclick = this.imgClick.bind(this, i);
            });

            this.dayinput = document.getElementById("datepicker");
            this.picker = new Pikaday({
                                onSelect: this.changeDate.bind(this),
                                defaultDate: day,
                                field: this.dayinput,
                                theme: "dark-theme",
                                toString: this.formatDate.bind(this)
                            });
            this.picker.setDate(day);
            this.dayinput.value = this.formatDate(day);
        });
    }

    imgClick(i)
    {
        console.log("clicked: " + i);
        this.modalDiv.style.display = "block";
        this.modalImg.src = i.src.replace(/.thumb/, "");
        this.caption.innerHTML = this.modalImg.src;
    }

    changeDate(date)
    {
        let str = this.formatDate(date, "URL");
        console.info("change date to " + str);
        app.navigateURL(`?day=${str}#day`);
    }

    formatDate(date, format="DD/MM/YY") 
    {
        // format is currently a kludge
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        if(format == "URL")
        {
            let MM = ("00" + month).slice(-2);
            let DD = ("00" + day).slice(-2);
            let YY = ("" + year).slice(-2);
            return `${MM}${DD}${YY}`;
        }
        else
        {
            return ` ${month} / ${day} / ${year}`;
        }
    }
}

export default Day;
