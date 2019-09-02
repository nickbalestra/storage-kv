import fetch from "cross-fetch";

export default function API({ headers, baseURL }) {
  // TODO: Add validation/normalization for urls
  const createUrl = endpoint => `${baseURL}${endpoint}`;
  const createHeaders = (overrides = {}) => {
    return {
      "Content-Type": "application/json",
      ...headers,
      ...overrides
    };
  };

  const fetchCloudflare = (endpoint, options = {}) => {
    return fetch(createUrl(endpoint), {
      method: options.method || "get",
      headers: createHeaders(options.headers || {}),
      body: options.body
    });
  };

  return {
    async get(endpoint, options) {
      return fetchCloudflare(endpoint, options);
    },
    async post(endpoint, body, options) {
      return fetchCloudflare(endpoint, { body, method: "post", ...options });
    },
    async put(endpoint, body, options) {
      return fetchCloudflare(endpoint, { body, method: "put", ...options });
    },
    async delete(endpoint, body, options) {
      return fetchCloudflare(endpoint, { body, method: "delete", ...options });
    }
  };
}
