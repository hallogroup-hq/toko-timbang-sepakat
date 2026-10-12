// node_modules/hono/dist/adapter/vercel/handler.js
var handle = (app2) => (req) => {
  return app2.fetch(req);
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path5) => {
  const paths = path5.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path: path5 } = extractGroupsFromPath(routePath);
  const paths = splitPath(path5);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path5) => {
  const groups = [];
  path5 = path5.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path: path5
  };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match2[2]) patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey2,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey2] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path5 = url.slice(start, end);
      return tryDecodeURI(path5.includes("%25") ? path5.replace(/%25/g, "%2525") : path5);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path5) => {
  if (path5.charCodeAt(path5.length - 1) !== 63 || !path5.includes(":")) return null;
  const segments = path5.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) return "";
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path5 = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path5;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  };
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = (layout) => this.#layout = layout;
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = () => this.#layout;
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = (name, value, options) => {
    if (this.finalized) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  };
  status = (status) => {
    this.#status = status;
  };
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  };
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = (object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  };
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class Hono2 {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path5, ...handlers) => {
      for (const p of [path5].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path5, app2) {
    const subApp = this.basePath(path5);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path5) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path5);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path5, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = (request) => request;
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path5);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) return res;
      await next();
    };
    this.#addRoute("ALL", mergePath(path5, "*"), handler);
    return this;
  }
  #addRoute(method, path5, handler, baseRoutePath) {
    path5 = mergePath(this._basePath, path5);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path: path5,
      method,
      handler
    };
    this.router.add(method, path5, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    const path5 = this.getPath(request, { env });
    const matchResult = this.router.match(method, path5);
    const c = new Context(request, {
      path: path5,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path5) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path6) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path6];
    if (staticMatch) return staticMatch;
    const match3 = path6.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path5);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === ".*" || a === "(?:|/.*)") return b === "(?:|/.*)" ? -1 : 1;
  else if (b === ".*" || b === "(?:|/.*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class Node2 {
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ".*"
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (regexpStr === ".*") throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ".*" && regexpStr !== "(?:|/.*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path5, isStatic) {
    if (isStatic) {
      this.#root.insert(path5.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path5;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path5] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path5) {
  return wildcardRegExpCache[path5] ??= new RegExp(`^${path5.replace(/\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g, (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ".*" : `/:${LABEL_REG_EXP_STR}`)}$`);
}
function findMiddleware(middleware, path5) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) if (buildWildcardRegExp(k).test(path5)) return [...middleware[k]];
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { ["ALL"]: createNullObject() };
    this.#routes = { ["ALL"]: createNullObject() };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path5) {
    try {
      this.#tries[method].insert(path5, !/\*|\/:/.test(path5));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path5) : e;
    }
  }
  add(method, path5, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap["ALL"]) {
          handlerMap[method][p] = [...handlerMap["ALL"][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path5 === "/*") path5 = "*";
    const methods = method === "ALL" ? Object.keys(middleware) : [method];
    if (/\*$/.test(path5)) {
      const re = buildWildcardRegExp(path5);
      for (const m of methods) if (!middleware[m][path5]) {
        this.#insertPath(m, path5);
        middleware[m][path5] = findMiddleware(middleware[m], path5) || findMiddleware(middleware["ALL"], path5) || [];
      }
      for (const handlerMap of [middleware, routes]) for (const m of methods) for (const p in handlerMap[m]) re.test(p) && handlerMap[m][p].push([handler, path5]);
      return;
    }
    const paths = checkOptionalParameter(path5) || [path5];
    for (const path6 of paths) for (const m of methods) {
      if (!routes[m][path6]) {
        this.#insertPath(m, path6);
        routes[m][path6] = findMiddleware(middleware[m], path6) || findMiddleware(middleware["ALL"], path6) || [];
      }
      routes[m][path6].push([handler, path6]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) matchers[method] = this.#buildMatcher(method);
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) for (const path5 in r) {
      const handlers = r[path5];
      const pathData = trie.paths[path5];
      if (!pathData) {
        staticMap[path5] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
        continue;
      }
      handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [h, trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
        map[key] = paramReplacementMap[pathData[1][i][1]];
        return map;
      }, createNullObject())]);
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path5, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path5,
      handler
    ]);
  }
  match(method, path5) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path5);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path5, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path5);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path5) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path5);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path5[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path5.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node3();
  add(method, path5, handler) {
    for (const result of checkOptionalParameter(path5) || [path5]) this.#node.insert(method, result, handler);
  }
  match(method, path5) {
    return this.#node.search(method, path5);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// node_modules/@hono/node-server/dist/index.mjs
import { createServer as createServerHTTP } from "http";
import { Http2ServerRequest as Http2ServerRequest2, constants as h2constants } from "http2";
import { Http2ServerRequest } from "http2";
import { Readable } from "stream";
import crypto2 from "crypto";
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request2 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      ;
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = /* @__PURE__ */ Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request2(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = Readable.toWeb(incoming);
    }
  }
  return new Request2(url, init);
};
var getRequestCache = /* @__PURE__ */ Symbol("getRequestCache");
var requestCache = /* @__PURE__ */ Symbol("requestCache");
var incomingKey = /* @__PURE__ */ Symbol("incomingKey");
var urlKey = /* @__PURE__ */ Symbol("urlKey");
var headersKey = /* @__PURE__ */ Symbol("headersKey");
var abortControllerKey = /* @__PURE__ */ Symbol("abortControllerKey");
var getAbortController = /* @__PURE__ */ Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.defineProperty(requestPrototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      method: this.method,
      url: this.url,
      headers: this.headers,
      nativeRequest: this[requestCache]
    };
    return `Request (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(requestPrototype, Request2.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      const url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  const url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url.href;
  return req;
};
var responseCache = /* @__PURE__ */ Symbol("responseCache");
var getResponseCache = /* @__PURE__ */ Symbol("getResponseCache");
var cacheKey = /* @__PURE__ */ Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      ;
      this[cacheKey] = [init?.status || 200, body, headers || init?.headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(
          cache[2] || { "content-type": "text/plain; charset=UTF-8" }
        );
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.defineProperty(Response2.prototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      status: this.status,
      headers: this.headers,
      ok: this.ok,
      nativeResponse: this[responseCache]
    };
    return `Response (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
if (typeof global.crypto === "undefined") {
  global.crypto = crypto2;
}
var outgoingEnded = /* @__PURE__ */ Symbol("outgoingEnded");
var incomingDraining = /* @__PURE__ */ Symbol("incomingDraining");
var DRAIN_TIMEOUT_MS = 500;
var MAX_DRAIN_BYTES = 64 * 1024 * 1024;
var drainIncoming = (incoming) => {
  const incomingWithDrainState = incoming;
  if (incoming.destroyed || incomingWithDrainState[incomingDraining]) {
    return;
  }
  incomingWithDrainState[incomingDraining] = true;
  if (incoming instanceof Http2ServerRequest2) {
    try {
      ;
      incoming.stream?.close?.(h2constants.NGHTTP2_NO_ERROR);
    } catch {
    }
    return;
  }
  let bytesRead = 0;
  const cleanup = () => {
    clearTimeout(timer);
    incoming.off("data", onData);
    incoming.off("end", cleanup);
    incoming.off("error", cleanup);
  };
  const forceClose = () => {
    cleanup();
    const socket = incoming.socket;
    if (socket && !socket.destroyed) {
      socket.destroySoon();
    }
  };
  const timer = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  const onData = (chunk) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_DRAIN_BYTES) {
      forceClose();
    }
  };
  incoming.on("data", onData);
  incoming.on("end", cleanup);
  incoming.on("error", cleanup);
  incoming.resume();
};
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  let hasContentLength = false;
  if (!header) {
    header = { "content-type": "text/plain; charset=UTF-8" };
  } else if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header);
  } else if (Array.isArray(header)) {
    const headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj);
  } else {
    for (const key in header) {
      if (key.length === 14 && key.toLowerCase() === "content-length") {
        hasContentLength = true;
        break;
      }
    }
  }
  if (!hasContentLength) {
    if (typeof body === "string") {
      header["Content-Length"] = Buffer.byteLength(body);
    } else if (body instanceof Uint8Array) {
      header["Content-Length"] = body.byteLength;
    } else if (body instanceof Blob) {
      header["Content-Length"] = body.size;
    }
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  ;
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      ;
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  ;
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request2) {
    Object.defineProperty(global, "Request", {
      value: Request2
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof Http2ServerRequest2) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    drainIncoming(incoming);
                  });
                }
              });
            }
          };
        }
        outgoing.on("finish", () => {
          if (!incomingEnded) {
            drainIncoming(incoming);
          }
        });
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                drainIncoming(incoming);
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback, {
    hostname: options.hostname,
    overrideGlobalObjects: options.overrideGlobalObjects,
    autoCleanupIncoming: options.autoCleanupIncoming
  });
  const createServer = options.createServer || createServerHTTP;
  const server = createServer(options.serverOptions || {}, requestListener);
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname, () => {
    const serverInfo = server.address();
    listeningListener && listeningListener(serverInfo);
  });
  return server;
};

// node_modules/hono/dist/utils/mime.js
var getMimeType = (filename, mimes = baseMimes) => {
  const match2 = filename.match(/\.([a-zA-Z0-9]+?)$/);
  if (!match2) return;
  return mimes[match2[1].toLowerCase()];
};
var baseMimes = {
  aac: "audio/aac",
  avi: "video/x-msvideo",
  avif: "image/avif",
  av1: "video/av1",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  css: "text/css; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gif: "image/gif",
  gz: "application/gzip",
  htm: "text/html; charset=utf-8",
  html: "text/html; charset=utf-8",
  ico: "image/x-icon",
  ics: "text/calendar; charset=utf-8",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript; charset=utf-8",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript; charset=utf-8",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  rtf: "application/rtf",
  svg: "image/svg+xml; charset=utf-8",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain; charset=utf-8",
  wasm: "application/wasm",
  webm: "video/webm",
  weba: "audio/webm",
  webmanifest: "application/manifest+json",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary"
};

