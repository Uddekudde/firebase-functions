const { db } = require("../util/admin");
const { validateReplyData } = require("../util/validators");

const OFFER_COLLECTION = "commission-offers";
const OFFER_REPLIES_COLLECTION = "offer-reply";
const OFFER_ID_FIELD = "offerId";

//Get all offers
exports.getAllOffers = (req, res) => {
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
          handle: doc.data().handle,
          example: doc.data().example,
          createdAt: doc.data().createdAt
        });
      });
      return res.json(offers);
    })
    .catch(err => {
      console.error(err);
    });
};

//Get all replies to an offer. Must be authentiated
exports.getOfferReplies = (req, res) => {
  let offerData = {};
  db.doc(`/${OFFER_COLLECTION}/${req.params.offerId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Offer not found" });
      }
      offerData = doc.data();
      if (req.user.handle !== offerData.handle) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      offerData.offerId = doc.id;
      return db
        .collection(OFFER_REPLIES_COLLECTION)
        .orderBy("createdAt", "desc")
        .where(OFFER_ID_FIELD, "==", req.params.offerId)
        .get()
        .then(data => {
          offerData.replies = [];
          data.forEach(doc => {
            offerData.replies.push(doc.data());
          });
          return res.json(offerData);
        })
        .catch(err => {
          console.log(err);
          res.status(500).json({ error: err.code });
        });
    });
};

//Post an offer
exports.postAnOffer = (req, res) => {
  const newOffer = {
    cancellation: req.body.cancellation,
    description: req.body.description,
    price: req.body.price,
    handle: req.user.handle,
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
};

//Post reply to an offer
exports.postOfferReply = (req, res) => {
  const newReply = {
    description: req.body.description,
    name: req.body.name,
    deadline: req.body.deadline,
    handle: req.user.handle,
    createdAt: new Date().toISOString(),
    offerId: req.params.offerId,
    userImage: req.user.imageUrl
  };

  const { valid, errors } = validateReplyData(newReply);

  if (!valid) return res.status(400).json(errors);

  db.doc(`/${OFFER_COLLECTION}/${req.params.offerId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Offer not found" });
      }
      return db.collection(OFFER_REPLIES_COLLECTION).add(newReply);
    })
    .then(() => {
      res.json(newReply);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "Something went wrong" });
    });
};
