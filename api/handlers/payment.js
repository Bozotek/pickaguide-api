'use strict';

const paymentService = require('../payment-service');
const paymentManager = require('../managers/payment')
const userManager = require('../managers/user');
const _ = require('lodash');


class Payment {
  static createUser(user) {
    return new Promise((resolve, reject) => {
      paymentService.createUser(user)
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

  static getUser(user) {
    return new Promise((resolve, reject) => {
      paymentService.getUser(user)
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

    static addCard(paymentId, reqBody) {
    return new Promise((resolve, reject) => {
      paymentService.addCard(paymentId, reqBody)
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

    static createPayment(user, reqBody) {
    return new Promise((resolve, reject) => {
      userManager
        .find(reqBody.destination)
        .then((userDestination) => {
          return paymentManager
            .create(user, userDestination, reqBody.amount, reqBody.amount)
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
        .then((paymentDb) => {
          paymentService.createPayment(user.account.paymentId, reqBody)
            .then((result) => {
              return paymentManager
                  .paymentPayed(paymentDb, result.id)
                  .then(() => resolve(result))
                  .catch(error => reject(error))
            })
        })
      .catch(error => reject(error))
    });
  }

    static getAllPayments(user) {
    return new Promise((resolve, reject) => {
      paymentManager.getPayments(user)
        .then(result => resolve(result))
        .catch(error => reject(error));
    });

    //   paymentService.getAllPayments(paymentId)
    //     .then(result => resolve(result))
    //     .catch(error => reject(error));
    // });
  }
    static getPayment(paymentId) {
      return new Promise((resolve, reject) => {
        paymentService.getPayment(paymentId)
        .then(result => resolve(result))
        .catch(error => reject(error))
      })
    }

    static getRefounds(user, refounded) {
    return new Promise((resolve, reject) => {
      paymentManager.getRefounds(user, refounded)
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

}

exports.Payment = Payment;