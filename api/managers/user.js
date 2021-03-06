const db = require('../database');
const jwt = require('jsonwebtoken');
const config = require('config');
const _ = require('lodash');
const assertInput = require('../handlers/_handler').assertInput;


const capitalize = (user) => {
  const fieldsToCapitalize = ['city', 'country', 'firstName', 'lastName'];

  fieldsToCapitalize.forEach((fieldName) => {
    const fieldValue = user.profile[fieldName];
    if (fieldValue && fieldValue.constructor === String) {
      user.profile[fieldName] = user.profile[fieldName].capitalize();
    }
  });
};

const add = (fields) => {
  return new Promise((resolve, reject) => {
    const newUser = new db.Users(fields);
    newUser.hash(fields.account.password, (hashed) => {
      newUser.account.token = jwt.sign({ userId: newUser._id }, config.jwtSecret);
      newUser.account.password = hashed;

      capitalize(newUser);

      newUser.save((err) => {
        if (err) {
          let message;
          if (err.code === 11000) { message = 'This account already exists'; } else { message = 'Invalid data'; }
          return reject({ code: 1, message });
        }

        resolve(newUser);
      });
    });
  });
};

const find = (userId, selectFields = '', updatable = false) => {
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
};

const findInIds = (userIds, selectFields = '', updatable = false) => {
  return new Promise((resolve, reject) => {
    let query = db.Users.find()
      .where('_id')
      .in(userIds)
      .select(selectFields);

    if (updatable === false) {
      query = query.lean();
    }

    query.exec((err, users) => {
      if (err) { return reject({ code: 1, message: err.message }); }

      resolve(users);
    });
  });
};

const findNear = (center, maxDistance) => {
  return new Promise((resolve, reject) => {
    db.Users
      .find({ isGuide: true }, {
        'profile.firstName': 1,
        'profile.description': 1,
        'profile.rate': 1,
        location: 1,
      })
      .near('location', { center, maxDistance: Number(maxDistance), spherical: true })
      .lean()
      .exec((err, users) => {
        if (err) { return reject({ code: 4, message: err.message }); }
        resolve(users);
      });
  });
};

const findAll = (selectFields = '') => {
  return new Promise((resolve, reject) => {
    db.Users
      .find({}, selectFields)
      .lean()
      .exec((err, users) => {
        if (err) { return reject({ code: 1, message: err.message }); }

        resolve(users);
      });
  });
};

const findByEmail = (email) => {
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
};

const findByTerms = (terms) => {
  const fields = {
    account: 0,
    'profile.gender': 0,
    'profile.phone': 0,
  };

  if (!terms || terms.length === 0) { return findAll(fields); }

  return new Promise((resolve, reject) => {
    const regexes = terms.trim().split(' ').filter(term => term.length > 2).map(term => new RegExp(term, 'i'));
    const regexSearch = [];
    ['firstName', 'lastName', 'description', 'interests'].forEach((field) => {
      const searchElement = {};
      searchElement[`profile.${field}`] = { $in: regexes };
      regexSearch.push(searchElement);
    });

    db.Users
      .find({ $or: regexSearch, 'account.emailConfirmation': true }, fields)
      .lean()
      .exec((err, users) => {
        if (err) { return reject({ code: 1, message: err.message }); }

        resolve(users);
      });
  });
};

const findByIdAndUpdate = (userId, fields) => {
  return new Promise((resolve, reject) =>
    db.Users
      .findByIdAndUpdate(userId, fields, { new: true }, (err, user) => {
        if (err) { return reject({ code: 1, message: err.message }); }
        if (user === null) { return reject({ code: 2, message: 'Cannot find user' }); }

        resolve(user);
      })
  );
};

const remove = (userId, reqBody) => {
  return new Promise((resolve, reject) => {
    const failed = assertInput(['email', 'password'], reqBody);

    if (failed) { return reject({ code: 1, error: `We need your ${failed}` }); }

    findByEmail(reqBody.email)
      .then((user) => {
        user.comparePassword(reqBody.password, (err, isMatch) => {
          if (err) { return reject({ code: 3, message: err.message }); }
          if (!isMatch) { return reject({ code: 4, message: 'Invalid password' }); }
          if (userId !== String(user._id)) { return reject({ code: 2, message: 'No account with this email' }); }

          resolve(user);
        });
      })
      .catch(err => reject(err));
  });
};

