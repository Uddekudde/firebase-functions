const functions = require("firebase-functions");
const express = require("express");
const app = express();
const { getAllOffers, postAnOffer } = require("./handlers/offers");
const { signup, login } = require("./handlers/users");
const { FBAuth } = require("./util/fbAuth");

const OFFER_ROUTE = "/offers";
const SIGNUP_ROUTE = "/signup";
const LOGIN_ROUTE = "/login";

//Offer routes
app.get(OFFER_ROUTE, getAllOffers);
app.post(OFFER_ROUTE, FBAuth, postAnOffer);

//Users routes
app.post(SIGNUP_ROUTE, signup);
app.post(LOGIN_ROUTE, login);

exports.api = functions.region("europe-west1").https.onRequest(app);
