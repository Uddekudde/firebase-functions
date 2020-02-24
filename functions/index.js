const functions = require("firebase-functions");
const express = require("express");
const app = express();
const {
  getAllOffers,
  postAnOffer,
  getOfferReplies,
  postOfferReply,
  deleteOffer,
  deleteReply
} = require("./handlers/offers");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getUserInfo
} = require("./handlers/users");
const { FBAuth } = require("./util/fbAuth");
const { db } = require("./util/admin");

const OFFER_REPLIES_COLLECTION = "offer-reply";
const OFFER_COLLECTION = "commission-offers";
const NOTIFICATIONS_COLLECTION = "/notifications";

const REGION_EUROPE = "europe-west1";

const OFFERS_ROUTE = "/offers";
const OFFER_ROUTE = "/offer";
const SIGNUP_ROUTE = "/signup";
const LOGIN_ROUTE = "/login";
const IMAGE_ROUTE = "/user/image";
const USER_INFO_ROUTE = "/user";
const OFFER_REPLIES_ROUTE = "/replies/:offerId";
const REPLY_ROUTE = `${OFFER_ROUTE}/:offerId/reply`;
const OFFER_SINGLE_ROUTE = `${OFFER_ROUTE}/:offerId`;
const REPLY_SINGLE_ROUTE = "/reply/:replyId";

//Offer routes
app.get(OFFERS_ROUTE, getAllOffers);
app.post(OFFER_ROUTE, FBAuth, postAnOffer);
app.get(OFFER_REPLIES_ROUTE, FBAuth, getOfferReplies);
app.post(REPLY_ROUTE, FBAuth, postOfferReply);
app.delete(OFFER_SINGLE_ROUTE, FBAuth, deleteOffer);
app.delete(REPLY_SINGLE_ROUTE, FBAuth, deleteReply);
//TODO: get my offers

//Users routes
app.post(SIGNUP_ROUTE, signup);
app.post(LOGIN_ROUTE, login);
app.post(IMAGE_ROUTE, FBAuth, uploadImage);
app.post(USER_INFO_ROUTE, FBAuth, addUserDetails);
app.get(USER_INFO_ROUTE, FBAuth, getUserInfo);

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
          return db.doc(`${NOTIFICATIONS_COLLECTION}/${snapshot.id}`).set({
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
