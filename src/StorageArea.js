import useCloudflare from "./cf/useCloudflare.js";
import { responseHandler } from "./cf/utils.js";

// storage = new StorageArea(name)
// Creates a new StorageArea that provides an async key/value store view
// onto an Cloudflare KV namespace named `${name}`.
// This does not actually open or create the kv namespace  on Cloudflare yet;
// that is done lazily when other methods are called.
// This means that all other methods can reject with database-related exceptions in failure cases.
export class StorageArea {
  #lazy;

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
  // For bulk write pass an arrays of key-values instead:
  // await storage.set([{ key, value, ...options }])
  // options support: expiration, expiration_ttl and base64
  set = async (key, value, options = {}) => {
    // Setting a key to undefined is the same of deleting that key
    if (value === undefined && !Array.isArray(key)) {
      return this.delete(key);
    }

    // Handle bulk writes
    if (Array.isArray(key)) {
      const [api, namespace] = await this.#lazy();
      const response = await api.put(
        `/storage/kv/namespaces/${namespace.id}/bulk`,
        JSON.stringify(key)
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
  };

  // value = await storage.get(key)
  // Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.
  // Values retrieved will be deserialized from their original form as specified in options.type
  // type: text (default) | json | arrayBuffer | stream | buffer
  get = async (key, options = {}) => {
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
  };

  // await storage.delete(key)
  // Asynchronously deletes the entry at the given key.
  // This is equivalent to storage.set(key, undefined).
  // The returned promise will fulfill with undefined on success.
  // For bulk write pass an arrays of keys instead:
  // await storage.delete(['key', 'another-key'])
  async delete(key) {
    const [api, namespace] = await this.#lazy();

    // Handle bulk deletions
    if (Array.isArray(key)) {
      const response = await api.delete(
        `/storage/kv/namespaces/${namespace.id}/bulk`,
        JSON.stringify(key)
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

    await api.delete(`/storage/kv/namespaces/${namespace.id}/values/${key}`);
    return;
  }

  // Asynchronously deletes all entries in this storage area.
  // This is done by actually deleting the underlying Cloudflare KV Storage.
  // As such, it always can be used as a fail-safe to get a clean slate
  // The returned promise will fulfill with undefined on success.
  clear = async () => {
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
  };
}

function responseIsJson(response) {
  return response.headers.get("content-type").includes("application/json");
}

// export function StorageArea2(name, options = {}) {
//   const { lazy } = setup(name, options);

//   // const { NamespacePromise, ApiPromise } = setup(name, options);
//   // NamespacePromise, a promise for a Cloudflare KV Namespace, lazily initialized when performing any CF KV operation
//   // ApiPromise, a promise for configured Cloudflare API for internal use

//   // Usage example:

//   // namespace = await NamespacePromise
//   // { id, name, ... }

//   // api = await ApiPromise
//   // api.get, api.post. api.put

//   async function set(key, value, options = {}) {
//     if (value === undefined) {
//       return this.delete(key);
//     }
//     // Lazy initialize namespace
//     // const api = await ready()
//     // const namespace = await init();
//     const { api, namespace } = await lazy();

//     let params = "";
//     if (options.exp) {
//       params = `?expiration=${options.exp}`;
//     }
//     if (options.ttl) {
//       params = `?expiration_ttl=${options.ttl}`;
//     }

//     const response = await api.put(
//       `/storage/kv/namespaces/${namespace.id}/values/${key}${params}`,
//       value
//     );
//     if (!response.success && res.errors) {
//       throw new Error(res.data.errors[0]);
//     }
//   }

//   return {
//     name,
//     set,
//     async get() {},
//     async delete() {},
//     async clear() {},
//     async *keys() {},
//     async *values() {},
//     async *entries() {}
//   };
// }

// function setup(name, options) {
//   // TODO: validate inputs (name should be mandatory, options need to be an object)
//   const CFKV = {
//     api: null,
//     namespace: { id: null }
//   };
//   // Bootstrap function to setup Cloudflare KV APIs
//   (function bootstrap(keyFilename, credentials) {
//     CFKV.api = new Promise((resolve, reject) => {
//       getApiConfig({ keyFilename, credentials })
//         .then(config => {
//           resolve(new CFKVAPI(config)); // could be proxied so that namespace is also a promise
//         })
//         .catch(reject);
//     });
//   })(options.keyFilename, options.credentials);

//   // lazy async function to retrieve configured Cloudflare KV APIs and namespace info { api, namespace }
//   return {
//     ApiPromise: CFKV.api,
//     NamespacePromise: initializeCFKVNamespace(name, CFKV, options)
//   };
// }

// // this should return a promise.
// // the promise will resolve to the initialized namespace once at least one command has been called.

// async function initializeCFKVNamespace(name, CFKV, options = {}) {
//   CFKV.namespace.id =
//     CFKV.namespace.id ||
//     new Promise((resolve, reject) => {
//       CFKV.api.then(async api => {
//         const response = await api.get("/storage/kv/namespaces");

//         if (response.success && response.result && response.result.length) {
//           const namespace = response.result.find(ns => ns.title === name);
//           if (namespace) {
//             resolve(namespace.id);
//             return;
//           }
//           // Don't create a new namespace if `onlyIfAvail` option is passed
//           if (options.onlyIfAvail) {
//             resolve(null);
//             return;
//           }
//           // const response = await api.post("/storage/kv/namespaces", {
//           //   title: name
//           // });
//           // if (response.success && response.result && response.id) {
//           //   resolve(response.result.id);
//           //   return;
//           // } else {
//           //   reject(response);
//           //   return;
//           // }
//         }
//         reject(response);
//       });
//     });

//   return {
//     api: await CFKV.api,
//     namespace: {
//       id: await CFKV.namespace.id
//     }
//   };
// }
// // const initialize = async (storage, options = {}) => {
// //   await storage.ready;

// //   // TODO:
// //   // - address racing condition
// //   // - better handling of errors

// //   // Look for existing namespaces block
// //   // If found set storage.id to the remote namespace.id and return
// //   {
// //     const response = await storage.api.get("/storage/kv/namespaces");
// //     if (response.success && response.result && res.result.length) {
// //       const namespace = response.result.find(ns => ns.title === storage.name);
// //       if (namespace) {
// //         storage.id = namespace.id;
// //         return;
// //       }
// //     }
// //   }

// //   // Don't create a new namespace if `onlyIfAvail` option is passed
// //   if (options.onlyIfAvail) {
// //     return;
// //   }

// //   const response = await storage.api.post("/storage/kv/namespaces", {
// //     title: storage.name
// //   });

// //   if (response.success && response.result && response.id) {
// //     storage.id = response.result.id;
// //     return;
// //   }

// //   throw new Error(JSON.stringify(res.errors));
// // };
// // ++++++++++++++++++++++++++++++++++++++
// // Original Class Implementation
// // Being refactored above ^^
// // ++++++++++++++++++++++++++++++++++++++
// export class StorageAreaO {
//   constructor(name, options = {}) {
//     // KV namespace creation is done lazily when other methods are called.
//     // This means that all other methods can reject with namespace-related exceptions in failure cases
//     this.id = null;

//     // Once ready StorageArea internal api can be called
//     this.api = null;

//     // keyFilename: '/path/to/keyFilename.json',
//     // credentials: object with key, id, email)
//     // if both are undefined it will look for credential [CF_KEY, CF_ID, CF_EMAIL] or KEYFILENAME on global envs
//     // otherwise default to cwd/credentials.json
//     this.ready = new Promise((resolve, reject) => {
//       getOptions(options.keyFilename || options.credentials)
//         .then(opts => {
//           this.api = apiConfig(opts);
//           resolve();
//         })
//         .catch(reject);
//     });

//     this.name = name;
//   }

//   // Asynchronously stores the given value so that it can later be retrieved by the given key.
//   // Keys have to be of type string.
//   // Values types are automatically inferred and can be any of [string, ReadableStream, ArrayBuffer, FormData]
//   // You can set keys to be automatically deleted at some time in the future, options support:
//   // - exp (second since epoch)
//   // - ttl (seconds from now)
//   // The returned promise will fulfill with undefined on success.
//   // TODO: Invalid keys will cause the returned promise to reject with a "DataError" DOMException.
//   async set(key, value, options = {}) {
//     if (value === undefined) {
//       return this.delete(key);
//     }

//     if (!this.id) {
//       await initialize(this);
//     }

//     let params = "";
//     if (options.exp) {
//       params = `?expiration=${options.exp}`;
//     }
//     if (options.ttl) {
//       params = `?expiration_ttl=${options.ttl}`;
//     }

//     const res = await this.api.put(
//       `/storage/kv/namespaces/${this.id}/values/${key}${params}`,
//       value
//     );

//     if (!res.success && res.errors.length) {
//       throw new Error(JSON.stringify(res.data.errors));
//     }
//   }

//   // Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.
//   // Values retrieved will be deserialized from their original form.
//   async get(key) {
//     if (!this.id) {
//       await initialize(this);
//     }

//     const res = await this.api.get(
//       `/storage/kv/namespaces/${this.id}/values/${key}`
//     );

//     if (!res.errors) {
//       return res;
//     }

//     throw new Error(res.errors[0].message);
//   }

//   // Asynchronously deletes the entry at the given key.
//   // This is equivalent to storage.set(key, undefined).
//   // The returned promise will fulfill with undefined on success.
//   async delete(key) {
//     if (!this.id) {
//       await initialize(this);
//     }

//     const { data } = await this.api.delete(
//       `/storage/kv/namespaces/${this.id}/values/${key}`
//     );

//     if (data.success) {
//       return;
//     }

//     throw new Error(data.errors[0].message);
//   }

//   // Asynchronously deletes all entries in this storage area.
//   // This is done by actually deleting the underlying namespace.
//   // The returned promise will fulfill with undefined on success.
//   async clear() {
//     if (!this.id) {
//       await initialize(this, { onlyIfAvail: true });
//       if (!this.id) {
//         return;
//       }
//     }
//     // delete current namespace
//     // set id to null for lazy initialization on next operation
//     const { data } = await this.api.delete(`/storage/kv/namespaces/${this.id}`);

//     if (data.success) {
//       this.id = null;
//       return;
//     }

//     throw new Error(data.errors[0].message);
//   }

//   // Retrieves an async iterator containing the keys of all entries in this storage area.
//   // Keys will be yielded in ascending order;
//   async *keys(options = {}) {
//     if (!this.id) {
//       await initialize(this);
//     }
//     const params = options.limit ? `?limit=${options.limit}` : "";
//     let url = `/storage/kv/namespaces/${this.id}/keys${params}`;

//     while (url) {
//       const { data } = await this.api.get(url);
//       if (data.success && data.result_info.cursor) {
//         const cursor = params
//           ? `&cursor=${data.result_info.cursor}`
//           : `?cursor=${data.result_info.cursor}`;
//         url = `/storage/kv/namespaces/${this.id}/keys${params}${cursor}`;
//       } else {
//         url = null;
//       }
//       for (const keyName of data.result.map(key => key.name)) {
//         yield keyName;
//       }
//     }
//   }

//   // Retrieves an async iterator containing the values of all entries in this storage area.
//   // Values will be ordered as corresponding to their keys; see keys().
//   async *values(options = {}) {
//     if (!this.id) {
//       await initialize(this);
//     }
//     const params = options.limit ? `?limit=${options.limit}` : "";
//     let url = `/storage/kv/namespaces/${this.id}/keys${params}`;

//     while (url) {
//       const { data } = await this.api.get(url);
//       if (data.success && data.result_info.cursor) {
//         const cursor = params
//           ? `&cursor=${data.result_info.cursor}`
//           : `?cursor=${data.result_info.cursor}`;
//         url = `/storage/kv/namespaces/${this.id}/keys${params}${cursor}`;
//       } else {
//         url = null;
//       }

//       const values = await Promise.all(
//         data.result.map(key =>
//           this.api.get(`/storage/kv/namespaces/${this.id}/values/${key.name}`)
//         )
//       );
//       for (const value of values.map(res => res.data)) {
//         yield value;
//       }
//     }
//   }

//   // Retrieves an async iterator containing the [keys, values] of all entries in this storage area.
//   // Entries will be ordered as corresponding to their keys; see keys().
//   async *entries(options = {}) {
//     if (!this.id) {
//       await initialize(this);
//     }
//     const params = options.limit ? `?limit=${options.limit}` : "";
//     let url = `/storage/kv/namespaces/${this.id}/keys${params}`;

//     while (url) {
//       const { data } = await this.api.get(url);
//       if (data.success && data.result_info.cursor) {
//         const cursor = params
//           ? `&cursor=${data.result_info.cursor}`
//           : `?cursor=${data.result_info.cursor}`;
//         url = `/storage/kv/namespaces/${this.id}/keys${params}${cursor}`;
//       } else {
//         url = null;
//       }

//       const values = await Promise.all(
//         data.result.map(key =>
//           this.api.get(`/storage/kv/namespaces/${this.id}/values/${key.name}`)
//         )
//       );
//       for (const tuple of values.map((res, i) => [
//         data.result[i].name,
//         res.data
//       ])) {
//         yield tuple;
//       }
//     }
//   }
// }
