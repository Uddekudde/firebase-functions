const isEmpty = string => {
  return string.trim() === "" ? true : false;
};

const isEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return email.match(emailRegEx) ? true : false;
};

const NO_EMPTY_MESSAGE = "Must not be empty";
const VALID_EMAIL_MESSAGE = "Must be a valid email address";
const MATCH_PASSWORDS_MESSAGE = "Passwords must match";

exports.validateSignupData = data => {
  let errors = {};
  if (isEmpty(data.email)) {
    errors.email = NO_EMPTY_MESSAGE;
  } else if (!isEmail(data.email)) {
    errors.email = VALID_EMAIL_MESSAGE;
  }
  if (isEmpty(data.password)) errors.password = NO_EMPTY_MESSAGE;
  if (isEmpty(data.handle)) errors.handle = NO_EMPTY_MESSAGE;
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = MATCH_PASSWORDS_MESSAGE;

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateLoginData = data => {
  let errors = {};
  if (isEmpty(data.password)) errors.password = NO_EMPTY_MESSAGE;
  if (isEmpty(data.email)) errors.email = NO_EMPTY_MESSAGE;

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.reduceUserDetails = data => {
  let userDetails = {};

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.location.trim())) userDetails.location = data.location;
  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }

  return userDetails;
};

exports.validateReplyData = data => {
  let errors = {};
  if (isEmpty(data.description)) errors.description = NO_EMPTY_MESSAGE;
  if (isEmpty(data.name)) errors.name = NO_EMPTY_MESSAGE;
  if (isEmpty(data.deadline)) errors.deadline = NO_EMPTY_MESSAGE;

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};
