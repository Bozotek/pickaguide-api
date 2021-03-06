'use strict';

const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const config = require('config');

const auth = {
  auth: {
    api_key: config.mailgun.apiKey,
    domain: 'mg.pickaguide.fr',
  },
};

const nodemailerMailgun = nodemailer.createTransport(mg(auth));
const send = nodemailerMailgun.templateSender({
  subject: '{{subject}}',
  html: 'Bonjour {{firstname}} {{lastname}}<br><br>' +
  '<a href="{{url}}">{{urlName}}</a>',
}, {
  from: 'equipe@pickaguide.fr',
});

const sendEmail = (user, subject, url, urlName) => {
  return new Promise((resolve, reject) => {
    send({
      to: user.account.email,
    }, {
      subject,
      firstname: user.profile.firstName,
      lastname: user.profile.lastName,
      url,
      urlName,
    }, (err, info) => (err ? reject(err.message) : resolve(info)));
  });
};

exports.sendEmailConfirmation = (user) => {
  const subject = 'Confirmation email Pickaguide';
  const url = config.host + '/public/verify/' + user._id;
  const urlName = 'Cliquez pour confirmer votre adresse email';
  return new Promise((resolve, reject) => {
    sendEmail(user, subject, url, urlName)
      .then(result => resolve({ code: 0, message: result }))
      .catch(err => reject({ code: 1, message: err }));
  });
};

exports.sendEmailPasswordReset = (user) => {
  const subject = 'Reset password Pickaguide';
  const url = config.host + '/public/reset/' + user.account.resetPasswordToken;
  const urlName = 'Cliquez pour changer votre mot de passe';
  return new Promise((resolve, reject) => {
    sendEmail(user, subject, url, urlName)
    .then(result => resolve({ code: 0, message: result }))
    .catch(err => reject({ code: 1, message: err }));
  });
};


const sendContactUsEmail = nodemailerMailgun.templateSender({
  subject: 'Message from {{name}}',
  html: 'Email : {{email}}<br><br>' +
  'Phone : {{phone}}<br><br>' +
  '{{message}}',
}, {
  from: 'equipe@pickaguide.fr',
});


exports.contactUs = (mail) => {
  return new Promise((resolve, reject) => {
    if (!mail.phone) {
      mail.phone = 'None';
    }
    sendContactUsEmail({
      to: 'pickaguide_2018@labeip.epitech.eu',
    }, {
      name: mail.name,
      email: mail.email,
      message: mail.message,
      phone: mail.phone,
    }, (err, info) => (err ? reject(err) : resolve(info)));
  });
};