const setBlocking = (userId, isBlocking) => {
  return new Promise((resolve, reject) => {
    db.Users
     .findByIdAndUpdate(userId, { isBlocking }, { new: true }, (err, user) => {
       if (err) { return reject({ code: 1, message: err.message }); }
       if (user === null) { return reject({ code: 2, message: 'Cannot find user' }); }

       resolve({ id: userId, isBlocking: user.isBlocking });
     });
  });
};

const update = (userId, reqBody) => {
  return new Promise((resolve, reject) => {
    db.Users
     .findById(userId)
     .exec((err, user) => {
       if (err) { return reject({ code: 1, message: err.message }); }
       if (user === null) { return reject({ code: 2, message: 'Cannot find user' }); }

       const mergedUser = _.merge(user, reqBody);
       capitalize(mergedUser);

       if (reqBody.profile && reqBody.profile.interests !== undefined) {
         mergedUser.profile.interests = reqBody.profile.interests;
         mergedUser.markModified('profile.interests');
       }

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
};

const updateRate = (userId) => {
  return new Promise((resolve, reject) => {
    db.Adverts
      .find({ owner: String(userId) }, '_id')
      .lean()
      .exec((err, adverts) => {
        if (err) { return reject({ code: 1, message: err.message }); }

        resolve(adverts);
      });
  })
    .then((adverts) => {
      return new Promise((resolve, reject) => {
        db.Visits
          .find({
            $or: [{
              about: {
                $in: adverts,
              },
              visitorRate: {
                $ne: null,
              },
            }, {
              by: String(userId),
              guideRate: {
                $ne: null,
              },
            }],
          }, 'by visitorRate guideRate systemRate')
          .lean()
          .exec((err, visits) => {
            if (err) { return reject({ code: 2, message: err.message }); }

            let notIndicated = 0;

            let averageRate = visits.reduce((sum, visit) => {
              let toAdd = (String(visit.by) === userId ? visit.guideRate : visit.visitorRate);

              if (String(visit.by) === userId && visit.systemRate !== null) {
                toAdd += visit.systemRate;
                notIndicated -= 1;
              }

              if (toAdd === null) {
                notIndicated += 1;
              }

              return sum + (toAdd || 0);
            }, 0) / (visits.length - notIndicated);

            if (isNaN(averageRate)) {
              averageRate = null;
            }

            resolve(averageRate);
          });
      });
    })
    .then((rate) => {
      return new Promise((resolve, reject) => {
        db.Users.findByIdAndUpdate(userId, { 'profile.rate': rate })
          .exec((err) => {
            if (err) { return reject({ code: 3, message: err.message }); }

            resolve();
          });
      });
    });
};

const isGuide = (userId) => {
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
};

const isBlocking = (userId) => {
  return new Promise((resolve, reject) => {
    db.Users
     .findById(userId, { isBlocking: 1 })
     .lean()
     .exec((err, user) => {
       if (err) { return reject({ code: 1, message: err.message }); }
       if (user === null) { return reject({ code: 2, message: 'Cannot find user' }); }

       resolve({ id: userId, isBlocking: user.isBlocking });
     });
  });
};

const becomeGuide = (userId) => {
  return new Promise((resolve, reject) => {
    db.Users
     .findById(userId)
     .exec((err, user) => {
       if (err) { return reject({ code: 1, message: err.message }); }
       if (user === null) { return reject({ code: 2, message: 'Cannot find user' }); }

       if (user.account.emailConfirmation === false) {
         return reject({ code: 3, message: 'You need to confirm your email address' });
       }

       const fieldsToValidate = ['phone', 'city', 'country', 'description', 'interests'];
       if (fieldsToValidate.every(field => ([undefined, null].indexOf(user.profile[field]) === -1)) === false) {
         return reject({ code: 4, message: 'You need to fill in all fields' });
       }

       user.isGuide = true;
       user.save((saveErr, updatedUser) => {
         if (saveErr) { return reject({ code: 3, message: saveErr.message }); }
         if (updatedUser === null) { return reject({ code: 4, message: 'Failed to update user' }); }

         resolve({ id: userId, isGuide: updatedUser.isGuide });
       });
     });
  });
};


module.exports = { add, remove, update, becomeGuide, updateRate, isBlocking, isGuide, setBlocking, find, findByIdAndUpdate, findInIds, findAll, findNear, findByEmail, findByTerms };