// node_modules/@hono/node-server/dist/serve-static.mjs
import { createReadStream, statSync, existsSync } from "fs";
import { join } from "path";
import { versions } from "process";
import { Readable as Readable2 } from "stream";
var COMPRESSIBLE_CONTENT_TYPE_REGEX = /^\s*(?:text\/[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;
var ENCODINGS = {
  br: ".br",
  zstd: ".zst",
  gzip: ".gz"
};
var ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS);
var pr54206Applied = () => {
  const [major, minor] = versions.node.split(".").map((component) => parseInt(component));
  return major >= 23 || major === 22 && minor >= 7 || major === 20 && minor >= 18;
};
var useReadableToWeb = pr54206Applied();
var createStreamBody = (stream) => {
  if (useReadableToWeb) {
    return Readable2.toWeb(stream);
  }
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      stream.on("error", (err) => {
        controller.error(err);
      });
      stream.on("end", () => {
        controller.close();
      });
    },
    cancel() {
      stream.destroy();
    }
  });
  return body;
};
var getStats = (path5) => {
  let stats;
  try {
    stats = statSync(path5);
  } catch {
  }
  return stats;
};
var tryDecode2 = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI2 = (str) => tryDecode2(str, decodeURI);
var serveStatic = (options = { root: "" }) => {
  const root = options.root || "";
  const optionPath = options.path;
  if (root !== "" && !existsSync(root)) {
    console.error(`serveStatic: root path '${root}' is not found, are you sure it's correct?`);
  }
  return async (c, next) => {
    if (c.finalized) {
      return next();
    }
    let filename;
    if (optionPath) {
      filename = optionPath;
    } else {
      try {
        filename = tryDecodeURI2(c.req.path);
        if (/(?:^|[\/\\])\.{1,2}(?:$|[\/\\])|[\/\\]{2,}|\\/.test(filename)) {
          throw new Error();
        }
      } catch {
        await options.onNotFound?.(c.req.path, c);
        return next();
      }
    }
    let path5 = join(
      root,
      !optionPath && options.rewriteRequestPath ? options.rewriteRequestPath(filename, c) : filename
    );
    let stats = getStats(path5);
    if (stats && stats.isDirectory()) {
      const indexFile = options.index ?? "index.html";
      path5 = join(path5, indexFile);
      stats = getStats(path5);
    }
    if (!stats) {
      await options.onNotFound?.(path5, c);
      return next();
    }
    const mimeType = getMimeType(path5);
    c.header("Content-Type", mimeType || "application/octet-stream");
    if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
      const acceptEncodingSet = new Set(
        c.req.header("Accept-Encoding")?.split(",").map((encoding) => encoding.trim())
      );
      for (const encoding of ENCODINGS_ORDERED_KEYS) {
        if (!acceptEncodingSet.has(encoding)) {
          continue;
        }
        const precompressedStats = getStats(path5 + ENCODINGS[encoding]);
        if (precompressedStats) {
          c.header("Content-Encoding", encoding);
          c.header("Vary", "Accept-Encoding", { append: true });
          stats = precompressedStats;
          path5 = path5 + ENCODINGS[encoding];
          break;
        }
      }
    }
    let result;
    const size = stats.size;
    const range = c.req.header("range") || "";
    if (c.req.method == "HEAD" || c.req.method == "OPTIONS") {
      c.header("Content-Length", size.toString());
      c.status(200);
      result = c.body(null);
    } else if (!range) {
      c.header("Content-Length", size.toString());
      result = c.body(createStreamBody(createReadStream(path5)), 200);
    } else {
      c.header("Accept-Ranges", "bytes");
      c.header("Date", stats.birthtime.toUTCString());
      const parts = range.replace(/bytes=/, "").split("-", 2);
      const start = parseInt(parts[0], 10) || 0;
      let end = parseInt(parts[1], 10) || size - 1;
      if (size < end - start + 1) {
        end = size - 1;
      }
      const chunksize = end - start + 1;
      const stream = createReadStream(path5, { start, end });
      c.header("Content-Length", chunksize.toString());
      c.header("Content-Range", `bytes ${start}-${end}/${stats.size}`);
      result = c.body(createStreamBody(stream), 206);
    }
    await options.onFound?.(path5, c);
    return result;
  };
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: [
      "GET",
      "HEAD",
      "PUT",
      "POST",
      "DELETE",
      "PATCH",
      "QUERY"
    ],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") return () => optsOrigin;
      else return (origin) => optsOrigin === origin ? origin : null;
    } else if (typeof optsOrigin === "function") return optsOrigin;
    else return (origin) => optsOrigin.includes(origin) ? origin : null;
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else return () => "";
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) set("Access-Control-Allow-Origin", allowOrigin);
    if (opts.credentials) set("Access-Control-Allow-Credentials", "true");
    if (exposeHeadersStr) set("Access-Control-Expose-Headers", exposeHeadersStr);
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") c.res.headers.append("Vary", "Origin");
      if (opts.maxAge != null) set("Access-Control-Max-Age", opts.maxAge.toString());
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) set("Access-Control-Allow-Methods", allowMethods);
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") c.header("Vary", "Origin", { append: true });
  };
};

// node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process: process2, Deno } = globalThis;
  return !(typeof Deno?.noColor === "boolean" ? Deno.noColor : process2 !== void 0 ? "NO_COLOR" in process2?.env : false);
}
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  return !(navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled());
}

// node_modules/hono/dist/middleware/logger/index.js
var humanize = (times) => {
  const [delimiter, separator] = [",", "."];
  return times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter)).join(separator);
};
var time = (start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
};
var colorStatus = async (status) => {
  if (await getColorEnabledAsync()) switch (status / 100 | 0) {
    case 5:
      return `\x1B[31m${status}\x1B[0m`;
    case 4:
      return `\x1B[33m${status}\x1B[0m`;
    case 3:
      return `\x1B[36m${status}\x1B[0m`;
    case 2:
      return `\x1B[32m${status}\x1B[0m`;
  }
  return `${status}`;
};
async function log(fn, prefix, method, path5, status = 0, elapsed) {
  fn(prefix === "<--" ? `${prefix} ${method} ${path5}` : `${prefix} ${method} ${path5} ${await colorStatus(status)} ${elapsed}`);
}
var logger = (fn = console.log) => {
  return async function logger2(c, next) {
    const { method, url } = c.req;
    const path5 = url.slice(url.indexOf("/", 8));
    await log(fn, "<--", method, path5);
    const start = Date.now();
    await next();
    await log(fn, "-->", method, path5, c.res.status, time(start));
  };
};

// server/index.ts
import path4 from "node:path";
import fs4 from "node:fs";

// server/db/migrate.ts
import fs2 from "node:fs";
import path2 from "node:path";

// server/db/database.ts
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
function getDbPath() {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  if (process.env.VERCEL) {
    const tmpDb = path.join("/tmp", "tts.db");
    const seedDb = path.join(process.cwd(), "data", "tts.db");
    if (!fs.existsSync(tmpDb) && fs.existsSync(seedDb)) {
      try {
        fs.copyFileSync(seedDb, tmpDb);
      } catch (err) {
        console.error("Failed to copy seed db to /tmp:", err);
      }
    }
    return tmpDb;
  }
  const dbDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch {
    }
  }
  return path.join(dbDir, "tts.db");
}
var AppDatabase = class {
  db;
  constructor(filePath = getDbPath()) {
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA journal_mode = WAL;");
  }
  exec(sql) {
    this.db.exec(sql);
  }
  prepare(sql) {
    return this.db.prepare(sql);
  }
  get(sql, ...params) {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }
  all(sql, ...params) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }
  run(sql, ...params) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }
  close() {
    this.db.close();
  }
};
var instance = null;
function getDb(customPath) {
  if (customPath) {
    return new AppDatabase(customPath);
  }
  if (!instance) {
    instance = new AppDatabase();
  }
  return instance;
}

// server/db/migrate.ts
function runMigrations(customDbPath) {
  const db = getDb(customDbPath);
  const schemaPath = path2.resolve(process.cwd(), "server/db/schema.sql");
  const schemaSql = fs2.readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);
  const tables = db.all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  console.log(`Database migrated successfully. Active tables (${tables.length}):`);
  tables.forEach((t) => console.log(` - ${t.name}`));
  return tables;
}
if (process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations();
}

// server/db/seed.ts
import fs3 from "node:fs";
import path3 from "node:path";

// server/lib/auth.ts
import crypto3 from "node:crypto";
function hashPassword(password) {
  const salt = crypto3.randomBytes(16).toString("hex");
  const derivedKey = crypto3.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}
function verifyPassword(password, combinedHash) {
  const parts = combinedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const derivedKey = crypto3.scryptSync(password, salt, 64).toString("hex");
  return crypto3.timingSafeEqual(Buffer.from(derivedKey, "hex"), Buffer.from(key, "hex"));
}
function generateToken(bytes = 32) {
  return crypto3.randomBytes(bytes).toString("hex");
}
function hashToken(token) {
  return crypto3.createHash("sha256").update(token).digest("hex");
}

