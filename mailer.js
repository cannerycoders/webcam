// https://bit.ly/2F6wHaj
const nodeMailer = require("nodemailer");

class Mailer
{
    constructor()
    {
        this.transporter = nodeMailer.createTransport({
            service: "gmail",
            auth: {
                user: "cannerycoders@gmail.com",
                pass: "G00glePassw0rd"
            }
        });

        this.htmlTemplate = "<html><head><title><h3>${title}</h3></title></head>" +
            "<body><table><tr><td><pre>${msg}</pre></td></tr></table></body></html>";

        this.mailOptions = {
            from:'"Cannery Coders Mailer" <cannerycoders@gmail.com>',
            to: "dana.batali@gmail.com",
            subject: "Notice from CanneryCoders",
            text: "here's your first test mail",
        };
    }

    Send(subject, msg, asHtml=false)
    {
        this.mailOptions.subject = subject;
        this.mailOptions.text = msg;
        if(asHtml)
        {
            this.mailOptions.html = this.interpolate(this.htmlTemplate, 
                {
                    title: subject,
                    msg: msg
                });
        }
        this.transporter.sendMail(this.mailOptions, 
            (error, info) => {
                if (error) 
                    console.log(JSON.stringify(error, null, 2));
                else 
                    console.log(JSON.stringify(info,null, 2));
            }); 
    }

    interpolate(body, map)
    {
        const exp = /\${(\w+)}/g;
        var result = body.replace(exp,
             function(match, capture)
             { 
                 var mm = map[capture]; 
                 if (typeof mm === "undefined") 
                    return match; 
                else 
                    return map[capture]; 
             }); 
        return result; 
    }
}

module.exports = Mailer;
