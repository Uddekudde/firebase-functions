const functions = require("firebase-functions");
const express = require("express");
const app = express();
const { getAllOffers, postAnOffer, getOfferReplies } = require("./handlers/offers");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getUserInfo
} = require("./handlers/users");
const { FBAuth } = require("./util/fbAuth");

const OFFER_ROUTE = "/offers";
const SIGNUP_ROUTE = "/signup";
const LOGIN_ROUTE = "/login";
const IMAGE_ROUTE = "/user/image";
const USER_INFO_ROUTE = "/user";

//Offer routes
app.get(OFFER_ROUTE, getAllOffers);
app.post(OFFER_ROUTE, FBAuth, postAnOffer);
app.get(`${OFFER_ROUTE}/:offerId`, FBAuth, getOfferReplies);
//TODO: delete offer
//TODO: get my offers

//Users routes
app.post(SIGNUP_ROUTE, signup);
app.post(LOGIN_ROUTE, login);
app.post(IMAGE_ROUTE, FBAuth, uploadImage);
app.post(USER_INFO_ROUTE, FBAuth, addUserDetails);
app.get(USER_INFO_ROUTE, FBAuth, getUserInfo);

exports.api = functions.region("europe-west1").https.onRequest(app);
