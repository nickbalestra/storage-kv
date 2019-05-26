# storage-kv

Node.js client for Cloudflare's KV Storage: a global, highly distributed, low-latency, key-value data store.

Workers KV is a highly distributed, eventually consistent, key-value store that spans Cloudflare's global edge. It allows you to store billions of key-value pairs and read them with ultra-low latency anywhere in the world. Now you can build entire applications with the performance of a CDN static cache.

This project follows the [std:kv-storage](https://wicg.github.io/kv-storage/#storagearea) specs.

⚠️ Early preview release (0.0.7) - Don't use in production.

## Usage

### Install

```bash
yarn add storage-kv
```

```js
const { StorageArea } = require("storage-kv");
```

### Configure

Creates a new StorageArea that provides an async key/value store view onto a Cloudflare KV namespace.

```js
const storage = new StorageArea("cats");
```

> This does not actually fetch or create the namespace yet; that is done lazily when other methods are called. This means that all other methods can reject with namespace-related exceptions in failure cases.

#### Options

You can specify in the options the path to Cloudflare credentials file:

```js
const storage = new StorageArea("cats", {
  keyFilename: "/path/to/keyFilename.json"
});
```

or passing the credentials directly

```js
const storage = new StorageArea("cats", { credentials: { id, email, key } });
```

> If none is given it will look for credential CF_KEY, CF_ID, CF_EMAIL or CF_KEYFILENAME in global env, falling back to "./cf-credentials.json".

### Storing values

Asynchronously stores the given value so that it can later be retrieved by the given key.
Values types are automatically inferred and can be of type [`String`, `ReadableStream`, `ArrayBuffer`, `FormData`].
The returned promise will fulfill with undefined on success.

```js
await storage.set("one-cat", "birman");
```

Can concurrently set multiple values by passing an array

```js
await storage.set([
  { key: "one-cat", value: "birman" },
  { key: "another-cat", value: "american curl" }
]);
```

#### Options

Keys can be set to expire:

- `exp`: seconds since epoch
- `ttl`: seconds from now

```js
await storage.set("one-cat", "birman", { exp: 1558853089 });
await storage.set("another-cat", "merican curl", { ttl: 60 });
```

When storing multiple values options can be specified globally and/or per value

```js
await storage.set(
  [
    { key: "one-cat", value: "birman", ttl: 100 },
    { key: "another-cat", value: "american curl" } // ttl 60
  ],
  { ttl: 60 }
);
```

### Retrieving values

Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.

```js
const cat = await storage.get("one-cat");
console.assert(cat === "birman");
```

### Deleting single values

Asynchronously deletes the entry at the given key.
This is equivalent to `storage.set(key, undefined)`.
The returned promise will fulfill with undefined on success.

```js
await storage.delete("one-cat");
```

### Deleting all values

Asynchronously deletes all entries in this storage area.
This is done by actually deleting the underlying namespace.
The returned promise will fulfill with undefined on success.

```js
await storage.clear();
```

### Retrieving all keys

Retrieves an async iterator containing the keys of all entries in this storage area.
Keys will be yielded in ascending order;

```js
for await (const key of storage.keys()) {
  console.log(key);
}

// "one-cat"
// "another-cat"
```

### Retrieving all values

Retrieves an async iterator containing the values of all entries in this storage area.
Values will be ordered as corresponding to their keys; see `keys()`.

```js
for await (const value of storage.values()) {
  console.log(value);
}

// "birman"
// "american curl"
```

### Retrieving all entries

Retrieves an async iterator containing the `[key, value]` of all entries in this storage area.
Entries will be ordered as corresponding to their keys; see `keys()`.

```js
for await (const [key, value] of storage.entries()) {
  console.log(key, value);
}

// "one-cat", "birman"
// "another-cat", "american curl"
```
