const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const express = require("express");
const app = express();
const db = admin.firestore();
const firebaseConfig = {
  apiKey: "AIzaSyCnBTStqlzH7Q_r6bRhbkLRa9uZ0yujEiM",
  authDomain: "commissionalpaca.firebaseapp.com",
  databaseURL: "https://commissionalpaca.firebaseio.com",
  projectId: "commissionalpaca",
  storageBucket: "commissionalpaca.appspot.com",
  messagingSenderId: "380478815116",
  appId: "1:380478815116:web:1bcb529482b344d44534a9",
  measurementId: "G-VCMSL5DZZ2"
};

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

const OFFER_URL = "/offers";
const OFFER_COLLECTION = "commission-offers";
const SIGNUP_URL = "/signup";
const EMAIL_TAKEN_ERROR = "auth/email-already-in-use";

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

app.post(SIGNUP_URL, (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    handle: req.body.handle,
    confirmPassword: req.body.confirmPassword
  };

  //TODO: validate data
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        handle: newUser.handle,
        createdAt: new Date().toISOString(),
        userId
      };
      db.doc(`/users/${newUser.handle}`).set(userCredentials);
    }).then(()=>{
      return res.status(200).json({token})
    })
    .catch(err => {
      console.error(err);
      if (err.code === EMAIL_TAKEN_ERROR) {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

exports.api = functions.region("europe-west1").https.onRequest(app);
