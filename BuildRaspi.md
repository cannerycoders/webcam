# Building a Raspberry PI for FRC - using FRCVision-rPi

<!-- TOC depthFrom:2 orderedList:false -->

- [Introduction](#introduction)
- [Theory of Operation](#theory-of-operation)
- [Prepare for Deployment](#prepare-for-deployment)
    - [official pre-built pi image](#official-pre-built-pi-image)
    - [read-only-raspberry-pi](#read-only-raspberry-pi)
    - [disable wireless (wifi and bluetooth)](#disable-wireless-wifi-and-bluetooth)
    - [duplicate working microSD card](#duplicate-working-microsd-card)
- [Config Details](#config-details)
    - [make sure you have a raspi 3 with picam](#make-sure-you-have-a-raspi-3-with-picam)
    - [build microSD card (minimum 8GB)](#build-microsd-card-minimum-8gb)
    - [on first boot](#on-first-boot)
    - [rename/renumber your raspi](#renamerenumber-your-raspi)
    - [install python extensions](#install-python-extensions)
    - [install node 10.x and extensions](#install-node-10x-and-extensions)
    - [validate camera](#validate-camera)
    - [verify opencv/python and picamera](#verify-opencvpython-and-picamera)
    - [install webcam support](#install-webcam-support)
        - [install webcam](#install-webcam)
    - [misc](#misc)
        - [mount usb thumbdrive](#mount-usb-thumbdrive)
        - [FRCVision-rPi services](#frcvision-rpi-services)
- [Troubleshooting](#troubleshooting)
    - [no camera functionality](#no-camera-functionality)
    - [frcvision webpage doesn't appear at http://frcvision.local](#frcvision-webpage-doesnt-appear-at-httpfrcvisionlocal)

<!-- /TOC -->

## Introduction

The Raspberry Pi (raspi) is an inexpensive and entirely adequate processor
capable of both video capture and processing.  Outfitting a raspi to
integrate well with FRC network tables and competition requirements is
a non-trivial system-administration task and so the FRC folks have
kindly provided the community with a canned
[raspi disk image](https://github.com/wpilibsuite/FRCVision-pi-gen/releases)
that can be installed onto a raspi and get you running in under 20 minutes.

Among the built-in conveneniences offered by the FRCVision-rPi image:

* WPI libraries for network tables and FRC interop utilities.
* The opencv image processing library with bridges to java, c++ and python.
* A disk partitioning scheme that can be configured for read-only or
  read-write access.  During competition, the read-only mode reduces the
  chance that the disk will be corrupted by during robot start & stop.
* An easy-admin webapi that allows you to:
    * configure IP addressing (DHCP vs static IP)
    * configure team number
    * establish which camera script runs on the robot
    * configure camera ports and binding
    * toggle between read-write and read-only mode
    * to monitor the state of the raspi (cpu, network traffic, etc).
* A service architecture that ensures that your camera/vision server
  program is always running.
* Clutter-reduction:  elimination of a variety of utilities on the default
  raspi image that consume precious space or cycles including:
    * wolfram mathematica
    * x windows and associated desktop tools
* WIFI disabling: disallowed during FRC competition and disabled in
  FRCVision-rPi (this is an inconvenience at first).

## Theory of Operation

Basic idea:  use the web FRCVision [dashboard](http://frcvision.local) to
control and monitor your raspi. If you change your raspi's name, this link
won't work, but you can either enter the new hostname or its static ip
address like [this](http://10.49.15.11).

If you need to configure/reset any persistent value, you must make the raspi
Read-Write.  After configuration is complete, make sure it's in Read-Only mode.
A reboot with cause filesystem to be reset to read-only mode.

Establishing a static IP address is one way to ensure that the raspi is
in your LAN's address space. It's also a way for a firewall to reliable
establish port forwarding.  The standard name, `frcvision.local`,
will __not__ work reliably when multiple raspis are on the same network.
You can also change the hostname of your raspi. Now, a static IP would
still be of potential use, but not absolutely necessary to disambiguate
multiple raspis.

You can upload your custom python "cameraService" via the web interface
via the Application tab.  This will persist across reboot and is the
preferred/suggested way of managing custom vision code.   The script,
`~/runCamera`, is used to launch your program. Each time you upload a
new vision script, `runCamera`  is automatically updated to point to
your new script.  Your script is uploaded to the file `~/uploaded.py` and
here's what runCamera looks like to make it happen:

``` bash
#!/bin/sh
### TYPE: upload-python
echo "Waiting 5 seconds..."
sleep 5
export PYTHONUNBUFFERED=1
exec ./uploaded.py

```

This form of `runCamera` requires that your python script be written to include
the [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)) to python3. In
other words, the first line of your script must be:

``` bash
#!/usr/bin/env python3
```

Here's a shell script (`startWebcam.sh`) to load a standard git-based
Vision solution:

``` bash
#!/bin/bash
echo "Waiting 5 seconds..."
sleep 5
cd /home/pi/cannerycoders/webcam
exec ./runWebcam
```

Note that if you _manually_ copy or create a file on the raspi for this
purpose that it must be _executable_.  You can make a file executable
via: `chmod +x yourfile`.  And verify that it is executable via
`ls -l yourfile`.  Here is a before and after:

```bash
# before
% ls -l yourfile
-rw-r--r-- 1 pi pi 17201 Feb  2 13:37 yourfile
# after
% ls -l yourfile
-rwxrwxr-x 1 pi pi 17201 Feb 2 13:37 yourfile
```

## Prepare for Deployment

### official pre-built pi image

Once we've built-out _our variation_ of a standard raspberry pi (see below),
we can create a disk image that should be used to build out new microsd cards.
In order to minimize the time to duplicate the image, its best to work with
an 8BG sdcard.  Our customizations could be made available in the release
section of our Vision github following
[these instructions](https://stackoverflow.com/questions/47584988/how-to-upload-tar-gz-and-jar-files-as-github-assets-using-python-requests),
however there appears to be a limit on the size of such tarballs and
we have yet to complete this task.  To get around this limitation
FRC has elected to "zip" the image.  Happily, disk-duplication
utilities like Etcher are able to handle .zip-ed images.

Note that any disk image will reflect a specific machine identity
([see here](#duplicate-working-microsd-card)) (ie: its static ip).  After
cloning this disk image, you'll need to boot your new raspi and reconfigure
its static ip.

### read-only-raspberry-pi

* use the FRCVision-rPi dashboard to ensure you're operating in Read-Only mode.
 You can use these commands to toggle between ro and rw:

``` bash
# make it read-only
ro
# make it read-write
rw
# ro is an alias for:
# sudo /bin/mount -o remount,ro / && sudo /bin/mount -o remount,ro /boot
# rw is an alias for:
# sudo /bin/mount -o remount,rw / && sudo /bin/mount -o remount,rw /boot
```

### disable wireless (wifi and bluetooth)

FRCVision-rPi disables both wifi and bluetooth via these contents of
    `/etc/modprobe.d/raspi-blacklist.config`.

```sh
#wifi
blacklist brcmfmac
blacklist brcmutil
#bt
blacklist btbcm
blacklist hci_uart
```

During debugging and provisioning of a raspi, you may find it useful
to enable the wifi.

After commenting out the two wifi entries and rebooting verify that
the wifi is active:

```sh
% ifconfig wlan0
wlan0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        ether b8:27:eb:47:2d:bd  txqueuelen 1000  (Ethernet)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

Check which wifi networks are available:

```sh
% sudo iwlist wlan0 scan | grep ESSID
ESSID:"Tortellini"
ESSID:"WIFI"
ESSID:""
ESSID:"CenturyLink1238"
ESSID:""
ESSID:"xfinitywifi"
```

Add network password  to `/etc/wpa_supplicant/wpa_supplicant.conf`:

```txt
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="CaffeVitta"
    key_mgmt=WPA-PSK
    psk="APassword"
    proto=RSN
    pairwise=CCMP
    auth_alg=OPEN
}
```

To reconfigure wifi network:

```sh
% wpa_cli -i wlan0 reconfigure
% ifconfig wlan0
```

If you have two routes to the internet you may need to look at the routes.

```sh
% ip route
default via 192.168.0.1 dev eth0 src 192.168.0.8 metric 202
default via 192.168.1.1 dev wlan0 src 192.168.1.74 metric 303
192.168.0.0/24 dev eth0 proto kernel scope link src 192.168.0.8 metric 202
192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.74 metric 303
```

Here, 192.168.1 and 192.168.0 are our two networks and each have a default
route.

More information on configuration wifi can be found [here](https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md).

### duplicate working microSD card

* a properly duplicated (up-to-date!) microsd is essential issurance
  for a competition.  Here's a [link](https://thepihut.com/blogs/raspberry-pi-tutorials/17789160-backing-up-and-restoring-your-raspberry-pis-sd-card)
  to a variety of methods to accomplish this task.  The larger your microsd,
  the longer this process will take.  On Linux and MacOS you can use this:

  ```sh
  sudo dd if=/dev/diskN of=~/Desktop/myRaspiImg bs=512;
  # where N is your microSD, you can findit either via:
  #  `mount` or `diskutil list`

  # to monitor its progress, you can periodically send it a signal
  # (either background the dd process or perform this in another shell)
  while true; do sudo killall -INFO dd; sleep 60; done # on linux use -USR1
  ```

NB: if your "working disk" is much larger than your target disk, you can
reduce the time it takes to perform the duplication through the use of
a piclone-like facility, like [this script](https://github.com/raspberrypi-ui/piclone/blob/master/src/backup), coupled with a usb-mounted target microsd card on
your master pi.

  ```bash
  backup /dev/sda1  # one parameter: target disk device /dev/sda[1-N]
  ```

  And to create a duplicate, reverse the process:

  ```sh
  # make sure the /dev/diskN is unmounted either via:
  #     `sudo diskutil unmountDisk /dev/diskN` or `sudo umount /dev/diskN`
  sudo dd if=~/Desktop/myRaspiImg of=/dev/diskN bs=512;
  ```

__Unfortunately__, this particular script wasn't able to successfully duplicate
an FRC vision system, perhaps because the number of mount points and file systems
is unusual.

## Config Details

Following are details on how to buy, provision and operate a raspi based
on the FRCVision-rPi image.  Additional customizations are offered to maximize
utility in the context of Spatronics4915. These are the steps needed to build
a raspi that can be used as a base-image. If you already have a base-image available,
use it skip these steps. In that case, remember to set the static IP and drive
script appropriate for the raspi's role on the robot.

### make sure you have a raspi 3 with picam

You can buy raspis and raspi cameras at a number of sites, here are
a few examples:

* [pi3](https://www.amazon.com/gp/product/B01CD5VC92)
* [camera](https://www.amazon.com/gp/product/B00FGKYHXA)
* [night-vision camera](https://www.amazon.com/dp/B06XYDCN5N)

### build microSD card (minimum 8GB)

* follow instructions [here](https://wpilib.screenstepslive.com/s/currentCS/m/85074/l/1027241-using-the-raspberry-pi-for-frc)

### on first boot

* verify that the built-in webserver is operational by pointing
  your browser to http://frcvision.local. Note that you must be
  on the same network for this to work.  Typically its best to
  plug your laptop and the pi into the same network access point
  (wifi hub/bridge). Note also that you may have problems with
  this if you have more than one raspi on the same network.
* notice the Read-Only | Writable selector at the top of the page.  If
  you need to make any changes, the disk must be writable.
* ssh into frcvision.local (user is 'pi', password is 'raspberry')
    * `sudo raspi-config`  (use Tab, Esc and Arrow keys to navigate)
        * `Localisation Options`
            * set keyboard locale (US-UTF8...)
            * time-zone (America/Los Angeles)
            * enable camera (interfaces))
        * `Interfacing Options`
            * Enable connection to Raspberry Pi Camera
        * `Advanced`
            * Consider raising GPU memory to 256MB
* update and cleanup (recover diskspace)

    ```sh
    sudo apt-get update
    sudo apt-get upgrade
    sudo apt-get install python3-pip git vim tree lsof
    sudo apt-get install ffmpeg libfreeimage-dev pigpio
    sudo apt-get install exfat-fuse exfat-utils
    sudo apt-get clean
    sudo apt-get autoremove
    ```

* change the default pi password

### rename/renumber your raspi

You can establish DHCP addressing with a static IP fallback via the
[frcvision dashboard](http://frcvision.local).

To change your raspi name, you must log-in manually.  Note that using
the raspi-config tool is __insufficient__ for this task due to frc
conventions. Also note that this step may not be needed since we
generally prefer to rely on ip addresses (since we have multiple
raspis to manage).

```sh
# renaming your raspi may not be necessary
# first the usual step
sudo hostnamectl set-hostname webcamfront

# next, the frc fixup:
# sudo edit /etc/hosts with nano or vi to look like this:

27.0.0.1       localhost
::1            localhost ip6-localhost ip6-loopback
ff02::1        ip6-allnodes
ff02::2        ip6-allrouters

127.0.1.1      webcamfront

# after editing this file, reboot the machine and potentially the router
```

### install python extensions

``` bash
sudo python3 -m pip install picamera
```

### install node 10.x and extensions

```bash
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -1
sudo apt-get install -y nodejs
sudo npm install -g node-stun # for diagnosing p2p networking
```

### validate camera

* `vcgencmd get_camera` should report this:

    ```sh
    supported=1 detected=1
    ```

* `raspistill -v -o test.jpg`. This will only work if you remove the picamera
  from the Connected Camera list on the Vision Settings tab. See
  [troubleshooting](#troubleshooting) if you have problems.
* (deprecated) to use picam as opencv videostream (ie: without picamera module):
 `sudo modprobe bcm2835-v4l2`

### verify opencv/python and picamera

``` python
% python3
>>> import cv2
>>> import picamera
```

### install webcam support

The sub-$25 pi camera can operate at up to 90 fps and includes a
native H264 encoder.  This is far superior to most current usb2 webcams
and offers a number of controls not usually present in a webcam.
A raspi has two CSI connection points, but can apparently support
only a single picam connected at the point nearest the HDMI.

H264 is a very efficient video solution on raspberry pi due to
its GPU-based implementation.  The hard part is delivering
the resulting video stream to a web browser for integration with our
Dashboard.  We have explored three technologies for this and currently
suggest that `h264player is the preferred solution`.

* `h264player` uses tcp-based websockets to deliver the
    raspivid stream to a browser. No fancy STUN negotiations
    take place, but to make the pixels visible in the browser
    we employ a javascript h264 decoder. Once the pixels
    are decoded, we rely on an opengl YUV canvas for their display.
    The more modern html5 video element and media streams aren't employed
    by this approach and so its major downside is that it consumes extra
    load on the driver station.

#### install webcam

Support for h264player is checked in to this repository.
To install the support, you simply pull the repository to your raspi
and wire it into the FRCVision application like so:

```bash
% mkdir ~/cannerycoders
% cd cannerycoders
% git clone https://github.com/cannerycoders/webcam
% cd webcam
% npm install
```

Next modify ~/runCamera

```bash
#!/bin/sh
echo "Waiting 5 seconds..."
sleep 5
exec /home/pi/cannerycoders/webcam/runWebcam
```

### misc

#### mount usb thumbdrive

* for FAT32 and exfat thumbdrives, the desktop environment can be used to
  mount and eject.  In this case, the contents are found under
  `/media/pi`. Via CLI: `sudo mount /dev/sda1 /mnt/thumbX -o umask=000`. You
  might need to `sudo mkdir /mnt/thumbX`.  It's possible that support for
  "exfat" (large-file FAT) isn't present on the system. Install via:
  `sudo apt-get install exfat-fuse exfat-utils`.   If you need to format
  your thumbdrive, use `lsblk` to determine the block device, then use
  `mkfs.exfat /dev/sda1` (sda1 is this example's block device id).
  Finally, remember that portable FAT doessn't have user permissions
  (or any security for that matter). Get used to all files being owned
  by root, etc. Because the default permissions are rather permissive
  you might get unreadable dir-colors. To address this:

  ```sh
    %  dircolors -p > ~/.dircolors
    # edit this values in ~/.dircolors
    STICKY_OTHER_WRITABLE 40;31;01
    OTHER_WRITABLE 40;31;01
    % eval $(dircolors ~/.dircolors)
  ```

* to permanently mount a thumbdrive, it's best to employ the drive's
  UUID.

  ```sh
  % sudo blkid (to obtain the UUID)
  % sudo mkdir /mnt/thumb1
  % sudo vi /etc/fstab (might want to back it up first)
    > UUID=64A5-F009 /mnt/thumb1 exfat defaults,nofail 0 0
  ```

* if you have an ext4 thumbdrive, you may need to manually mount it:
   `sudo mount /dev/sda1 /mnt/thumbX`. (you might need to mkdir)
   If you don't know the device id: `lsblk`.
* remember to eject/umount the thumbdrive!

#### FRCVision-rPi services

`pi@frcvision(rw):~$ pstree`

``` text
systemd─┬─agetty
        ├─avahi-daemon───avahi-daemon
        ├─cron
        ├─dbus-daemon
        ├─dhcpcd
        ├─ntpd───{ntpd}
        ├─sshd─┬─sshd───sshd───bash
        │      └─sshd───sshd───bash───pstree
        ├─svscanboot─┬─readproctitle
        │            └─svscan─┬─supervise───multiCameraServ───3*[{multiCameraServ}]
        │                     ├─supervise───netconsoleTee
        │                     └─supervise───configServer───5*[{configServer}]
        ├─syslogd
        ├─systemd───(sd-pam)
        ├─systemd-journal
        ├─systemd-logind
        ├─systemd-udevd
        └─thd
```

Here's a subset of above with a custom python script (multiCameraServer
replaced by python3).


``` text
        ├─svscanboot─┬─readproctitle
        │            └─svscan─┬─supervise───python3
        │                     ├─supervise───netconsoleTee
        │                     └─supervise───configServer───5*[{configServer}]

```

The svscanboot process subtree is all about keeping your camera server process
running.  The default cameraServer detects the installed cameras and writes
a files to `/boot/frc.json`.  This file can be configured from the FRCVision
dashboard under `Vision Settings`. If you don't want the built-in
discoverable cameras (USB or raspicam) from being locked, you can remove
them from the list of enabled cameras.  You can also configure settings
like capture resolution, brightness and auto-exposure via this interface.
The results of your configuration activities trigger updates to /boot/frc.json
but you can also manually edit this file (using vi, of course).

Here's a list of services listing on the ports. The FRCVision dashboard
is listening on the standard http port.  Port 1740 is the network tables
service.  22 is ssh and 1181 is the mjpeg streaming port.

`netstat -n -a | grep LIST`

``` text
tcp        0      0 0.0.0.0:1740            0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:1181            0.0.0.0:*               LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN
```

## Troubleshooting

### no camera functionality

Test with `raspistill -p "0,0,640,480"`.

* did you enable the camera with `sudo raspi-config`?
* is `multiCameraServer` using it? Make sure that the camera is removed from
  the `Vision Settings`.  Save is only available if the system is `Writable`.
  If that fails to resolve the problem upload the tick-tock script above to
  fully disable multiCameraServer.
* is another program using it? uv4l? your python script?

  ```bash
    # this will show you if a uv4l process is running
    % ps -ef | fgrep uv4l

    # this will show you all the processes that are LISTENING on a port
    % netstat -an | grep LISTEN

    # this will show you which process is listening on port 8080 it
    # returns a process number (pid)
    % sudo fuser 8080/tcp

    # and this finds the program associated with a pid
    %  ps -ef | grep yourpid
  ```

* is there a problem with the video device?

    ```bash
    cd /dev
    ls -l | grep video  # look for devices owned by group video
    ```

    It should look like this:

    ```console
    crw-rw---- 1 root video    29,   0 Mar 12 20:34 fb0
    crw-rw---- 1 root video   245,   0 Mar 12 20:34 vchiq
    crw-rw---- 1 root video   249,   0 Mar 12 20:34 vcio
    crw-rw---- 1 root video   246,   0 Mar 12 20:34 vcsm
    crw-rw---- 1 root video    81,   0 Mar 12 20:34 video0
    ```

    If you see something else, try:

    ```bash
    % sudo rm /dev/video0
    % sudo reboot
    ```

### frcvision webpage doesn't appear at http://frcvision.local

* are there more than one raspis on the network?  Then you
    should be using static IP addresses and using the ip address
    as the URL.  Make sure only one is on the network, then
    try again.  You can configure static ip addressing via
    the Network Status page.  Here's a typical setup:

    ```bash
    #  Configure IPv4 Address
    Static
    # IPv4 Address
    10.49.15.XXX  # where XXX is in the range 10-20
    # Subnet Mask
    255.255.255.0
    # Gateway
    10.49.15.1
    # DNS Server
    8.8.8.8
    ```

* is configServer running?

    ```bash
    % ps -ef | grep configServer
    # should produce:
    root       294   288  0 Jan28 ?        00:00:00 supervise configServer
    root       299   294  0 Jan28 ?        00:29:24 /usr/local/sbin/configServer
    pi       15895 15900  0 10:46 pts/1    00:00:00 grep --color=auto configServer
    ```

* is someone listening on port 80?

    ```bash
    % netstat -an | grep :80
    # this shows that a process is listening on port 80
    tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
    # and this shows someone connected to the port
    tcp        0      0 10.49.15.11:80          192.168.0.4:52793       ESTABLISHED
    ```
