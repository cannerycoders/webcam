#!/usr/bin/env python3

# Produce a single m4v (h264) from a directory of images
#
# assumptions
#  1. sparse collection of input files named HH_MM.jpg 
#   a. sort order == temporal order
#   b. aspect ratio is 4:3, size is pi native, size: 2592x1944
#   c. we'd like to normalize time - so duration of result is
#      independent of sparsity, ie: time passes linearly
#   d. there are no more than ~ 24 * 60 input images (one per minute)
#  2. opencv is installed with python binding. We use it to
#    resize and normalize the sparse set of input images.
#   a. output res is DVD or XGA (720x480), 1024x768
#  3. ffmpeg is installed and supports the libxh264 codec
#
#
# notes:
#   experiment with direct opencv convertion failed, so we resize then 
#       exec a lengthy ffmpeg process.
#
#   we can crop with opencv images via numpy slicing:
#
#       img = cv2.imread("lenna.png")
#       crop_img = img[y:y+h, x:x+w]`
#
#  
#   if temporal resampling weren't needed we could resize/crop via ffmpeg:
#
#       https://bit.ly/2ONW1JL
#       ffmpeg -i in.mp4 -filter:v "crop=80:60:200:100" -c:a copy out.mp4
#
#       https://trac.ffmpeg.org/wiki/Scaling
#       ffmpeg -i input.avi -vf scale=320:240 output.avi
#

import cv2
import sys, traceback, subprocess, os
from datetime import datetime
from subprocess import PIPE
from os import path
from sys import argv
from shutil import copyfile, rmtree

DEBUG_RESAMPLE = False
DEBUG_MOVIE = False   # True -> don't cleanup resampled dir

#
# resampleImages:
#   resize images found in inputdir that match *.jpg
#   results are temporally resampled and written to inputdir/resized
#
def resampleImages(inputdir, framewidth, force=False):
    os.chdir(inputdir)
    outputdir = path.join(inputdir, "resampled")
    try:
        os.mkdir(outputdir)
        doit = True
    except OSError as exc:
        doit = force

    if not doit:
        if DEBUG_RESAMPLE:
            doit = true
        else:
            print("Resampling already done. Short-circuiting ...")
    else:
        print("Resampling imgdir " + inputdir)

    files = os.listdir(inputdir)
    if len(files) == 0:
        raise Exception("no files in " + inputdir)
    imgfiles = [f for f in files if path.splitext(f)[1] == ".jpg"]
    if len(imgfiles) == 0:
        raise Exception("no img files in " + inputdir)
    imgfiles.sort()

    outIndex = 0 
    outpattern = "%04d.jpg"

    lastKeyframe = -1
    lastimg = None
    thumbnail = None
    outbase = None

    for infile in imgfiles: # no dir in imgfile
        # base is assumed to be of the form HH_DD, we'd like to
        # output one file per minute of the day
        split = path.splitext(infile);
        base = split[0]
        ext = split[-1]
        ts = base.split("_")
        newKeyframe = 60 * int(ts[0]) + int(ts[1])

        if doit:
            img = cv2.imread(path.join(inputdir, infile), cv2.IMREAD_COLOR)
            height, width, depth = img.shape
        else:
            height, width = (1024, 720)

        scale = framewidth/width
        newW,newH = int(width*scale), int(height*scale)
        if doit:
            newimg = cv2.resize(img, (newW, newH))
        else:
            newimg = "XXX"

        if lastimg is None:
            # nothing to write
            pass
        else:
            imin = lastKeyframe+1 # lastKeyframe was written
            while imin < newKeyframe:
                outfile = outpattern % outIndex
                pct = (imin - lastKeyframe) / float(newKeyframe - lastKeyframe)
                if outIndex % 300 == 0:
                    print(" %s->%s (%f)" %  (infile, outfile, pct))
                # fade between last and new
                if doit:
                    dst = cv2.addWeighted(lastimg, 1-pct, newimg, pct, 0)
                    cv2.imwrite(path.join(outputdir, outfile), dst)
                imin += 1
                outIndex += 1

        # write our keyframe
        outfile = outpattern % outIndex
        if outIndex % 300 == 0:
            print(" %s->%s (keyframe)" %  (infile, outfile))

        if doit:
            cv2.imwrite(path.join(outputdir, outfile), newimg)
        
        if outIndex >= 700 and (thumbnail is None):
            # this for our single thumbnail, near midday
            print(" %s->thumb.jpg" % infile)
            tscale = 100/width # 100 pixels wide
            if doit:
                thumbnail = cv2.resize(img, 
                                (int(tscale*width), int(tscale*height)))
                cv2.imwrite(path.join(outputdir, "thumb.jpg"), thumbnail)
                # XXX 'release' thumbnail img

        lastimg = newimg
        lastKeyframe = newKeyframe
        outIndex += 1

    print(" done resampling %d images" % outIndex)
    return (outpattern, 0, outputdir)

