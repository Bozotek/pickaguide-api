'use strict';

const User = require('./user').User;
const uploadService = require('../upload-service');
const ObjectId = require('../database').ObjectId;
const _ = require('lodash');


class Profile extends User {

  static find(userId, updatable = false) {
    return new Promise((resolve, reject) => {
      super.find(userId, 'profile', updatable)
        .then(user => resolve(updatable ? user : user.profile))
        .catch(err => reject(err));
    });
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      const fields = {
        account: 0,
        'profile.gender': 0,
        'profile.phone': 0,
        'profile.interests': 0,
        'profile._fsId': 0,
      };

      super.findAll(fields)
        .then((users) => {
          const displayableProfiles = users.map((user) => {
            const profile = user.profile;
            profile.displayName = Profile._displayName(profile);
            delete profile.firstName;
            delete profile.lastName;
            const ageDate = new Date(Date.now() - new Date(profile.birthdate).getTime());
            profile.age = Math.abs(ageDate.getUTCFullYear() - 1970);
            delete profile.birthdate;
            return profile;
          });

          resolve({ profiles: displayableProfiles, ids: users.map(user => user._id) });
        })
        .catch(err => reject(err));
    });
  }

  static search(searchTerms) {
    return new Promise((resolve, reject) => {
      super.findByTerms(searchTerms)
        .then((users) => {
          const displayableProfiles = users.map((user) => {
            const profile = user.profile;
            profile.displayName = `${profile.firstName} ${profile.lastName.charAt(0)}.`;
            delete profile.firstName;
            delete profile.lastName;
            const ageDate = new Date(Date.now() - new Date(profile.birthdate).getTime());
            profile.age = Math.abs(ageDate.getUTCFullYear() - 1970);
            delete profile.birthdate;
            return profile;
          });

          resolve({ profiles: displayableProfiles, ids: users.map(user => user._id) });
        })
        .catch(err => reject(err));
    });
  }

  static upload(userId, file) {
    return new Promise((resolve, reject) => {
      uploadService.uploadImage(file.path, file.originalname, file.mimetype)
        .then((value) => {
          super.update(userId, { profile: { _fsId: new ObjectId(value) } })
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static download(userId) {
    return new Promise((resolve, reject) => {
      super.find(userId, 'profile')
        .then((user) => {
          uploadService.downloadImage(user.profile._fsId)
            .then((value) => {
              resolve(value);
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static deleteAvatar(userId) {
    return new Promise((resolve, reject) => {
      super.find(userId, 'profile')
        .then((user) => {
          uploadService.deleteImage(user.profile._fsId)
            .then(() => {
              User.update(userId, { profile: { _fsId: null } })
                .then(() => resolve())
                .catch(err => reject(err));
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static _displayName(profile) {
    return `${profile.firstName} ${profile.lastName.charAt(0)}.`;
  }

  static _pseudo(profile) {
    return `${profile.firstName.substring(0, 6)}${profile.lastName.charAt(0)}`;
  }
  
  static addGeo(userId, reqBody) {
    return new Promise((resolve, reject) => {
      super.find(userId, 'profile')
        .then((user) => {
          let array = [];
          user.profile.geo =
          User.update(userId, { profile: { geo: _.concat(array, reqBody.x, reqBody.y) } })
            .then((user) => resolve({ id: userId, geo: user.profile.geo }))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }
  
  static findNear(userId, distance) {
    return new Promise((resolve, reject) => {
      super.find(userId, 'profile')
        .then((user) => {
          if (!user.profile.geo) { return reject({ code: 3, message: 'User does not have localisation'}); }
          super.findNear(user.profile.geo, distance)
            .then((users) => resolve(users))
            .catch(err => reject(err));
        });
    });
  }

}

exports.Profile = Profile;
