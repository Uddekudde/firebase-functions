const functions = require("firebase-functions");
const express = require("express");
const app = express();
const {
  getAllOffers,
  postAnOffer,
  getOfferReplies,
  postOfferReply
} = require("./handlers/offers");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getUserInfo
} = require("./handlers/users");
const { FBAuth } = require("./util/fbAuth");

const OFFERS_ROUTE = "/offers";
const OFFER_ROUTE = "/offer";
const SIGNUP_ROUTE = "/signup";
const LOGIN_ROUTE = "/login";
const IMAGE_ROUTE = "/user/image";
const USER_INFO_ROUTE = "/user";
const OFFER_REPLIES_ROUTE = "/replies/:offerId";
const REPLY_ROUTE = `${OFFER_ROUTE}/:offerId/reply`;

//Offer routes
app.get(OFFERS_ROUTE, getAllOffers);
app.post(OFFER_ROUTE, FBAuth, postAnOffer);
app.get(OFFER_REPLIES_ROUTE, FBAuth, getOfferReplies);
app.post(REPLY_ROUTE, FBAuth, postOfferReply);
//TODO: delete offer
//TODO: get my offers

//Users routes
app.post(SIGNUP_ROUTE, signup);
app.post(LOGIN_ROUTE, login);
app.post(IMAGE_ROUTE, FBAuth, uploadImage);
app.post(USER_INFO_ROUTE, FBAuth, addUserDetails);
app.get(USER_INFO_ROUTE, FBAuth, getUserInfo);

exports.api = functions.region("europe-west1").https.onRequest(app);
