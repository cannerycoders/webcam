/* special url config syntax:
*
*   http://localhost:5080/?moving=0&date=101919&#tab0
*
*  url hash selects the current nav page:
*      #tab0, follows the optional configuration
*
**/
import LatestImg from "./ph/latest.js";
import DayView from "./ph/day.js";

export class App
{
    constructor()
    {
        this.mainContent = "#mainlayout";
        this.mainNav = "#mainNavList";
        this.openURL = null;
        this.currentPage = null;

        this.phList = []; // an ordered (left->right) collection of handlers
        this.phList.push(new LatestImg());
        this.phList.push(new DayView());
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
        window.onbeforeunload = this.onBeforeUnload.bind(this);
        this._parseURLSearch(); // override layout and env

        let div = document.getElementById("navtabs");
        let html = "";
        for(let i=0;i<this.phList.length;i++)
        {
            html += "<div class='navtab'>";
            html += this.phList[i].BuildNav();
            html += "</div>";
        }
        div.innerHTML = html;

        var initURL = this.homeHref;
        if(window.location.hash)
        {
            // app.logMsg("using window.location.hash: "+window.location.hash);
            initURL = window.location.hash;
            this.navigate(window.location.hash);
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

    registerPageIdler(h, interval, clientdata)
    {
        if(!this.idleHandlerId)
        {
            this.idleHandlerId = 1;
            this.idleHandlers = {};
        }
        let id = "idleId"+this.idleHandlerId++;
        this.idleHandlers[id] = {
            handler: h,
            interval: interval,
            lastfired: 0,
            clientdata: clientdata
        };

        return id;
    }

    clearPageIdlers()
    {
        this.idleHandlers = {};
        this.idleHandlerId = 1;
    }

    onIdle()
    {
        let now = Date.now();
        if(this.idleHandlers)
        {
            for(let key in this.idleHandlers)
            {
                let h = this.idleHandlers[key];
                if((now - h.interval) > h.lastfired)
                {
                    try
                    {
                        h.handler(h.clientdata);
                    }
                    catch(e)
                    {
                        app.error("idleHandler error:" + e);
                    }
                    h.lastfired = Date.now();
                }
            }
        }
        const fps = 30;
        setTimeout(this.onIdle.bind(this), 1000/fps);
    }

    // navigate: is the primary entrypoint for switch views
    navigate(hash)
    {
        if(hash == "")
            hash = this.homeHref;
        let page = hash.slice(1); // works for empty
        if(this.currentPage !== page)
        {
            this.info("navigate: " + page);
            this.loadPage(page);
        }
        this._parseURLSearch();
    }

    _parseURLSearch()
    {
        if(window.location.search.length <= 0)
            return;

        let url = new URL(window.location);
        for(let pair of url.searchParams.entries())
        {
            app.info("url search: " + pair);
        }
    }

    updateNav()
    {
        $("nav").find(".active").removeClass("active");
        // find the parent of the <a> whose href endswith the current page.
        $("nav a[href$='" + this.currentPage + "']").parent()
                                                    .addClass("active");
    }

    loadPage(page)
    {
        this.debug("loadPage " + page);
        if(this.currentPage && this.phMap[this.currentPage])
            this.phMap[this.currentPage].Cleanup();
        this.clearPageIdlers();
        this.currentPage = page;
        let html = this.phMap[page].BuildPage((html) => {
            document.getElementById("maincontent").innerHTML = html;
        });
        this.updateNav();
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

    // robotlog callbacks ------------------------------------------------
    onLogConnect(cnx)
    {
        this.info("robotLog connected:" + cnx);
    }

    // ajax utils -------------------------------------------------------
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
                    // Looking for variable substitions during layout loads?
                    //  see app.interpolate
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

    loadImage(url)
    {
        return new Promise(resolve => {
            let i = new Image();
            i.onload = () => {
                resolve(i);
            };
            i.src = url;
        });
    }

    downloadURI(uri, name)
    {
        var link = document.createElement("a");
        link.target = "_blank";
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
} // end of App class

window.app = new App();
