# webcam

Capture picam image every 5 minutes.  Cleanup "redundant images".
Organize captures by date.  Present them as mjpg or jpg via a web 
interface.

## intro


## cleanup redundant images

* currently we use a raspi3 build of 
[perceptualdiff](https://github.com/myint/perceptualdiff).

## config issues

* need to install ffmpeg for timelapse support
* need to statically mount a larger disk drive.  We currently
  employ a exfat usb stick. Auto-mounting instructions :

  ```sh
  % sudo blkid (to obtain the UUID)
  % sudo mkdir /mnt/thumb1
  % sudo vi /etc/fstab (might want to back it up first)
    > UUID=64A5-F009 /mnt/thumb1 exfat defaults,nofail 0 0
  ```

  * directory permissions are weird for exfat and this can make for
    [ugly colors](https://unix.stackexchange.com/questions/241726/fix-ls-colors-for-directories-with-777-permission).
