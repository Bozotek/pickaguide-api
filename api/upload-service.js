'use strict';

const fs = require('fs');
const db = require('./database');
const mime = require('mime-types');
const path = require('path');
const Grid = require('gridfs-stream');

Grid.mongo = db.mongo;

exports.uploadImage = (pathFile, fileName, mimetype) => {
  return new Promise((resolve, reject) => {
    const gfs = Grid(db.conn.db);
    const writestream = gfs.createWriteStream({
      filename: fileName,
      content_type: mimetype,
    });
    fs.createReadStream(pathFile).pipe(writestream);
    writestream.on('close', (file) => {
      fs.unlink(pathFile, ((err) => {
        if (err) return reject({ code: 1, message: err });
        resolve(file._id);
      }));
    });
  });
};

exports.downloadImage = (idImage) => {
  return new Promise((resolve, reject) => {
    const gfs = Grid(db.conn.db);

    gfs.files.find({ _id: idImage }).toArray((err, files) => {
      if (files.length === 0 || err) return reject({ code: 1, message: err });

      const name = idImage + '.' + mime.extension(files[0].contentType);
      const fsWriteStream = fs.createWriteStream(path.join(path.join(__dirname, '/../assets/'), name));
      const readstream = gfs.createReadStream({
        _id: idImage,
      });

      readstream.pipe(fsWriteStream);
      fsWriteStream.on('close', () => {
        resolve(path.resolve(path.join(path.join(__dirname, '/../assets/'), name)));
      });
    });
  });
};

exports.deleteImage = (idImage) => {
  return new Promise((resolve, reject) => {
    const gfs = Grid(db.conn.db);

    gfs.remove({
      _id: idImage,
    }, (err) => {
      if (err) return reject({ code: 1, message: err });

      resolve();
    });
  });
};
