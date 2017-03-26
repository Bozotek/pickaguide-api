'use strict';

const db = require('../database');
const Handler = require('./_handler').Handler;
const jwt = require('jsonwebtoken');
const config = require('config');
const emailService = require('../email-service');
const _ = require('lodash');


class User extends Handler {

  static _capitalize(user) {
    const fieldsToCapitalize = ['city', 'country', 'firstName', 'lastName'];

    fieldsToCapitalize.forEach((fieldName) => {
      const fieldValue = user.profile[fieldName];
      if (fieldValue && fieldValue.constructor === String) {
        user.profile[fieldName] = user.profile[fieldName].capitalize();
      }
    });
  }

  static add(fields) {
    return new Promise((resolve, reject) => {
      const newUser = new db.Users(fields);
      newUser.hash(fields.account.password, (hashed) => {
        newUser.account.token = jwt.sign({ userId: newUser._id }, config.jwtSecret);
        newUser.account.password = hashed;

        User._capitalize(newUser);

        newUser.save((err) => {
          if (err) {
            let message;
            if (err.code === 11000) { message = 'This account already exists'; } else { message = 'Invalid data'; }
            return reject({ code: 1, message });
          }

          emailService.sendEmailConfirmation(newUser)
            .then(() => resolve({ code: 0, message: 'Account created' }))
            .catch((mailErr) => {
              if (mailErr.code === 1) { resolve({ code: 0, message: 'Account created' }); } else { reject(mailErr); }
            });
        });
      });
    });
  }

  static find(userId, selectFields = '', updatable = false) {
    return new Promise((resolve, reject) => {
      let query = db.Users.findById(userId, selectFields);

      if (updatable === false) {
        query = query.lean();
      }

      query.exec((err, user) => {
        if (err) { return reject({ code: 1, message: err.message }); }
        if (user === null) { return reject({ code: 2, message: 'No user with this id' }); }

        resolve(user);
      });
    });
  }

  static findAll(selectFields = '') {
    return new Promise((resolve, reject) => {
      db.Users
        .find({}, selectFields)
        .lean()
        .exec((err, users) => {
          if (err) { return reject({ code: 1, message: err.message }); }

          resolve(users);
        });
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      if (email === undefined) { return reject({ code: 2, message: 'No account with this email' }); }

      db.Users
        .findOne({ 'account.email': email })
        .exec((err, user) => {
          if (err) { return reject({ code: 1, message: err.message }); }
          if (user == null) { return reject({ code: 2, message: 'No account with this email' }); }

          resolve(user);
        });
    });
  }

  static update(userId, reqBody) {
    return new Promise((resolve, reject) => {
      db.Users
       .findById(userId)
       .exec((err, user) => {
         if (err) { return reject({ code: 1, message: err.message }); }
         if (user === null) { return reject({ code: 2, message: 'Cannot find user' }); }

         const mergedUser = _.merge(user, reqBody);
         User._capitalize(mergedUser);

         mergedUser.save((saveErr, updatedUser) => {
           if (saveErr) {
             let message;
             if (saveErr.code === 11000) { message = 'This account already exists'; } else { message = 'Invalid update'; }
             return reject({ code: 3, message });
           }

           if (updatedUser === null) { return reject({ code: 4, message: 'Failed to update user' }); }

           resolve(updatedUser);
         });
       });
    });
  }

  static remove(reqBody) {
    return new Promise((resolve, reject) => {
      const failed = this.assertInput(['email', 'password'], reqBody);

      if (failed) { return reject({ code: 1, error: `We need your ${failed}` }); }

      this.findByEmail(reqBody.email)
        .then((user) => {
          user.comparePassword(reqBody.password, (err, isMatch) => {
            if (err) { return reject({ code: 2, message: err.message }); }
            if (!isMatch) { return reject({ code: 3, message: 'Invalid password' }); }

            user.remove((removalErr) => {
              if (err) { return reject({ code: 4, message: removalErr.message }); }

              resolve({ code: 0, message: 'Account deleted' });
            });
          });
        })
        .catch(err => reject({ code: 5, message: err }));
    });
  }

  static isGuide(userId) {
    return new Promise((resolve, reject) => {
      db.Users
       .findById(userId, { isGuide: 1 })
       .lean()
       .exec((err, user) => {
         if (err) { return reject({ code: 1, message: err.message }); }
         if (user === null) { return reject({ code: 2, message: 'Cannot find user' }); }

         resolve({ id: userId, isGuide: user.isGuide });
       });
    });
  }
}

exports.User = User;
