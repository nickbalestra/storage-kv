const axios = require("axios");
const getOptions = require("./utils/getOptions.js");

const initialize = async ({ name, req }) => {
  {
    const { data } = await req({ url: "/storage/kv/namespaces" });
    if (data.success && data.result && data.result.length) {
      const namespace = data.result.find(ns => ns.title === name);
      if (namespace) {
        return namespace.id;
      }
    }
  }

  const { data } = await req({
    method: "post",
    url: "/storage/kv/namespaces",
    data: { title: name }
  });

  if (data.success && data.result) {
    return data.result.id;
  }

  throw new Error(data.errors[0].message);
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
  // TODO: Invalid keys will cause the returned promise to reject with a "DataError" DOMException.
  // Values types are automatically inferred and can be any of [string, ReadableStream, ArrayBuffer, FormData]
  // You can set keys to be automatically deleted at some time in the future, options support:
  // - exp (second since epoch)
  // - ttl (seconds from now)
  // The returned promise will fulfill with undefined on success.
  async set(key, value, options = {}) {
    if (value === undefined) {
      return this.delete(key);
    }
    if (!this.id) {
      this.id = await initialize(this);
    }
    let params = "";
    if (options.exp) {
      params = `?expiration=${options.exp}`;
    }
    if (options.ttl) {
      params = `?expiration_ttl=${options.ttl}`;
    }

    const res = await this.req({
      method: "put",
      url: `/storage/kv/namespaces/${this.id}/values/${key}${params}`,
      data: value
    });

    // console.log(res.headers);

    if (!res.data.success) {
      throw new Error(res.data.errors[0].message);
    }

    return;
  }

  // Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.
  // Values retrieved will be deserialized from their original form.
  async get(key) {
    if (!this.id) {
      this.id = await initialize(this);
    }

    let { data } = await this.req({
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
      this.id = await initialize(this);
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
      return;
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
  async *keys(options = {}) {
    if (!this.id) {
      this.id = await initialize(this);
    }
    const params = options.limit ? `?limit=${options.limit}` : "";
    let url = `/storage/kv/namespaces/${this.id}/keys${params}`;

    while (url) {
      const { data } = await this.req({ url });
      if (data.success && data.result_info.cursor) {
        const cursor = params
          ? `&cursor=${data.result_info.cursor}`
          : `?cursor=${data.result_info.cursor}`;
        url = `/storage/kv/namespaces/${this.id}/keys${params}${cursor}`;
      } else {
        url = "";
      }
      for (const key of data.result.map(key => key.name)) {
        yield key;
      }
    }
  }

  // Asynchronously retrieves an array containing the values of all entries in this storage area.
  async *values(options) {
    if (!this.id) {
      this.id = await initialize(this);
    }
    for await (const key of this.keys(options)) {
      const value = await this.req({
        url: `/storage/kv/namespaces/${this.id}/values/${key}`
      });

      yield value.data;
    }
  }

  // Asynchronously retrieves an array of two-element [key, value] arrays,
  // each of which corresponds to an entry in this storage area.
  async *entries(options) {
    if (!this.id) {
      this.id = await initialize(this);
    }
    for await (const key of this.keys(options)) {
      const value = await this.req({
        url: `/storage/kv/namespaces/${this.id}/values/${key}`
      });

      yield [key, value.data];
    }
  }
}

module.exports = StorageArea;
