import Api from "../src/cf/Api";
import createConfig from "../src/cf/createConfig";

import { join } from "path";
import fetch from "cross-fetch";
jest.mock("cross-fetch", () => {
  return jest.fn(async (...params) =>
    Promise.resolve({
      async json() {
        return { result: "ok" };
      }
    })
  );
});

const configureApi = async () => {
  const config = await createConfig({
    keyFilename: join(__dirname, "mockCredentials.json")
  });
  return [new Api(config), config];
};

describe("api class", () => {
  it("correctly istantiate", async () => {
    expect.assertions(1);

    const [api] = await configureApi();
    expect(api).toBeInstanceOf(Api);
  });

  it.each`
    method      | endpoint            | body
    ${"get"}    | ${"/endpoin/one"}   | ${undefined}
    ${"post"}   | ${"/endpoin/two"}   | ${"postData"}
    ${"put"}    | ${"/endpoin/three"} | ${"putData"}
    ${"delete"} | ${"/endpoin/four"}  | ${"deleteData"}
  `("fetch $method call for $endpoint", async ({ method, endpoint, body }) => {
    expect.assertions(2);

    const [api, { baseURL, headers }] = await configureApi();
    const response = body
      ? await api[method](endpoint, body)
      : await api[method](endpoint);
    const { result } = await response.json();

    expect(result).toBe("ok");
    expect(fetch).toHaveBeenCalledWith(`${baseURL}${endpoint}`, {
      body,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    });

    fetch.mockClear();
  });
});
