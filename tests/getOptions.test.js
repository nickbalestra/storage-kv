/* eslint-disable */

const { join } = require("path");
const getOptions = require("../src/utils/getOptions");
const {
  CF_API_URL,
  CF_KEYFILENAME_ENV_NAME,
  CF_EMAIL_ENV_NAME,
  CF_ID_ENV_NAME,
  CF_KEY_ENV_NAME
} = require("../src/constants");

afterEach(() => {
  delete process.env[CF_KEYFILENAME_ENV_NAME];
  delete process.env.CF_ID;
  delete process.env[CF_EMAIL_ENV_NAME];
  delete process.env.CF_KEY;
});

test("Passing credential object", () => {
  const credentials = require(join(__dirname, "mockCredentials.json"));

  const options = getOptions(credentials);
  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${credentials.id}`);
  expect(options.headers.common["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers.common["X-Auth-Key"]).toBe(credentials.key);
});

test("Passing path to credentialsFile.json", () => {
  const credentialsFile = join(__dirname, "mockCredentials.json");
  const credentials = require(credentialsFile);

  const options = getOptions(credentialsFile);

  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${credentials.id}`);
  expect(options.headers.common["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers.common["X-Auth-Key"]).toBe(credentials.key);
});

test("Relying on path available in global env", () => {
  const credentialsFile = join(__dirname, "mockCredentials.json");
  const credentials = require(credentialsFile);

  process.env[CF_KEYFILENAME_ENV_NAME] = credentialsFile;
  const options = getOptions();

  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${credentials.id}`);
  expect(options.headers.common["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers.common["X-Auth-Key"]).toBe(credentials.key);
});

test("Relying on credential available in global env", () => {
  const CF_ID = "002";
  const CF_KEY = "123ABC";
  const CF_EMAIL = "john@doe.com";

  process.env[CF_ID_ENV_NAME] = CF_ID;
  process.env[CF_EMAIL_ENV_NAME] = CF_EMAIL;
  process.env[CF_KEY_ENV_NAME] = CF_KEY;
  const options = getOptions();

  expect(options.baseURL).toBe(`${CF_API_URL}/accounts/${CF_ID}`);
  expect(options.headers.common["X-Auth-Email"]).toBe(CF_EMAIL);
  expect(options.headers.common["X-Auth-Key"]).toBe(CF_KEY);
});
