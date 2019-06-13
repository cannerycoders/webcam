export class PageHandler
{
    constructor() 
    {}

    GetId() { console.assert(false, "override me"); }

    GetLabel()
    {
        return this.GetId();
    } 

    Cleanup() 
    { 
    } 

    GetURL()  // optionally overridden
    { 
        return `#${this.GetId()}`;
    }

    BuildNav() 
    {
        return `<a href='${this.GetURL()}'>${this.GetLabel()}</a>`;
    }

    BuildPage(cb) 
    {
        return cb(""); 
    }

}
