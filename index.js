'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const expressJwt = require('express-jwt');
const config = require('config');
const morgan = require('morgan');
const cors = require('cors');
const db = require('./api/database');

const app = express();
let server = null;
let httpsServer = null;

const run = function run(next) {
  db.init()
    .then(function then() {
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: false }));

      app.use(morgan('dev'));
      app.use(cors());

      app.use('/public', require('./api/routes/public/public'));
      app.use('/public/accounts', require('./api/routes/public/account'));
      app.use('/public/profiles', require('./api/routes/public/profile'));

      app.use('/', expressJwt({ secret: config.jwtSecret }).unless({ path: /\/public(\/.*)?/ }));
      app.use('/', require('./api/middleware-service').errorsTokenMissing);
      app.use('/', require('./api/handlers/account').Account.isAuthorised);
      app.use('/', require('./api/middleware-service').checkContentTypeHeader);

      app.use('/profiles', require('./api/routes/profile'));
      app.use('/accounts', require('./api/routes/account'));

      app.set('port', config.port);

      server = http.createServer(app).listen(app.get('port'), function handler() {
        console.log('Express server listening on %d, in %s mode', app.get('port'), app.get('env'));
        if (next) next(null, app);
      });

      if (process.env.ENVIRONMENT === 'production') {
        const sslOptions = {
          key: fs.readFileSync('/home/sslCertificates/privkey.pem'),
          cert: fs.readFileSync('/home/sslCertificates/cert.pem'),
          ca: fs.readFileSync('/home/sslCertificates/chain.pem')
        };

        httpsServer = https.createServer(sslOptions, app).listen(443);
      }
    })
    .catch(function error(err) {
      console.error('Could not init the database:', err);
    });
};

if (require.main === module) {
  run();
}

const stop = function stop(next) {
  if (httpsServer) {
    httpsServer.close()
  }

  if (server) {
    server.close(next);
  }
};

module.exports.start = run;
module.exports.stop = stop;
