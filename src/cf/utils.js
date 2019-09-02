const errorList = {
  10009: "key not found"
};

const methods = {
  get: {
    resolveUndefined: false,
    whitelist: new Set([10009])
  },
  set: {
    resolveUndefined: true,
    whitelist: new Set([])
  },
  delete: {
    resolveUndefined: true
  }
};

const responseHandler = (method, response, debug) => {
  if (!response.errors || response.errors.length === 0) {
    return methods[method].resolveUndefined ? undefined : response;
  }

  const { code, message } = response.errors[0];
  if (debug) {
    console.log(message);
  }
  if (methods[method].whitelist.has(code)) {
    return;
  }
  throw new Error(message);
};

export { errorList, responseHandler };
