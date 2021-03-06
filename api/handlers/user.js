'use strict';

const userManager = require('../managers/user');
const visitManager = require('../managers/visit');
const advertManager = require('../managers/advert');
const blacklistManager = require('../managers/blacklist');
const emailService = require('../email-service');


class User {

  static add(fields) {
    return new Promise((resolve, reject) =>
      userManager
        .add(fields)
        .then(newUser =>
          emailService.sendEmailConfirmation(newUser)
            .then(() => resolve({ code: 0, message: 'Account created' }))
            .catch((mailErr) => {
              if (mailErr.code === 1) { resolve({ code: 0, message: 'Account created' }); } else { reject(mailErr); }
            })
        )
        .catch(addErr => reject(addErr))
    );
  }

  static find(userId, selectFields = '', updatable = false) {
    return userManager.find(userId, selectFields, updatable);
  }

  static findInIds(userIds, selectFields = '', updatable = false) {
    return userManager.findInIds(userIds, selectFields, updatable);
  }

  static findAll(selectFields = '') {
    return userManager.findAll(selectFields);
  }

  static findByEmail(email) {
    return userManager.findByEmail(email);
  }

  static findByTerms(terms) {
    return userManager.findByTerms(terms);
  }

  static update(userId, reqBody) {
    return userManager.update(userId, reqBody);
  }

  static remove(userId, reqBody) {
    return new Promise((resolve, reject) => {
      userManager
        .remove(userId, reqBody)
        .then((user) => {
          visitManager.cancelAll(userId)
            .then(() =>
              new Promise((resolveRetire, rejectRetire) => {
                userManager
                  .isGuide(userId)
                  .then((res) => {
                    if (res.isGuide) {
                      User
                        .retire(userId)
                        .then(() => advertManager.removeAll(userId))
                        .then(() => resolveRetire())
                        .catch(err => rejectRetire(err));
                    } else {
                      resolveRetire();
                    }
                  })
                  .catch(err => rejectRetire(err));
              })
            )
            .then(() => blacklistManager.add({ email: user.account.email }))
            .then(() => {
              user.remove((removalErr) => {
                if (removalErr) { return reject({ code: 1, message: removalErr.message }); }

                resolve({ code: 0, message: 'Account deleted' });
              });
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static isGuide(userId) {
    return userManager.isGuide(userId);
  }

  static isBlocking(userId) {
    return userManager.isBlocking(userId);
  }

  static becomeGuide(userId) {
    return userManager.becomeGuide(userId);
  }

  static retire(userId) {
    return new Promise((resolve, reject) =>
      visitManager.denyAll(userId)
        .then(() => advertManager.toggleAllOff(userId))
        .then(() =>
          userManager
            .findByIdAndUpdate(userId, { isGuide: false })
            .then(user => resolve({ id: userId, isGuide: user.isGuide }))
            .catch(updateErr => reject(updateErr))
        )
        .catch(err => reject(err))
    );
  }

  static findNear(geo, distance) {
    return userManager.findNear(geo, distance);
  }

}

exports.User = User;
