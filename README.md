# webcam

Capture picam image every 5 minutes.  Cleanup "redundant images".
Organize captures by date.  Present them as mjpg or jpg via a web 
interface.

## intro


## cleanup redundant images

* currently we use a raspi3 build of 
[perceptualdiff](https://github.com/myint/perceptualdiff).

this requires that you install libfreeimage-dev

```sh
sudo apt-get install libfreeimage-dev
```

## convert jpg to mp4

* need to install ffmpeg for timelapse support
    `sudo apt-get install ffmpeg`

(tried to use the opencv video capability, didn't work with frc image).

## control camera servo

* install pigpio and node binding, pigpio

```sh
% sudo apt-get install pigpio
% npm install pigpio
```

read [docs](http://abyz.me.uk/rpi/pigpio/) for api details 

## thumbdir config issues

* need to statically mount a larger disk drive.  We currently
  employ a exfat usb stick. Auto-mounting instructions :

  ```sh
  % sudo apt-get install exfat-fuse
  % sudo apt-get install exfat-utils
  % sudo blkid (to obtain the UUID)
  % sudo mkdir /mnt/thumb1
  % sudo vi /etc/fstab (might want to back it up first)
    > UUID=64A5-F009 /mnt/thumb1 exfat defaults,nofail 0 0
  ```

    [ugly colors](https://unix.stackexchange.com/questions/241726/fix-ls-colors-for-directories-with-777-permission).

```sh
%  dircolors -p > ~/.dircolors
STICKY_OTHER_WRITABLE 40;31;01 
OTHER_WRITABLE 40;31;01
% eval $(dircolors ~/.dircolors0
```

## servo control for camera positioning

* we use pigpio library since it's "more real time" which is important for pwm.
    * downside is that it must run as root, but it does support a daemon mode
    * daemon listen on port 8888 for commands
    * daemon installation:
        ```sh
        sudo systemctl enable|disable pigpiod
        sudo systemctl start|stop pigpiod
        ```
        * parameter/ctl file is here: /lib/systemd/system/pigpiod.service
* pinouts [here](https://elinux.org/RPi_Low-level_peripherals)

