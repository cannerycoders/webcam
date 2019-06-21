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

#define MIN_WIDTH 1000
#define MAX_WIDTH 2000

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

    void SetTarget(int t)
    {
        this->pwInitial = get_servo_pulsewidth(this->ctx, this->pin);
        this->pwCurrent = this->pwInitial;
        this->pwTarget = t;
        if(this->pwTarget == 0)
            this->pwTarget = this->pwCurrent;
        printf("%s starting at: %d\n", this->nm, this->pwInitial);
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

static bool run = true;

static void stop(int signum)
{
   run = false;
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
    printf("%s: panTarget tiltTarget\n  0 means no change\n", nm);
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
    if(panTarget < 0 || tiltTarget < 0)
    {
        usage(argv[0]);
        exit(-1);
    }

    int ctx = pigpio_start(NULL, NULL);
    if (ctx < 0) return -1;

    Servo pan(ctx, "pan", 13, 800, 2200);
    Servo tilt(ctx, "tilt", 5, 1000, 2200);
    setSignalHandler(SIGINT, stop);
    pan.SetTarget(panTarget);
    tilt.SetTarget(tiltTarget);
    printf("%s moving servos to %d, %d", argv[0], panTarget, tiltTarget);
    printf(", control C to stop.\n");
    while(run && (!pan.Done() || !tilt.Done()))
    {
        pan.Move();
        tilt.Move();
        time_sleep(0.1);
    }

    printf("\ntidying up\n");
    pigpio_stop(ctx);
    return 0;
}

