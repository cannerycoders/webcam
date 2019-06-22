/* special url config syntax:
*
*   http://localhost:5080/?date=101919&#day
*
*  url hash selects the current nav page:
*      #day, follows the optional configuration
*
**/
import Moments from "./ph/moments.js";
import Timelapse from "./ph/timelapse.js";
import Now from "./ph/now.js";

export class App
{
    constructor()
    {
        this.mainContent = "#mainlayout";
        this.mainNav = "#mainNavList";
        this.openURL = null;
        this.currentPage = null;
        this.serverInfo = {};

        // phList: an ordered (left->right) collection of handlers
        this.phList = []; 
        this.phList.push(new Moments());
        this.phList.push(new Timelapse());
        this.phList.push(new Now());
        // phMap: locate handler by name
        this.phMap = {};
        for(let i=0;i<this.phList.length;i++)
        {
            let ph = this.phList[i];
            if(i==0)
                this.homeHref = ph.GetURL();
            this.phMap[ph.GetId()] = ph;
        }

        this.varRegExp = /{\s*(\w+)\s*}/g; /* w is alphnum, s is space*/
        this.config = {}; // XXX: load via .json file?
        this.config.debug = false;
        this.config.shownav = true;

        this.debug("app constructed");
        document.addEventListener("DOMContentLoaded",
            this.onReady.bind(this), false);
    }

    alertuser(msg)
    {
        let x = document.getElementById("alert");
        if(x) 
        {
            x.className = "show";
            x.innerHTML = msg;
            setTimeout(function() { 
                x.className = x.className.replace("show", ""); 
            }, 5000);
        }
    }

    logMsg(msg)
    {
        console.log(msg);
    }

    debug(msg)
    {
        if(this.config.debug)
            this.logMsg("DEBUG   " + msg);
    }

    info(msg)
    {
        this.logMsg("INFO    " + msg);
    }

    notice(msg)
    {
        this.logMsg("NOTICE  " + msg);
    }

    warning(msg)
    {
        this.logMsg("WARNING " + msg);
    }

    error(msg)
    {
        // todo add alert?
        this.logMsg("ERROR " + msg);
    }

    // onReady is invoked after all scripts have finished loading.
    onReady()
    { 
        app.sendGetRequest(`/api/getinfo`, (ret) => {
            if(ret.title)
            {
                document.title = ret.title;
                document.getElementById("navtitle").innerHTML = ret.title;
            }
            this.serverInfo = ret;
        });
        window.onbeforeunload = this.onBeforeUnload.bind(this);

        let div = document.getElementById("navtabs");
        let html = "";
        for(let i=0;i<this.phList.length;i++)
        {
            html += "<div class='navtab'>";
            html += this.phList[i].BuildNav();
            html += "</div>";
        }
        div.innerHTML = html;
        this.dayinput = document.getElementById("datepicker")
        this.picker = new Pikaday({
                                onSelect: this.onDateSelect.bind(this),
                                defaultDate: new Date(),
                                field: this.dayinput,
                                theme: "dark-theme",
                                toString: this.formatDate.bind(this)
                            });
        var initURL = this.homeHref;
        if(window.location.hash)
        {
            // app.logMsg("using window.location.hash: "+window.location.hash);
            initURL = window.location.hash;
        }
        this.navigate(initURL);

        // do this after first navigate
        window.onhashchange = function(arg) {
            this.navigate(window.location.hash);
        }.bind(this);

        this.onIdle();
    }

    onBeforeUnload(evt)
    {
        app.info("before unload");
        if(this.currentPage && this.phMap[this.currentPage])
            this.phMap[this.currentPage].Cleanup();
        if(false) // return code can pop an alert
        {
            if (evt == undefined) 
                evt = window.event;
            if (evt)
                evt.returnValue = "before unloading...";
            return "before unloading(2)...";
        }
    }

    onIdle()
    {
        const fps = 30;
        let now = new Date();
        this.phMap[this.currentPage].OnIdle(now);
        setTimeout(this.onIdle.bind(this), 1000/fps);
    }

    parseURL(urlstr, init=false)
    {
        let search = window.location.search.split("=");
        let dayindex = search.indexOf("?day");
        let day;
        if(dayindex == -1)
            day = new Date();
        else
        {
            let v = search[dayindex+1];
            let dstr = v.match(/..?/g).join("/");
            day = new Date(dstr);
        }
        this.daystr = this.formatDate(day, "URL");
    }

    // navigate: is the primary entrypoint for switch views
    navigate(hash)
    {
        if(hash == "")
            hash = this.homeHref;
        let page = hash.slice(1); // works for empty
		this.updateDate();
        if(this.currentPage !== page)
        {
            this.info("navigate: " + page);
            this.loadPage(page);
        }
    }

    updateNav()
    {
        $("nav").find(".active").removeClass("active");
        // find the parent of the <a> whose href ends with the 
        // current page.
        $("nav a[href$='" + this.currentPage + "']").parent()
                                                    .addClass("active");
    }

    loadPage(page)
    {
        this.debug("loadPage " + page);
        if(this.currentPage && this.phMap[this.currentPage])
            this.phMap[this.currentPage].Cleanup();
        this.currentPage = page;
        this.refreshPage();
        this.updateNav();
    }

    refreshPage()
    {
        let page = this.currentPage;
        this.debug("refreshPage " + page);
        let url = new URL(window.location);
        let maincontent = document.getElementById("maincontent");
        let navextra = document.getElementById("navextra");
        this.phMap[page].BuildPage(maincontent, navextra, this.daystr, 
                                  url.searchParams);
    }

    interpolate(body, map)
    {
        var result = body.replace(this.varRegExp,
            function(match, capture) {
                var mm = map[capture];
                if (typeof mm === "undefined") {
                    return match;
                }
                else
                {
                    return map[capture];
                }
            });
        return result;
    }

    /* date -----------------------------------------------------*/
    setDateVisibility(b)
    {
        let el = document.getElementById("navdate");
        // el.style.visibility = b ? "visible" : "hidden";
        el.style.display = b ? "block" : "none";
    }

	updateDate(date)
	{
        if(!date)
            date = new Date();
		this.picker.setDate(date, true/*prevent onSelect*/);
		this.dayinput.value = this.formatDate(date);
        this.daystr = this.formatDate(date, "URL");
	}

    onDateSelect(date)
    {
        let str = this.formatDate(date, "URL");
        console.info("change date to " + str);
		// this.dayinput.value = this.formatDate(date);
        this.daystr = str;;
        this.refreshPage();
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


    // ajax utils ----------------------------------------------------
    sendGetRequest(url, responseHandler, isJSON=true)
    {
        var req = new XMLHttpRequest();
        // XXX: use 'onload'
        req.onreadystatechange = function() {
            this.handleResponse(req, responseHandler, isJSON);
        }.bind(this);
        req.open("GET", url, true);
        req.send(null);
    }

    handleResponse(request, responseHandler, isJSON)
    {
        if((request.readyState == 4) && (request.status == 200))
        {
            if(isJSON)
            {
                try
                {
                    let val = JSON.parse(request.responseText);
                    // Looking for variable substitions during layout 
                    // loads? see app.interpolate
                    responseHandler(val);
                }
                catch(e)
                {
                   this.error("http response json error: " + e);
                }
            }
            else
            {
                responseHandler(request.responseText);
            }
        }
    }
} // end of App class

window.app = new App();
