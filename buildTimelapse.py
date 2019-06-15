#!/usr/bin/env python3

# produce a single m4v (h264) from a directory of images
#
# assumptions
#  1. sparse collection of input files named HH_MM.jpg 
#   a. sort order == temporal order
#   a. aspect ratio is 4:3, size is pi native
#   b. we'd like to normalize time - so duration of result is
#      independent of sparsity, ie: time passes linearly
#   c. there are no more than ~ 24 * 60/5 input images
#  2. opencv is installed with python binding. We use it to
#    resize and normalize the sparse set of input images.
#   a. output res is DVD or XGA (720x480), 1024x768
#  3. ffmpeg is installed and supports the libxh264 codec
#
import cv2
import os.path as path
import os
import subprocess
from sys import argv
from shutil import copyfile, rmtree

# experiment with direct opencv convertion failed, so we resize
# then exec a lengthy ffmpeg process.

# resizeImages found in inputdir that match *.jpg
# results are written to inputdir/resized
def resizeImages(inputdir, framewidth, force=False):
    os.chdir(inputdir)
    outputdir = path.join(inputdir, "resampled")
    try:
        os.mkdir(outputdir)
        doit = True
    except OSError as exc:
        doit = force

    if not doit:
        print("Resampling already done. Short-circuiting ...")
    else:
        print("Resampling imgdir " + inputdir + " to " + outputdir)

    files = os.listdir(inputdir)
    if len(files) == 0:
        raise Exception("no files in " + inputdir)
    imgfiles = [f for f in files if path.splitext(f)[1] == ".jpg"]
    if len(imgfiles) == 0:
        raise Exception("no img files in " + inputdir)
    imgfiles.sort()

    i = 0 
    firstframe = -1
    lastmin = -1
    lastimg = None
    thumbnail = None
    outbase = None
    outpattern = None
    for infile in imgfiles: # no dir in imgfile
        # base is assumed to be of the form HH_DD, we'd like to
        # output one file per minute of the day
        split = path.splitext(infile);
        base = split[0]
        ext = split[-1]
        if outpattern == None:
            outpattern = "%04d" + ext
        ts = base.split("_")
        newmin = int(ts[1]) + 60 * int(ts[0])
        if doit or firstframe == -1:
            img = cv2.imread(path.join(inputdir, infile), cv2.IMREAD_COLOR)
        height, width, depth = img.shape
        scale = framewidth/width
        newW,newH = int(width*scale), int(height*scale)
        newimg = cv2.resize(img, (newW, newH))

        # 60*24 minutes: 1440
        if not lastimg is None:
            while i < newmin:
                outfile = outpattern % i
                if i % 300 == 0:
                    print(" %s->%s %d<%d" %  (infile, outfile, i, newmin))
                # fade between last and new
                if doit:
                    pct = (i - lastmin) / float(newmin - lastmin)
                    dst = cv2.addWeighted(lastimg, 1-pct, newimg, pct, 0)
                    cv2.imwrite(path.join(outputdir, outfile), dst)
                i += 1
        else:
            firstframe = newmin
            i = newmin

        if doit:
            outfile = outpattern % i # 60*24 minutes: 1440
            cv2.imwrite(path.join(outputdir, outfile), newimg)
        
        if not thumbnail and i > 700:
            # this for our single thumbnail, near midday
            print(" thumbnail at %s (%d) ------------" % (infile, i))
            tscale = 100/width # 100 pixels wide
            if doit:
                thumbnail = cv2.resize(img, 
                                (int(tscale*width), int(tscale*height)))
                cv2.imwrite(path.join(outputdir, "thumb.jpg"), thumbnail)
            thumbnail = True # 'release' thumbnail img

        lastimg = newimg
        lastmin = i
        i += 1

    print("  done!", (firstframe, lastmin))
    return (outpattern, firstframe, outputdir)


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
    subprocess.run(["ffmpeg", 
                "-loglevel", "panic",
                "-r", str(framerate), 
                "-start_number", str(startFrame),
                "-i", "%4d.jpg",
                "-vcodec", "libx264",
                outputfile])

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
        (imgpattern, firstframe, resampledir) = resizeImages(indir, movieWidth)

        # inputdir is assumed ../fullyear/month/day
        dirs = indir.split("/")
        subdirs = dirs[-3:]
        outfilebase = path.join(outdir, "_".join(subdirs))
        moviefile = outfilebase+".mp4"
        print("creating movie file " + moviefile)
        makeMovie(resampledir, firstframe, moviefile)
        thumbnail = path.join(outfilebase+".jpg")
        print("installing thumbnail as " + thumbnail)
        copyfile(path.join(resampledir, "thumb.jpg"), thumbnail)
        print("cleaning resampled area " + resampledir)
        rmtree(resampledir)
        
    else:
        print("ERROR: '" + indir + "' is not a directory")


if __name__ == "__main__":
    main()
