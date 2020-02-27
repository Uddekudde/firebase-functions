const functions = require("firebase-functions");
const express = require("express");
const app = express();
const {
  getAllOffers,
  postAnOffer,
  getOfferReplies,
  postOfferReply,
  deleteOffer,
  deleteReply,
  confirmReply
} = require("./handlers/offers");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getMyUserInfo,
  getUserInfo,
  markNotificationsRead
} = require("./handlers/users");
const { FBAuth } = require("./util/fbAuth");
const { db } = require("./util/admin");

const OFFER_REPLIES_COLLECTION = "offer-reply";
const OFFER_COLLECTION = "commission-offers";
const NOTIFICATIONS_COLLECTION = "notifications";
const USERS_COLLECTION = "users";

const REGION_EUROPE = "europe-west1";

const OFFERS_ROUTE = "/offers";
const OFFER_ROUTE = "/offer";
const SIGNUP_ROUTE = "/signup";
const LOGIN_ROUTE = "/login";
const IMAGE_ROUTE = "/user/image";
const USER_INFO_ROUTE = "/user";
const SPECIFIC_USER_INFO_ROUTE = `${USER_INFO_ROUTE}/:handle`;
const OFFER_REPLIES_ROUTE = "/replies/:offerId";
const REPLY_ROUTE = `${OFFER_ROUTE}/:offerId/reply`;
const OFFER_SINGLE_ROUTE = `${OFFER_ROUTE}/:offerId`;
const REPLY_SINGLE_ROUTE = "/reply/:replyId";
const NOTIFICATIONS_ROUTE = "/notifications";

//Offer routes
app.get(OFFERS_ROUTE, getAllOffers);
app.post(OFFER_ROUTE, FBAuth, postAnOffer);
app.get(OFFER_REPLIES_ROUTE, FBAuth, getOfferReplies);
app.post(REPLY_ROUTE, FBAuth, postOfferReply);
app.delete(OFFER_SINGLE_ROUTE, FBAuth, deleteOffer);
app.delete(REPLY_SINGLE_ROUTE, FBAuth, deleteReply);
app.post(REPLY_SINGLE_ROUTE, FBAuth, confirmReply);

//Users routes
app.post(SIGNUP_ROUTE, signup);
app.post(LOGIN_ROUTE, login);
app.post(IMAGE_ROUTE, FBAuth, uploadImage);
app.get(SPECIFIC_USER_INFO_ROUTE, getUserInfo);
app.post(USER_INFO_ROUTE, FBAuth, addUserDetails);
app.get(USER_INFO_ROUTE, FBAuth, getMyUserInfo);
app.post(NOTIFICATIONS_ROUTE, FBAuth, markNotificationsRead);

exports.api = functions.region(REGION_EUROPE).https.onRequest(app);

exports.createNotificationOnReply = functions
  .region(REGION_EUROPE)
  .firestore.document(`${OFFER_REPLIES_COLLECTION}/{id}`)
  .onCreate(snapshot => {
    return db
      .doc(`${OFFER_COLLECTION}/${snapshot.data().offerId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/${NOTIFICATIONS_COLLECTION}/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            sender: snapshot.data().handle,
            recipient: doc.data().handle,
            type: "reply",
            read: false,
            offerId: doc.id
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

exports.deleteNotificationOnDeletedReply = functions
  .region(REGION_EUROPE)
  .firestore.document(`${OFFER_REPLIES_COLLECTION}/{id}`)
  .onDelete(snapshot => {
    return db
      .doc(`/${NOTIFICATIONS_COLLECTION}/${snapshot.id}`)
      .delete()
      .catch(err => {
        console.error(err);
      });
  });

exports.onUserImageCHange = functions
  .region(REGION_EUROPE)
  .firestore.document(`/${USERS_COLLECTION}/{userId}`)
  .onUpdate(change => {
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      let batch = db.batch();
      return db
        .collection(OFFER_REPLIES_COLLECTION)
        .where("handle", "==", change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const offer = db.doc(`/${OFFER_REPLIES_COLLECTION}/${doc.id}`);
            batch.update(offer, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onOfferDelete = functions
  .region(REGION_EUROPE)
  .firestore.document(`/${OFFER_COLLECTION}/{offerId}`)
  .onDelete((snapshot, context) => {
    const offerId = context.params.offerId;
    const batch = db.batch();

    return db
      .collection(OFFER_REPLIES_COLLECTION)
      .where("offerId", "==", offerId)
      .get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/${OFFER_REPLIES_COLLECTION}/${doc.id}`));
        });
        return db
          .collection(NOTIFICATIONS_COLLECTION)
          .where("offerId", "==", offerId).get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/${NOTIFICATIONS_COLLECTION}/${doc.id}`));
        });
        return batch.commit();
      });
  });
