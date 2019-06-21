const Gpio = require("pigpio").Gpio;

class Servo
{
    constructor(name, pin, pw, pwRange, pwIncr=100)
    {
        this.name = name;
        this.pin = pin;
        this.motor = new Gpio(this.pin, {mode: Gpio.OUTPUT});
        this.pw = pw;
        this.pwRange = pwRange;
        this.pwIncr = pwIncr;
        this.dir = 1;
    }

    nextPosition()
    {
        if(this.pw >= this.pwRange[1] ||
            this.pw <= this.pwRange[0])
        {
            this.dir *= -1;
        }
        this.pw += this.dir * this.pwIncr;
        this.motor.servoWrite(this.pw);
    }

    toString()
    {
        return `${this.name}: ${this.pw} `;
    }
}

let motors = {
    "pan": new Servo("pan", 13, 1400, [800, 2200], 20),
    "tilt": new Servo("tilt", 5, 1800, [1000, 2200], 20),
};
    
let printInterval = 20;
let frame = 0;
setInterval(() => {
    for(let key in motors)
    {
        motors[key].nextPosition();
    }

    if(++frame % printInterval == 0)
    {
        let str = "";
        for(let key in motors)
            str += ("        " + motors[key].toString()).slice(-12);
        console.log(str);
    }
}, 50);

