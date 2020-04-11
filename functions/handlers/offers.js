const { admin, db } = require("../util/admin");
const firebaseConfig = require("../util/config");
const {
  validateReplyData,
  validateReplyStatusData,
} = require("../util/validators");

const OFFER_COLLECTION = "commission-offers";
const OFFER_REPLIES_COLLECTION = "offer-reply";
const OFFER_ID_FIELD = "offerId";
const OFFER_OWNER_FIELD = "offerOwner";
const USERS_COLLECTION = "users";
const MIMETYPE_PNG = "image/png";
const MIMETYPE_jpeg = "image/jpeg";
const MIMETYPE_jpg = "image/jpg";

//Get all offers
exports.getAllOffers = (req, res) => {
  db.collection(OFFER_COLLECTION)
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let offers = [];
      data.forEach((doc) => {
        let fields = doc.data();
        offers.push({ ...fields, offerId: doc.id });
      });
      return res.json(offers);
    })
    .catch((err) => {
      console.error(err);
    });
};

//Get all replies to an offer. Must be authentiated
exports.getOfferReplies = (req, res) => {
  let offerData = {};
  db.doc(`/${OFFER_COLLECTION}/${req.params.offerId}`)
    .get()
    .then((doc) => {
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
        .then((data) => {
          offerData.replies = [];
          data.forEach((doc) => {
            let fields = doc.data();
            offerData.replies.push({ ...fields, replyId: doc.id });
          });
          return res.json(offerData);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: err.code });
        });
    });
};

//Get all replies to a user's offers
exports.getAllRepliesForUser = (req, res) => {
  let offerData = {};
  db.collection(OFFER_REPLIES_COLLECTION)
    .orderBy("createdAt", "desc")
    .where(OFFER_OWNER_FIELD, "==", req.user.handle)
    .get()
    .then((data) => {
      offerData.replies = [];
      data.forEach((doc) => {
        let fields = doc.data();
        offerData.replies.push({ ...fields, replyId: doc.id });
      });
      return res.json(offerData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

//Get an offer and info about the author
exports.getOfferWithUser = (req, res) => {
  let offerData = {};
  db.doc(`/${OFFER_COLLECTION}/${req.params.offerId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Offer not found" });
      }
      offerData = doc.data();
      offerData.offerId = doc.id;
      return db
        .doc(`/${USERS_COLLECTION}/${offerData.handle}`)
        .get()
        .then((doc) => {
          offerData.author = doc.data();
          return res.json(offerData);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: err.code });
        });
    });
};

//Post an offer
exports.postAnOffer = (req, res) => {
  const newOffer = {
    handle: req.user.handle,
    createdAt: new Date().toISOString(),
  };
  const acceptableFields = ["price", "description", "title"];
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({
    headers: req.headers,
    limits: { fileSize: 5000000 },
  });
  let imageFileName;
  let imageToBeUploaded = {};
  let hasError = false;
  let errors = {};

  busboy.on("field", (fieldname, val) => {
    if (acceptableFields.includes(fieldname)) newOffer[fieldname] = val;
    else {
      errors.fields = "wrong field submitted";
      hasError = true;
    }
  });

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (
      mimetype !== MIMETYPE_PNG &&
      mimetype !== MIMETYPE_jpeg &&
      mimetype !== MIMETYPE_jpg
    ) {
      errors.fileType = "Wrong file type submitted";
      hasError = true;
    }
    file.on("limit", () => {
      errors.fileSize = "5MB file size limt reached";
      hasError = true;
    });
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 10000000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    if (Object.keys(newOffer).length < 5)
      return res.status(400).json({ message: "Missing required fields" });
    if (hasError) return res.status(400).json(errors);
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        newOffer.imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
        db.collection(OFFER_COLLECTION)
          .add(newOffer)
          .then((doc) => {
            res.json({ message: `document ${doc.id} created successfully` });
          });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
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
    userImage: req.user.imageUrl,
    status: "open",
  };

  const { valid, errors } = validateReplyData(newReply);

  if (!valid) return res.status(400).json(errors);

  db.collection(OFFER_REPLIES_COLLECTION)
    .where("handle", "==", req.user.handle)
    .where("offerId", "==", req.params.offerId)
    .where("status", "==", "open")
    .limit(1)
    .get()
    .then((data) => {
      if (!data.empty) {
        return res.status(403).json({
          error: "You already have an active request for this listing",
        });
      } else {
        db.doc(`/${OFFER_COLLECTION}/${req.params.offerId}`)
          .get()
          .then((doc) => {
            if (!doc.exists) {
              res.status(404).json({ error: "Offer not found" });
            }
            newReply.offerOwner = doc.data().handle;
            return db.collection(OFFER_REPLIES_COLLECTION).add(newReply);
          })
          .then(() => {
            res.json(newReply);
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

//Delete offer
exports.deleteOffer = (req, res) => {
  const document = db.doc(`/${OFFER_COLLECTION}/${req.params.offerId}`);

  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Offer not found" });
      }
      if (doc.data().handle !== req.user.handle) {
        return res.status(401).json({ error: "Unauthorized" });
      } else {
        return document.delete().then(() => {
          return res.json({ message: "Offer successfully deleted" });
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

//Delete reply
exports.deleteReply = (req, res) => {
  const document = db.doc(`/${OFFER_REPLIES_COLLECTION}/${req.params.replyId}`);

  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Reply not found" });
      }
      if (doc.data().handle !== req.user.handle) {
        return res.status(401).json({ error: "Unauthorized" });
      } else {
        if (doc.data().status !== "accepted") {
          return document.delete().then(() => {
            return res.json({ message: "Reply successfully deleted" });
          });
        } else {
          return res
            .status(403)
            .json({ error: "Cannot delete accepted offers" });
        }
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

//Change status of a reply
exports.confirmReply = (req, res) => {
  let newStatus = {
    status: req.body.status,
  };

  const { valid, errors } = validateReplyStatusData(newStatus);

  if (!valid) return res.status(400).json(errors);

  db.doc(`${OFFER_REPLIES_COLLECTION}/${req.params.replyId}`)
    .get()
    .then((doc) => {
      let replyData = doc.data();
      if (!doc.exists) {
        return res.status(404).json({ error: "Reply not found" });
      } else {
        db.doc(`${OFFER_COLLECTION}/${replyData.offerId}`)
          .get()
          .then((offerDoc) => {
            if (req.user.handle !== offerDoc.data().handle) {
              return res.status(401).json({ message: "Unauthorized" });
            } else {
              db.doc(`${OFFER_REPLIES_COLLECTION}/${req.params.replyId}`)
                .update(newStatus)
                .then(() => {
                  return res.json({ message: "Status successfully updated" });
                });
            }
          });
      }
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};