// server/db/seed.ts
function parseCsv(content) {
  const cleaned = content.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
function createSlug(name) {
  return name.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function seedDatabase(customDbPath) {
  const db = getDb(customDbPath);
  const categories = [
    { id: "cat_dairy", slug: "dairy-susu", name: "Dairy & Susu", sort_order: 1 },
    { id: "cat_syrup", slug: "sirup-perisa", name: "Sirup & Perisa", sort_order: 2 },
    { id: "cat_powder", slug: "bubuk-teh-kopi", name: "Bubuk, Teh & Kopi", sort_order: 3 },
    { id: "cat_beverage", slug: "minuman-jus", name: "Minuman & Air Mineral", sort_order: 4 },
    { id: "cat_packaging", slug: "kemasan-takeaway", name: "Kemasan & Perlengkapan", sort_order: 5 },
    { id: "cat_food", slug: "makanan-frozen", name: "Bahan Makanan & Frozen", sort_order: 6 },
    { id: "cat_topping", slug: "topping-pemanis", name: "Topping, Gula & Selai", sort_order: 7 }
  ];
  for (const cat of categories) {
    const exists = db.get("SELECT id FROM categories WHERE id = ?", cat.id);
    if (!exists) {
      db.run(
        "INSERT INTO categories (id, slug, name, sort_order, active) VALUES (?, ?, ?, ?, 1)",
        cat.id,
        cat.slug,
        cat.name,
        cat.sort_order
      );
    }
  }
  const adminExists = db.get("SELECT id FROM admin_users WHERE email = ?", "admin@tokotimbangsepakat.com");
  let adminId = "admin_001";
  if (!adminExists) {
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "AdminTokoSepakat2026!";
    const passwordHash = hashPassword(initialPassword);
    db.run(
      `INSERT INTO admin_users (id, email, display_name, password_hash, role, active)
       VALUES (?, ?, ?, ?, 'owner', 1)`,
      adminId,
      "admin@tokotimbangsepakat.com",
      "Owner Toko Timbang Sepakat",
      passwordHash
    );
    console.log("Seeded initial admin user: admin@tokotimbangsepakat.com");
  } else {
    adminId = adminExists.id;
  }
  const settingsKeys = [
    { key: "store_name", value: "Toko Timbang Sepakat" },
    { key: "whatsapp_number", value: "6287749415861" },
    // Official store WhatsApp
    { key: "business_info", value: "Penyedia bahan baku terpercaya untuk coffee shop, kafe, dan F&B." }
  ];
  for (const s of settingsKeys) {
    const settingExists = db.get("SELECT key FROM store_settings WHERE key = ?", s.key);
    if (!settingExists) {
      db.run(
        "INSERT INTO store_settings (key, value_json, updated_by) VALUES (?, ?, ?)",
        s.key,
        JSON.stringify(s.value),
        adminId
      );
    }
  }
  const csvPath = path3.resolve(process.cwd(), "TTS_Katalog_Awal_94_Produk.csv");
  const csvContent = fs3.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(csvContent);
  if (rows.length !== 94) {
    throw new Error(`Expected exactly 94 rows from CSV, found ${rows.length}`);
  }
  function classifyCategory(name) {
    const n = name.toLowerCase();
    if (n.includes("greenfield") || n.includes("milk") || n.includes("uht") || n.includes("susu") || n.includes("creamer") || n.includes("tiga sapi") || n.includes("dairy champ") || n.includes("milac") || n.includes("whip cream") || n.includes("dc skm") || n.includes("oatside")) {
      return "cat_dairy";
    }
    if (n.includes("trieste") || n.includes("marjan") || n.includes("davinci") || n.includes("sanquick")) {
      return "cat_syrup";
    }
    if (n.includes("matcha") || n.includes("dilico") || n.includes("thai tea") || n.includes("pondan") || n.includes("van houten") || n.includes("lipton")) {
      return "cat_powder";
    }
    if (n.includes("equil") || n.includes("cleo") || n.includes("jungle juice") || n.includes("sprite") || n.includes("amidis") || n.includes("le minerale") || n.includes("diamond cranberry") || n.includes("diamond apple") || n.includes("diamond mango")) {
      return "cat_beverage";
    }
    if (n.includes("cup seal") || n.includes("paper wrap") || n.includes("filter v60") || n.includes("plastik") || n.includes("lunch box") || n.includes("straw") || n.includes("trash bag") || n.includes("tissue")) {
      return "cat_packaging";
    }
    if (n.includes("cilok") || n.includes("batagor") || n.includes("dimsum") || n.includes("lumpia") || n.includes("kanzler") || n.includes("kentang") || n.includes("beras") || n.includes("telor")) {
      return "cat_food";
    }
    return "cat_topping";
  }
  let productsInserted = 0;
  let optionsInserted = 0;
  let productsExisting = 0;
  let optionsExisting = 0;
  const usedSlugs = /* @__PURE__ */ new Set();
  for (const r of rows) {
    const sourceKey = r.source_key;
    const sourceRow = parseInt(r.source_row, 10);
    const sourceName = r.nama_produk_asli;
    const productId = `prod_${sourceKey.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    let baseSlug = createSlug(sourceName);
    if (!baseSlug) baseSlug = `product-${sourceRow}`;
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (usedSlugs.has(uniqueSlug)) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }
    usedSlugs.add(uniqueSlug);
    const categoryId = classifyCategory(sourceName);
    const existingProduct = db.get("SELECT id FROM products WHERE source_key = ?", sourceKey);
    if (!existingProduct) {
      db.run(
        `INSERT INTO products (
          id, source_key, source_row, source_name, source_data_json,
          sku, brand, display_name, slug, category_id,
          description, status, availability, sort_order, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'ask_admin', ?, 1)`,
        productId,
        sourceKey,
        sourceRow,
        sourceName,
        JSON.stringify(r),
        r.sku || null,
        null,
        sourceName,
        uniqueSlug,
        categoryId,
        null,
        sourceRow
      );
      productsInserted++;
    } else {
      productsExisting++;
    }
    const actualProductId = existingProduct ? existingProduct.id : productId;
    const kartonPriceRaw = r.harga_karton_pack_idr.trim();
    if (kartonPriceRaw) {
      const kartonPrice = parseInt(kartonPriceRaw, 10);
      if (isNaN(kartonPrice) || kartonPrice <= 0) {
        throw new Error(`Invalid Karton/Pack price for ${sourceKey}: ${kartonPriceRaw}`);
      }
      const optId = `opt_${sourceKey.toLowerCase().replace(/[^a-z0-9]/g, "_")}_kp`;
      const existingOption = db.get(
        "SELECT id FROM sellable_options WHERE product_id = ? AND source_price_column = ?",
        actualProductId,
        "karton_pack"
      );
      if (!existingOption) {
        db.run(
          `INSERT INTO sellable_options (
            id, product_id, source_price_column, sku, unit_label,
            pack_quantity, price_idr, active, sort_order, version
          ) VALUES (?, ?, 'karton_pack', null, 'Karton / Pack', null, ?, 1, 1, 1)`,
          optId,
          actualProductId,
          kartonPrice
        );
        optionsInserted++;
      } else {
        optionsExisting++;
      }
    }
    const pcsPriceRaw = r.harga_pcs_idr.trim();
    if (pcsPriceRaw) {
      const pcsPrice = parseInt(pcsPriceRaw, 10);
      if (isNaN(pcsPrice) || pcsPrice <= 0) {
        throw new Error(`Invalid Pcs price for ${sourceKey}: ${pcsPriceRaw}`);
      }
      const optId = `opt_${sourceKey.toLowerCase().replace(/[^a-z0-9]/g, "_")}_pcs`;
      const existingOption = db.get(
        "SELECT id FROM sellable_options WHERE product_id = ? AND source_price_column = ?",
        actualProductId,
        "pcs"
      );
      if (!existingOption) {
        db.run(
          `INSERT INTO sellable_options (
            id, product_id, source_price_column, sku, unit_label,
            pack_quantity, price_idr, active, sort_order, version
          ) VALUES (?, ?, 'pcs', null, 'Pcs', null, ?, 1, 2, 1)`,
          optId,
          actualProductId,
          pcsPrice
        );
        optionsInserted++;
      } else {
        optionsExisting++;
      }
    }
  }
  const totalProducts = db.get("SELECT count(*) as count FROM products");
  const totalOptions = db.get("SELECT count(*) as count FROM sellable_options");
  const kartonOptions = db.get(
    "SELECT count(*) as count FROM sellable_options WHERE source_price_column = 'karton_pack'"
  );
  const pcsOptions = db.get(
    "SELECT count(*) as count FROM sellable_options WHERE source_price_column = 'pcs'"
  );
  console.log("Seed summary:");
  console.log(` - Products: ${totalProducts?.count} (new: ${productsInserted}, skipped/existing: ${productsExisting})`);
  console.log(` - Total Sellable Options: ${totalOptions?.count} (new: ${optionsInserted}, existing: ${optionsExisting})`);
  console.log(` - Karton/Pack Options: ${kartonOptions?.count}`);
  console.log(` - Pcs Options: ${pcsOptions?.count}`);
  return {
    totalProducts: totalProducts?.count,
    totalOptions: totalOptions?.count,
    kartonOptions: kartonOptions?.count,
    pcsOptions: pcsOptions?.count
  };
}
if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase();
}

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var trimCookieWhitespace = (value) => {
  let start = 0;
  let end = value.length;
  while (start < end) {
    const charCode = value.charCodeAt(start);
    if (charCode !== 32 && charCode !== 9) break;
    start++;
  }
  while (end > start) {
    const charCode = value.charCodeAt(end - 1);
    if (charCode !== 32 && charCode !== 9) break;
    end--;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
};
var parse = (cookie, name) => {
  if (name && cookie.indexOf(name) === -1) return {};
  const pairs = cookie.split(";");
  const parsedCookie = /* @__PURE__ */ Object.create(null);
  for (const pairStr of pairs) {
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) continue;
    const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
    if (name && name !== cookieName || !relaxedCookieNameRegEx.test(cookieName) || cookieName in parsedCookie) continue;
    let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) cookieValue = cookieValue.slice(1, -1);
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = tryDecodeURIComponent(cookieValue);
      if (name) break;
    }
  }
  return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
  if (!validCookieNameRegEx.test(name)) throw new Error("Invalid cookie name");
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) throw new Error("__Secure- Cookie must have Secure attributes");
  if (name.startsWith("__Host-")) {
    if (!opt.secure) throw new Error("__Host- Cookie must have Secure attributes");
    if (opt.path !== "/") throw new Error('__Host- Cookie must have Path attributes with "/"');
    if (opt.domain) throw new Error("__Host- Cookie must not have Domain attributes");
  }
  for (const key of [
    "domain",
    "path",
    "sameSite",
    "priority"
  ]) if (opt[key] && /[;\r\n]/.test(opt[key])) throw new Error(`${key} must not contain ";", "\\r", or "\\n"`);
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") cookie += `; Domain=${opt.domain}`;
  if (opt.path) cookie += `; Path=${opt.path}`;
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) cookie += "; HttpOnly";
  if (opt.secure) cookie += "; Secure";
  if (opt.sameSite) cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  if (opt.priority) cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
  if (opt.partitioned) {
    if (!opt.secure) throw new Error("Partitioned Cookie must have Secure attributes");
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) return;
    let finalKey = key;
    if (prefix === "secure") finalKey = "__Secure-" + key;
    else if (prefix === "host") finalKey = "__Host-" + key;
    return parse(cookie, finalKey)[finalKey];
  }
  if (!cookie) return {};
  return parse(cookie);
};
var generateCookie = (name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") cookie = serialize("__Secure-" + name, value, {
    path: "/",
    ...opt,
    secure: true
  });
  else if (opt?.prefix === "host") cookie = serialize("__Host-" + name, value, {
    ...opt,
    path: "/",
    secure: true,
    domain: void 0
  });
  else cookie = serialize(name, value, {
    path: "/",
    ...opt
  });
  return cookie;
};
var setCookie = (c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
};
var deleteCookie = (c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", {
    ...opt,
    maxAge: 0
  });
  return deletedCookie;
};

// server/routes/admin/auth.ts
import crypto4 from "node:crypto";

// server/middleware/auth.ts
async function adminAuthMiddleware(c, next) {
  const sessionToken = getCookie(c, "tts_admin_session");
  if (!sessionToken) {
    return c.json({ error: "Unauthorized: No session token provided" }, 401);
  }
  const tokenHash = hashToken(sessionToken);
  const db = getDb();
  const session = db.get(
    `SELECT s.id as session_id, s.admin_user_id, s.expires_at, s.revoked_at,
            u.email, u.display_name, u.role, u.active
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND u.active = 1`,
    tokenHash
  );
  if (!session) {
    return c.json({ error: "Unauthorized: Invalid or revoked session" }, 401);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (session.expires_at < now) {
    return c.json({ error: "Unauthorized: Session has expired" }, 401);
  }
  c.set("adminUser", {
    id: session.admin_user_id,
    email: session.email,
    displayName: session.display_name,
    role: session.role,
    sessionId: session.session_id
  });
  await next();
}

// server/routes/admin/auth.ts
var adminAuthRoutes = new Hono3();
var loginAttempts = /* @__PURE__ */ new Map();
adminAuthRoutes.post("/login", async (c) => {
  const ip = c.req.header("x-forwarded-for") || "local";
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.lockedUntil > now) {
    const waitSec = Math.ceil((attempt.lockedUntil - now) / 1e3);
    return c.json({ error: `Terlalu banyak percobaan. Silakan coba lagi dalam ${waitSec} detik.` }, 429);
  }
  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return c.json({ error: "Email dan password wajib diisi." }, 400);
  }
  const email = String(body.email).trim().toLowerCase();
  const password = String(body.password);
  const db = getDb();
  const user = db.get("SELECT * FROM admin_users WHERE email = ?", email);
  if (!user || user.active !== 1 || !verifyPassword(password, user.password_hash)) {
    const cur = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
    cur.count += 1;
    if (cur.count >= 5) {
      cur.lockedUntil = now + 60 * 1e3;
    }
    loginAttempts.set(ip, cur);
    return c.json({ error: "Email atau password tidak sesuai." }, 401);
  }
  loginAttempts.delete(ip);
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const sessionId = "sess_" + crypto4.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
  db.run(
    `INSERT INTO admin_sessions (id, admin_user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    sessionId,
    user.id,
    tokenHash,
    expiresAt
  );
  setCookie(c, "tts_admin_session", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60
  });
  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role
    }
  });
});
adminAuthRoutes.post("/logout", adminAuthMiddleware, async (c) => {
  const adminUser = c.get("adminUser");
  const db = getDb();
  db.run("UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?", adminUser.sessionId);
  deleteCookie(c, "tts_admin_session", { path: "/" });
  return c.json({ success: true, message: "Berhasil keluar." });
});
adminAuthRoutes.get("/me", adminAuthMiddleware, async (c) => {
  const adminUser = c.get("adminUser");
  return c.json({
    user: {
      id: adminUser.id,
      email: adminUser.email,
      displayName: adminUser.displayName,
      role: adminUser.role
    }
  });
});

