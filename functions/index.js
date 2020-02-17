const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const express = require("express");
const app = express();
const db = admin.firestore();

const OFFER_URL = "/offers";

app.get(OFFER_URL, (req, res) => {
  db.collection("commission-offers")
    .get()
    .then(data => {
      let offers = [];
      data.forEach(doc => {
        offers.push(doc.data());
      });
      return res.json(offers);
    })
    .catch(err => {
      console.error(err);
    });
});

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

exports.api = functions.https.onRequest(app);
