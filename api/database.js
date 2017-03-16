const mongoose = require('mongoose');
const config = require('config');

mongoose.Promise = global.Promise;

const connectionUrl = (['staging', 'production'].indexOf(process.env.NODE_ENV) !== -1 ?
  `${config.mongo.user}:${config.mongo.password}@${config.mongo.url}` :
  config.mongo.url);

const init = () => mongoose.connect(connectionUrl);

exports.ObjectId = mongoose.Types.ObjectId;

exports.Users = require('./models/user').Users;

exports.conn = mongoose.connection;

exports.mongo = mongoose.mongo;

exports.init = init;
