'use strict';

var path = require('path'),
  fs = require('fs'),
  pump = require('pump');

module.exports = function (req, res, torrent, file) {
  var param = req.query.ffmpeg,
    ffmpeg = require('fluent-ffmpeg');

  function probe() {
    var filePath = path.join(torrent.path, file.path);
    fs.exists(filePath, function (exists) {
      if (!exists) {
        return res.send(404, 'File doesn`t exist.');
      }
      return ffmpeg.ffprobe(filePath, function (err, metadata) {
        if (err) {
          console.error(err);
          return res.send(500, err.toString());
        }
        res.send(metadata);
      });
    });
  }

  function remux(ffmpegOptions) {
    res.type(ffmpegOptions.rt);
    var outputOptions = [
      //'-threads 2',
      '-deadline realtime',
      '-error-resilient 1',
      '-preset ultrafast'
      // '-movflags faststart+frag_keyframe+empty_moov'
    ];

    var command = ffmpeg(file.createReadStream())
      .videoCodec(ffmpegOptions.vc).audioCodec(ffmpegOptions.ac).format(ffmpegOptions.f)
      .audioBitrate(ffmpegOptions.ab)
      .videoBitrate(ffmpegOptions.vb)
      .outputOptions(outputOptions)
      .on('start', function (cmd) {
        console.log(cmd);
      })
      .on('error', function (err) {
        console.error(err);
      });
    pump(command, res);
  }

  switch (param) {
    case 'probe':
      return probe();
    case 'remux':
      var ffmpegOptions = {
        rt: req.query.rt || 'video/webm',
        f: req.query.f || 'webm',
        vc: req.query.vc || 'libvpx',
        ac: req.query.ac || 'libvorbis',
        vb: req.query.vb || 4096,
        ab: req.query.ab || 256
      };

      console.log(ffmpegOptions);

      return remux(ffmpegOptions);
    default:
      res.send(501, 'Not supported.');
  }
};
