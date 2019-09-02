import { join } from "path";
import {
  CF_API_URL,
  CF_EMAIL_ENV_NAME,
  CF_ID_ENV_NAME,
  CF_KEYFILENAME_ENV_NAME,
  CF_KEY_ENV_NAME
} from "../src/constants";
import createConfig from "../src/cf/createConfig";

const CREDENTIALS_PATH = join(__dirname, "mockCredentials.json");
const readCredentials = async () => await import(CREDENTIALS_PATH);
const clearProcess = () => {
  delete process.env[CF_KEYFILENAME_ENV_NAME];
  delete process.env.CF_ID;
  delete process.env[CF_EMAIL_ENV_NAME];
  delete process.env.CF_KEY;
};

test("passing credential object", async () => {
  expect.assertions(3);

  const credentials = await readCredentials();
  const options = await createConfig({ credentials });

  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${credentials.id}`);
  expect(options.headers["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers["X-Auth-Key"]).toBe(credentials.key);
});

test("passing path to credentialsFile.json", async () => {
  expect.assertions(3);

  const credentials = await readCredentials();
  const options = await createConfig({ keyFilename: CREDENTIALS_PATH });

  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${credentials.id}`);
  expect(options.headers["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers["X-Auth-Key"]).toBe(credentials.key);
});

test("relying on path available in global env", async () => {
  expect.assertions(3);

  process.env[CF_KEYFILENAME_ENV_NAME] = CREDENTIALS_PATH;
  const credentials = await readCredentials();
  const options = await createConfig();

  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${credentials.id}`);
  expect(options.headers["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers["X-Auth-Key"]).toBe(credentials.key);
  clearProcess();
});

test("relying on credential available in global env", async () => {
  expect.assertions(3);

  const CF_ID = "002";
  const CF_KEY = "123ABC";
  const CF_EMAIL = "john@doe.com";

  process.env[CF_ID_ENV_NAME] = CF_ID;
  process.env[CF_EMAIL_ENV_NAME] = CF_EMAIL;
  process.env[CF_KEY_ENV_NAME] = CF_KEY;
  const options = await createConfig();

  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${CF_ID}`);
  expect(options.headers["X-Auth-Email"]).toBe(CF_EMAIL);
  expect(options.headers["X-Auth-Key"]).toBe(CF_KEY);
  clearProcess();
});
