/* eslint-disable no-param-reassign */

const axios = require("axios");
const getOptions = require("./utils/getOptions.js");

const initialize = async (storage, options = {}) => {
  {
    const { data } = await storage.req({ url: "/storage/kv/namespaces" });
    if (data.success && data.result && data.result.length) {
      const namespace = data.result.find(ns => ns.title === storage.name);
      if (namespace) {
        storage.id = namespace.id;
        return;
      }
    }
  }
  if (options.onlyIfAvail) {
    return;
  }

  const { data } = await storage.req({
    method: "post",
    url: "/storage/kv/namespaces",
    data: { title: storage.name }
  });

  if (data.success && data.result) {
    storage.id = data.result.id;
    return;
  }

  throw new Error(JSON.stringify(data.errors));
};

class StorageArea {
  constructor(name, options = {}) {
    // keyFilename: '/path/to/keyFilename.json',
    // credentials: require('/path/to/keyFilename.json')
    // if both are undefined it will look for credential [CF_KEY, CF_ID, CF_EMAIL] or KEYFILENAME on global envs
    // otherwise default to cwd/credentials.json
    this.req = axios.create(
      getOptions(options.keyFilename || options.credentials)
    );

    this.name = name;
    // KV namespace creation is done lazily when other methods are called.
    // This means that all other methods can reject with namespace-related exceptions in failure cases
    this.id = null;
  }

  // Asynchronously stores the given value so that it can later be retrieved by the given key.
  // Keys have to be of type string.
  // Values types are automatically inferred and can be any of [string, ReadableStream, ArrayBuffer, FormData]
  // You can set keys to be automatically deleted at some time in the future, options support:
  // - exp (second since epoch)
  // - ttl (seconds from now)
  // The returned promise will fulfill with undefined on success.
  // Can set multiple entries by passing an array of [{key, value, ...options}]
  // TODO: Invalid keys will cause the returned promise to reject with a "DataError" DOMException.
  // TODO: Replace multiple entry insertions with bulk endpoint API once available
  async set(key, value, options = {}) {
    let entries;
    if (Array.isArray(key)) {
      entries = key;
      options = value;
    } else {
      entries = [{ key, value, ...options }];
    }

    if (!this.id) {
      await initialize(this);
    }

    entries = entries.map(entry => {
      let params = "";
      if (entry.exp || options.exp) {
        params = `?expiration=${entry.exp || options.exp}`;
      }
      if (entry.ttl || options.ttl) {
        params = `?expiration_ttl=${entry.ttl || options.ttl}`;
      }
      const method = entry.value === undefined ? "delete" : "put";

      return this.req({
        method,
        url: `/storage/kv/namespaces/${this.id}/values/${entry.key}${params}`,
        data: entry.value
      });
    });

    const responses = await Promise.all(entries);
    const errors = responses
      .filter(res => !res.data.success)
      .map(res => res.errors);

    if (errors.length) {
      throw new Error(JSON.stringify(errors));
    }
  }

  // Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.
  // Values retrieved will be deserialized from their original form.
  async get(key) {
    if (!this.id) {
      await initialize(this);
    }

    const { data } = await this.req({
      url: `/storage/kv/namespaces/${this.id}/values/${key}`
    });

    if (!data.errors) {
      return data;
    }

    throw new Error(data.errors[0].message);
  }

  // Asynchronously deletes the entry at the given key.
  // This is equivalent to storage.set(key, undefined).
  // The returned promise will fulfill with undefined on success.
  async delete(key) {
    if (!this.id) {
      await initialize(this);
    }

    const { data } = await this.req({
      method: "delete",
      url: `/storage/kv/namespaces/${this.id}/values/${key}`
    });

    if (data.success) {
      return;
    }

    throw new Error(data.errors[0].message);
  }

  // Asynchronously deletes all entries in this storage area.
  // This is done by actually deleting the underlying namespace.
  // The returned promise will fulfill with undefined on success.
  async clear() {
    if (!this.id) {
      await initialize(this, { onlyIfAvail: true });
      if (!this.id) {
        return;
      }
    }
    // delete current namespace
    // set id to null for lazy initialization on next operation
    const { data } = await this.req({
      method: "delete",
      url: `/storage/kv/namespaces/${this.id}`
    });

    if (data.success) {
      this.id = null;
      return;
    }

    throw new Error(data.errors[0].message);
  }

  // Retrieves an async iterator containing the keys of all entries in this storage area.
  // Keys will be yielded in ascending order;
  async *keys(options = {}) {
    if (!this.id) {
      await initialize(this);
    }
    const params = options.limit ? `?limit=${options.limit}` : "";
    let url = `/storage/kv/namespaces/${this.id}/keys${params}`;

    while (url) {
      const { data } = await this.req({ url }); // eslint-disable-line no-await-in-loop
      if (data.success && data.result_info.cursor) {
        const cursor = params
          ? `&cursor=${data.result_info.cursor}`
          : `?cursor=${data.result_info.cursor}`;
        url = `/storage/kv/namespaces/${this.id}/keys${params}${cursor}`;
      } else {
        url = null;
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const keyName of data.result.map(key => key.name)) {
        yield keyName;
      }
    }
  }

  // Retrieves an async iterator containing the values of all entries in this storage area.
  // Values will be ordered as corresponding to their keys; see keys().
  async *values(options = {}) {
    if (!this.id) {
      await initialize(this);
    }
    const params = options.limit ? `?limit=${options.limit}` : "";
    let url = `/storage/kv/namespaces/${this.id}/keys${params}`;

    /* eslint-disable no-await-in-loop */
    while (url) {
      const { data } = await this.req({ url });
      if (data.success && data.result_info.cursor) {
        const cursor = params
          ? `&cursor=${data.result_info.cursor}`
          : `?cursor=${data.result_info.cursor}`;
        url = `/storage/kv/namespaces/${this.id}/keys${params}${cursor}`;
      } else {
        url = null;
      }

      const values = await Promise.all(
        data.result.map(key =>
          this.req({
            url: `/storage/kv/namespaces/${this.id}/values/${key.name}`
          })
        )
      );
      // eslint-disable-next-line no-restricted-syntax
      for (const value of values.map(res => res.data)) {
        yield value;
      }
    }
    /* eslint-enable no-await-in-loop */
  }

  // Retrieves an async iterator containing the [keys, values] of all entries in this storage area.
  // Entries will be ordered as corresponding to their keys; see keys().
  async *entries(options = {}) {
    if (!this.id) {
      await initialize(this);
    }
    const params = options.limit ? `?limit=${options.limit}` : "";
    let url = `/storage/kv/namespaces/${this.id}/keys${params}`;

    /* eslint-disable no-await-in-loop */
    while (url) {
      const { data } = await this.req({ url });
      if (data.success && data.result_info.cursor) {
        const cursor = params
          ? `&cursor=${data.result_info.cursor}`
          : `?cursor=${data.result_info.cursor}`;
        url = `/storage/kv/namespaces/${this.id}/keys${params}${cursor}`;
      } else {
        url = null;
      }

      const values = await Promise.all(
        data.result.map(key =>
          this.req({
            url: `/storage/kv/namespaces/${this.id}/values/${key.name}`
          })
        )
      );
      // eslint-disable-next-line no-restricted-syntax
      for (const tuple of values.map((res, i) => [
        data.result[i].name,
        res.data
      ])) {
        yield tuple;
      }
    }
    /* eslint-enable no-await-in-loop */
  }
}

module.exports = StorageArea;
