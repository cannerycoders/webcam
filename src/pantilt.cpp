#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <string.h>

#include <pigpiod_if2.h>

/*
g++ -Wall -pthread -o pantilt pantilt.cpp -lpigpiod_if2 -lrt

This software requires the pigpio daemon to be running.
pantilt targetPan targetTilt

*/

#define k_MinPulseWidth 1000
#define k_MaxPulseWidth 2000

#define k_PanGpio 13
#define k_TiltGpio 5

class Servo
{
private:
    int ctx;
    char const *nm;
    int pin;
    int pwRange[2];
    int pwDelta;
    int pwInitial;
    int pwCurrent;
    int pwTarget;

    int toPct(int val)
    {
        return int(100 * (val - this->pwRange[0]) / 
                         (this->pwRange[1] - this->pwRange[0]));
    }

    int fromPct(int val)
    {
        return this->pwRange[0] +
               int(val/100. * (this->pwRange[1] - this->pwRange[0]));
    }

public:
    Servo(int ctx, char const *nm, int pin, int minPW, int maxPW)
    {
        this->ctx = ctx;
        this->nm = nm;
        this->pin = pin;
        this->pwRange[0] = minPW;
        this->pwRange[1] = maxPW;
        this->pwInitial = 0;
        this->pwCurrent = 0;
        this->pwTarget = 0;
        this->pwDelta = 10;
    }

    void PrintSummary()
    {
        printf("%s %d -> %d (%d -> %d)\n", this->nm, 
            this->toPct(this->pwInitial), 
            this->toPct(this->pwTarget),
            this->pwInitial, this->pwTarget
            );
    }

    void SetTarget(int pct)
    {
        this->pwInitial = get_servo_pulsewidth(this->ctx, this->pin);
        this->pwCurrent = this->pwInitial;
        if(pct == -1)
            this->pwTarget = this->pwCurrent;
        else
            this->pwTarget = this->fromPct(pct);
    }

    void Move()
    {
        if(this->pwCurrent < this->pwTarget)
        {
            this->pwCurrent += this->pwDelta;
            if(this->pwCurrent > this->pwTarget)
                this->pwCurrent = this->pwTarget;
        }
        else
        if(this->pwCurrent > this->pwTarget)
        {
            this->pwCurrent -= this->pwDelta;
            if(this->pwCurrent < this->pwTarget)
                this->pwCurrent = this->pwTarget;
        }

        if(this->pwCurrent < this->pwRange[0])
            this->pwCurrent = this->pwRange[0];
        else
        if(this->pwCurrent > this->pwRange[1])
            this->pwCurrent = this->pwRange[1];

        set_servo_pulsewidth(this->ctx, this->pin, this->pwCurrent);
    }

    bool Done()
    {
        return (this->pwCurrent == this->pwTarget);
    }

};

static bool s_run = true;

static void stop(int signum)
{
   s_run = false;
}

typedef void (*signalFunc_t) (int signum);

static void 
setSignalHandler(int signum, signalFunc_t sigHandler)
{
   struct sigaction act;
   memset(&act, 0, sizeof(act));
   act.sa_handler = sigHandler;
   sigaction(signum, &act, NULL);
}

static void
usage(char const*nm)
{
    printf("%s panPct tiltPct\n (0, 100), -1 means no change\n", nm);
}

int 
main(int argc, char *argv[])
{
    if(argc != 3) 
    {
        usage(argv[0]);
        exit(1);
    }
    int panTarget = atoi(argv[1]);
    int tiltTarget = atoi(argv[2]);
    if(panTarget > 100 || tiltTarget > 100 ||
       panTarget < -10 || tiltTarget < -10)
    {
        usage(argv[0]);
        exit(-1);
    }

    int ctx = pigpio_start(NULL, NULL);
    if (ctx < 0) return -1;

    Servo pan(ctx, "pan", k_PanGpio, k_MinPulseWidth, k_MaxPulseWidth);
    Servo tilt(ctx, "tilt", k_TiltGpio, k_MinPulseWidth, k_MaxPulseWidth);
    setSignalHandler(SIGINT, stop);
    pan.SetTarget(panTarget);
    tilt.SetTarget(tiltTarget);
    pan.PrintSummary();
    tilt.PrintSummary();
    while(s_run && (!pan.Done() || !tilt.Done()))
    {
        pan.Move();
        tilt.Move();
        time_sleep(0.1);
    }
    // printf("\ntidying up\n");
    pigpio_stop(ctx);
    return 0;
}

