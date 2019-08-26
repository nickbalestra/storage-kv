import { join } from "path";
import {
  CF_API_URL,
  CF_CREDENTIALS_FILENAME,
  CF_EMAIL_ENV_NAME,
  CF_ID_ENV_NAME,
  CF_KEYFILENAME_ENV_NAME,
  CF_KEY_ENV_NAME
} from "./../constants.js";

export default function(credentials) {
  if (typeof credentials === "string") {
    credentials = require(credentials);
  }
  if (!credentials) {
    credentials = process.env[CF_KEYFILENAME_ENV_NAME]
      ? require(process.env[CF_KEYFILENAME_ENV_NAME])
      : process.env[CF_EMAIL_ENV_NAME] &&
        process.env[CF_ID_ENV_NAME] &&
        process.env[CF_KEY_ENV_NAME]
      ? {
          email: process.env[CF_EMAIL_ENV_NAME],
          id: process.env[CF_ID_ENV_NAME],
          key: process.env[CF_KEY_ENV_NAME]
        }
      : require(join(process.cwd(), CF_CREDENTIALS_FILENAME));
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
}