// server/routes/admin/products.ts
import crypto5 from "node:crypto";
var adminProductRoutes = new Hono3();
adminProductRoutes.use("*", adminAuthMiddleware);
adminProductRoutes.get("/", async (c) => {
  const db = getDb();
  const q = c.req.query("q")?.trim() || "";
  const categoryId = c.req.query("category")?.trim() || "";
  const status = c.req.query("status")?.trim() || "";
  const availability = c.req.query("availability")?.trim() || "";
  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params = [];
  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_key LIKE ? OR p.sku LIKE ? OR p.source_name LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }
  if (categoryId) {
    sql += ` AND p.category_id = ?`;
    params.push(categoryId);
  }
  if (status) {
    sql += ` AND p.status = ?`;
    params.push(status);
  }
  if (availability) {
    sql += ` AND p.availability = ?`;
    params.push(availability);
  }
  sql += ` ORDER BY p.sort_order ASC, p.created_at DESC`;
  const products = db.all(sql, ...params);
  const productIds = products.map((p) => p.id);
  let options = [];
  let images = [];
  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    options = db.all(
      `SELECT * FROM sellable_options WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`,
      ...productIds
    );
    images = db.all(
      `SELECT pi.product_id, pi.alt_text, pi.is_primary, ia.storage_key, ia.mime_type
       FROM product_images pi
       JOIN image_assets ia ON ia.id = pi.image_asset_id
       WHERE pi.product_id IN (${placeholders}) AND pi.is_primary = 1`,
      ...productIds
    );
  }
  const optionsMap = /* @__PURE__ */ new Map();
  for (const opt of options) {
    const list = optionsMap.get(opt.product_id) || [];
    list.push(opt);
    optionsMap.set(opt.product_id, list);
  }
  const imageMap = /* @__PURE__ */ new Map();
  for (const img of images) {
    imageMap.set(img.product_id, img);
  }
  const result = products.map((p) => ({
    ...p,
    options: optionsMap.get(p.id) || [],
    primary_image: imageMap.get(p.id) || null
  }));
  return c.json({ data: result, total: result.length });
});
adminProductRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const product = db.get(
    `SELECT p.*, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    id
  );
  if (!product) {
    return c.json({ error: "Produk tidak ditemukan." }, 404);
  }
  const options = db.all(
    `SELECT * FROM sellable_options WHERE product_id = ? ORDER BY sort_order ASC`,
    id
  );
  const images = db.all(
    `SELECT pi.*, ia.storage_key, ia.mime_type, ia.rights_status
     FROM product_images pi
     JOIN image_assets ia ON ia.id = pi.image_asset_id
     WHERE pi.product_id = ? ORDER BY pi.sort_order ASC`,
    id
  );
  const priceHistory = db.all(
    `SELECT pc.*, so.unit_label, u.display_name as changed_by_name
     FROM price_changes pc
     JOIN sellable_options so ON so.id = pc.sellable_option_id
     LEFT JOIN admin_users u ON u.id = pc.changed_by
     WHERE so.product_id = ?
     ORDER BY pc.created_at DESC`,
    id
  );
  return c.json({
    data: {
      ...product,
      options,
      images,
      price_history: priceHistory
    }
  });
});
adminProductRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.display_name) {
    return c.json({ error: "Nama produk wajib diisi." }, 400);
  }
  const db = getDb();
  const id = "prod_" + crypto5.randomBytes(12).toString("hex");
  const displayName = String(body.display_name).trim();
  const baseSlug = displayName.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-");
  const slug = baseSlug + "-" + crypto5.randomBytes(4).toString("hex");
  const categoryId = body.category_id || null;
  const sku = body.sku ? String(body.sku).trim() : null;
  const description = body.description ? String(body.description).trim() : null;
  const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
  const availability = ["ask_admin", "available", "unavailable"].includes(body.availability) ? body.availability : "ask_admin";
  db.run(
    `INSERT INTO products (
      id, display_name, slug, category_id, sku, description,
      status, availability, sort_order, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 999, 1)`,
    id,
    displayName,
    slug,
    categoryId,
    sku,
    description,
    status,
    availability
  );
  if (Array.isArray(body.options)) {
    for (const opt of body.options) {
      if (opt.unit_label && opt.price_idr && Number(opt.price_idr) > 0) {
        const optId = "opt_" + crypto5.randomBytes(12).toString("hex");
        db.run(
          `INSERT INTO sellable_options (
            id, product_id, unit_label, price_idr, pack_quantity, active, sort_order
          ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
          optId,
          id,
          String(opt.unit_label).trim(),
          Math.floor(Number(opt.price_idr)),
          opt.pack_quantity ? Math.floor(Number(opt.pack_quantity)) : null,
          opt.sort_order || 1
        );
      }
    }
  }
  return c.json({ success: true, id }, 201);
});
adminProductRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Data tidak valid." }, 400);
  const db = getDb();
  const existing = db.get("SELECT * FROM products WHERE id = ?", id);
  if (!existing) return c.json({ error: "Produk tidak ditemukan." }, 404);
  const displayName = body.display_name !== void 0 ? String(body.display_name).trim() : existing.display_name;
  const categoryId = body.category_id !== void 0 ? body.category_id : existing.category_id;
  const sku = body.sku !== void 0 ? body.sku ? String(body.sku).trim() : null : existing.sku;
  const description = body.description !== void 0 ? body.description : existing.description;
  const status = ["draft", "published", "archived"].includes(body.status) ? body.status : existing.status;
  const availability = ["ask_admin", "available", "unavailable"].includes(body.availability) ? body.availability : existing.availability;
  const sortOrder = body.sort_order !== void 0 ? Number(body.sort_order) : existing.sort_order;
  db.run(
    `UPDATE products
     SET display_name = ?, category_id = ?, sku = ?, description = ?,
         status = ?, availability = ?, sort_order = ?, version = version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    displayName,
    categoryId,
    sku,
    description,
    status,
    availability,
    sortOrder,
    id
  );
  return c.json({ success: true, message: "Produk berhasil diperbarui." });
});
adminProductRoutes.put("/:id/options/:optionId", async (c) => {
  const adminUser = c.get("adminUser");
  const productId = c.req.param("id");
  const optionId = c.req.param("optionId");
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Data tidak valid." }, 400);
  const db = getDb();
  const existingOption = db.get(
    "SELECT * FROM sellable_options WHERE id = ? AND product_id = ?",
    optionId,
    productId
  );
  if (!existingOption) {
    return c.json({ error: "Opsi jual tidak ditemukan." }, 404);
  }
  const newPrice = body.price_idr !== void 0 ? Math.floor(Number(body.price_idr)) : existingOption.price_idr;
  const unitLabel = body.unit_label !== void 0 ? String(body.unit_label).trim() : existingOption.unit_label;
  const packQuantity = body.pack_quantity !== void 0 ? body.pack_quantity ? Math.floor(Number(body.pack_quantity)) : null : existingOption.pack_quantity;
  const active = body.active !== void 0 ? body.active ? 1 : 0 : existingOption.active;
  const reason = body.reason ? String(body.reason).trim() : null;
  if (newPrice <= 0) {
    return c.json({ error: "Harga harus lebih besar dari 0." }, 400);
  }
  if (newPrice !== existingOption.price_idr) {
    const pcId = "pc_" + crypto5.randomBytes(12).toString("hex");
    db.run(
      `INSERT INTO price_changes (
        id, sellable_option_id, changed_by, old_price_idr, new_price_idr, reason
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      pcId,
      optionId,
      adminUser.id,
      existingOption.price_idr,
      newPrice,
      reason || "Pembaruan manual melalui admin"
    );
  }
  db.run(
    `UPDATE sellable_options
     SET price_idr = ?, unit_label = ?, pack_quantity = ?, active = ?,
         version = version + 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    newPrice,
    unitLabel,
    packQuantity,
    active,
    optionId
  );
  return c.json({ success: true, message: "Opsi berhasil diperbarui." });
});
adminProductRoutes.post("/:id/options", async (c) => {
  const productId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body || !body.unit_label || !body.price_idr) {
    return c.json({ error: "Label satuan dan harga wajib diisi." }, 400);
  }
  const priceIdr = Math.floor(Number(body.price_idr));
  if (priceIdr <= 0) {
    return c.json({ error: "Harga harus lebih besar dari 0." }, 400);
  }
  const db = getDb();
  const product = db.get("SELECT id FROM products WHERE id = ?", productId);
  if (!product) return c.json({ error: "Produk tidak ditemukan." }, 404);
  const optId = "opt_" + crypto5.randomBytes(12).toString("hex");
  const packQuantity = body.pack_quantity ? Math.floor(Number(body.pack_quantity)) : null;
  db.run(
    `INSERT INTO sellable_options (
      id, product_id, unit_label, price_idr, pack_quantity, active, sort_order
    ) VALUES (?, ?, ?, ?, ?, 1, 2)`,
    optId,
    productId,
    String(body.unit_label).trim(),
    priceIdr,
    packQuantity
  );
  return c.json({ success: true, id: optId }, 201);
});

// server/routes/admin/pricing.ts
import crypto6 from "node:crypto";
var adminPricingRoutes = new Hono3();
adminPricingRoutes.use("*", adminAuthMiddleware);
adminPricingRoutes.get("/", async (c) => {
  const db = getDb();
  const q = c.req.query("q")?.trim() || "";
  let sql = `
    SELECT so.id as option_id, so.unit_label, so.price_idr, so.pack_quantity, so.active as option_active,
           so.source_price_column, so.updated_at as option_updated_at,
           p.id as product_id, p.display_name as product_name, p.source_key, p.sku, p.status as product_status,
           c.name as category_name
    FROM sellable_options so
    JOIN products p ON p.id = so.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status != 'archived'
  `;
  const params = [];
  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_key LIKE ? OR so.unit_label LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  sql += ` ORDER BY p.sort_order ASC, so.sort_order ASC`;
  const rows = db.all(sql, ...params);
  return c.json({ data: rows, total: rows.length });
});
adminPricingRoutes.get("/matrix", async (c) => {
  const db = getDb();
  const q = c.req.query("q")?.trim() || "";
  let sql = `
    SELECT p.id as product_id, p.display_name as product_name, p.source_key, p.sku,
           c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status != 'archived'
  `;
  const params = [];
  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_key LIKE ? OR p.sku LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  sql += ` ORDER BY p.sort_order ASC, p.display_name ASC`;
  const products = db.all(sql, ...params);
  const options = db.all(
    `SELECT id, product_id, unit_label, price_idr, pack_quantity, source_price_column, active
     FROM sellable_options`
  );
  const optionsByProduct = /* @__PURE__ */ new Map();
  for (const opt of options) {
    const group = optionsByProduct.get(opt.product_id) || { karton: null, pcs: null };
    if (opt.source_price_column === "karton_pack" || opt.unit_label.toLowerCase().includes("karton") || opt.unit_label.toLowerCase().includes("pack")) {
      group.karton = opt;
    } else {
      group.pcs = opt;
    }
    optionsByProduct.set(opt.product_id, group);
  }
  const matrix = products.map((p) => {
    const group = optionsByProduct.get(p.product_id) || { karton: null, pcs: null };
    return {
      product_id: p.product_id,
      product_name: p.product_name,
      source_key: p.source_key,
      sku: p.sku,
      category_name: p.category_name,
      karton_option: group.karton,
      pcs_option: group.pcs
    };
  });
  return c.json({ data: matrix, total: matrix.length });
});
adminPricingRoutes.put("/batch", async (c) => {
  const adminUser = c.get("adminUser");
  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.updates) || body.updates.length === 0) {
    return c.json({ error: "Daftar pembaruan harga tidak valid." }, 400);
  }
  const db = getDb();
  const updates = body.updates;
  for (const item of updates) {
    if (!item.option_id && (!item.product_id || !item.unit_type) || !item.new_price_idr || item.new_price_idr <= 0) {
      return c.json({ error: `Harga yang dimasukkan tidak valid (harus berupa angka positif > 0).` }, 400);
    }
  }
  let updatedCount = 0;
  db.exec("BEGIN TRANSACTION;");
  try {
    for (const item of updates) {
      let optionId = item.option_id;
      let currentPrice = 0;
      if (!optionId && item.product_id && item.unit_type) {
        const existing = db.get(
          "SELECT id, price_idr FROM sellable_options WHERE product_id = ? AND source_price_column = ?",
          item.product_id,
          item.unit_type
        );
        if (existing) {
          optionId = existing.id;
          currentPrice = existing.price_idr;
        } else {
          optionId = "opt_" + crypto6.randomBytes(12).toString("hex");
          const unitLabel = item.unit_type === "karton_pack" ? "Karton / Pack" : "Pcs";
          const sortOrder = item.unit_type === "karton_pack" ? 1 : 2;
          db.run(
            `INSERT INTO sellable_options (
              id, product_id, unit_label, price_idr, source_price_column, active, sort_order
            ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
            optionId,
            item.product_id,
            unitLabel,
            Math.floor(Number(item.new_price_idr)),
            item.unit_type,
            sortOrder
          );
          currentPrice = 0;
        }
      } else if (optionId) {
        const current = db.get(
          "SELECT id, price_idr FROM sellable_options WHERE id = ?",
          optionId
        );
        if (current) currentPrice = current.price_idr;
      }
      if (!optionId) continue;
      const newPrice = Math.floor(Number(item.new_price_idr));
      if (newPrice !== currentPrice) {
        const pcId = "pc_" + crypto6.randomBytes(12).toString("hex");
        db.run(
          `INSERT INTO price_changes (
            id, sellable_option_id, changed_by, old_price_idr, new_price_idr, reason
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          pcId,
          optionId,
          adminUser.id,
          currentPrice,
          newPrice,
          item.reason ? String(item.reason).trim() : "Pembaruan harga operasional"
        );
        db.run(
          `UPDATE sellable_options
           SET price_idr = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          newPrice,
          optionId
        );
        updatedCount++;
      }
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    return c.json({ error: `Gagal memperbarui harga: ${err.message}` }, 500);
  }
  return c.json({ success: true, updated_count: updatedCount });
});
adminPricingRoutes.get("/history", async (c) => {
  const db = getDb();
  const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
  const history = db.all(
    `SELECT pc.*, so.unit_label, p.display_name as product_name, p.source_key,
            u.display_name as changed_by_name, u.email as changed_by_email
     FROM price_changes pc
     JOIN sellable_options so ON so.id = pc.sellable_option_id
     JOIN products p ON p.id = so.product_id
     LEFT JOIN admin_users u ON u.id = pc.changed_by
     ORDER BY pc.created_at DESC
     LIMIT ?`,
    limit
  );
  return c.json({ data: history });
});

