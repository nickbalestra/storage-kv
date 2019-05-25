/* eslint-disable global-require, no-param-reassign, import/no-dynamic-require, no-nested-ternary */
const { join } = require("path");
const { CF_API_URL, CREDENTIALS_FILENAME } = require("./../constants.js");

module.exports = credentials => {
  if (typeof credentials === "string") {
    credentials = require(credentials);
  }
  if (!credentials) {
    credentials = process.env.KEYFILENAME
      ? require(process.env.KEYFILENAME)
      : process.env.CF_EMAIL && process.env.CF_ID && process.env.CF_KEY
      ? {
          id: process.env.CF_ID,
          email: process.env.CF_EMAIL,
          key: process.env.CF_KEY
        }
      : require(join(process.cwd(), CREDENTIALS_FILENAME));
  }

  return {
    baseURL: `${CF_API_URL}/accounts/${credentials.id}`,
    headers: {
      common: {
        "X-Auth-Email": credentials.email,
        "X-Auth-Key": credentials.key
      }
    }
  };
};
