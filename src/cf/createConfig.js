import { join } from "path";
import {
  CF_API_URL,
  CF_CREDENTIALS_FILENAME,
  CF_EMAIL_ENV_NAME,
  CF_ID_ENV_NAME,
  CF_KEYFILENAME_ENV_NAME,
  CF_KEY_ENV_NAME
} from "../constants.js";

export default async function createConfig(configData = {}) {
  let { keyFilename = null, credentials = null } = configData;

  if (keyFilename && typeof keyFilename === "string") {
    credentials = await importJSON(keyFilename);
  }
  if (!credentials) {
    credentials = process.env[CF_KEYFILENAME_ENV_NAME]
      ? await importJSON(process.env[CF_KEYFILENAME_ENV_NAME])
      : process.env[CF_EMAIL_ENV_NAME] &&
        process.env[CF_ID_ENV_NAME] &&
        process.env[CF_KEY_ENV_NAME]
      ? {
          email: process.env[CF_EMAIL_ENV_NAME],
          id: process.env[CF_ID_ENV_NAME],
          key: process.env[CF_KEY_ENV_NAME]
        }
      : await importJSON(join(process.cwd(), CF_CREDENTIALS_FILENAME));
  }

  return {
    baseURL: `${CF_API_URL}/accounts/${credentials.id}`,
    headers: {
      "X-Auth-Email": credentials.email,
      "X-Auth-Key": credentials.key
    }
  };
}

async function importJSON(path) {
  const module = await import(path);
  return module.default;
}