// server/routes/admin/import.ts
import crypto7 from "node:crypto";
var adminImportRoutes = new Hono3();
adminImportRoutes.use("*", adminAuthMiddleware);
function parseCsvText(content) {
  const cleaned = content.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}
function parseLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
adminImportRoutes.post("/preview", async (c) => {
  const adminUser = c.get("adminUser");
  const body = await c.req.json().catch(() => null);
  if (!body || !body.csv_content) {
    return c.json({ error: "Konten CSV wajib diunggah." }, 400);
  }
  const csvContent = String(body.csv_content);
  const filename = String(body.filename || "import.csv").trim();
  const sha2562 = crypto7.createHash("sha256").update(csvContent).digest("hex");
  const rows = parseCsvText(csvContent);
  if (rows.length === 0) {
    return c.json({ error: "File CSV kosong atau format tidak sesuai." }, 400);
  }
  const db = getDb();
  const batchId = "batch_" + crypto7.randomBytes(12).toString("hex");
  let createCount = 0;
  let updateCount = 0;
  let unchangedCount = 0;
  let invalidCount = 0;
  let conflictCount = 0;
  const analyzedRows = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 1;
    const sourceKey = row.source_key || row["Source Key"] || "";
    const name = row.nama_produk_asli || row.nama_produk || row["Nama Produk"] || "";
    const sku = row.sku || row.SKU || "";
    const priceKartonRaw = row.harga_karton_pack_idr || row.harga_karton || "";
    const pricePcsRaw = row.harga_pcs_idr || row.harga_pcs || "";
    if (!name && !sourceKey) {
      invalidCount++;
      analyzedRows.push({
        row_number: rowNum,
        source_key: sourceKey,
        action: "invalid",
        errors: ["Nama produk tidak boleh kosong"],
        before: null,
        after: row
      });
      continue;
    }
    let existingProduct = null;
    if (sourceKey) {
      existingProduct = db.get("SELECT * FROM products WHERE source_key = ?", sourceKey);
    } else if (sku) {
      existingProduct = db.get("SELECT * FROM products WHERE sku = ?", sku);
    }
    if (!existingProduct) {
      createCount++;
      analyzedRows.push({
        row_number: rowNum,
        source_key: sourceKey,
        action: "create",
        errors: [],
        before: null,
        after: row
      });
    } else {
      const existingOptions = db.all(
        "SELECT * FROM sellable_options WHERE product_id = ?",
        existingProduct.id
      );
      const kartonOpt = existingOptions.find((o) => o.source_price_column === "karton_pack");
      const pcsOpt = existingOptions.find((o) => o.source_price_column === "pcs");
      let hasPriceDiff = false;
      const parsedKarton = priceKartonRaw ? parseInt(priceKartonRaw.replace(/[^\d]/g, ""), 10) : null;
      const parsedPcs = pricePcsRaw ? parseInt(pricePcsRaw.replace(/[^\d]/g, ""), 10) : null;
      if (parsedKarton !== null && (!kartonOpt || kartonOpt.price_idr !== parsedKarton)) {
        hasPriceDiff = true;
      }
      if (parsedPcs !== null && (!pcsOpt || pcsOpt.price_idr !== parsedPcs)) {
        hasPriceDiff = true;
      }
      if (hasPriceDiff) {
        updateCount++;
        analyzedRows.push({
          row_number: rowNum,
          source_key: sourceKey,
          action: "update",
          errors: [],
          before: {
            display_name: existingProduct.display_name,
            karton_price: kartonOpt?.price_idr || null,
            pcs_price: pcsOpt?.price_idr || null
          },
          after: {
            display_name: name || existingProduct.display_name,
            karton_price: parsedKarton,
            pcs_price: parsedPcs
          }
        });
      } else {
        unchangedCount++;
        analyzedRows.push({
          row_number: rowNum,
          source_key: sourceKey,
          action: "unchanged",
          errors: [],
          before: {
            display_name: existingProduct.display_name,
            karton_price: kartonOpt?.price_idr || null,
            pcs_price: pcsOpt?.price_idr || null
          },
          after: row
        });
      }
    }
  }
  const summary = {
    total_rows: rows.length,
    create: createCount,
    update: updateCount,
    unchanged: unchangedCount,
    invalid: invalidCount,
    conflict: conflictCount
  };
  db.run(
    `INSERT INTO import_batches (
      id, created_by, source_filename, source_sha256, status, row_count, summary_json
    ) VALUES (?, ?, ?, ?, 'preview', ?, ?)`,
    batchId,
    adminUser.id,
    filename,
    sha2562,
    rows.length,
    JSON.stringify(summary)
  );
  for (const item of analyzedRows) {
    const rowId = "improw_" + crypto7.randomBytes(12).toString("hex");
    db.run(
      `INSERT INTO import_rows (
        id, import_batch_id, source_row_number, source_key, action, before_json, after_json, errors_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      rowId,
      batchId,
      item.row_number,
      item.source_key || null,
      item.action,
      item.before ? JSON.stringify(item.before) : null,
      item.after ? JSON.stringify(item.after) : null,
      item.errors ? JSON.stringify(item.errors) : null
    );
  }
  return c.json({
    batch_id: batchId,
    summary,
    sample_rows: analyzedRows.slice(0, 50)
  });
});
adminImportRoutes.post("/commit/:batchId", async (c) => {
  const adminUser = c.get("adminUser");
  const batchId = c.req.param("batchId");
  const db = getDb();
  const batch = db.get("SELECT * FROM import_batches WHERE id = ?", batchId);
  if (!batch) return c.json({ error: "Batch impor tidak ditemukan." }, 404);
  if (batch.status !== "preview") {
    return c.json({ error: `Batch telah berstatus: ${batch.status}. Tidak dapat dikomit ulang.` }, 400);
  }
  const importRows = db.all(
    "SELECT * FROM import_rows WHERE import_batch_id = ? ORDER BY source_row_number ASC",
    batchId
  );
  let committedUpdates = 0;
  let committedCreates = 0;
  db.exec("BEGIN TRANSACTION;");
  try {
    for (const r of importRows) {
      if (r.action === "update" && r.after_json) {
        const after = JSON.parse(r.after_json);
        const sourceKey = r.source_key;
        if (!sourceKey) continue;
        const prod = db.get("SELECT id FROM products WHERE source_key = ?", sourceKey);
        if (!prod) continue;
        if (after.karton_price !== void 0 && after.karton_price !== null) {
          const opt = db.get(
            "SELECT * FROM sellable_options WHERE product_id = ? AND source_price_column = 'karton_pack'",
            prod.id
          );
          if (opt && opt.price_idr !== after.karton_price) {
            const pcId = "pc_" + crypto7.randomBytes(12).toString("hex");
            db.run(
              `INSERT INTO price_changes (
                id, sellable_option_id, changed_by, import_batch_id, old_price_idr, new_price_idr, reason
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              pcId,
              opt.id,
              adminUser.id,
              batchId,
              opt.price_idr,
              after.karton_price,
              `Impor berkas ${batch.source_filename}`
            );
            db.run(
              "UPDATE sellable_options SET price_idr = ?, version = version + 1 WHERE id = ?",
              after.karton_price,
              opt.id
            );
            committedUpdates++;
          }
        }
        if (after.pcs_price !== void 0 && after.pcs_price !== null) {
          const opt = db.get(
            "SELECT * FROM sellable_options WHERE product_id = ? AND source_price_column = 'pcs'",
            prod.id
          );
          if (opt && opt.price_idr !== after.pcs_price) {
            const pcId = "pc_" + crypto7.randomBytes(12).toString("hex");
            db.run(
              `INSERT INTO price_changes (
                id, sellable_option_id, changed_by, import_batch_id, old_price_idr, new_price_idr, reason
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              pcId,
              opt.id,
              adminUser.id,
              batchId,
              opt.price_idr,
              after.pcs_price,
              `Impor berkas ${batch.source_filename}`
            );
            db.run(
              "UPDATE sellable_options SET price_idr = ?, version = version + 1 WHERE id = ?",
              after.pcs_price,
              opt.id
            );
            committedUpdates++;
          }
        }
      }
    }
    db.run(
      "UPDATE import_batches SET status = 'committed', committed_at = CURRENT_TIMESTAMP WHERE id = ?",
      batchId
    );
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    return c.json({ error: `Gagal mengomit impor: ${err.message}` }, 500);
  }
  return c.json({
    success: true,
    message: "Impor berhasil dikomit.",
    committed_updates: committedUpdates,
    committed_creates: committedCreates
  });
});
adminImportRoutes.get("/batches", async (c) => {
  const db = getDb();
  const batches = db.all(
    `SELECT b.*, u.display_name as created_by_name
     FROM import_batches b
     LEFT JOIN admin_users u ON u.id = b.created_by
     ORDER BY b.created_at DESC
     LIMIT 50`
  );
  return c.json({ data: batches });
});

// server/routes/admin/categories.ts
import crypto8 from "node:crypto";
var adminCategoryRoutes = new Hono3();
adminCategoryRoutes.use("*", adminAuthMiddleware);
adminCategoryRoutes.get("/", async (c) => {
  const db = getDb();
  const categories = db.all(
    `SELECT c.*, COUNT(p.id) as product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return c.json({ data: categories });
});
adminCategoryRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.name) {
    return c.json({ error: "Nama kategori wajib diisi." }, 400);
  }
  const name = String(body.name).trim();
  const slug = String(body.slug || name.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-"));
  const sortOrder = Number(body.sort_order) || 0;
  const id = "cat_" + crypto8.randomBytes(8).toString("hex");
  const db = getDb();
  db.run(
    "INSERT INTO categories (id, slug, name, sort_order, active) VALUES (?, ?, ?, ?, 1)",
    id,
    slug,
    name,
    sortOrder
  );
  return c.json({ success: true, id }, 201);
});
adminCategoryRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Data tidak valid." }, 400);
  const db = getDb();
  const existing = db.get("SELECT * FROM categories WHERE id = ?", id);
  if (!existing) return c.json({ error: "Kategori tidak ditemukan." }, 404);
  const name = body.name !== void 0 ? String(body.name).trim() : existing.name;
  const slug = body.slug !== void 0 ? String(body.slug).trim() : existing.slug;
  const sortOrder = body.sort_order !== void 0 ? Number(body.sort_order) : existing.sort_order;
  const active = body.active !== void 0 ? body.active ? 1 : 0 : existing.active;
  db.run(
    `UPDATE categories
     SET name = ?, slug = ?, sort_order = ?, active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    name,
    slug,
    sortOrder,
    active,
    id
  );
  return c.json({ success: true, message: "Kategori berhasil diperbarui." });
});

// server/routes/admin/settings.ts
var adminSettingsRoutes = new Hono3();
adminSettingsRoutes.use("*", adminAuthMiddleware);
adminSettingsRoutes.get("/", async (c) => {
  const db = getDb();
  const rows = db.all("SELECT key, value_json, updated_at FROM store_settings");
  const settings = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value_json);
    } catch {
      settings[r.key] = r.value_json;
    }
  }
  return c.json({ data: settings });
});
adminSettingsRoutes.put("/", async (c) => {
  const adminUser = c.get("adminUser");
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Data pengaturan tidak valid." }, 400);
  }
  const db = getDb();
  for (const [key, val] of Object.entries(body)) {
    let cleanVal = val;
    if (key === "whatsapp_number" && typeof val === "string") {
      cleanVal = val.replace(/\D/g, "");
    }
    const jsonVal = JSON.stringify(cleanVal);
    const existing = db.get("SELECT key FROM store_settings WHERE key = ?", key);
    if (existing) {
      db.run(
        "UPDATE store_settings SET value_json = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
        jsonVal,
        adminUser.id,
        key
      );
    } else {
      db.run(
        "INSERT INTO store_settings (key, value_json, updated_by) VALUES (?, ?, ?)",
        key,
        jsonVal,
        adminUser.id
      );
    }
  }
  return c.json({ success: true, message: "Pengaturan berhasil disimpan." });
});

// server/routes/admin/orders.ts
import crypto9 from "node:crypto";
var adminOrderRoutes = new Hono3();
adminOrderRoutes.use("*", adminAuthMiddleware);
adminOrderRoutes.get("/metrics", async (c) => {
  const db = getDb();
  const published = db.get(
    "SELECT count(*) as count FROM products WHERE status = 'published'"
  );
  const unavailable = db.get(
    "SELECT count(*) as count FROM products WHERE availability = 'unavailable'"
  );
  const pendingIntents = db.get(
    "SELECT count(*) as count FROM checkout_intents WHERE status = 'created'"
  );
  const confirmedOrders = db.get(
    "SELECT count(*) as count FROM orders WHERE status != 'cancelled'"
  );
  const paidRevenue = db.get(
    "SELECT COALESCE(SUM(COALESCE(total_idr, subtotal_idr)), 0) as revenue FROM orders WHERE status IN ('paid', 'completed')"
  );
  return c.json({
    metrics: {
      total_published_products: published?.count || 0,
      total_unavailable_products: unavailable?.count || 0,
      pending_checkout_requests: pendingIntents?.count || 0,
      confirmed_orders_count: confirmedOrders?.count || 0,
      verified_revenue_idr: paidRevenue?.revenue || 0,
      revenue_basis: "Hanya mencakup pesanan berstatus paid atau completed. Percobaan checkout dan klik WhatsApp TIDAK dihitung sebagai omzet."
    }
  });
});
adminOrderRoutes.get("/intents", async (c) => {
  const db = getDb();
  const status = c.req.query("status") || "";
  let sql = "SELECT * FROM checkout_intents WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT 100";
  const intents = db.all(sql, ...params);
  return c.json({ data: intents });
});
adminOrderRoutes.get("/intents/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const intent = db.get("SELECT * FROM checkout_intents WHERE id = ?", id);
  if (!intent) return c.json({ error: "Permintaan checkout tidak ditemukan." }, 404);
  const lines = db.all(
    "SELECT * FROM checkout_intent_lines WHERE checkout_intent_id = ? ORDER BY line_position ASC",
    id
  );
  return c.json({ data: { ...intent, lines } });
});
adminOrderRoutes.post("/from-intent/:intentId", async (c) => {
  const adminUser = c.get("adminUser");
  const intentId = c.req.param("intentId");
  const db = getDb();
  const intent = db.get("SELECT * FROM checkout_intents WHERE id = ?", intentId);
  if (!intent) return c.json({ error: "Permintaan checkout tidak ditemukan." }, 404);
  if (intent.status === "converted") {
    return c.json({ error: "Permintaan checkout ini telah dikonversi sebelumnya." }, 400);
  }
  const intentLines = db.all(
    "SELECT * FROM checkout_intent_lines WHERE checkout_intent_id = ? ORDER BY line_position ASC",
    intentId
  );
  const orderId = "ord_" + crypto9.randomBytes(12).toString("hex");
  const publicRef = "ORD-" + crypto9.randomBytes(4).toString("hex").toUpperCase();
  db.exec("BEGIN TRANSACTION;");
  try {
    db.run(
      `INSERT INTO orders (
        id, public_ref, checkout_intent_id, buyer_name, business_name,
        status, subtotal_idr, shipping_fee_idr, total_idr, admin_note,
        created_by, version
      ) VALUES (?, ?, ?, ?, ?, 'confirmed', ?, null, null, null, ?, 1)`,
      orderId,
      publicRef,
      intentId,
      intent.buyer_name,
      intent.business_name,
      intent.subtotal_idr,
      adminUser.id
    );
    for (const line of intentLines) {
      const orderLineId = "oline_" + crypto9.randomBytes(12).toString("hex");
      db.run(
        `INSERT INTO order_lines (
          id, order_id, product_id, sellable_option_id, line_position,
          product_name_snapshot, unit_label_snapshot, qty, unit_price_idr, line_subtotal_idr
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderLineId,
        orderId,
        line.product_id,
        line.sellable_option_id,
        line.line_position,
        line.product_name_snapshot,
        line.unit_label_snapshot,
        line.qty,
        line.unit_price_idr,
        line.line_subtotal_idr
      );
    }
    db.run("UPDATE checkout_intents SET status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", intentId);
    const eventId = "oevt_" + crypto9.randomBytes(12).toString("hex");
    db.run(
      `INSERT INTO order_events (
        id, order_id, actor_admin_user_id, event_type, reason
      ) VALUES (?, ?, ?, 'convert_from_intent', ?)`,
      eventId,
      orderId,
      adminUser.id,
      `Dikonversi dari checkout intent ${intent.public_ref}`
    );
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    return c.json({ error: `Gagal mengonversi pesanan: ${err.message}` }, 500);
  }
  return c.json({ success: true, order_id: orderId, public_ref: publicRef }, 201);
});
adminOrderRoutes.get("/orders", async (c) => {
  const db = getDb();
  const status = c.req.query("status") || "";
  let sql = `
    SELECT o.*, u.display_name as created_by_name
    FROM orders o
    LEFT JOIN admin_users u ON u.id = o.created_by
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += " AND o.status = ?";
    params.push(status);
  }
  sql += " ORDER BY o.created_at DESC LIMIT 100";
  const orders = db.all(sql, ...params);
  return c.json({ data: orders });
});
adminOrderRoutes.get("/orders/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const order2 = db.get(
    `SELECT o.*, u.display_name as created_by_name
     FROM orders o
     LEFT JOIN admin_users u ON u.id = o.created_by
     WHERE o.id = ?`,
    id
  );
  if (!order2) return c.json({ error: "Pesanan tidak ditemukan." }, 404);
  const lines = db.all(
    "SELECT * FROM order_lines WHERE order_id = ? ORDER BY line_position ASC",
    id
  );
  const events = db.all(
    `SELECT oe.*, u.display_name as actor_name
     FROM order_events oe
     LEFT JOIN admin_users u ON u.id = oe.actor_admin_user_id
     WHERE oe.order_id = ? ORDER BY oe.created_at DESC`,
    id
  );
  return c.json({ data: { ...order2, lines, events } });
});
adminOrderRoutes.put("/orders/:id/status", async (c) => {
  const adminUser = c.get("adminUser");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Data tidak valid." }, 400);
  const db = getDb();
  const existing = db.get("SELECT * FROM orders WHERE id = ?", id);
  if (!existing) return c.json({ error: "Pesanan tidak ditemukan." }, 404);
  const validStatuses = ["confirmed", "awaiting_payment", "paid", "preparing", "completed", "cancelled"];
  const newStatus = body.status && validStatuses.includes(body.status) ? body.status : existing.status;
  const adminNote = body.admin_note !== void 0 ? body.admin_note : existing.admin_note;
  let shippingFee = existing.shipping_fee_idr;
  let totalIdr = existing.total_idr;
  if (body.shipping_fee_idr !== void 0) {
    if (body.shipping_fee_idr === null) {
      shippingFee = null;
      totalIdr = null;
    } else {
      shippingFee = Math.max(0, Math.floor(Number(body.shipping_fee_idr)));
      totalIdr = existing.subtotal_idr + shippingFee;
    }
  }
  db.exec("BEGIN TRANSACTION;");
  try {
    db.run(
      `UPDATE orders
       SET status = ?, shipping_fee_idr = ?, total_idr = ?, admin_note = ?,
           version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      newStatus,
      shippingFee,
      totalIdr,
      adminNote,
      id
    );
    const eventId = "oevt_" + crypto9.randomBytes(12).toString("hex");
    db.run(
      `INSERT INTO order_events (
        id, order_id, actor_admin_user_id, event_type, previous_json, next_json, reason
      ) VALUES (?, ?, ?, 'status_update', ?, ?, ?)`,
      eventId,
      id,
      adminUser.id,
      JSON.stringify({ status: existing.status, shipping_fee: existing.shipping_fee_idr }),
      JSON.stringify({ status: newStatus, shipping_fee: shippingFee }),
      body.reason || "Pembaruan status operasional"
    );
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    return c.json({ error: `Gagal memperbarui pesanan: ${err.message}` }, 500);
  }
  return c.json({ success: true, message: "Pesanan berhasil diperbarui." });
});