def makeMovie(inputdir, startFrame, outputfile):
    # for ffmpeg commandline help: https://bit.ly/2XdXThE
    #
    #  ffmpeg -r ${framerate} -start_number 299 \
    #       -i "06_13.%04d.jpg" \
    #       -vcodec libx264  \
    #       06_13.mp4
    os.chdir(inputdir)
    framerate = 20
    # this subprocess idiom doesn't redirect stdout/stderr
    movieCmd = ["ffmpeg", 
                "-y", # overwrite target
                "-loglevel", "panic",
                "-r", str(framerate), 
                "-start_number", str(startFrame),
                "-i", "%4d.jpg",
                "-vcodec", "libx264",
                outputfile]
    movieStr = " ".join(movieCmd)
    if DEBUG_MOVIE:
        print("Running `%s'" % movieStr)
    else:
        print("Running ffmpeg")

    before = datetime.now()
    ret = subprocess.run(movieCmd, stdout=PIPE, stderr=PIPE)
    after = datetime.now()
    seconds = (after - before).total_seconds()
    minutes = int(seconds // 60)
    seconds = int(seconds - (minutes * 60))
    print("  finished in {:02}:{:02}".format(minutes, seconds))
    print("  returned with %d return code" % ret.returncode)
    if len(ret.stdout) > 0:
        print("  stdout {")
        print(ret.stdout)
        print("  }")
    if len(ret.stderr) > 0:
        print("  stderr {")
        print(ret.stderr)
        print("  }\n\n")

#
# ./buildTimelapse.py \
#      /mnt/thumb1/capture/201Eakin/2019/06/13 \
#      /mnt/thumb1/capture/201Eakin/timelapse
#
#   produces the files 2019_06_13.mp4 and 2019_60_13.jpg in outputdir

def usage():
    return '''
%s [options] [inputdir] outputdir
  Convert the images found in <inputdir> to produce a movie named <outputfile>
  Options:
    <none so far>
got: %s
''' % (path.basename(argv[0]), argv)

def main():
    movieWidth = 1024

    if len(argv) > 3:
        print(usage())
    elif len(argv) == 3:
        indir = argv[1]
        outdir = argv[2]
    elif len(argv) == 2:
        indir = "."
        outdir = argv[1]
    else:
        print(usage())
        return

    if path.isdir(indir):
        (outpat, frame0, resampledir) = resampleImages(indir, movieWidth)

        # inputdir is assumed ../fullyear/month/day
        dirs = indir.split("/")
        subdirs = dirs[-3:]
        outfilebase = path.join(outdir, "_".join(subdirs))
        moviefile = outfilebase+".mp4"

        try:
            makeMovie(resampledir, frame0, moviefile)

            thumbnail = path.join(outfilebase+".jpg")

            print("Installing thumbnail as " + thumbnail)
            copyfile(path.join(resampledir, "thumb.jpg"), thumbnail)

        except Exception:
            traceback.print_exc()

        if not DEBUG_MOVIE:
            print("Cleaning resampled area " + resampledir)
            rmtree(resampledir)
        
    else:
        print("ERROR: '" + indir + "' is not a directory")


if __name__ == "__main__":
    main()
