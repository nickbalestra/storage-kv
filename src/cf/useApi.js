import API from "./Api.js";
import createConfig from "./createConfig.js";

export default async function useApi(configData) {
  const config = await createConfig(configData);
  return new API(config);
}