// server/routes/admin/images.ts
import crypto10 from "node:crypto";
var adminImageRoutes = new Hono3();
adminImageRoutes.use("*", adminAuthMiddleware);
adminImageRoutes.get("/candidates", async (c) => {
  const db = getDb();
  const status = c.req.query("status") || "";
  let sql = `
    SELECT ic.*, p.display_name as product_name, p.source_key
    FROM image_candidates ic
    JOIN products p ON p.id = ic.product_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += " AND ic.review_status = ?";
    params.push(status);
  }
  sql += " ORDER BY ic.created_at DESC LIMIT 100";
  const rows = db.all(sql, ...params);
  return c.json({ data: rows });
});
adminImageRoutes.put("/candidates/:id/review", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body || !["approved", "rejected"].includes(body.review_status)) {
    return c.json({ error: "Status review harus approved atau rejected." }, 400);
  }
  const db = getDb();
  const candidate = db.get("SELECT * FROM image_candidates WHERE id = ?", id);
  if (!candidate) return c.json({ error: "Kandidat gambar tidak ditemukan." }, 404);
  const reviewStatus = body.review_status;
  const reviewerNote = body.reviewer_note ? String(body.reviewer_note).trim() : null;
  db.exec("BEGIN TRANSACTION;");
  try {
    db.run(
      `UPDATE image_candidates
       SET review_status = ?, reviewer_note = ?, checked_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      reviewStatus,
      reviewerNote,
      id
    );
    if (reviewStatus === "approved") {
      const assetId = "asset_" + crypto10.randomBytes(12).toString("hex");
      const storageKey = candidate.image_url;
      db.run(
        `INSERT INTO image_assets (
          id, storage_key, mime_type, source_page_url, rights_status
        ) VALUES (?, ?, 'image/jpeg', ?, 'permitted')`,
        assetId,
        storageKey,
        candidate.source_page_url
      );
      db.run("UPDATE product_images SET is_primary = 0 WHERE product_id = ?", candidate.product_id);
      const prodImgId = "pimg_" + crypto10.randomBytes(12).toString("hex");
      db.run(
        `INSERT INTO product_images (
          id, product_id, image_asset_id, is_primary, alt_text
        ) VALUES (?, ?, ?, 1, ?)`,
        prodImgId,
        candidate.product_id,
        assetId,
        candidate.product_name || "Foto Produk"
      );
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    return c.json({ error: `Gagal memperbarui status kandidat: ${err.message}` }, 500);
  }
  return c.json({ success: true, message: `Status kandidat diperbarui menjadi ${reviewStatus}.` });
});

