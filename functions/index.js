const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const express = require("express");
const app = express();
const db = admin.firestore();

const OFFER_URL = "/offers";
const OFFER_COLLECTION = "commission-offers";

app.get(OFFER_URL, (req, res) => {
  db.collection(OFFER_COLLECTION)
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let offers = [];
      data.forEach(doc => {
        offers.push({
          offerId: doc.id,
          cancellation: doc.data().cancellation,
          description: doc.data().description,
          price: doc.data().price,
          userId: doc.data().userId,
          example: doc.data().example,
          createdAt: doc.data().createdAt
        });
      });
      return res.json(offers);
    })
    .catch(err => {
      console.error(err);
    });
});

app.post(OFFER_URL, (req, res) => {
  const newOffer = {
    cancellation: req.body.cancellation,
    description: req.body.description,
    price: req.body.price,
    userId: req.body.userId,
    example: req.body.example,
    createdAt: new Date().toISOString()
  };

  db.collection(OFFER_COLLECTION)
    .add(newOffer)
    .then(doc => {
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch(err => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
});

exports.api = functions.region('europe-west1').https.onRequest(app);
