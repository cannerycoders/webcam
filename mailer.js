// https://bit.ly/2F6wHaj
const nodeMailer = require("nodemailer");

const ExampleConfig =
{
    "transport": {
        "service": "gmail",
        "auth": {
            "user": "yoursendingaccount@gmail.com",
            "pass": "yoursendingpassword"
        }
    },
    "message": {
        "from": "'Your Sender' <yoursendingaccount@gmail.com>",
        "to": "yourmailreceiver@gmail.com",
        "subject": "message from webcam bot",
        "text": "here's some body text"
    }
};

class Mailer
{
    constructor(mailconfig=null)
    {
        if(!mailconfig) mailconfig = ExampleConfig;
        this.transporter = nodeMailer.createTransport(mailconfig.transport);
        this.htmlTemplate = 
          "<html><head><title><h3>${title}</h3></title></head><body>" +
              "<table><tr><td><pre>${msg}</pre></td></tr></table>"+
          "</body></html>";
        this.mailOptions = mailconfig.messageOptions; 
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
                    console.warn(JSON.stringify(error, null, 2));
                else 
                    console.info("mail sent to " + info.accepted);
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