// server/routes/public/products.ts
var publicProductRoutes = new Hono3();
publicProductRoutes.get("/", async (c) => {
  const db = getDb();
  const q = c.req.query("q")?.trim() || "";
  const categorySlug = c.req.query("category")?.trim() || "";
  const sort = c.req.query("sort") || "sort_order";
  let sql = `
    SELECT p.id, p.display_name, p.slug, p.source_key, p.sku, p.description,
           p.availability, p.sort_order,
           c.id as category_id, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published'
  `;
  const params = [];
  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_name LIKE ? OR p.source_key LIKE ? OR p.sku LIKE ?)`;
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }
  if (categorySlug) {
    sql += ` AND c.slug = ?`;
    params.push(categorySlug);
  }
  if (sort === "name_asc") {
    sql += ` ORDER BY p.display_name COLLATE NOCASE ASC`;
  } else {
    sql += ` ORDER BY p.sort_order ASC, p.display_name COLLATE NOCASE ASC`;
  }
  const products = db.all(sql, ...params);
  const productIds = products.map((p) => p.id);
  let options = [];
  let images = [];
  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    options = db.all(
      `SELECT id, product_id, unit_label, price_idr, pack_quantity, source_price_column, sort_order
       FROM sellable_options
       WHERE product_id IN (${placeholders}) AND active = 1
       ORDER BY sort_order ASC, price_idr ASC`,
      ...productIds
    );
    images = db.all(
      `SELECT pi.product_id, pi.alt_text, ia.storage_key
       FROM product_images pi
       JOIN image_assets ia ON ia.id = pi.image_asset_id
       WHERE pi.product_id IN (${placeholders}) AND pi.is_primary = 1`,
      ...productIds
    );
  }
  const optionsMap = /* @__PURE__ */ new Map();
  for (const opt of options) {
    const list = optionsMap.get(opt.product_id) || [];
    list.push(opt);
    optionsMap.set(opt.product_id, list);
  }
  const imageMap = /* @__PURE__ */ new Map();
  for (const img of images) {
    imageMap.set(img.product_id, img.storage_key);
  }
  const results = products.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    slug: p.slug,
    source_key: p.source_key,
    description: p.description,
    availability: p.availability,
    category: p.category_name ? { id: p.category_id, name: p.category_name, slug: p.category_slug } : null,
    image_url: imageMap.get(p.id) || null,
    options: optionsMap.get(p.id) || []
  }));
  return c.json({ data: results, total: results.length });
});
publicProductRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = getDb();
  const product = db.get(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.status = 'published'`,
    slug
  );
  if (!product) {
    return c.json({ error: "Produk tidak ditemukan." }, 404);
  }
  const options = db.all(
    `SELECT id, product_id, unit_label, price_idr, pack_quantity, source_price_column, sort_order
     FROM sellable_options
     WHERE product_id = ? AND active = 1
     ORDER BY sort_order ASC, price_idr ASC`,
    product.id
  );
  const images = db.all(
    `SELECT pi.alt_text, ia.storage_key
     FROM product_images pi
     JOIN image_assets ia ON ia.id = pi.image_asset_id
     WHERE pi.product_id = ?
     ORDER BY pi.sort_order ASC`,
    product.id
  );
  return c.json({
    data: {
      id: product.id,
      display_name: product.display_name,
      slug: product.slug,
      source_key: product.source_key,
      description: product.description,
      availability: product.availability,
      category: product.category_name ? { id: product.category_id, name: product.category_name, slug: product.category_slug } : null,
      image_url: images.length > 0 ? images[0].storage_key : null,
      images: images.map((img) => ({ url: img.storage_key, alt: img.alt_text })),
      options
    }
  });
});

