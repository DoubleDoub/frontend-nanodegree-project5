# [Udacity Front-End Web Development Nanodegree](https://www.udacity.com/course/front-end-web-developer-nanodegree--nd001)
## Project 5 Neighborhood Map
---

##Install Dependencies

This document assumes node and npm are already installed. If not, get it [here](https://nodejs.org/download/)

### Grunt command line tool
```
$>npm install -g grunt-cli
```

### Install image-magick
If you are an ubuntu user:

```bash
$> sudo apt-get install imagemagick
```
If you are a Mac user and have [homebrew](http://brew.sh/) installed:
```bash
$> brew install ImageMagick
```
Otherwise please visit [ImageMagick downloads page](http://www.imagemagick.org/script/binary-releases.php).

If you are having issues with ImageMagick you can try a different engine. Please visit [grunt-responsive-images](https://github.com/andismith/grunt-responsive-images) for installing GraphicsMagick and change line 12 in Gruntfile.js

### Install node dependencies
```
$> npm install
```

### Let grunt download bower components and copy them to src
```
$> grunt initProject
```
