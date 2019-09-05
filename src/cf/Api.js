import fetch from "cross-fetch";

export default class API {
  constructor({ headers, baseURL }) {
    // TODO: Add validation/normalization for urls
    const createUrl = endpoint => `${baseURL}${endpoint}`;
    const createHeaders = (overrides = {}) => ({
      "Content-Type": "application/json",
      ...headers,
      ...overrides
    });

    this.#fetchCloudflare = (endpoint, options = {}) =>
      fetch(createUrl(endpoint), {
        method: options.method,
        headers: createHeaders(options.headers),
        body: options.body
      });
  }

  #fetchCloudflare;

  get = async (endpoint, options) =>
    this.#fetchCloudflare(endpoint, { method: "get", ...options });

  post = async (endpoint, body, options) =>
    this.#fetchCloudflare(endpoint, {
      body,
      method: "post",
      ...options
    });

  put = async (endpoint, body, options) =>
    this.#fetchCloudflare(endpoint, { body, method: "put", ...options });

  delete = async (endpoint, body, options) =>
    this.#fetchCloudflare(endpoint, {
      body,
      method: "delete",
      ...options
    });
}