// server/routes/public/categories.ts
var publicCategoryRoutes = new Hono3();
publicCategoryRoutes.get("/", async (c) => {
  const db = getDb();
  const categories = db.all(
    `SELECT c.id, c.slug, c.name, COUNT(p.id) as product_count
     FROM categories c
     JOIN products p ON p.category_id = c.id AND p.status = 'published'
     WHERE c.active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return c.json({ data: categories });
});

// server/routes/public/settings.ts
var publicSettingsRoutes = new Hono3();
publicSettingsRoutes.get("/", async (c) => {
  const db = getDb();
  const rows = db.all("SELECT key, value_json FROM store_settings");
  const settings = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value_json);
    } catch {
      settings[r.key] = r.value_json;
    }
  }
  const waNumber = typeof settings.whatsapp_number === "string" ? settings.whatsapp_number.trim() : "";
  return c.json({
    data: {
      store_name: settings.store_name || "Toko Timbang Sepakat",
      business_info: settings.business_info || "Penyedia bahan baku terpercaya untuk coffee shop, kafe, dan F&B.",
      is_whatsapp_ready: waNumber.length >= 8
    }
  });
});

// server/routes/public/checkout.ts
import crypto11 from "node:crypto";
var publicCheckoutRoutes = new Hono3();
function formatRupiah(amount) {
  return "Rp" + amount.toLocaleString("id-ID");
}
publicCheckoutRoutes.post("/preview", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "Keranjang belanja kosong." }, 400);
  }
  const db = getDb();
  const items = body.items;
  let subtotalIdr = 0;
  let hasPriceChange = false;
  let hasUnavailableItem = false;
  const validatedLines = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const qty = Math.max(1, Math.min(99999, Math.floor(Number(item.qty) || 1)));
    const option = db.get(
      `SELECT so.id as option_id, so.product_id, so.unit_label, so.price_idr, so.active as option_active,
              p.display_name, p.status as product_status, p.availability
       FROM sellable_options so
       JOIN products p ON p.id = so.product_id
       WHERE so.id = ? AND so.product_id = ?`,
      item.sellable_option_id,
      item.product_id
    );
    if (!option || option.product_status !== "published" || option.option_active !== 1) {
      return c.json(
        {
          error: `Produk atau satuan sudah tidak tersedia di katalog.`,
          invalid_item: { product_id: item.product_id, option_id: item.sellable_option_id }
        },
        400
      );
    }
    if (option.availability === "unavailable") {
      hasUnavailableItem = true;
    }
    const unitPriceIdr = option.price_idr;
    const lineSubtotal = qty * unitPriceIdr;
    subtotalIdr += lineSubtotal;
    let priceChanged = false;
    if (item.client_price_idr !== void 0 && item.client_price_idr !== unitPriceIdr) {
      hasPriceChange = true;
      priceChanged = true;
    }
    validatedLines.push({
      line_position: idx + 1,
      product_id: option.product_id,
      sellable_option_id: option.option_id,
      product_name: option.display_name,
      unit_label: option.unit_label,
      qty,
      unit_price_idr: unitPriceIdr,
      line_subtotal_idr: lineSubtotal,
      price_changed: priceChanged,
      old_price_idr: item.client_price_idr || unitPriceIdr,
      availability: option.availability
    });
  }
  return c.json({
    subtotal_idr: subtotalIdr,
    has_price_change: hasPriceChange,
    has_unavailable_item: hasUnavailableItem,
    lines: validatedLines
  });
});
var intentRateLimits = /* @__PURE__ */ new Map();
publicCheckoutRoutes.post("/intent", async (c) => {
  const ip = c.req.header("x-forwarded-for") || "local";
  const now = Date.now();
  const rl = intentRateLimits.get(ip) || { count: 0, resetAt: now + 60 * 1e3 };
  if (now > rl.resetAt) {
    rl.count = 0;
    rl.resetAt = now + 60 * 1e3;
  }
  rl.count += 1;
  intentRateLimits.set(ip, rl);
  if (rl.count > 20) {
    return c.json({ error: "Terlalu banyak permintaan pemesanan. Silakan coba lagi sebentar lagi." }, 429);
  }
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Permintaan checkout tidak valid." }, 400);
  const buyerName = String(body.buyer_name || "").replace(/<[^>]*>/g, "").replace(/[\r\n]/g, " ").replace(/[<>]/g, "").trim();
  const rawBiz = body.business_name ? String(body.business_name).replace(/<[^>]*>/g, "").replace(/[\r\n]/g, " ").replace(/[<>]/g, "").trim() : "";
  const businessName = rawBiz ? rawBiz : null;
  const idempotencyKey = String(body.idempotency_key || "").trim();
  const items = Array.isArray(body.items) ? body.items : [];
  if (buyerName.length < 2 || buyerName.length > 100) {
    return c.json({ error: "Nama Pembeli wajib diisi (antara 2 hingga 100 karakter)." }, 400);
  }
  if (businessName && businessName.length > 120) {
    return c.json({ error: "Nama Toko / Usaha maksimal 120 karakter." }, 400);
  }
  if (!idempotencyKey) {
    return c.json({ error: "Idempotency key wajib disertakan." }, 400);
  }
  if (items.length === 0) {
    return c.json({ error: "Keranjang belanja kosong." }, 400);
  }
  const db = getDb();
  const existingIntent = db.get(
    "SELECT * FROM checkout_intents WHERE idempotency_key = ?",
    idempotencyKey
  );
  if (existingIntent) {
    const lines = db.all(
      "SELECT * FROM checkout_intent_lines WHERE checkout_intent_id = ? ORDER BY line_position ASC",
      existingIntent.id
    );
    const settingRow2 = db.get("SELECT value_json FROM store_settings WHERE key = 'whatsapp_number'");
    let waNumber2 = "";
    if (settingRow2) {
      try {
        waNumber2 = String(JSON.parse(settingRow2.value_json)).replace(/\D/g, "");
      } catch {
        waNumber2 = String(settingRow2.value_json).replace(/\D/g, "");
      }
    }
    const whatsappUrl2 = waNumber2 ? `https://wa.me/${waNumber2}?text=${encodeURIComponent(existingIntent.message_snapshot)}` : null;
    return c.json({
      intent_id: existingIntent.id,
      public_ref: existingIntent.public_ref,
      buyer_name: existingIntent.buyer_name,
      business_name: existingIntent.business_name,
      subtotal_idr: existingIntent.subtotal_idr,
      message_snapshot: existingIntent.message_snapshot,
      whatsapp_url: whatsappUrl2,
      whatsapp_number_configured: Boolean(waNumber2),
      lines
    });
  }
  let subtotalIdr = 0;
  const lineDetails = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const qty = Math.max(1, Math.min(99999, Math.floor(Number(it.qty) || 1)));
    const option = db.get(
      `SELECT so.id as option_id, so.product_id, so.unit_label, so.price_idr, so.active as option_active,
              p.display_name, p.status as product_status, p.availability
       FROM sellable_options so
       JOIN products p ON p.id = so.product_id
       WHERE so.id = ? AND so.product_id = ?`,
      it.sellable_option_id,
      it.product_id
    );
    if (!option || option.product_status !== "published" || option.option_active !== 1) {
      return c.json({ error: `Produk atau satuan sudah tidak aktif di katalog.` }, 400);
    }
    if (option.availability === "unavailable") {
      return c.json(
        { error: `Produk "${option.display_name}" sedang tidak tersedia. Silakan hapus dari keranjang.` },
        400
      );
    }
    const unitPrice = option.price_idr;
    const lineTotal = qty * unitPrice;
    subtotalIdr += lineTotal;
    lineDetails.push({
      line_position: i + 1,
      product_id: option.product_id,
      sellable_option_id: option.option_id,
      product_name: option.display_name,
      unit_label: option.unit_label,
      qty,
      unit_price_idr: unitPrice,
      line_subtotal_idr: lineTotal
    });
  }
  const publicRef = "TS-" + crypto11.randomBytes(4).toString("hex").toUpperCase();
  const intentId = "cint_" + crypto11.randomBytes(12).toString("hex");
  const linesText = lineDetails.map(
    (l) => `${l.line_position}. ${l.product_name} - ${l.unit_label}
   ${l.qty} x ${formatRupiah(l.unit_price_idr)} = ${formatRupiah(l.line_subtotal_idr)}`
  ).join("\n");
  let message = `Halo Admin Toko Timbang Sepakat, saya ingin memesan:

Referensi: ${publicRef}
Nama Pembeli: ${buyerName}
`;
  if (businessName) {
    message += `Nama Toko/Usaha: ${businessName}
`;
  }
  message += `
${linesText}

Subtotal barang: ${formatRupiah(subtotalIdr)}
`;
  message += `Ongkir: dikonfirmasi admin
`;
  message += `Mohon konfirmasi ketersediaan produk, ongkir, total akhir, dan cara pembayaran. Terima kasih.`;
  const settingRow = db.get("SELECT value_json FROM store_settings WHERE key = 'whatsapp_number'");
  let waNumber = "";
  if (settingRow) {
    try {
      waNumber = String(JSON.parse(settingRow.value_json)).replace(/\D/g, "");
    } catch {
      waNumber = String(settingRow.value_json).replace(/\D/g, "");
    }
  }
  const whatsappUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : null;
  db.exec("BEGIN TRANSACTION;");
  try {
    db.run(
      `INSERT INTO checkout_intents (
        id, public_ref, idempotency_key, buyer_name, business_name,
        subtotal_idr, message_snapshot, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'created')`,
      intentId,
      publicRef,
      idempotencyKey,
      buyerName,
      businessName,
      subtotalIdr,
      message
    );
    for (const l of lineDetails) {
      const lineId = "cline_" + crypto11.randomBytes(12).toString("hex");
      db.run(
        `INSERT INTO checkout_intent_lines (
          id, checkout_intent_id, product_id, sellable_option_id, line_position,
          product_name_snapshot, unit_label_snapshot, qty, unit_price_idr, line_subtotal_idr
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        lineId,
        intentId,
        l.product_id,
        l.sellable_option_id,
        l.line_position,
        l.product_name,
        l.unit_label,
        l.qty,
        l.unit_price_idr,
        l.line_subtotal_idr
      );
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    return c.json({ error: `Gagal membuat checkout intent: ${err.message}` }, 500);
  }
  return c.json(
    {
      intent_id: intentId,
      public_ref: publicRef,
      buyer_name: buyerName,
      business_name: businessName,
      subtotal_idr: subtotalIdr,
      message_snapshot: message,
      whatsapp_url: whatsappUrl,
      whatsapp_number_configured: Boolean(waNumber),
      lines: lineDetails
    },
    201
  );
});

// server/index.ts
function createApp() {
  const app2 = new Hono3();
  app2.use("*", logger());
  app2.use(
    "*",
    cors({
      origin: (origin) => origin || "*",
      credentials: true
    })
  );
  app2.get("/api/health", (c) => c.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
  app2.route("/api/admin/auth", adminAuthRoutes);
  app2.route("/api/admin/products", adminProductRoutes);
  app2.route("/api/admin/pricing", adminPricingRoutes);
  app2.route("/api/admin/import", adminImportRoutes);
  app2.route("/api/admin/categories", adminCategoryRoutes);
  app2.route("/api/admin/settings", adminSettingsRoutes);
  app2.route("/api/admin/orders", adminOrderRoutes);
  app2.route("/api/admin/images", adminImageRoutes);
  app2.route("/api/products", publicProductRoutes);
  app2.route("/api/categories", publicCategoryRoutes);
  app2.route("/api/settings", publicSettingsRoutes);
  app2.route("/api/checkout", publicCheckoutRoutes);
  app2.get("/branding/:filename", (c) => {
    const filename = c.req.param("filename");
    const brandingDir = path4.resolve(process.cwd(), "Branding");
    const publicBrandingDir = path4.resolve(process.cwd(), "public/branding");
    let filePath = path4.join(brandingDir, filename);
    if (!fs4.existsSync(filePath)) {
      if (filename === "logo-color.png") {
        filePath = path4.join(brandingDir, "Logo Toko Timbang Sepakat (Color).png");
      } else if (filename === "logo-white.png") {
        filePath = path4.join(brandingDir, "Logo Toko Timbang Sepakat (white).png");
      }
    }
    if (!fs4.existsSync(filePath)) {
      filePath = path4.join(publicBrandingDir, filename);
    }
    if (fs4.existsSync(filePath)) {
      const ext = path4.extname(filePath).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
      const fileBuffer = fs4.readFileSync(filePath);
      return c.body(fileBuffer, 200, {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400"
      });
    }
    return c.text("Not found", 404);
  });
  const productsDir = path4.resolve(process.cwd(), "public/products");
  app2.get("/products/:filename", (c) => {
    const filename = c.req.param("filename");
    const filePath = path4.join(productsDir, filename);
    if (fs4.existsSync(filePath)) {
      const ext = path4.extname(filePath).toLowerCase();
      const mime = ext === ".svg" ? "image/svg+xml" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const fileBuffer = fs4.readFileSync(filePath);
      return c.body(fileBuffer, 200, {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400"
      });
    }
    return c.text("Not found", 404);
  });
  const distDir = path4.resolve(process.cwd(), "dist");
  if (fs4.existsSync(distDir)) {
    app2.use("/assets/*", serveStatic({ root: "./dist" }));
    app2.use("/branding/*", serveStatic({ root: "./dist" }));
    app2.use("/*", serveStatic({ root: "./dist" }));
    app2.get("*", (c) => {
      const htmlPath = path4.join(distDir, "index.html");
      if (fs4.existsSync(htmlPath)) {
        return c.html(fs4.readFileSync(htmlPath, "utf-8"));
      }
      return c.text("Not found", 404);
    });
  }
  return app2;
}
var app = createApp();
if (process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js")) {
  runMigrations();
  seedDatabase();
  const port = Number(process.env.PORT) || 3e3;
  console.log(`Starting Toko Timbang Sepakat backend server on port ${port}...`);
  serve({
    fetch: app.fetch,
    port
  });
}
var index_default = app;

// server/api-entry.ts
try {
  runMigrations();
  seedDatabase();
} catch (err) {
  console.error("Database initialization warning:", err);
}
var api_entry_default = handle(index_default);
export {
  api_entry_default as default
};
