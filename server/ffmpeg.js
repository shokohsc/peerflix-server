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
    res.type(ffmpegOptions.resType);
    var outputOptions = [
      //'-threads 2',
      '-deadline realtime',
      '-error-resilient 1'
      // '-movflags faststart+frag_keyframe+empty_moov'
    ];

    var command = ffmpeg(file.createReadStream())
      .videoCodec(ffmpegOptions.vCodec).audioCodec(ffmpegOptions.aCodec).format(ffmpegOptions.format)
      .audioBitrate(ffmpegOptions.aBitrate)
      .videoBitrate(ffmpegOptions.vBitrate)
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
        resType: req.query.resType || 'video/webm',
        format: req.query.format || 'webm',
        vCodec: req.query.vCodec || 'libvpx',
        aCodec: req.query.aCodec || 'libvorbis',
        vBitrate: req.query.vBitrate || 2048,
        aBitrate: req.query.aBitrate || 128
      };

      console.log(ffmpegOptions);

      return remux(ffmpegOptions);
    default:
      res.send(501, 'Not supported.');
  }
};
