import useCloudflare from "./cf/useCloudflare.js";

// storage = new StorageArea(name)
// Creates a new StorageArea that provides an async key/value store view
// onto an Cloudflare KV namespace named `${name}`.
// This does not actually open or create the kv namespace  on Cloudflare yet;
// that is done lazily when other methods are called.
// This means that all other methods can reject with database-related exceptions in failure cases.
export class StorageArea {
  constructor(name, options = {}) {
    this.#lazy = useCloudflare({
      name,
      credentials: options.credentials,
      keyFilename: options.keyFilename
    });
  }

  // await storage.set(key, value, options)
  // Asynchronously stores the given value so that it can later be retrieved by the given key.
  // Keys have to be of type string
  // Values types are automatically inferred and can be any of [string, ReadableStream, ArrayBuffer, FormData]
  // You can set keys to be automatically deleted at some time in the future, options support:
  // - expiration (second since epoch)
  // - expiration_ttl (seconds from now)
  // The returned promise will fulfill with undefined on success.
  async set(key, value, options = {}) {
    // Handle bulk writes
    if (Array.isArray(key)) {
      return this.#bulkSet(key);
    }

    // Setting a key to undefined is the same of deleting that key
    if (value === undefined) {
      return this.delete(key);
    }

    const [api, namespace] = await this.#lazy();

    let params = "";
    if (options.expiration) {
      params = `?expiration=${options.expiration}`;
    }
    if (options.expiration_ttl) {
      params = `?expiration_ttl=${options.expiration_ttl}`;
    }

    const response = await api.put(
      `/storage/kv/namespaces/${namespace.id}/values/${key}${params}`,
      value
    );

    // TODO: fully handle response.errrors
    if (responseIsJson(response)) {
      const json = await response.json();
      if (!json.sucess && json.errors && json.errors.length) {
        const { code, message } = json.errors[0];
        switch (code) {
          default:
            return message;
        }
      }
    }

    return;
  }

  // value = await storage.get(key)
  // Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.
  // Values retrieved will be deserialized from their original form as specified in options.type
  // type: text (default) | json | arrayBuffer | stream | buffer
  async get(key, options = {}) {
    const [api, namespace] = await this.#lazy();

    const response = await api.get(
      `/storage/kv/namespaces/${namespace.id}/values/${key}`
    );

    if (responseIsJson(response) || options.type === "json") {
      const json = await response.json();

      // TODO: fully handle response.errrors
      if (!json.sucess && json.errors && json.errors.length) {
        const { code, message } = json.errors[0];
        switch (code) {
          case 10009:
            return;
          default:
            return message;
        }
      }
      return json;
    }

    switch (options.type) {
      case "arrayBuffer":
        return await response.arrayBuffer();
      case "stream":
        return response.body;
      case "buffer":
        return await response.buffer();
      default:
        return await response.text();
    }
  }

  // await storage.delete(key)
  // Asynchronously deletes the entry at the given key.
  // This is equivalent to storage.set(key, undefined).
  // The returned promise will fulfill with undefined on success.
  async delete(key) {
    // Handle bulk deletes
    if (Array.isArray(key)) {
      return this.#bulkDelete(key);
    }

    const [api, namespace] = await this.#lazy();

    await api.delete(`/storage/kv/namespaces/${namespace.id}/values/${key}`);
    return;
  }

  // Asynchronously deletes all entries in this storage area.
  // This is done by actually deleting the underlying Cloudflare KV Storage.
  // As such, it always can be used as a fail-safe to get a clean slate
  // The returned promise will fulfill with undefined on success.
  async clear() {
    const [api, namespace] = await this.#lazy({
      onlyIfExist: true
    });
    if (namespace) {
      const response = await api.delete(
        `/storage/kv/namespaces/${namespace.id}`
      );
      const json = await response.json();
      if (json.success) {
        await namespace.clear();
        return;
      }
      return json.errors[0];
    }
  }

  // Retrieves an async iterator containing the keys of all entries in this storage area.
  // Keys will be yielded in ascending order;
  async *keys(options = {}) {
    const [api, namespace] = await this.#lazy();

    const limitParams = options.limit ? `?limit=${options.limit}` : "";
    let url = `/storage/kv/namespaces/${namespace.id}/keys${limitParams}`;

    while (url) {
      // TODO: fully handle response.errrors
      const response = await api.get(url);
      const {
        success,
        result: keys,
        result_info: { cursor }
      } = await response.json();

      if (success && cursor) {
        const cursorParams = limitParams
          ? `&cursor=${cursor}`
          : `?cursor=${cursor}`;
        url = `/storage/kv/namespaces/${namespace.id}/keys${limitParams}${cursorParams}`;
      } else {
        url = null;
      }

      for (const { name } of keys) {
        yield name;
      }
    }
  }

  // Retrieves an async iterator containing the values of all entries in this storage area.
  // Values will be ordered as corresponding to their keys; see keys().
  async *values(options = {}) {
    const [api, namespace] = await this.#lazy();

    const limitParams = options.limit ? `?limit=${options.limit}` : "";
    let url = `/storage/kv/namespaces/${namespace.id}/keys${limitParams}`;

    while (url) {
      // TODO: fully handle response.errrors
      const response = await api.get(url);
      const {
        success,
        result: keys,
        result_info: { cursor }
      } = await response.json();

      if (success && cursor) {
        const cursorParams = limitParams
          ? `&cursor=${cursor}`
          : `?cursor=${cursor}`;
        url = `/storage/kv/namespaces/${namespace.id}/keys${limitParams}${cursorParams}`;
      } else {
        url = null;
      }

      // TODO: return values in different format as per get
      // TODO: fully handle response.errrors
      const valueRequests = await Promise.all(
        keys.map(({ name }) =>
          api.get(`/storage/kv/namespaces/${namespace.id}/values/${name}`)
        )
      );
      for await (const valueResponse of valueRequests) {
        const value = await valueResponse.text();
        yield value;
      }
    }
  }

  // Retrieves an async iterator containing the [keys, values] of all entries in this storage area.
  // Entries will be ordered as corresponding to their keys; see keys().
  async *entries(options = {}) {
    const [api, namespace] = await this.#lazy();

    const limitParams = options.limit ? `?limit=${options.limit}` : "";
    let url = `/storage/kv/namespaces/${namespace.id}/keys${limitParams}`;

    while (url) {
      // TODO: fully handle response.errrors
      const response = await api.get(url);
      const {
        success,
        result: keys,
        result_info: { cursor }
      } = await response.json();

      if (success && cursor) {
        const cursorParams = limitParams
          ? `&cursor=${cursor}`
          : `?cursor=${cursor}`;
        url = `/storage/kv/namespaces/${namespace.id}/keys${limitParams}${cursorParams}`;
      } else {
        url = null;
      }

      // TODO: return values in different format as per get
      // TODO: fully handle response.errrors
      const valueRequests = await Promise.all(
        keys.map(({ name }) =>
          api.get(`/storage/kv/namespaces/${namespace.id}/values/${name}`)
        )
      );

      for await (const [index, valueResponse] of valueRequests.entries()) {
        const key = keys[index].name;
        const value = await valueResponse.text();
        yield [key, value];
      }
    }
  }

  // const [api, namespace] = await this.#lazy();
  // Access initialized namespace and configured api
  // Namespace will be initialized on CF if not found
  #lazy;

  // await storage.set([{ key, value, ...options }])
  // options support: expiration, expiration_ttl and base64
  #bulkSet = async keys => {
    const [api, namespace] = await this.#lazy();

    const response = await api.put(
      `/storage/kv/namespaces/${namespace.id}/bulk`,
      JSON.stringify(keys)
    );

    // TODO: fully handle response.errrors
    if (responseIsJson(response)) {
      const json = await response.json();
      if (!json.sucess && json.errors && json.errors.length) {
        const { code, message } = json.errors[0];
        switch (code) {
          default:
            return message;
        }
      }
    }
    return;
  };

  // await storage.delete(['key', 'another-key'])
  #bulkDelete = async keys => {
    const [api, namespace] = await this.#lazy();

    const response = await api.delete(
      `/storage/kv/namespaces/${namespace.id}/bulk`,
      JSON.stringify(keys)
    );

    // TODO: fully handle response.errrors
    if (responseIsJson(response)) {
      const json = await response.json();
      if (!json.sucess && json.errors && json.errors.length) {
        const { code, message } = json.errors[0];
        switch (code) {
          default:
            return message;
        }
      }
    }
    return;
  };
}

function responseIsJson(response) {
  return response.headers.get("content-type").includes("application/json");
}
