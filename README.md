# storage-kv

NodeJS library for [Cloudflare's Workers KV](https://blog.cloudflare.com/workers-kv-is-ga/) inspired by the [std:kv-storage](https://wicg.github.io/kv-storage/#storagearea) specs.

⚠️ Early preview release (0.0.3) - Don't use in production.

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
const storage = new StorageArea("cats", { keyFilename: '/path/to/keyFilename.json' });
```

or passing the credentials directly

```js
const storage = new StorageArea("cats", { credentials: {id, email, key }});
```

> If none is given it will look for credential CF_KEY, CF_ID, CF_EMAIL or KEYFILENAME in global env, falling back to "./credentials.json".


### Storing values

Asynchronously stores the given value so that it can later be retrieved by the given key.
The returned promise will fulfill with undefined on success.

```js
await storage.set("one-cat", "birman");
await storage.set("another-cat", "american curl");
```

### Retrieving values

Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.

```js
const cat = await storage.get("one-cat");
console.assert(cat === "birman")
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

```js
for await (const key of storage.keys()) {
  console.log(key);
}

// "one-cat"
// "another-cat"
```

### Retrieving all values

Asynchronously retrieves an array containing the values of all entries in this storage area.

```js
for await (const value of storage.values()) {
  console.log(value);
}

// "birman"
// "american curl"
```

### Retrieving all entries

Asynchronously retrieves an array of two-element `[key, value]` arrays, each of which corresponds to an entry in this storage area.

```js
for await (const [key, value] of storage.entries()) {
  console.log(key, value);
}

// "one-cat", "birman"
// "another-cat", "american curl"
```
