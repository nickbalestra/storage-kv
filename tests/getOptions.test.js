/* eslint-disable */

const { join } = require("path");
const getOptions = require("../src/utils/getOptions");
const constants = require("../src/constants");

afterEach(() => {
  delete process.env.KEYFILENAME;
  delete process.env.CF_ID;
  delete process.env.CF_EMAIL;
  delete process.env.CF_KEY;
});

test("Passing credential object", () => {
  const credentials = require(join(__dirname, "mockCredentials.json"));

  const options = getOptions(credentials);
  expect(options.baseURL).toBe(
    `${constants.CF_API_URL}/accounts/${credentials.id}`
  );
  expect(options.headers.common["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers.common["X-Auth-Key"]).toBe(credentials.key);
});

test("Passing path to credentialsFile.json", () => {
  const credentialsFile = join(__dirname, "mockCredentials.json");
  const credentials = require(credentialsFile);

  const options = getOptions(credentialsFile);

  expect(options.baseURL).toBe(
    `${constants.CF_API_URL}/accounts/${credentials.id}`
  );
  expect(options.headers.common["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers.common["X-Auth-Key"]).toBe(credentials.key);
});

test("Relying on path available in global env", () => {
  const credentialsFile = join(__dirname, "mockCredentials.json");
  const credentials = require(credentialsFile);

  process.env.KEYFILENAME = credentialsFile;
  const options = getOptions();

  expect(options.baseURL).toBe(
    `${constants.CF_API_URL}/accounts/${credentials.id}`
  );
  expect(options.headers.common["X-Auth-Email"]).toBe(credentials.email);
  expect(options.headers.common["X-Auth-Key"]).toBe(credentials.key);
});

test("Relying on credential available in global env", () => {
  const CF_ID = "002";
  const CF_KEY = "123ABC";
  const CF_EMAIL = "john@doe.com";

  process.env.CF_ID = CF_ID;
  process.env.CF_EMAIL = CF_EMAIL;
  process.env.CF_KEY = CF_KEY;
  const options = getOptions();

  expect(options.baseURL).toBe(`${constants.CF_API_URL}/accounts/${CF_ID}`);
  expect(options.headers.common["X-Auth-Email"]).toBe(CF_EMAIL);
  expect(options.headers.common["X-Auth-Key"]).toBe(CF_KEY);
});
