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

const OFFER_ROUTE = "/offers";
const OFFER_COLLECTION = "commission-offers";
const SIGNUP_ROUTE = "/signup";
const LOGIN_ROUTE = "/login";
const EMAIL_TAKEN_ERROR = "auth/email-already-in-use";
const WRONG_PASSWORD_ERROR = "auth/wrong-password";

app.get(OFFER_ROUTE, (req, res) => {
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

app.post(OFFER_ROUTE, (req, res) => {
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

const isEmpty = string => {
  return string.trim() === "" ? true : false;
};

const isEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return email.match(emailRegEx) ? true : false;
};

app.post(SIGNUP_ROUTE, (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    handle: req.body.handle,
    confirmPassword: req.body.confirmPassword
  };

  let errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address";
  }
  if (isEmpty(newUser.password)) errors.password = "Must not be empty";
  if (isEmpty(newUser.handle)) errors.handle = "Must not be empty";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Passwords must match";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

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
    })
    .then(() => {
      return res.status(200).json({ token });
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

app.post(LOGIN_ROUTE, (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };
  let errors = {};
  if (isEmpty(user.password)) errors.password = "Must not be empty";
  if (isEmpty(user.email)) errors.email = "Must not be empty";
  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      return err.code === WRONG_PASSWORD_ERROR
        ? res
            .status(403)
            .json({ general: "Wrong credentials, please try again" })
        : res.status(500).json({ error: err.code });
    });
});

exports.api = functions.region("europe-west1").https.onRequest(app);
