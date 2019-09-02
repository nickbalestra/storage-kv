import useApi from "./useApi.js";

export default function useCloudflare({ name, credentials, keyFilename }) {
  let namespace;
  const api = useApi({ credentials, keyFilename });
  const clear = async () => {
    namespace = null;
  };

  const init = (name, options) =>
    new Promise((resolve, reject) => {
      api.then(async api => {
        // Check for existing KV Namespaces
        {
          const response = await api.get("/storage/kv/namespaces");
          const namespaces = await response.json();
          if (
            namespaces.success &&
            namespaces.result &&
            namespaces.result.length
          ) {
            const found = namespaces.result.find(
              namespace => namespace.title === name
            );
            if (found) {
              resolve({ ...found, clear });
              return;
            }

            // Don't create a new namespace if `onlyIfExist` option is passed
            if (options.onlyIfExist) {
              resolve(null);
              return;
            }
          }
        }

        // Create a new KV a new namespace
        {
          const response = await api.post(
            "/storage/kv/namespaces",
            JSON.stringify({
              title: name
            })
          );
          const namespace = await response.json();
          if (namespace.success && namespace.result) {
            resolve({ ...namespace.result, clear });
            return;
          }
          reject(namespace);
          return;
        }
      });
    });

  const lazy = (options = {}) => namespace || init(name, options);

  return async options => [await api, await lazy(options)];
}
