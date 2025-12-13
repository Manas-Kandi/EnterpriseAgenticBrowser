var Wm = Object.defineProperty;
var Gm = Object.getPrototypeOf;
var Vm = Reflect.get;
var ud = (i) => {
  throw TypeError(i);
};
var Xm = (i, e, t) => e in i ? Wm(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var N = (i, e, t) => Xm(i, typeof e != "symbol" ? e + "" : e, t), dd = (i, e, t) => e.has(i) || ud("Cannot " + t), rc = (i, e) => Object(e) !== e ? ud('Cannot use the "in" operator on this value') : i.has(e), s = (i, e, t) => (dd(i, e, "read from private field"), t ? t.call(i) : e.get(i)), u = (i, e, t) => e.has(i) ? ud("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, t), m = (i, e, t, r) => (dd(i, e, "write to private field"), r ? r.call(i, t) : e.set(i, t), t), g = (i, e, t) => (dd(i, e, "access private method"), t);
var mh = (i, e, t, r) => ({
  set _(n) {
    m(i, e, n, t);
  },
  get _() {
    return s(i, e, r);
  }
}), gh = (i, e, t) => Vm(Gm(i), t, e);
import { m as Jm, n as yt, o as Ym, D as zl, U as H, p as Kl, E as X, q as Qm, s as Zm, t as Wl, v as Ae, w as eg, x as Mt, y as he, z as $s, A as q, F as pp, G as Fc, H as Ve, J as fp, K as tg, L as sg, M as rg, N as mp, O as ng, Q as ig, R as gp, S as og, V as ag, X as cg, Y as ug, Z as wh, _ as dg, $ as lg, a0 as hg, a1 as pg, a2 as fg, a3 as mg, a4 as gg, a5 as wg, a6 as fc, a7 as yh, a8 as yg, a9 as vg, aa as bg, ab as Cg, ac as vh, ad as bh, ae as xg, af as Eg, ag as cs, ah as nc, ai as gt, aj as Ui, ak as Ch, al as Xs, am as jc, an as Sg, ao as Pg, ap as Ig, aq as _g, ar as kg, as as Uc, at as Tg, au as ld, av as Dg, aw as Ng, ax as qs, ay as Og, az as Rg, aA as fs, aB as Ag, aC as Mg, aD as Bg, aE as Fg, aF as jg, aG as Ug, aH as $g, aI as xh, aJ as Lg, aK as bu, aL as qg, aM as Cu, aN as xu, aO as Eh, aP as Hg, aQ as zg } from "./main-BQzmRivP.js";
import Kg from "crypto";
var Eu = {}, Su = {}, Ls = {};
function Wg(i) {
  return { all: i = i || /* @__PURE__ */ new Map(), on: function(e, t) {
    var r = i.get(e);
    r ? r.push(t) : i.set(e, [t]);
  }, off: function(e, t) {
    var r = i.get(e);
    r && (t ? r.splice(r.indexOf(t) >>> 0, 1) : i.set(e, []));
  }, emit: function(e, t) {
    var r = i.get(e);
    r && r.slice().map(function(n) {
      n(t);
    }), (r = i.get("*")) && r.slice().map(function(n) {
      n(e, t);
    });
  } };
}
const Gg = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Wg
}, Symbol.toStringTag, { value: "Module" })), Vg = /* @__PURE__ */ Jm(Gg);
var Xg = yt && yt.__importDefault || function(i) {
  return i && i.__esModule ? i : { default: i };
};
Object.defineProperty(Ls, "__esModule", { value: !0 });
Ls.EventEmitter = void 0;
const Jg = Xg(Vg);
var ms;
class Yg {
  constructor() {
    u(this, ms, (0, Jg.default)());
  }
  on(e, t) {
    return s(this, ms).on(e, t), this;
  }
  /**
   * Like `on` but the listener will only be fired once and then it will be removed.
   * @param event The event you'd like to listen to
   * @param handler The handler function to run when the event occurs
   * @return `this` to enable chaining method calls.
   */
  once(e, t) {
    const r = (n) => {
      t(n), this.off(e, r);
    };
    return this.on(e, r);
  }
  off(e, t) {
    return s(this, ms).off(e, t), this;
  }
  /**
   * Emits an event and call any associated listeners.
   *
   * @param event The event to emit.
   * @param eventData Any data to emit with the event.
   * @return `true` if there are any listeners, `false` otherwise.
   */
  emit(e, t) {
    s(this, ms).emit(e, t);
  }
  /**
   * Removes all listeners. If given an event argument, it will remove only
   * listeners for that event.
   * @param event - the event to remove listeners for.
   * @returns `this` to enable you to chain method calls.
   */
  removeAllListeners(e) {
    return e ? s(this, ms).all.delete(e) : s(this, ms).all.clear(), this;
  }
}
ms = new WeakMap();
Ls.EventEmitter = Yg;
var Te = {};
Object.defineProperty(Te, "__esModule", { value: !0 });
Te.LogType = void 0;
var Sh;
(function(i) {
  i.bidi = "bidi", i.cdp = "cdp", i.debug = "debug", i.debugError = "debug:error", i.debugInfo = "debug:info", i.debugWarn = "debug:warn";
})(Sh || (Te.LogType = Sh = {}));
var Pu = {}, wp;
Object.defineProperty(Pu, "__esModule", { value: !0 });
Pu.ProcessingQueue = void 0;
const hd = Te;
var Ys, co, yn, vn, Kc, yp;
class Gl {
  constructor(e, t) {
    u(this, Kc);
    u(this, Ys);
    u(this, co);
    u(this, yn, []);
    // Flag to keep only 1 active processor.
    u(this, vn, !1);
    m(this, co, e), m(this, Ys, t);
  }
  add(e, t) {
    s(this, yn).push([e, t]), g(this, Kc, yp).call(this);
  }
}
Ys = new WeakMap(), co = new WeakMap(), yn = new WeakMap(), vn = new WeakMap(), Kc = new WeakSet(), yp = async function() {
  var e;
  if (!s(this, vn)) {
    for (m(this, vn, !0); s(this, yn).length > 0; ) {
      const t = s(this, yn).shift();
      if (!t)
        continue;
      const [r, n] = t;
      (e = s(this, Ys)) == null || e.call(this, wp.LOGGER_PREFIX, "Processing event:", n), await r.then((o) => {
        var a;
        if (o.kind === "error") {
          (a = s(this, Ys)) == null || a.call(this, hd.LogType.debugError, "Event threw before sending:", o.error.message, o.error.stack);
          return;
        }
        return s(this, co).call(this, o.value);
      }).catch((o) => {
        var a;
        (a = s(this, Ys)) == null || a.call(this, hd.LogType.debugError, "Event was not processed:", o == null ? void 0 : o.message);
      });
    }
    m(this, vn, !1);
  }
}, N(Gl, "LOGGER_PREFIX", `${hd.LogType.debug}:queue`);
Pu.ProcessingQueue = Gl;
wp = Gl;
var Iu = {}, ee = {}, vp = {};
Object.defineProperty(vp, "__esModule", { value: !0 });
var ve = {};
Object.defineProperty(ve, "__esModule", { value: !0 });
ve.EVENT_NAMES = ve.Speculation = ve.Bluetooth = ve.Network = ve.Input = ve.BrowsingContext = ve.Log = ve.Script = ve.BiDiModule = void 0;
var kd;
(function(i) {
  i.Bluetooth = "bluetooth", i.Browser = "browser", i.BrowsingContext = "browsingContext", i.Cdp = "goog:cdp", i.Input = "input", i.Log = "log", i.Network = "network", i.Script = "script", i.Session = "session", i.Speculation = "speculation";
})(kd || (ve.BiDiModule = kd = {}));
var Td;
(function(i) {
  (function(e) {
    e.Message = "script.message", e.RealmCreated = "script.realmCreated", e.RealmDestroyed = "script.realmDestroyed";
  })(i.EventNames || (i.EventNames = {}));
})(Td || (ve.Script = Td = {}));
var Dd;
(function(i) {
  (function(e) {
    e.LogEntryAdded = "log.entryAdded";
  })(i.EventNames || (i.EventNames = {}));
})(Dd || (ve.Log = Dd = {}));
var Nd;
(function(i) {
  (function(e) {
    e.ContextCreated = "browsingContext.contextCreated", e.ContextDestroyed = "browsingContext.contextDestroyed", e.DomContentLoaded = "browsingContext.domContentLoaded", e.DownloadEnd = "browsingContext.downloadEnd", e.DownloadWillBegin = "browsingContext.downloadWillBegin", e.FragmentNavigated = "browsingContext.fragmentNavigated", e.HistoryUpdated = "browsingContext.historyUpdated", e.Load = "browsingContext.load", e.NavigationAborted = "browsingContext.navigationAborted", e.NavigationCommitted = "browsingContext.navigationCommitted", e.NavigationFailed = "browsingContext.navigationFailed", e.NavigationStarted = "browsingContext.navigationStarted", e.UserPromptClosed = "browsingContext.userPromptClosed", e.UserPromptOpened = "browsingContext.userPromptOpened";
  })(i.EventNames || (i.EventNames = {}));
})(Nd || (ve.BrowsingContext = Nd = {}));
var Od;
(function(i) {
  (function(e) {
    e.FileDialogOpened = "input.fileDialogOpened";
  })(i.EventNames || (i.EventNames = {}));
})(Od || (ve.Input = Od = {}));
var Rd;
(function(i) {
  (function(e) {
    e.AuthRequired = "network.authRequired", e.BeforeRequestSent = "network.beforeRequestSent", e.FetchError = "network.fetchError", e.ResponseCompleted = "network.responseCompleted", e.ResponseStarted = "network.responseStarted";
  })(i.EventNames || (i.EventNames = {}));
})(Rd || (ve.Network = Rd = {}));
var Ad;
(function(i) {
  (function(e) {
    e.RequestDevicePromptUpdated = "bluetooth.requestDevicePromptUpdated", e.GattConnectionAttempted = "bluetooth.gattConnectionAttempted", e.CharacteristicEventGenerated = "bluetooth.characteristicEventGenerated", e.DescriptorEventGenerated = "bluetooth.descriptorEventGenerated";
  })(i.EventNames || (i.EventNames = {}));
})(Ad || (ve.Bluetooth = Ad = {}));
var Md;
(function(i) {
  (function(e) {
    e.PrefetchStatusUpdated = "speculation.prefetchStatusUpdated";
  })(i.EventNames || (i.EventNames = {}));
})(Md || (ve.Speculation = Md = {}));
ve.EVENT_NAMES = /* @__PURE__ */ new Set([
  // keep-sorted start
  ...Object.values(kd),
  ...Object.values(Ad.EventNames),
  ...Object.values(Nd.EventNames),
  ...Object.values(Od.EventNames),
  ...Object.values(Dd.EventNames),
  ...Object.values(Rd.EventNames),
  ...Object.values(Td.EventNames),
  ...Object.values(Md.EventNames)
  // keep-sorted end
]);
var bp = {};
Object.defineProperty(bp, "__esModule", { value: !0 });
var F = {};
Object.defineProperty(F, "__esModule", { value: !0 });
F.UnavailableNetworkDataException = F.NoSuchNetworkDataException = F.NoSuchNetworkCollectorException = F.NoSuchWebExtensionException = F.InvalidWebExtensionException = F.UnderspecifiedStoragePartitionException = F.UnableToSetFileInputException = F.UnableToSetCookieException = F.NoSuchStoragePartitionException = F.UnsupportedOperationException = F.UnableToCloseBrowserException = F.UnableToCaptureScreenException = F.UnknownErrorException = F.UnknownCommandException = F.SessionNotCreatedException = F.NoSuchUserContextException = F.NoSuchScriptException = F.NoSuchRequestException = F.NoSuchNodeException = F.NoSuchInterceptException = F.NoSuchHistoryEntryException = F.NoSuchHandleException = F.NoSuchFrameException = F.NoSuchElementException = F.NoSuchAlertException = F.MoveTargetOutOfBoundsException = F.InvalidSessionIdException = F.InvalidSelectorException = F.InvalidArgumentException = F.Exception = void 0;
class te extends Error {
  constructor(t, r, n) {
    super();
    N(this, "error");
    N(this, "message");
    N(this, "stacktrace");
    this.error = t, this.message = r, this.stacktrace = n;
  }
  toErrorResponse(t) {
    return {
      type: "error",
      id: t,
      error: this.error,
      message: this.message,
      stacktrace: this.stacktrace
    };
  }
}
F.Exception = te;
class Qg extends te {
  constructor(e, t) {
    super("invalid argument", e, t);
  }
}
F.InvalidArgumentException = Qg;
class Zg extends te {
  constructor(e, t) {
    super("invalid selector", e, t);
  }
}
F.InvalidSelectorException = Zg;
class ew extends te {
  constructor(e, t) {
    super("invalid session id", e, t);
  }
}
F.InvalidSessionIdException = ew;
class tw extends te {
  constructor(e, t) {
    super("move target out of bounds", e, t);
  }
}
F.MoveTargetOutOfBoundsException = tw;
class sw extends te {
  constructor(e, t) {
    super("no such alert", e, t);
  }
}
F.NoSuchAlertException = sw;
class rw extends te {
  constructor(e, t) {
    super("no such element", e, t);
  }
}
F.NoSuchElementException = rw;
class nw extends te {
  constructor(e, t) {
    super("no such frame", e, t);
  }
}
F.NoSuchFrameException = nw;
class iw extends te {
  constructor(e, t) {
    super("no such handle", e, t);
  }
}
F.NoSuchHandleException = iw;
class ow extends te {
  constructor(e, t) {
    super("no such history entry", e, t);
  }
}
F.NoSuchHistoryEntryException = ow;
class aw extends te {
  constructor(e, t) {
    super("no such intercept", e, t);
  }
}
F.NoSuchInterceptException = aw;
class cw extends te {
  constructor(e, t) {
    super("no such node", e, t);
  }
}
F.NoSuchNodeException = cw;
class uw extends te {
  constructor(e, t) {
    super("no such request", e, t);
  }
}
F.NoSuchRequestException = uw;
class dw extends te {
  constructor(e, t) {
    super("no such script", e, t);
  }
}
F.NoSuchScriptException = dw;
class lw extends te {
  constructor(e, t) {
    super("no such user context", e, t);
  }
}
F.NoSuchUserContextException = lw;
class hw extends te {
  constructor(e, t) {
    super("session not created", e, t);
  }
}
F.SessionNotCreatedException = hw;
class pw extends te {
  constructor(e, t) {
    super("unknown command", e, t);
  }
}
F.UnknownCommandException = pw;
class fw extends te {
  constructor(e, t = new Error().stack) {
    super("unknown error", e, t);
  }
}
F.UnknownErrorException = fw;
class mw extends te {
  constructor(e, t) {
    super("unable to capture screen", e, t);
  }
}
F.UnableToCaptureScreenException = mw;
class gw extends te {
  constructor(e, t) {
    super("unable to close browser", e, t);
  }
}
F.UnableToCloseBrowserException = gw;
class ww extends te {
  constructor(e, t) {
    super("unsupported operation", e, t);
  }
}
F.UnsupportedOperationException = ww;
class yw extends te {
  constructor(e, t) {
    super("no such storage partition", e, t);
  }
}
F.NoSuchStoragePartitionException = yw;
class vw extends te {
  constructor(e, t) {
    super("unable to set cookie", e, t);
  }
}
F.UnableToSetCookieException = vw;
class bw extends te {
  constructor(e, t) {
    super("unable to set file input", e, t);
  }
}
F.UnableToSetFileInputException = bw;
class Cw extends te {
  constructor(e, t) {
    super("underspecified storage partition", e, t);
  }
}
F.UnderspecifiedStoragePartitionException = Cw;
class xw extends te {
  constructor(e, t) {
    super("invalid web extension", e, t);
  }
}
F.InvalidWebExtensionException = xw;
class Ew extends te {
  constructor(e, t) {
    super("no such web extension", e, t);
  }
}
F.NoSuchWebExtensionException = Ew;
class Sw extends te {
  constructor(e, t) {
    super("no such network collector", e, t);
  }
}
F.NoSuchNetworkCollectorException = Sw;
class Pw extends te {
  constructor(e, t) {
    super("no such network data", e, t);
  }
}
F.NoSuchNetworkDataException = Pw;
class Iw extends te {
  constructor(e, t) {
    super("unavailable network data", e, t);
  }
}
F.UnavailableNetworkDataException = Iw;
var Cp = {};
Object.defineProperty(Cp, "__esModule", { value: !0 });
var xp = {};
Object.defineProperty(xp, "__esModule", { value: !0 });
var Ep = {};
Object.defineProperty(Ep, "__esModule", { value: !0 });
(function(i) {
  var e = yt && yt.__createBinding || (Object.create ? function(o, a, c, f) {
    f === void 0 && (f = c);
    var p = Object.getOwnPropertyDescriptor(a, c);
    (!p || ("get" in p ? !a.__esModule : p.writable || p.configurable)) && (p = { enumerable: !0, get: function() {
      return a[c];
    } }), Object.defineProperty(o, f, p);
  } : function(o, a, c, f) {
    f === void 0 && (f = c), o[f] = a[c];
  }), t = yt && yt.__setModuleDefault || (Object.create ? function(o, a) {
    Object.defineProperty(o, "default", { enumerable: !0, value: a });
  } : function(o, a) {
    o.default = a;
  }), r = yt && yt.__importStar || /* @__PURE__ */ function() {
    var o = function(a) {
      return o = Object.getOwnPropertyNames || function(c) {
        var f = [];
        for (var p in c) Object.prototype.hasOwnProperty.call(c, p) && (f[f.length] = p);
        return f;
      }, o(a);
    };
    return function(a) {
      if (a && a.__esModule) return a;
      var c = {};
      if (a != null) for (var f = o(a), p = 0; p < f.length; p++) f[p] !== "default" && e(c, a, f[p]);
      return t(c, a), c;
    };
  }(), n = yt && yt.__exportStar || function(o, a) {
    for (var c in o) c !== "default" && !Object.prototype.hasOwnProperty.call(a, c) && e(a, o, c);
  };
  Object.defineProperty(i, "__esModule", { value: !0 }), i.ChromiumBidi = i.Cdp = void 0, i.Cdp = r(vp), i.ChromiumBidi = r(ve), n(bp, i), n(F, i), n(Cp, i), n(xp, i), n(Ep, i);
})(ee);
var _u = {};
Object.defineProperty(_u, "__esModule", { value: !0 });
_u.BidiNoOpParser = void 0;
class _w {
  // Bluetooth module
  // keep-sorted start block=yes
  parseDisableSimulationParameters(e) {
    return e;
  }
  parseHandleRequestDevicePromptParams(e) {
    return e;
  }
  parseSimulateAdapterParameters(e) {
    return e;
  }
  parseSimulateAdvertisementParameters(e) {
    return e;
  }
  parseSimulateCharacteristicParameters(e) {
    return e;
  }
  parseSimulateCharacteristicResponseParameters(e) {
    return e;
  }
  parseSimulateDescriptorParameters(e) {
    return e;
  }
  parseSimulateDescriptorResponseParameters(e) {
    return e;
  }
  parseSimulateGattConnectionResponseParameters(e) {
    return e;
  }
  parseSimulateGattDisconnectionParameters(e) {
    return e;
  }
  parseSimulatePreconnectedPeripheralParameters(e) {
    return e;
  }
  parseSimulateServiceParameters(e) {
    return e;
  }
  // keep-sorted end
  // Browser module
  // keep-sorted start block=yes
  parseCreateUserContextParameters(e) {
    return e;
  }
  parseRemoveUserContextParameters(e) {
    return e;
  }
  parseSetClientWindowStateParameters(e) {
    return e;
  }
  parseSetDownloadBehaviorParameters(e) {
    return e;
  }
  // keep-sorted end
  // Browsing Context module
  // keep-sorted start block=yes
  parseActivateParams(e) {
    return e;
  }
  parseCaptureScreenshotParams(e) {
    return e;
  }
  parseCloseParams(e) {
    return e;
  }
  parseCreateParams(e) {
    return e;
  }
  parseGetTreeParams(e) {
    return e;
  }
  parseHandleUserPromptParams(e) {
    return e;
  }
  parseLocateNodesParams(e) {
    return e;
  }
  parseNavigateParams(e) {
    return e;
  }
  parsePrintParams(e) {
    return e;
  }
  parseReloadParams(e) {
    return e;
  }
  parseSetViewportParams(e) {
    return e;
  }
  parseTraverseHistoryParams(e) {
    return e;
  }
  // keep-sorted end
  // CDP module
  // keep-sorted start block=yes
  parseGetSessionParams(e) {
    return e;
  }
  parseResolveRealmParams(e) {
    return e;
  }
  parseSendCommandParams(e) {
    return e;
  }
  // keep-sorted end
  // Emulation module
  // keep-sorted start block=yes
  parseSetForcedColorsModeThemeOverrideParams(e) {
    return e;
  }
  parseSetGeolocationOverrideParams(e) {
    return e;
  }
  parseSetLocaleOverrideParams(e) {
    return e;
  }
  parseSetNetworkConditionsParams(e) {
    return e;
  }
  parseSetScreenOrientationOverrideParams(e) {
    return e;
  }
  parseSetScriptingEnabledParams(e) {
    return e;
  }
  parseSetTimezoneOverrideParams(e) {
    return e;
  }
  parseSetUserAgentOverrideParams(e) {
    return e;
  }
  // keep-sorted end
  // Script module
  // keep-sorted start block=yes
  parseAddPreloadScriptParams(e) {
    return e;
  }
  parseCallFunctionParams(e) {
    return e;
  }
  parseDisownParams(e) {
    return e;
  }
  parseEvaluateParams(e) {
    return e;
  }
  parseGetRealmsParams(e) {
    return e;
  }
  parseRemovePreloadScriptParams(e) {
    return e;
  }
  // keep-sorted end
  // Input module
  // keep-sorted start block=yes
  parsePerformActionsParams(e) {
    return e;
  }
  parseReleaseActionsParams(e) {
    return e;
  }
  parseSetFilesParams(e) {
    return e;
  }
  // keep-sorted end
  // Network module
  // keep-sorted start block=yes
  parseAddDataCollectorParams(e) {
    return e;
  }
  parseAddInterceptParams(e) {
    return e;
  }
  parseContinueRequestParams(e) {
    return e;
  }
  parseContinueResponseParams(e) {
    return e;
  }
  parseContinueWithAuthParams(e) {
    return e;
  }
  parseDisownDataParams(e) {
    return e;
  }
  parseFailRequestParams(e) {
    return e;
  }
  parseGetDataParams(e) {
    return e;
  }
  parseProvideResponseParams(e) {
    return e;
  }
  parseRemoveDataCollectorParams(e) {
    return e;
  }
  parseRemoveInterceptParams(e) {
    return e;
  }
  parseSetCacheBehaviorParams(e) {
    return e;
  }
  parseSetExtraHeadersParams(e) {
    return e;
  }
  // keep-sorted end
  // Permissions module
  // keep-sorted start block=yes
  parseSetPermissionsParams(e) {
    return e;
  }
  // keep-sorted end
  // Session module
  // keep-sorted start block=yes
  parseSubscribeParams(e) {
    return e;
  }
  parseUnsubscribeParams(e) {
    return e;
  }
  // keep-sorted end
  // Storage module
  // keep-sorted start block=yes
  parseDeleteCookiesParams(e) {
    return e;
  }
  parseGetCookiesParams(e) {
    return e;
  }
  parseSetCookieParams(e) {
    return e;
  }
  // keep-sorted end
  // WebExtenstion module
  // keep-sorted start block=yes
  parseInstallParams(e) {
    return e;
  }
  parseUninstallParams(e) {
    return e;
  }
}
_u.BidiNoOpParser = _w;
var Xa = {};
Object.defineProperty(Xa, "__esModule", { value: !0 });
Xa.BrowserProcessor = void 0;
Xa.getProxyStr = Ip;
const rs = ee;
var Lt, uo, qt, Qs, ns, Sp, Pp, Bd;
class kw {
  constructor(e, t, r, n) {
    u(this, ns);
    u(this, Lt);
    u(this, uo);
    u(this, qt);
    u(this, Qs);
    m(this, Lt, e), m(this, uo, t), m(this, qt, r), m(this, Qs, n);
  }
  close() {
    return setTimeout(() => s(this, Lt).sendCommand("Browser.close"), 0), {};
  }
  async createUserContext(e) {
    const t = e, r = s(this, qt).getGlobalConfig();
    if (t.acceptInsecureCerts !== void 0 && t.acceptInsecureCerts === !1 && r.acceptInsecureCerts === !0)
      throw new rs.UnknownErrorException(`Cannot set user context's "acceptInsecureCerts" to false, when a capability "acceptInsecureCerts" is set to true`);
    const n = {};
    if (t.proxy) {
      const a = Ip(t.proxy);
      a && (n.proxyServer = a), t.proxy.noProxy && (n.proxyBypassList = t.proxy.noProxy.join(","));
    } else {
      e["goog:proxyServer"] !== void 0 && (n.proxyServer = e["goog:proxyServer"]);
      const a = e["goog:proxyBypassList"] ?? void 0;
      a && (n.proxyBypassList = a.join(","));
    }
    const o = await s(this, Lt).sendCommand("Target.createBrowserContext", n);
    return await g(this, ns, Bd).call(this, r.downloadBehavior ?? null, o.browserContextId), s(this, qt).updateUserContextConfig(o.browserContextId, {
      acceptInsecureCerts: e.acceptInsecureCerts,
      userPromptHandler: e.unhandledPromptBehavior
    }), {
      userContext: o.browserContextId
    };
  }
  async removeUserContext(e) {
    const t = e.userContext;
    if (t === "default")
      throw new rs.InvalidArgumentException("`default` user context cannot be removed");
    try {
      await s(this, Lt).sendCommand("Target.disposeBrowserContext", {
        browserContextId: t
      });
    } catch (r) {
      throw r.message.startsWith("Failed to find context with id") ? new rs.NoSuchUserContextException(r.message) : r;
    }
    return {};
  }
  async getUserContexts() {
    return {
      userContexts: await s(this, Qs).getUserContexts()
    };
  }
  async getClientWindows() {
    const e = s(this, uo).getTopLevelContexts().map((o) => o.cdpTarget.id), t = await Promise.all(e.map(async (o) => await g(this, ns, Sp).call(this, o))), r = /* @__PURE__ */ new Set(), n = new Array();
    for (const o of t)
      r.has(o.clientWindow) || (r.add(o.clientWindow), n.push(o));
    return { clientWindows: n };
  }
  async setDownloadBehavior(e) {
    let t;
    return e.userContexts === void 0 ? t = (await s(this, Qs).getUserContexts()).map((r) => r.userContext) : t = Array.from(await s(this, Qs).verifyUserContextIdList(e.userContexts)), e.userContexts === void 0 ? s(this, qt).updateGlobalConfig({
      downloadBehavior: e.downloadBehavior
    }) : e.userContexts.map((r) => s(this, qt).updateUserContextConfig(r, {
      downloadBehavior: e.downloadBehavior
    })), await Promise.all(t.map(async (r) => {
      const n = s(this, qt).getActiveConfig(void 0, r).downloadBehavior ?? null;
      await g(this, ns, Bd).call(this, n, r);
    })), {};
  }
}
Lt = new WeakMap(), uo = new WeakMap(), qt = new WeakMap(), Qs = new WeakMap(), ns = new WeakSet(), Sp = async function(e) {
  const t = await s(this, Lt).sendCommand("Browser.getWindowForTarget", { targetId: e });
  return {
    // `active` is not supported in CDP yet.
    active: !1,
    clientWindow: `${t.windowId}`,
    state: t.bounds.windowState ?? "normal",
    height: t.bounds.height ?? 0,
    width: t.bounds.width ?? 0,
    x: t.bounds.left ?? 0,
    y: t.bounds.top ?? 0
  };
}, Pp = function(e) {
  if (e === null)
    return {
      behavior: "default"
    };
  if ((e == null ? void 0 : e.type) === "denied")
    return {
      behavior: "deny"
    };
  if ((e == null ? void 0 : e.type) === "allowed")
    return {
      behavior: "allow",
      downloadPath: e.destinationFolder
    };
  throw new rs.UnknownErrorException("Unexpected download behavior");
}, Bd = async function(e, t) {
  await s(this, Lt).sendCommand("Browser.setDownloadBehavior", {
    ...g(this, ns, Pp).call(this, e),
    browserContextId: t === "default" ? void 0 : t,
    // Required for enabling download events.
    eventsEnabled: !0
  });
};
Xa.BrowserProcessor = kw;
function Ip(i) {
  if (!(i.proxyType === "direct" || i.proxyType === "system")) {
    if (i.proxyType === "pac")
      throw new rs.UnsupportedOperationException("PAC proxy configuration is not supported per user context");
    if (i.proxyType === "autodetect")
      throw new rs.UnsupportedOperationException("Autodetect proxy is not supported per user context");
    if (i.proxyType === "manual") {
      const e = [];
      if (i.httpProxy !== void 0 && e.push(`http=${i.httpProxy}`), i.sslProxy !== void 0 && e.push(`https=${i.sslProxy}`), i.socksProxy !== void 0 || i.socksVersion !== void 0) {
        if (i.socksProxy === void 0)
          throw new rs.InvalidArgumentException("'socksVersion' cannot be set without 'socksProxy'");
        if (i.socksVersion === void 0 || typeof i.socksVersion != "number" || !Number.isInteger(i.socksVersion) || i.socksVersion < 0 || i.socksVersion > 255)
          throw new rs.InvalidArgumentException("'socksVersion' must be between 0 and 255");
        e.push(`socks=socks${i.socksVersion}://${i.socksProxy}`);
      }
      return e.length === 0 ? void 0 : e.join(";");
    }
    throw new rs.UnknownErrorException("Unknown proxy type");
  }
}
var ku = {};
Object.defineProperty(ku, "__esModule", { value: !0 });
ku.CdpProcessor = void 0;
const Tw = ee;
var lo, ho, po, fo;
class Dw {
  constructor(e, t, r, n) {
    u(this, lo);
    u(this, ho);
    u(this, po);
    u(this, fo);
    m(this, lo, e), m(this, ho, t), m(this, po, r), m(this, fo, n);
  }
  getSession(e) {
    const t = e.context, r = s(this, lo).getContext(t).cdpTarget.cdpSessionId;
    return r === void 0 ? {} : { session: r };
  }
  resolveRealm(e) {
    const t = e.realm, r = s(this, ho).getRealm({ realmId: t });
    if (r === void 0)
      throw new Tw.UnknownErrorException(`Could not find realm ${e.realm}`);
    return { executionContextId: r.executionContextId };
  }
  async sendCommand(e) {
    return {
      result: await (e.session ? s(this, po).getCdpClient(e.session) : s(this, fo)).sendCommand(e.method, e.params),
      session: e.session
    };
  }
}
lo = new WeakMap(), ho = new WeakMap(), po = new WeakMap(), fo = new WeakMap();
ku.CdpProcessor = Dw;
var Tu = {};
Object.defineProperty(Tu, "__esModule", { value: !0 });
Tu.BrowsingContextProcessor = void 0;
const $e = ee;
var mo, me, Zs, bn, go, Di, _p, kp;
class Nw {
  constructor(e, t, r, n, o) {
    u(this, Di);
    u(this, mo);
    u(this, me);
    u(this, Zs);
    u(this, bn);
    u(this, go);
    m(this, Zs, n), m(this, go, r), m(this, mo, e), m(this, me, t), m(this, bn, o), s(this, bn).addSubscribeHook($e.ChromiumBidi.BrowsingContext.EventNames.ContextCreated, g(this, Di, kp).bind(this));
  }
  getTree(e) {
    return {
      contexts: (e.root === void 0 ? s(this, me).getTopLevelContexts() : [s(this, me).getContext(e.root)]).map((r) => r.serializeToBidiValue(e.maxDepth ?? Number.MAX_VALUE))
    };
  }
  async create(e) {
    let t, r = "default";
    if (e.referenceContext !== void 0) {
      if (t = s(this, me).getContext(e.referenceContext), !t.isTopLevelContext())
        throw new $e.InvalidArgumentException("referenceContext should be a top-level context");
      r = t.userContext;
    }
    e.userContext !== void 0 && (r = e.userContext);
    const n = s(this, me).getAllContexts().filter((f) => f.userContext === r);
    let o = !1;
    switch (e.type) {
      case "tab":
        o = !1;
        break;
      case "window":
        o = !0;
        break;
    }
    n.length || (o = !0);
    let a;
    try {
      a = await s(this, mo).sendCommand("Target.createTarget", {
        url: "about:blank",
        newWindow: o,
        browserContextId: r === "default" ? void 0 : r,
        background: e.background === !0
      });
    } catch (f) {
      throw (
        // See https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/devtools/protocol/target_handler.cc;l=90;drc=e80392ac11e48a691f4309964cab83a3a59e01c8
        f.message.startsWith("Failed to find browser context with id") || // See https://source.chromium.org/chromium/chromium/src/+/main:headless/lib/browser/protocol/target_handler.cc;l=49;drc=e80392ac11e48a691f4309964cab83a3a59e01c8
        f.message === "browserContextId" ? new $e.NoSuchUserContextException(`The context ${r} was not found`) : f
      );
    }
    const c = await s(this, me).waitForContext(a.targetId);
    return await c.lifecycleLoaded(), { context: c.id };
  }
  navigate(e) {
    return s(this, me).getContext(e.context).navigate(
      e.url,
      e.wait ?? "none"
      /* BrowsingContext.ReadinessState.None */
    );
  }
  reload(e) {
    return s(this, me).getContext(e.context).reload(
      e.ignoreCache ?? !1,
      e.wait ?? "none"
      /* BrowsingContext.ReadinessState.None */
    );
  }
  async activate(e) {
    const t = s(this, me).getContext(e.context);
    if (!t.isTopLevelContext())
      throw new $e.InvalidArgumentException("Activation is only supported on the top-level context");
    return await t.activate(), {};
  }
  async captureScreenshot(e) {
    return await s(this, me).getContext(e.context).captureScreenshot(e);
  }
  async print(e) {
    return await s(this, me).getContext(e.context).print(e);
  }
  async setViewport(e) {
    var o, a;
    if ((((o = e.viewport) == null ? void 0 : o.height) ?? 0) > 1e7 || (((a = e.viewport) == null ? void 0 : a.width) ?? 0) > 1e7)
      throw new $e.UnsupportedOperationException("Viewport dimension over 10000000 are not supported");
    const r = {};
    e.devicePixelRatio !== void 0 && (r.devicePixelRatio = e.devicePixelRatio), e.viewport !== void 0 && (r.viewport = e.viewport);
    const n = await g(this, Di, _p).call(this, e.context, e.userContexts);
    for (const c of e.userContexts ?? [])
      s(this, Zs).updateUserContextConfig(c, r);
    return e.context !== void 0 && s(this, Zs).updateBrowsingContextConfig(e.context, r), await Promise.all(n.map(async (c) => {
      const f = s(this, Zs).getActiveConfig(c.id, c.userContext);
      await c.setViewport(f.viewport ?? null, f.devicePixelRatio ?? null, f.screenOrientation ?? null);
    })), {};
  }
  async traverseHistory(e) {
    const t = s(this, me).getContext(e.context);
    if (!t)
      throw new $e.InvalidArgumentException(`No browsing context with id ${e.context}`);
    if (!t.isTopLevelContext())
      throw new $e.InvalidArgumentException("Traversing history is only supported on the top-level context");
    return await t.traverseHistory(e.delta), {};
  }
  async handleUserPrompt(e) {
    var r;
    const t = s(this, me).getContext(e.context);
    try {
      await t.handleUserPrompt(e.accept, e.userText);
    } catch (n) {
      throw (r = n.message) != null && r.includes("No dialog is showing") ? new $e.NoSuchAlertException("No dialog is showing") : n;
    }
    return {};
  }
  async close(e) {
    const t = s(this, me).getContext(e.context);
    if (!t.isTopLevelContext())
      throw new $e.InvalidArgumentException(`Non top-level browsing context ${t.id} cannot be closed.`);
    const r = t.cdpTarget.parentCdpClient;
    try {
      const n = new Promise((o) => {
        const a = (c) => {
          c.targetId === e.context && (r.off("Target.detachedFromTarget", a), o());
        };
        r.on("Target.detachedFromTarget", a);
      });
      try {
        e.promptUnload ? await t.close() : await r.sendCommand("Target.closeTarget", {
          targetId: e.context
        });
      } catch (o) {
        if (!r.isCloseError(o))
          throw o;
      }
      await n;
    } catch (n) {
      if (!(n.code === -32e3 && n.message === "Not attached to an active page"))
        throw n;
    }
    return {};
  }
  async locateNodes(e) {
    return await s(this, me).getContext(e.context).locateNodes(e);
  }
}
mo = new WeakMap(), me = new WeakMap(), Zs = new WeakMap(), bn = new WeakMap(), go = new WeakMap(), Di = new WeakSet(), _p = async function(e, t) {
  if (e === void 0 && t === void 0)
    throw new $e.InvalidArgumentException("Either userContexts or context must be provided");
  if (e !== void 0 && t !== void 0)
    throw new $e.InvalidArgumentException("userContexts and context are mutually exclusive");
  if (e !== void 0) {
    const n = s(this, me).getContext(e);
    if (!n.isTopLevelContext())
      throw new $e.InvalidArgumentException("Emulating viewport is only supported on the top-level context");
    return [n];
  }
  await s(this, go).verifyUserContextIdList(t);
  const r = [];
  for (const n of t) {
    const o = s(this, me).getTopLevelContexts().filter((a) => a.userContext === n);
    r.push(...o);
  }
  return [...new Set(r).values()];
}, kp = function(e) {
  return [
    s(this, me).getContext(e),
    ...s(this, me).getContext(e).allChildren
  ].forEach((n) => {
    s(this, bn).registerEvent({
      type: "event",
      method: $e.ChromiumBidi.BrowsingContext.EventNames.ContextCreated,
      params: n.serializeToBidiValue()
    }, n.id);
  }), Promise.resolve();
};
Tu.BrowsingContextProcessor = Nw;
var Gr = {};
Object.defineProperty(Gr, "__esModule", { value: !0 });
Gr.EmulationProcessor = void 0;
Gr.isValidLocale = Tp;
Gr.isValidTimezone = Dp;
Gr.isTimeZoneOffsetString = Np;
const Le = F;
var wo, er, ae, vt, hs;
class Ow {
  constructor(e, t, r) {
    u(this, vt);
    u(this, wo);
    u(this, er);
    u(this, ae);
    m(this, wo, t), m(this, er, e), m(this, ae, r);
  }
  async setGeolocationOverride(e) {
    var n, o;
    if ("coordinates" in e && "error" in e)
      throw new Le.InvalidArgumentException("Coordinates and error cannot be set at the same time");
    let t = null;
    if ("coordinates" in e) {
      if ((((n = e.coordinates) == null ? void 0 : n.altitude) ?? null) === null && (((o = e.coordinates) == null ? void 0 : o.altitudeAccuracy) ?? null) !== null)
        throw new Le.InvalidArgumentException("Geolocation altitudeAccuracy can be set only with altitude");
      t = e.coordinates;
    } else if ("error" in e) {
      if (e.error.type !== "positionUnavailable")
        throw new Le.InvalidArgumentException(`Unknown geolocation error ${e.error.type}`);
      t = e.error;
    } else
      throw new Le.InvalidArgumentException("Coordinates or error should be set");
    const r = await g(this, vt, hs).call(this, e.contexts, e.userContexts);
    for (const a of e.contexts ?? [])
      s(this, ae).updateBrowsingContextConfig(a, {
        geolocation: t
      });
    for (const a of e.userContexts ?? [])
      s(this, ae).updateUserContextConfig(a, {
        geolocation: t
      });
    return await Promise.all(r.map(async (a) => {
      const c = s(this, ae).getActiveConfig(a.id, a.userContext);
      await a.setGeolocationOverride(c.geolocation ?? null);
    })), {};
  }
  async setLocaleOverride(e) {
    const t = e.locale ?? null;
    if (t !== null && !Tp(t))
      throw new Le.InvalidArgumentException(`Invalid locale "${t}"`);
    const r = await g(this, vt, hs).call(this, e.contexts, e.userContexts);
    for (const n of e.contexts ?? [])
      s(this, ae).updateBrowsingContextConfig(n, {
        locale: t
      });
    for (const n of e.userContexts ?? [])
      s(this, ae).updateUserContextConfig(n, {
        locale: t
      });
    return await Promise.all(r.map(async (n) => {
      const o = s(this, ae).getActiveConfig(n.id, n.userContext);
      await Promise.all([
        n.setLocaleOverride(o.locale ?? null),
        // Set `AcceptLanguage` to locale.
        n.setUserAgentAndAcceptLanguage(o.userAgent, o.locale)
      ]);
    })), {};
  }
  async setScriptingEnabled(e) {
    const t = e.enabled, r = await g(this, vt, hs).call(this, e.contexts, e.userContexts);
    for (const n of e.contexts ?? [])
      s(this, ae).updateBrowsingContextConfig(n, {
        scriptingEnabled: t
      });
    for (const n of e.userContexts ?? [])
      s(this, ae).updateUserContextConfig(n, {
        scriptingEnabled: t
      });
    return await Promise.all(r.map(async (n) => {
      const o = s(this, ae).getActiveConfig(n.id, n.userContext);
      await n.setScriptingEnabled(o.scriptingEnabled ?? null);
    })), {};
  }
  async setScreenOrientationOverride(e) {
    const t = await g(this, vt, hs).call(this, e.contexts, e.userContexts);
    for (const r of e.contexts ?? [])
      s(this, ae).updateBrowsingContextConfig(r, {
        screenOrientation: e.screenOrientation
      });
    for (const r of e.userContexts ?? [])
      s(this, ae).updateUserContextConfig(r, {
        screenOrientation: e.screenOrientation
      });
    return await Promise.all(t.map(async (r) => {
      const n = s(this, ae).getActiveConfig(r.id, r.userContext);
      await r.setViewport(n.viewport ?? null, n.devicePixelRatio ?? null, n.screenOrientation ?? null);
    })), {};
  }
  async setTimezoneOverride(e) {
    let t = e.timezone ?? null;
    if (t !== null && !Dp(t))
      throw new Le.InvalidArgumentException(`Invalid timezone "${t}"`);
    t !== null && Np(t) && (t = `GMT${t}`);
    const r = await g(this, vt, hs).call(this, e.contexts, e.userContexts);
    for (const n of e.contexts ?? [])
      s(this, ae).updateBrowsingContextConfig(n, {
        timezone: t
      });
    for (const n of e.userContexts ?? [])
      s(this, ae).updateUserContextConfig(n, {
        timezone: t
      });
    return await Promise.all(r.map(async (n) => {
      const o = s(this, ae).getActiveConfig(n.id, n.userContext);
      await n.setTimezoneOverride(o.timezone ?? null);
    })), {};
  }
  async setUserAgentOverrideParams(e) {
    if (e.userAgent === "")
      throw new Le.UnsupportedOperationException("empty user agent string is not supported");
    const t = await g(this, vt, hs).call(this, e.contexts, e.userContexts, !0);
    for (const r of e.contexts ?? [])
      s(this, ae).updateBrowsingContextConfig(r, {
        userAgent: e.userAgent
      });
    for (const r of e.userContexts ?? [])
      s(this, ae).updateUserContextConfig(r, {
        userAgent: e.userAgent
      });
    return e.contexts === void 0 && e.userContexts === void 0 && s(this, ae).updateGlobalConfig({
      userAgent: e.userAgent
    }), await Promise.all(t.map(async (r) => {
      const n = s(this, ae).getActiveConfig(r.id, r.userContext);
      await r.setUserAgentAndAcceptLanguage(n.userAgent, n.locale);
    })), {};
  }
  async setNetworkConditions(e) {
    const t = await g(this, vt, hs).call(this, e.contexts, e.userContexts, !0);
    for (const r of e.contexts ?? [])
      s(this, ae).updateBrowsingContextConfig(r, {
        emulatedNetworkConditions: e.networkConditions
      });
    for (const r of e.userContexts ?? [])
      s(this, ae).updateUserContextConfig(r, {
        emulatedNetworkConditions: e.networkConditions
      });
    if (e.contexts === void 0 && e.userContexts === void 0 && s(this, ae).updateGlobalConfig({
      emulatedNetworkConditions: e.networkConditions
    }), e.networkConditions !== null && e.networkConditions.type !== "offline")
      throw new Le.UnsupportedOperationException(`Unsupported network conditions ${e.networkConditions.type}`);
    return await Promise.all(t.map(async (r) => {
      const n = s(this, ae).getActiveConfig(r.id, r.userContext);
      await r.setEmulatedNetworkConditions(n.emulatedNetworkConditions ?? null);
    })), {};
  }
}
wo = new WeakMap(), er = new WeakMap(), ae = new WeakMap(), vt = new WeakSet(), hs = async function(e, t, r = !1) {
  if (e === void 0 && t === void 0) {
    if (r)
      return s(this, er).getTopLevelContexts();
    throw new Le.InvalidArgumentException("Either user contexts or browsing contexts must be provided");
  }
  if (e !== void 0 && t !== void 0)
    throw new Le.InvalidArgumentException("User contexts and browsing contexts are mutually exclusive");
  const n = [];
  if (e === void 0) {
    if (t.length === 0)
      throw new Le.InvalidArgumentException("user context should be provided");
    await s(this, wo).verifyUserContextIdList(t);
    for (const o of t) {
      const a = s(this, er).getTopLevelContexts().filter((c) => c.userContext === o);
      n.push(...a);
    }
  } else {
    if (e.length === 0)
      throw new Le.InvalidArgumentException("browsing context should be provided");
    for (const o of e) {
      const a = s(this, er).getContext(o);
      if (!a.isTopLevelContext())
        throw new Le.InvalidArgumentException("The command is only supported on the top-level context");
      n.push(a);
    }
  }
  return [...new Set(n).values()];
};
Gr.EmulationProcessor = Ow;
function Tp(i) {
  try {
    return new Intl.Locale(i), !0;
  } catch (e) {
    if (e instanceof RangeError)
      return !1;
    throw e;
  }
}
function Dp(i) {
  try {
    return Intl.DateTimeFormat(void 0, { timeZone: i }), !0;
  } catch (e) {
    if (e instanceof RangeError)
      return !1;
    throw e;
  }
}
function Np(i) {
  return /^[+-](?:2[0-3]|[01]\d)(?::[0-5]\d)?$/.test(i);
}
var Du = {}, os = {};
Object.defineProperty(os, "__esModule", { value: !0 });
os.assert = Rw;
function Rw(i, e) {
  if (!i)
    throw new Error(e ?? "Internal assertion failed.");
}
var Nu = {}, Ou = {};
Object.defineProperty(Ou, "__esModule", { value: !0 });
Ou.isSingleComplexGrapheme = Aw;
Ou.isSingleGrapheme = Op;
function Aw(i) {
  return Op(i) && i.length > 1;
}
function Op(i) {
  return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(i)].length === 1;
}
var ht = {};
Object.defineProperty(ht, "__esModule", { value: !0 });
ht.WheelSource = ht.PointerSource = ht.KeySource = ht.NoneSource = void 0;
class Mw {
  constructor() {
    N(this, "type", "none");
  }
}
ht.NoneSource = Mw;
var bt, tr, Vi;
class Bw {
  constructor() {
    u(this, tr);
    N(this, "type", "key");
    N(this, "pressed", /* @__PURE__ */ new Set());
    // This is a bitfield that matches the modifiers parameter of
    // https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchKeyEvent
    u(this, bt, 0);
  }
  get modifiers() {
    return s(this, bt);
  }
  get alt() {
    return (s(this, bt) & 1) === 1;
  }
  set alt(e) {
    g(this, tr, Vi).call(this, e, 1);
  }
  get ctrl() {
    return (s(this, bt) & 2) === 2;
  }
  set ctrl(e) {
    g(this, tr, Vi).call(this, e, 2);
  }
  get meta() {
    return (s(this, bt) & 4) === 4;
  }
  set meta(e) {
    g(this, tr, Vi).call(this, e, 4);
  }
  get shift() {
    return (s(this, bt) & 8) === 8;
  }
  set shift(e) {
    g(this, tr, Vi).call(this, e, 8);
  }
}
bt = new WeakMap(), tr = new WeakSet(), Vi = function(e, t) {
  e ? m(this, bt, s(this, bt) | t) : m(this, bt, s(this, bt) & ~t);
};
ht.KeySource = Bw;
var At, Wc, yo, Cn, xn, En, sr;
class Rp {
  constructor(e, t) {
    N(this, "type", "pointer");
    N(this, "subtype");
    N(this, "pointerId");
    N(this, "pressed", /* @__PURE__ */ new Set());
    N(this, "x", 0);
    N(this, "y", 0);
    N(this, "radiusX");
    N(this, "radiusY");
    N(this, "force");
    u(this, sr, /* @__PURE__ */ new Map());
    this.pointerId = e, this.subtype = t;
  }
  // This is a bitfield that matches the buttons parameter of
  // https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchMouseEvent
  get buttons() {
    let e = 0;
    for (const t of this.pressed)
      switch (t) {
        case 0:
          e |= 1;
          break;
        case 1:
          e |= 4;
          break;
        case 2:
          e |= 2;
          break;
        case 3:
          e |= 8;
          break;
        case 4:
          e |= 16;
          break;
      }
    return e;
  }
  setClickCount(e, t) {
    let r = s(this, sr).get(e);
    return (!r || r.compare(t)) && (r = t), ++r.count, s(this, sr).set(e, r), r.count;
  }
  getClickCount(e) {
    var t;
    return ((t = s(this, sr).get(e)) == null ? void 0 : t.count) ?? 0;
  }
  /**
   * Resets click count. Resets consequent click counter. Prevents grouping clicks in
   * different `performActions` calls, so that they are not grouped as double, triple etc
   * clicks. Required for https://github.com/GoogleChromeLabs/chromium-bidi/issues/3043.
   */
  resetClickCount() {
    m(this, sr, /* @__PURE__ */ new Map());
  }
}
sr = new WeakMap(), // --- Platform-specific code starts here ---
// Input.dispatchMouseEvent doesn't know the concept of double click, so we
// need to create the logic, similar to how it's done for OSes:
// https://source.chromium.org/chromium/chromium/src/+/refs/heads/main:ui/events/event.cc;l=479
N(Rp, "ClickContext", (At = class {
  constructor(t, r, n) {
    N(this, "count", 0);
    u(this, Cn);
    u(this, xn);
    u(this, En);
    m(this, Cn, t), m(this, xn, r), m(this, En, n);
  }
  compare(t) {
    return (
      // The click needs to be within a certain amount of ms.
      s(t, En) - s(this, En) > s(At, Wc) || // The click needs to be within a certain square radius.
      Math.abs(s(t, Cn) - s(this, Cn)) > s(At, yo) || Math.abs(s(t, xn) - s(this, xn)) > s(At, yo)
    );
  }
}, Wc = new WeakMap(), yo = new WeakMap(), Cn = new WeakMap(), xn = new WeakMap(), En = new WeakMap(), u(At, Wc, 500), u(At, yo, 2), At));
ht.PointerSource = Rp;
class Fw {
  constructor() {
    N(this, "type", "wheel");
  }
}
ht.WheelSource = Fw;
var Ja = {};
Object.defineProperty(Ja, "__esModule", { value: !0 });
Ja.getNormalizedKey = jw;
Ja.getKeyCode = Uw;
Ja.getKeyLocation = $w;
function jw(i) {
  switch (i) {
    case "":
      return "Unidentified";
    case "":
      return "Cancel";
    case "":
      return "Help";
    case "":
      return "Backspace";
    case "":
      return "Tab";
    case "":
      return "Clear";
    case "":
    case "":
      return "Enter";
    case "":
      return "Shift";
    case "":
      return "Control";
    case "":
      return "Alt";
    case "":
      return "Pause";
    case "":
      return "Escape";
    case "":
      return " ";
    case "":
      return "PageUp";
    case "":
      return "PageDown";
    case "":
      return "End";
    case "":
      return "Home";
    case "":
      return "ArrowLeft";
    case "":
      return "ArrowUp";
    case "":
      return "ArrowRight";
    case "":
      return "ArrowDown";
    case "":
      return "Insert";
    case "":
      return "Delete";
    case "":
      return ";";
    case "":
      return "=";
    case "":
      return "0";
    case "":
      return "1";
    case "":
      return "2";
    case "":
      return "3";
    case "":
      return "4";
    case "":
      return "5";
    case "":
      return "6";
    case "":
      return "7";
    case "":
      return "8";
    case "":
      return "9";
    case "":
      return "*";
    case "":
      return "+";
    case "":
      return ",";
    case "":
      return "-";
    case "":
      return ".";
    case "":
      return "/";
    case "":
      return "F1";
    case "":
      return "F2";
    case "":
      return "F3";
    case "":
      return "F4";
    case "":
      return "F5";
    case "":
      return "F6";
    case "":
      return "F7";
    case "":
      return "F8";
    case "":
      return "F9";
    case "":
      return "F10";
    case "":
      return "F11";
    case "":
      return "F12";
    case "":
      return "Meta";
    case "":
      return "ZenkakuHankaku";
    case "":
      return "Shift";
    case "":
      return "Control";
    case "":
      return "Alt";
    case "":
      return "Meta";
    case "":
      return "PageUp";
    case "":
      return "PageDown";
    case "":
      return "End";
    case "":
      return "Home";
    case "":
      return "ArrowLeft";
    case "":
      return "ArrowUp";
    case "":
      return "ArrowRight";
    case "":
      return "ArrowDown";
    case "":
      return "Insert";
    case "":
      return "Delete";
    default:
      return i;
  }
}
function Uw(i) {
  switch (i) {
    case "`":
    case "~":
      return "Backquote";
    case "\\":
    case "|":
      return "Backslash";
    case "":
      return "Backspace";
    case "[":
    case "{":
      return "BracketLeft";
    case "]":
    case "}":
      return "BracketRight";
    case ",":
    case "<":
      return "Comma";
    case "0":
    case ")":
      return "Digit0";
    case "1":
    case "!":
      return "Digit1";
    case "2":
    case "@":
      return "Digit2";
    case "3":
    case "#":
      return "Digit3";
    case "4":
    case "$":
      return "Digit4";
    case "5":
    case "%":
      return "Digit5";
    case "6":
    case "^":
      return "Digit6";
    case "7":
    case "&":
      return "Digit7";
    case "8":
    case "*":
      return "Digit8";
    case "9":
    case "(":
      return "Digit9";
    case "=":
    case "+":
      return "Equal";
    case ">":
      return "IntlBackslash";
    case "a":
    case "A":
      return "KeyA";
    case "b":
    case "B":
      return "KeyB";
    case "c":
    case "C":
      return "KeyC";
    case "d":
    case "D":
      return "KeyD";
    case "e":
    case "E":
      return "KeyE";
    case "f":
    case "F":
      return "KeyF";
    case "g":
    case "G":
      return "KeyG";
    case "h":
    case "H":
      return "KeyH";
    case "i":
    case "I":
      return "KeyI";
    case "j":
    case "J":
      return "KeyJ";
    case "k":
    case "K":
      return "KeyK";
    case "l":
    case "L":
      return "KeyL";
    case "m":
    case "M":
      return "KeyM";
    case "n":
    case "N":
      return "KeyN";
    case "o":
    case "O":
      return "KeyO";
    case "p":
    case "P":
      return "KeyP";
    case "q":
    case "Q":
      return "KeyQ";
    case "r":
    case "R":
      return "KeyR";
    case "s":
    case "S":
      return "KeyS";
    case "t":
    case "T":
      return "KeyT";
    case "u":
    case "U":
      return "KeyU";
    case "v":
    case "V":
      return "KeyV";
    case "w":
    case "W":
      return "KeyW";
    case "x":
    case "X":
      return "KeyX";
    case "y":
    case "Y":
      return "KeyY";
    case "z":
    case "Z":
      return "KeyZ";
    case "-":
    case "_":
      return "Minus";
    case ".":
      return "Period";
    case "'":
    case '"':
      return "Quote";
    case ";":
    case ":":
      return "Semicolon";
    case "/":
    case "?":
      return "Slash";
    case "":
      return "AltLeft";
    case "":
      return "AltRight";
    case "":
      return "ControlLeft";
    case "":
      return "ControlRight";
    case "":
      return "Enter";
    case "":
      return "Pause";
    case "":
      return "MetaLeft";
    case "":
      return "MetaRight";
    case "":
      return "ShiftLeft";
    case "":
      return "ShiftRight";
    case " ":
    case "":
      return "Space";
    case "":
      return "Tab";
    case "":
      return "Delete";
    case "":
      return "End";
    case "":
      return "Help";
    case "":
      return "Home";
    case "":
      return "Insert";
    case "":
      return "PageDown";
    case "":
      return "PageUp";
    case "":
      return "ArrowDown";
    case "":
      return "ArrowLeft";
    case "":
      return "ArrowRight";
    case "":
      return "ArrowUp";
    case "":
      return "Escape";
    case "":
      return "F1";
    case "":
      return "F2";
    case "":
      return "F3";
    case "":
      return "F4";
    case "":
      return "F5";
    case "":
      return "F6";
    case "":
      return "F7";
    case "":
      return "F8";
    case "":
      return "F9";
    case "":
      return "F10";
    case "":
      return "F11";
    case "":
      return "F12";
    case "":
      return "NumpadEqual";
    case "":
    case "":
      return "Numpad0";
    case "":
    case "":
      return "Numpad1";
    case "":
    case "":
      return "Numpad2";
    case "":
    case "":
      return "Numpad3";
    case "":
    case "":
      return "Numpad4";
    case "":
      return "Numpad5";
    case "":
    case "":
      return "Numpad6";
    case "":
    case "":
      return "Numpad7";
    case "":
    case "":
      return "Numpad8";
    case "":
    case "":
      return "Numpad9";
    case "":
      return "NumpadAdd";
    case "":
      return "NumpadComma";
    case "":
    case "":
      return "NumpadDecimal";
    case "":
      return "NumpadDivide";
    case "":
      return "NumpadEnter";
    case "":
      return "NumpadMultiply";
    case "":
      return "NumpadSubtract";
    default:
      return;
  }
}
function $w(i) {
  switch (i) {
    case "":
    case "":
    case "":
    case "":
    case "":
      return 1;
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
    case "":
      return 3;
    case "":
    case "":
    case "":
    case "":
      return 2;
    default:
      return 0;
  }
}
var Ru = {};
Object.defineProperty(Ru, "__esModule", { value: !0 });
Ru.KeyToKeyCode = void 0;
Ru.KeyToKeyCode = {
  0: 48,
  1: 49,
  2: 50,
  3: 51,
  4: 52,
  5: 53,
  6: 54,
  7: 55,
  8: 56,
  9: 57,
  Abort: 3,
  Help: 6,
  Backspace: 8,
  Tab: 9,
  Numpad5: 12,
  NumpadEnter: 13,
  Enter: 13,
  "\\r": 13,
  "\\n": 13,
  ShiftLeft: 16,
  ShiftRight: 16,
  ControlLeft: 17,
  ControlRight: 17,
  AltLeft: 18,
  AltRight: 18,
  Pause: 19,
  CapsLock: 20,
  Escape: 27,
  Convert: 28,
  NonConvert: 29,
  Space: 32,
  Numpad9: 33,
  PageUp: 33,
  Numpad3: 34,
  PageDown: 34,
  End: 35,
  Numpad1: 35,
  Home: 36,
  Numpad7: 36,
  ArrowLeft: 37,
  Numpad4: 37,
  Numpad8: 38,
  ArrowUp: 38,
  ArrowRight: 39,
  Numpad6: 39,
  Numpad2: 40,
  ArrowDown: 40,
  Select: 41,
  Open: 43,
  PrintScreen: 44,
  Insert: 45,
  Numpad0: 45,
  Delete: 46,
  NumpadDecimal: 46,
  Digit0: 48,
  Digit1: 49,
  Digit2: 50,
  Digit3: 51,
  Digit4: 52,
  Digit5: 53,
  Digit6: 54,
  Digit7: 55,
  Digit8: 56,
  Digit9: 57,
  KeyA: 65,
  KeyB: 66,
  KeyC: 67,
  KeyD: 68,
  KeyE: 69,
  KeyF: 70,
  KeyG: 71,
  KeyH: 72,
  KeyI: 73,
  KeyJ: 74,
  KeyK: 75,
  KeyL: 76,
  KeyM: 77,
  KeyN: 78,
  KeyO: 79,
  KeyP: 80,
  KeyQ: 81,
  KeyR: 82,
  KeyS: 83,
  KeyT: 84,
  KeyU: 85,
  KeyV: 86,
  KeyW: 87,
  KeyX: 88,
  KeyY: 89,
  KeyZ: 90,
  MetaLeft: 91,
  MetaRight: 92,
  ContextMenu: 93,
  NumpadMultiply: 106,
  NumpadAdd: 107,
  NumpadSubtract: 109,
  NumpadDivide: 111,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  F13: 124,
  F14: 125,
  F15: 126,
  F16: 127,
  F17: 128,
  F18: 129,
  F19: 130,
  F20: 131,
  F21: 132,
  F22: 133,
  F23: 134,
  F24: 135,
  NumLock: 144,
  ScrollLock: 145,
  AudioVolumeMute: 173,
  AudioVolumeDown: 174,
  AudioVolumeUp: 175,
  MediaTrackNext: 176,
  MediaTrackPrevious: 177,
  MediaStop: 178,
  MediaPlayPause: 179,
  Semicolon: 186,
  Equal: 187,
  NumpadEqual: 187,
  Comma: 188,
  Minus: 189,
  Period: 190,
  Slash: 191,
  Backquote: 192,
  BracketLeft: 219,
  Backslash: 220,
  BracketRight: 221,
  Quote: 222,
  AltGraph: 225,
  Props: 247,
  Cancel: 3,
  Clear: 12,
  Shift: 16,
  Control: 17,
  Alt: 18,
  Accept: 30,
  ModeChange: 31,
  " ": 32,
  Print: 42,
  Execute: 43,
  "\\u0000": 46,
  a: 65,
  b: 66,
  c: 67,
  d: 68,
  e: 69,
  f: 70,
  g: 71,
  h: 72,
  i: 73,
  j: 74,
  k: 75,
  l: 76,
  m: 77,
  n: 78,
  o: 79,
  p: 80,
  q: 81,
  r: 82,
  s: 83,
  t: 84,
  u: 85,
  v: 86,
  w: 87,
  x: 88,
  y: 89,
  z: 90,
  Meta: 91,
  "*": 106,
  "+": 107,
  "-": 109,
  "/": 111,
  ";": 186,
  "=": 187,
  ",": 188,
  ".": 190,
  "`": 192,
  "[": 219,
  "\\\\": 220,
  "]": 221,
  "'": 222,
  Attn: 246,
  CrSel: 247,
  ExSel: 248,
  EraseEof: 249,
  Play: 250,
  ZoomOut: 251,
  ")": 48,
  "!": 49,
  "@": 50,
  "#": 51,
  $: 52,
  "%": 53,
  "^": 54,
  "&": 55,
  "(": 57,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  ":": 186,
  "<": 188,
  _: 189,
  ">": 190,
  "?": 191,
  "~": 192,
  "{": 219,
  "|": 220,
  "}": 221,
  '"': 222,
  Camera: 44,
  EndCall: 95,
  VolumeDown: 182,
  VolumeUp: 183
};
Object.defineProperty(Nu, "__esModule", { value: !0 });
Nu.ActionDispatcher = void 0;
const cn = ee, ro = os, ic = Ou, Lw = ht, Qr = Ja, Ph = Ru, qw = ((i) => {
  const e = i.getClientRects()[0], t = Math.max(0, Math.min(e.x, e.x + e.width)), r = Math.min(window.innerWidth, Math.max(e.x, e.x + e.width)), n = Math.max(0, Math.min(e.y, e.y + e.height)), o = Math.min(window.innerHeight, Math.max(e.y, e.y + e.height));
  return [t + (r - t >> 1), n + (o - n >> 1)];
}).toString(), Hw = (() => navigator.platform.toLowerCase().includes("mac")).toString();
async function zw(i, e) {
  var a, c, f, p;
  const r = await (await i.getOrCreateHiddenSandbox()).callFunction(qw, !1, { type: "undefined" }, [e]);
  if (r.type === "exception")
    throw new cn.NoSuchElementException(`Origin element ${e.sharedId} was not found`);
  (0, ro.assert)(r.result.type === "array"), (0, ro.assert)(((c = (a = r.result.value) == null ? void 0 : a[0]) == null ? void 0 : c.type) === "number"), (0, ro.assert)(((p = (f = r.result.value) == null ? void 0 : f[1]) == null ? void 0 : p.type) === "number");
  const { result: { value: [{ value: n }, { value: o }] } } = r;
  return { x: n, y: o };
}
var vo, Sn, Ht, zt, bo, rr, V, xe, Mp, Bp, Fp, jp, Up, Fd, $p, Lp, qp;
class Ap {
  constructor(e, t, r, n) {
    u(this, V);
    u(this, vo);
    u(this, Sn, 0);
    u(this, Ht, 0);
    u(this, zt);
    u(this, bo);
    u(this, rr);
    m(this, vo, t), m(this, zt, e), m(this, bo, r), m(this, rr, n);
  }
  async dispatchActions(e) {
    await s(this, zt).queue.run(async () => {
      for (const t of e)
        await this.dispatchTickActions(t);
    });
  }
  async dispatchTickActions(e) {
    m(this, Sn, performance.now()), m(this, Ht, 0);
    for (const { action: r } of e)
      "duration" in r && r.duration !== void 0 && m(this, Ht, Math.max(s(this, Ht), r.duration));
    const t = [
      new Promise((r) => setTimeout(r, s(this, Ht)))
    ];
    for (const r of e)
      t.push(g(this, V, Mp).call(this, r));
    await Promise.all(t);
  }
}
vo = new WeakMap(), Sn = new WeakMap(), Ht = new WeakMap(), zt = new WeakMap(), bo = new WeakMap(), rr = new WeakMap(), V = new WeakSet(), xe = function() {
  return s(this, vo).getContext(s(this, bo));
}, Mp = async function({ id: e, action: t }) {
  const r = s(this, zt).get(e), n = s(this, zt).getGlobalKeyState();
  switch (t.type) {
    case "keyDown": {
      await g(this, V, Lp).call(this, r, t), s(this, zt).cancelList.push({
        id: e,
        action: {
          ...t,
          type: "keyUp"
        }
      });
      break;
    }
    case "keyUp": {
      await g(this, V, qp).call(this, r, t);
      break;
    }
    case "pause":
      break;
    case "pointerDown": {
      await g(this, V, Bp).call(this, r, n, t), s(this, zt).cancelList.push({
        id: e,
        action: {
          ...t,
          type: "pointerUp"
        }
      });
      break;
    }
    case "pointerMove": {
      await g(this, V, jp).call(this, r, n, t);
      break;
    }
    case "pointerUp": {
      await g(this, V, Fp).call(this, r, n, t);
      break;
    }
    case "scroll": {
      await g(this, V, $p).call(this, r, n, t);
      break;
    }
  }
}, Bp = async function(e, t, r) {
  const { button: n } = r;
  if (e.pressed.has(n))
    return;
  e.pressed.add(n);
  const { x: o, y: a, subtype: c } = e, { width: f, height: p, pressure: d, twist: h, tangentialPressure: w } = r, { tiltX: x, tiltY: S } = kh(r), { modifiers: P } = t, { radiusX: C, radiusY: b } = Th(f ?? 1, p ?? 1);
  switch (c) {
    case "mouse":
    case "pen":
      await s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: o,
        y: a,
        modifiers: P,
        button: oc(n),
        buttons: e.buttons,
        clickCount: e.setClickCount(n, new Lw.PointerSource.ClickContext(o, a, performance.now())),
        pointerType: c,
        tangentialPressure: w,
        tiltX: x,
        tiltY: S,
        twist: h,
        force: d
      });
      break;
    case "touch":
      await s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          {
            x: o,
            y: a,
            radiusX: C,
            radiusY: b,
            tangentialPressure: w,
            tiltX: x,
            tiltY: S,
            twist: h,
            force: d,
            id: e.pointerId
          }
        ],
        modifiers: P
      });
      break;
  }
  e.radiusX = C, e.radiusY = b, e.force = d;
}, Fp = function(e, t, r) {
  const { button: n } = r;
  if (!e.pressed.has(n))
    return;
  e.pressed.delete(n);
  const { x: o, y: a, force: c, radiusX: f, radiusY: p, subtype: d } = e, { modifiers: h } = t;
  switch (d) {
    case "mouse":
    case "pen":
      return s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: o,
        y: a,
        modifiers: h,
        button: oc(n),
        buttons: e.buttons,
        clickCount: e.getClickCount(n),
        pointerType: d
      });
    case "touch":
      return s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [
          {
            x: o,
            y: a,
            id: e.pointerId,
            force: c,
            radiusX: f,
            radiusY: p
          }
        ],
        modifiers: h
      });
  }
}, jp = async function(e, t, r) {
  const { x: n, y: o, subtype: a } = e, { width: c, height: f, pressure: p, twist: d, tangentialPressure: h, x: w, y: x, origin: S = "viewport", duration: P = s(this, Ht) } = r, { tiltX: C, tiltY: b } = kh(r), { radiusX: D, radiusY: v } = Th(c ?? 1, f ?? 1), { targetX: E, targetY: A } = await g(this, V, Fd).call(this, S, w, x, n, o);
  if (E < 0 || A < 0)
    throw new cn.MoveTargetOutOfBoundsException(`Cannot move beyond viewport (x: ${E}, y: ${A})`);
  let R;
  do {
    const l = P > 0 ? (performance.now() - s(this, Sn)) / P : 1;
    R = l >= 1;
    let y, k;
    if (R ? (y = E, k = A) : (y = Math.round(l * (E - n) + n), k = Math.round(l * (A - o) + o)), e.x !== y || e.y !== k) {
      const { modifiers: T } = t;
      switch (a) {
        case "mouse":
          await s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: y,
            y: k,
            modifiers: T,
            clickCount: 0,
            button: oc(e.pressed.values().next().value ?? 5),
            buttons: e.buttons,
            pointerType: a,
            tangentialPressure: h,
            tiltX: C,
            tiltY: b,
            twist: d,
            force: p
          });
          break;
        case "pen":
          e.pressed.size !== 0 && await s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: y,
            y: k,
            modifiers: T,
            clickCount: 0,
            button: oc(e.pressed.values().next().value ?? 5),
            buttons: e.buttons,
            pointerType: a,
            tangentialPressure: h,
            tiltX: C,
            tiltY: b,
            twist: d,
            force: p ?? 0.5
          });
          break;
        case "touch":
          e.pressed.size !== 0 && await s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              {
                x: y,
                y: k,
                radiusX: D,
                radiusY: v,
                tangentialPressure: h,
                tiltX: C,
                tiltY: b,
                twist: d,
                force: p,
                id: e.pointerId
              }
            ],
            modifiers: T
          });
          break;
      }
      e.x = y, e.y = k, e.radiusX = D, e.radiusY = v, e.force = p;
    }
  } while (!R);
}, Up = async function() {
  if (s(this, V, xe).id === s(this, V, xe).cdpTarget.id)
    return { x: 0, y: 0 };
  const { backendNodeId: e } = await s(this, V, xe).cdpTarget.cdpClient.sendCommand("DOM.getFrameOwner", { frameId: s(this, V, xe).id }), { model: t } = await s(this, V, xe).cdpTarget.cdpClient.sendCommand("DOM.getBoxModel", {
    backendNodeId: e
  });
  return { x: t.content[0], y: t.content[1] };
}, Fd = async function(e, t, r, n, o) {
  let a, c;
  const f = await g(this, V, Up).call(this);
  switch (e) {
    case "viewport":
      a = t + f.x, c = r + f.y;
      break;
    case "pointer":
      a = n + t + f.x, c = o + r + f.y;
      break;
    default: {
      const { x: p, y: d } = await zw(s(this, V, xe), e.element);
      a = p + t + f.x, c = d + r + f.y;
      break;
    }
  }
  return { targetX: a, targetY: c };
}, $p = async function(e, t, r) {
  const { deltaX: n, deltaY: o, x: a, y: c, origin: f = "viewport", duration: p = s(this, Ht) } = r;
  if (f === "pointer")
    throw new cn.InvalidArgumentException('"pointer" origin is invalid for scrolling.');
  const { targetX: d, targetY: h } = await g(this, V, Fd).call(this, f, a, c, 0, 0);
  if (d < 0 || h < 0)
    throw new cn.MoveTargetOutOfBoundsException(`Cannot move beyond viewport (x: ${d}, y: ${h})`);
  let w = 0, x = 0, S;
  do {
    const P = p > 0 ? (performance.now() - s(this, Sn)) / p : 1;
    S = P >= 1;
    let C, b;
    if (S ? (C = n - w, b = o - x) : (C = Math.round(P * n - w), b = Math.round(P * o - x)), C !== 0 || b !== 0) {
      const { modifiers: D } = t;
      await s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        deltaX: C,
        deltaY: b,
        x: d,
        y: h,
        modifiers: D
      }), w += C, x += b;
    }
  } while (!S);
}, Lp = async function(e, t) {
  const r = t.value;
  if (!(0, ic.isSingleGrapheme)(r))
    throw new cn.InvalidArgumentException(`Invalid key value: ${r}`);
  const n = (0, ic.isSingleComplexGrapheme)(r), o = (0, Qr.getNormalizedKey)(r), a = e.pressed.has(o), c = (0, Qr.getKeyCode)(r), f = (0, Qr.getKeyLocation)(r);
  switch (o) {
    case "Alt":
      e.alt = !0;
      break;
    case "Shift":
      e.shift = !0;
      break;
    case "Control":
      e.ctrl = !0;
      break;
    case "Meta":
      e.meta = !0;
      break;
  }
  e.pressed.add(o);
  const { modifiers: p } = e, d = Ih(o, e, n), h = _h(c ?? "", e) ?? d;
  let w;
  if (s(this, rr) && e.meta)
    switch (c) {
      case "KeyA":
        w = "SelectAll";
        break;
      case "KeyC":
        w = "Copy";
        break;
      case "KeyV":
        w = e.shift ? "PasteAndMatchStyle" : "Paste";
        break;
      case "KeyX":
        w = "Cut";
        break;
      case "KeyZ":
        w = e.shift ? "Redo" : "Undo";
        break;
    }
  const x = [
    s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchKeyEvent", {
      type: h ? "keyDown" : "rawKeyDown",
      windowsVirtualKeyCode: Ph.KeyToKeyCode[o],
      key: o,
      code: c,
      text: h,
      unmodifiedText: d,
      autoRepeat: a,
      isSystemKey: e.alt || void 0,
      location: f < 3 ? f : void 0,
      isKeypad: f === 3,
      modifiers: p,
      commands: w ? [w] : void 0
    })
  ];
  o === "Escape" && !e.alt && (s(this, rr) && !e.ctrl && !e.meta || !s(this, rr)) && x.push(s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.cancelDragging")), await Promise.all(x);
}, qp = function(e, t) {
  const r = t.value;
  if (!(0, ic.isSingleGrapheme)(r))
    throw new cn.InvalidArgumentException(`Invalid key value: ${r}`);
  const n = (0, ic.isSingleComplexGrapheme)(r), o = (0, Qr.getNormalizedKey)(r);
  if (!e.pressed.has(o))
    return;
  const a = (0, Qr.getKeyCode)(r), c = (0, Qr.getKeyLocation)(r);
  switch (o) {
    case "Alt":
      e.alt = !1;
      break;
    case "Shift":
      e.shift = !1;
      break;
    case "Control":
      e.ctrl = !1;
      break;
    case "Meta":
      e.meta = !1;
      break;
  }
  e.pressed.delete(o);
  const { modifiers: f } = e, p = Ih(o, e, n), d = _h(a ?? "", e) ?? p;
  return s(this, V, xe).cdpTarget.cdpClient.sendCommand("Input.dispatchKeyEvent", {
    type: "keyUp",
    windowsVirtualKeyCode: Ph.KeyToKeyCode[o],
    key: o,
    code: a,
    text: d,
    unmodifiedText: p,
    location: c < 3 ? c : void 0,
    isSystemKey: e.alt || void 0,
    isKeypad: c === 3,
    modifiers: f
  });
}, N(Ap, "isMacOS", async (e) => {
  const r = await (await e.getOrCreateHiddenSandbox()).callFunction(Hw, !1);
  return (0, ro.assert)(r.type !== "exception"), (0, ro.assert)(r.result.type === "boolean"), r.result.value;
});
Nu.ActionDispatcher = Ap;
const Ih = (i, e, t) => t ? i : i === "Enter" ? "\r" : [...i].length === 1 ? e.shift ? i.toLocaleUpperCase("en-US") : i : void 0, _h = (i, e) => {
  if (e.ctrl) {
    switch (i) {
      case "Digit2":
        if (e.shift)
          return "\0";
        break;
      case "KeyA":
        return "";
      case "KeyB":
        return "";
      case "KeyC":
        return "";
      case "KeyD":
        return "";
      case "KeyE":
        return "";
      case "KeyF":
        return "";
      case "KeyG":
        return "\x07";
      case "KeyH":
        return "\b";
      case "KeyI":
        return "	";
      case "KeyJ":
        return `
`;
      case "KeyK":
        return "\v";
      case "KeyL":
        return "\f";
      case "KeyM":
        return "\r";
      case "KeyN":
        return "";
      case "KeyO":
        return "";
      case "KeyP":
        return "";
      case "KeyQ":
        return "";
      case "KeyR":
        return "";
      case "KeyS":
        return "";
      case "KeyT":
        return "";
      case "KeyU":
        return "";
      case "KeyV":
        return "";
      case "KeyW":
        return "";
      case "KeyX":
        return "";
      case "KeyY":
        return "";
      case "KeyZ":
        return "";
      case "BracketLeft":
        return "\x1B";
      case "Backslash":
        return "";
      case "BracketRight":
        return "";
      case "Digit6":
        if (e.shift)
          return "";
        break;
      case "Minus":
        return "";
    }
    return "";
  }
  if (e.alt)
    return "";
};
function oc(i) {
  switch (i) {
    case 0:
      return "left";
    case 1:
      return "middle";
    case 2:
      return "right";
    case 3:
      return "back";
    case 4:
      return "forward";
    default:
      return "none";
  }
}
function kh(i) {
  const e = i.altitudeAngle ?? Math.PI / 2, t = i.azimuthAngle ?? 0;
  let r = 0, n = 0;
  if (e === 0 && ((t === 0 || t === 2 * Math.PI) && (r = Math.PI / 2), t === Math.PI / 2 && (n = Math.PI / 2), t === Math.PI && (r = -Math.PI / 2), t === 3 * Math.PI / 2 && (n = -Math.PI / 2), t > 0 && t < Math.PI / 2 && (r = Math.PI / 2, n = Math.PI / 2), t > Math.PI / 2 && t < Math.PI && (r = -Math.PI / 2, n = Math.PI / 2), t > Math.PI && t < 3 * Math.PI / 2 && (r = -Math.PI / 2, n = -Math.PI / 2), t > 3 * Math.PI / 2 && t < 2 * Math.PI && (r = Math.PI / 2, n = -Math.PI / 2)), e !== 0) {
    const a = Math.tan(e);
    r = Math.atan(Math.cos(t) / a), n = Math.atan(Math.sin(t) / a);
  }
  const o = 180 / Math.PI;
  return {
    tiltX: Math.round(r * o),
    tiltY: Math.round(n * o)
  };
}
function Th(i, e) {
  return {
    radiusX: i ? i / 2 : 0.5,
    radiusY: e ? e / 2 : 0.5
  };
}
var Au = {}, Mu = {}, Bu = {};
Object.defineProperty(Bu, "__esModule", { value: !0 });
Bu.Mutex = void 0;
var Pn, Co, xo, jd;
class Kw {
  constructor() {
    u(this, xo);
    u(this, Pn, !1);
    u(this, Co, []);
  }
  // This is FIFO.
  acquire() {
    const e = { resolved: !1 };
    return s(this, Pn) ? new Promise((t) => {
      s(this, Co).push(() => t(g(this, xo, jd).bind(this, e)));
    }) : (m(this, Pn, !0), Promise.resolve(g(this, xo, jd).bind(this, e)));
  }
  async run(e) {
    const t = await this.acquire();
    try {
      return await e();
    } finally {
      t();
    }
  }
}
Pn = new WeakMap(), Co = new WeakMap(), xo = new WeakSet(), jd = function(e) {
  if (e.resolved)
    throw new Error("Cannot release more than once.");
  e.resolved = !0;
  const t = s(this, Co).shift();
  if (!t) {
    m(this, Pn, !1);
    return;
  }
  t();
};
Bu.Mutex = Kw;
Object.defineProperty(Mu, "__esModule", { value: !0 });
Mu.InputState = void 0;
const pd = ee, Ww = Bu, $i = ht;
var gs, Gc;
class Gw {
  constructor() {
    N(this, "cancelList", []);
    u(this, gs, /* @__PURE__ */ new Map());
    u(this, Gc, new Ww.Mutex());
  }
  getOrCreate(e, t, r) {
    let n = s(this, gs).get(e);
    if (!n) {
      switch (t) {
        case "none":
          n = new $i.NoneSource();
          break;
        case "key":
          n = new $i.KeySource();
          break;
        case "pointer": {
          let o = r === "mouse" ? 0 : 2;
          const a = /* @__PURE__ */ new Set();
          for (const [, c] of s(this, gs))
            c.type === "pointer" && a.add(c.pointerId);
          for (; a.has(o); )
            ++o;
          n = new $i.PointerSource(o, r);
          break;
        }
        case "wheel":
          n = new $i.WheelSource();
          break;
        default:
          throw new pd.InvalidArgumentException(`Expected "none", "key", "pointer", or "wheel". Found unknown source type ${t}.`);
      }
      return s(this, gs).set(e, n), n;
    }
    if (n.type !== t)
      throw new pd.InvalidArgumentException(`Input source type of ${e} is ${n.type}, but received ${t}.`);
    return n;
  }
  get(e) {
    const t = s(this, gs).get(e);
    if (!t)
      throw new pd.UnknownErrorException("Internal error.");
    return t;
  }
  getGlobalKeyState() {
    const e = new $i.KeySource();
    for (const [, t] of s(this, gs))
      if (t.type === "key") {
        for (const r of t.pressed)
          e.pressed.add(r);
        e.alt || (e.alt = t.alt), e.ctrl || (e.ctrl = t.ctrl), e.meta || (e.meta = t.meta), e.shift || (e.shift = t.shift);
      }
    return e;
  }
  get queue() {
    return s(this, Gc);
  }
}
gs = new WeakMap(), Gc = new WeakMap();
Mu.InputState = Gw;
Object.defineProperty(Au, "__esModule", { value: !0 });
Au.InputStateManager = void 0;
const Vw = os, Xw = Mu;
class Jw extends WeakMap {
  get(e) {
    return (0, Vw.assert)(e.isTopLevelContext()), this.has(e) || this.set(e, new Xw.InputState()), super.get(e);
  }
}
Au.InputStateManager = Jw;
Object.defineProperty(Du, "__esModule", { value: !0 });
Du.InputProcessor = void 0;
const Hs = ee, ac = os, cc = Nu, Yw = Au;
var Kt, In, Vc, Hp;
class Qw {
  constructor(e) {
    u(this, Vc);
    u(this, Kt);
    u(this, In, new Yw.InputStateManager());
    m(this, Kt, e);
  }
  async performActions(e) {
    const t = s(this, Kt).getContext(e.context), r = s(this, In).get(t.top), n = g(this, Vc, Hp).call(this, e, r);
    return await new cc.ActionDispatcher(r, s(this, Kt), e.context, await cc.ActionDispatcher.isMacOS(t).catch(() => !1)).dispatchActions(n), {};
  }
  async releaseActions(e) {
    const t = s(this, Kt).getContext(e.context), r = t.top, n = s(this, In).get(r);
    return await new cc.ActionDispatcher(n, s(this, Kt), e.context, await cc.ActionDispatcher.isMacOS(t).catch(() => !1)).dispatchTickActions(n.cancelList.reverse()), s(this, In).delete(r), {};
  }
  async setFiles(e) {
    const r = await s(this, Kt).getContext(e.context).getOrCreateHiddenSandbox();
    let n;
    try {
      n = await r.callFunction(String(function(f) {
        if (!(this instanceof HTMLInputElement))
          return this instanceof Element ? 1 : 0;
        if (this.type !== "file")
          return 2;
        if (this.disabled)
          return 3;
        if (f > 1 && !this.multiple)
          return 4;
      }), !1, e.element, [{ type: "number", value: e.files.length }]);
    } catch {
      throw new Hs.NoSuchNodeException(`Could not find element ${e.element.sharedId}`);
    }
    if ((0, ac.assert)(n.type === "success"), n.result.type === "number")
      switch (n.result.value) {
        case 0:
          throw new Hs.NoSuchElementException(`Could not find element ${e.element.sharedId}`);
        case 1:
          throw new Hs.UnableToSetFileInputException(`Element ${e.element.sharedId} is not a input`);
        case 2:
          throw new Hs.UnableToSetFileInputException(`Input element ${e.element.sharedId} is not a file type`);
        case 3:
          throw new Hs.UnableToSetFileInputException(`Input element ${e.element.sharedId} is disabled`);
        case 4:
          throw new Hs.UnableToSetFileInputException("Cannot set multiple files on a non-multiple input element");
      }
    if (e.files.length === 0)
      return await r.callFunction(String(function() {
        var f;
        if (((f = this.files) == null ? void 0 : f.length) === 0) {
          this.dispatchEvent(new Event("cancel", {
            bubbles: !0
          }));
          return;
        }
        this.files = new DataTransfer().files, this.dispatchEvent(new Event("input", { bubbles: !0, composed: !0 })), this.dispatchEvent(new Event("change", { bubbles: !0 }));
      }), !1, e.element), {};
    const o = [];
    for (let c = 0; c < e.files.length; ++c) {
      const f = await r.callFunction(
        String(function(w) {
          var x;
          return (x = this.files) == null ? void 0 : x.item(w);
        }),
        !1,
        e.element,
        [{ type: "number", value: 0 }],
        "root"
        /* Script.ResultOwnership.Root */
      );
      if ((0, ac.assert)(f.type === "success"), f.result.type !== "object")
        break;
      const { handle: p } = f.result;
      (0, ac.assert)(p !== void 0);
      const { path: d } = await r.cdpClient.sendCommand("DOM.getFileInfo", {
        objectId: p
      });
      o.push(d), r.disown(p).catch(void 0);
    }
    o.sort();
    const a = [...e.files].sort();
    if (o.length !== e.files.length || a.some((c, f) => o[f] !== c)) {
      const { objectId: c } = await r.deserializeForCdp(e.element);
      (0, ac.assert)(c !== void 0), await r.cdpClient.sendCommand("DOM.setFileInputFiles", {
        files: e.files,
        objectId: c
      });
    } else
      await r.callFunction(String(function() {
        this.dispatchEvent(new Event("cancel", {
          bubbles: !0
        }));
      }), !1, e.element);
    return {};
  }
}
Kt = new WeakMap(), In = new WeakMap(), Vc = new WeakSet(), Hp = function(e, t) {
  var n;
  const r = [];
  for (const o of e.actions) {
    switch (o.type) {
      case "pointer": {
        o.parameters ?? (o.parameters = {
          pointerType: "mouse"
          /* Input.PointerType.Mouse */
        }), (n = o.parameters).pointerType ?? (n.pointerType = "mouse");
        const c = t.getOrCreate(o.id, "pointer", o.parameters.pointerType);
        if (c.subtype !== o.parameters.pointerType)
          throw new Hs.InvalidArgumentException(`Expected input source ${o.id} to be ${c.subtype}; got ${o.parameters.pointerType}.`);
        c.resetClickCount();
        break;
      }
      default:
        t.getOrCreate(o.id, o.type);
    }
    const a = o.actions.map((c) => ({
      id: o.id,
      action: c
    }));
    for (let c = 0; c < a.length; c++)
      r.length === c && r.push([]), r[c].push(a[c]);
  }
  return r;
};
Du.InputProcessor = Qw;
var Ai = {}, ye = {}, Vl = {};
Object.defineProperty(Vl, "__esModule", { value: !0 });
Vl.base64ToString = Zw;
function Zw(i) {
  return "atob" in globalThis ? globalThis.atob(i) : Buffer.from(i, "base64").toString("ascii");
}
Object.defineProperty(ye, "__esModule", { value: !0 });
ye.computeHeadersSize = sy;
ye.stringToBase64 = ry;
ye.bidiNetworkHeadersFromCdpNetworkHeaders = iy;
ye.bidiNetworkHeadersFromCdpNetworkHeadersEntries = oy;
ye.cdpNetworkHeadersFromBidiNetworkHeaders = ay;
ye.bidiNetworkHeadersFromCdpFetchHeaders = cy;
ye.cdpFetchHeadersFromBidiNetworkHeaders = uy;
ye.networkHeaderFromCookieHeaders = dy;
ye.cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction = ly;
ye.cdpToBiDiCookie = hy;
ye.deserializeByteValue = zp;
ye.bidiToCdpCookie = py;
ye.sameSiteBiDiToCdp = Kp;
ye.isSpecialScheme = my;
ye.matchUrlPattern = wy;
ye.bidiBodySizeFromCdpPostDataEntries = yy;
ye.getTiming = vy;
const ey = F, ty = Vl;
function sy(i) {
  const e = i.reduce((t, r) => `${t}${r.name}: ${r.value.value}\r
`, "");
  return new TextEncoder().encode(e).length;
}
function ry(i) {
  return ny(new TextEncoder().encode(i));
}
function ny(i) {
  const t = [];
  for (let n = 0; n < i.length; n += 65534) {
    const o = i.subarray(n, n + 65534);
    t.push(String.fromCodePoint.apply(null, o));
  }
  const r = t.join("");
  return btoa(r);
}
function iy(i) {
  return i ? Object.entries(i).map(([e, t]) => ({
    name: e,
    value: {
      type: "string",
      value: t
    }
  })) : [];
}
function oy(i) {
  return i ? i.map(({ name: e, value: t }) => ({
    name: e,
    value: {
      type: "string",
      value: t
    }
  })) : [];
}
function ay(i) {
  if (i !== void 0)
    return i.reduce((e, t) => (e[t.name] = t.value.value, e), {});
}
function cy(i) {
  return i ? i.map(({ name: e, value: t }) => ({
    name: e,
    value: {
      type: "string",
      value: t
    }
  })) : [];
}
function uy(i) {
  if (i !== void 0)
    return i.map(({ name: e, value: t }) => ({
      name: e,
      value: t.value
    }));
}
function dy(i) {
  return i === void 0 ? void 0 : {
    name: "Cookie",
    value: {
      type: "string",
      value: i.reduce((t, r, n) => {
        n > 0 && (t += ";");
        const o = r.value.type === "base64" ? btoa(r.value.value) : r.value.value;
        return t += `${r.name}=${o}`, t;
      }, "")
    }
  };
}
function ly(i) {
  switch (i) {
    case "default":
      return "Default";
    case "cancel":
      return "CancelAuth";
    case "provideCredentials":
      return "ProvideCredentials";
  }
}
function hy(i) {
  const e = {
    name: i.name,
    value: { type: "string", value: i.value },
    domain: i.domain,
    path: i.path,
    size: i.size,
    httpOnly: i.httpOnly,
    secure: i.secure,
    sameSite: i.sameSite === void 0 ? "none" : fy(i.sameSite),
    ...i.expires >= 0 ? { expiry: i.expires } : void 0
  };
  return e["goog:session"] = i.session, e["goog:priority"] = i.priority, e["goog:sameParty"] = i.sameParty, e["goog:sourceScheme"] = i.sourceScheme, e["goog:sourcePort"] = i.sourcePort, i.partitionKey !== void 0 && (e["goog:partitionKey"] = i.partitionKey), i.partitionKeyOpaque !== void 0 && (e["goog:partitionKeyOpaque"] = i.partitionKeyOpaque), e;
}
function zp(i) {
  return i.type === "base64" ? (0, ty.base64ToString)(i.value) : i.value;
}
function py(i, e) {
  const t = zp(i.cookie.value), r = {
    name: i.cookie.name,
    value: t,
    domain: i.cookie.domain,
    path: i.cookie.path ?? "/",
    secure: i.cookie.secure ?? !1,
    httpOnly: i.cookie.httpOnly ?? !1,
    ...e.sourceOrigin !== void 0 && {
      partitionKey: {
        hasCrossSiteAncestor: !1,
        // CDP's `partitionKey.topLevelSite` is the BiDi's `partition.sourceOrigin`.
        topLevelSite: e.sourceOrigin
      }
    },
    ...i.cookie.expiry !== void 0 && {
      expires: i.cookie.expiry
    },
    ...i.cookie.sameSite !== void 0 && {
      sameSite: Kp(i.cookie.sameSite)
    }
  };
  return i.cookie["goog:url"] !== void 0 && (r.url = i.cookie["goog:url"]), i.cookie["goog:priority"] !== void 0 && (r.priority = i.cookie["goog:priority"]), i.cookie["goog:sameParty"] !== void 0 && (r.sameParty = i.cookie["goog:sameParty"]), i.cookie["goog:sourceScheme"] !== void 0 && (r.sourceScheme = i.cookie["goog:sourceScheme"]), i.cookie["goog:sourcePort"] !== void 0 && (r.sourcePort = i.cookie["goog:sourcePort"]), r;
}
function fy(i) {
  switch (i) {
    case "Strict":
      return "strict";
    case "None":
      return "none";
    case "Lax":
      return "lax";
    default:
      return "lax";
  }
}
function Kp(i) {
  switch (i) {
    case "none":
      return "None";
    case "strict":
      return "Strict";
    case "default":
    case "lax":
      return "Lax";
  }
  throw new ey.InvalidArgumentException(`Unknown 'sameSite' value ${i}`);
}
function my(i) {
  return ["ftp", "file", "http", "https", "ws", "wss"].includes(i.replace(/:$/, ""));
}
function gy(i) {
  return i.protocol.replace(/:$/, "");
}
function wy(i, e) {
  const t = new URL(e);
  return !(i.protocol !== void 0 && i.protocol !== gy(t) || i.hostname !== void 0 && i.hostname !== t.hostname || i.port !== void 0 && i.port !== t.port || i.pathname !== void 0 && i.pathname !== t.pathname || i.search !== void 0 && i.search !== t.search);
}
function yy(i) {
  let e = 0;
  for (const t of i)
    e += atob(t.bytes ?? "").length;
  return e;
}
function vy(i, e = 0) {
  return !i || i <= 0 || i + e <= 0 ? 0 : i + e;
}
Object.defineProperty(Ai, "__esModule", { value: !0 });
Ai.NetworkProcessor = void 0;
Ai.parseBiDiHeaders = Gp;
const Q = ee, Dh = ye;
var Xe, Je, _n, ws, ke, Xi, $d, Ji, Wp;
const st = class st {
  constructor(e, t, r, n) {
    u(this, ke);
    u(this, Xe);
    u(this, Je);
    u(this, _n);
    u(this, ws);
    m(this, _n, r), m(this, Xe, e), m(this, Je, t), m(this, ws, n);
  }
  async addIntercept(e) {
    s(this, Xe).verifyTopLevelContextsList(e.contexts);
    const t = e.urlPatterns ?? [], r = st.parseUrlPatterns(t), n = s(this, Je).addIntercept({
      urlPatterns: r,
      phases: e.phases,
      contexts: e.contexts
    });
    return await g(this, ke, Xi).call(this), {
      intercept: n
    };
  }
  async continueRequest(e) {
    if (e.url !== void 0 && st.parseUrlString(e.url), e.method !== void 0 && !st.isMethodValid(e.method))
      throw new Q.InvalidArgumentException(`Method '${e.method}' is invalid.`);
    e.headers && st.validateHeaders(e.headers);
    const t = g(this, ke, Ji).call(this, e.request, [
      "beforeRequestSent"
    ]);
    try {
      await t.continueRequest(e);
    } catch (r) {
      throw st.wrapInterceptionError(r);
    }
    return {};
  }
  async continueResponse(e) {
    e.headers && st.validateHeaders(e.headers);
    const t = g(this, ke, Ji).call(this, e.request, [
      "authRequired",
      "responseStarted"
    ]);
    try {
      await t.continueResponse(e);
    } catch (r) {
      throw st.wrapInterceptionError(r);
    }
    return {};
  }
  async continueWithAuth(e) {
    const t = e.request;
    return await g(this, ke, Ji).call(this, t, [
      "authRequired"
    ]).continueWithAuth(e), {};
  }
  async failRequest({ request: e }) {
    const t = g(this, ke, $d).call(this, e);
    if (t.interceptPhase === "authRequired")
      throw new Q.InvalidArgumentException(`Request '${e}' in 'authRequired' phase cannot be failed`);
    if (!t.interceptPhase)
      throw new Q.NoSuchRequestException(`No blocked request found for network id '${e}'`);
    return await t.failRequest("Failed"), {};
  }
  async provideResponse(e) {
    e.headers && st.validateHeaders(e.headers);
    const t = g(this, ke, Ji).call(this, e.request, [
      "beforeRequestSent",
      "responseStarted",
      "authRequired"
    ]);
    try {
      await t.provideResponse(e);
    } catch (r) {
      throw st.wrapInterceptionError(r);
    }
    return {};
  }
  async removeIntercept(e) {
    return s(this, Je).removeIntercept(e.intercept), await g(this, ke, Xi).call(this), {};
  }
  async setCacheBehavior(e) {
    const t = s(this, Xe).verifyTopLevelContextsList(e.contexts);
    if (t.size === 0)
      return s(this, Je).defaultCacheBehavior = e.cacheBehavior, await Promise.all(s(this, Xe).getAllContexts().map((n) => n.cdpTarget.toggleSetCacheDisabled())), {};
    const r = e.cacheBehavior === "bypass";
    return await Promise.all([...t.values()].map((n) => n.cdpTarget.toggleSetCacheDisabled(r))), {};
  }
  /**
   * Validate https://fetch.spec.whatwg.org/#header-value
   */
  static validateHeaders(e) {
    for (const t of e) {
      let r;
      if (t.value.type === "string" ? r = t.value.value : r = atob(t.value.value), r !== r.trim() || r.includes(`
`) || r.includes("\0"))
        throw new Q.InvalidArgumentException(`Header value '${r}' is not acceptable value`);
    }
  }
  static isMethodValid(e) {
    return /^[!#$%&'*+\-.^_`|~a-zA-Z\d]+$/.test(e);
  }
  /**
   * Attempts to parse the given url.
   * Throws an InvalidArgumentException if the url is invalid.
   */
  static parseUrlString(e) {
    try {
      return new URL(e);
    } catch (t) {
      throw new Q.InvalidArgumentException(`Invalid URL '${e}': ${t}`);
    }
  }
  static parseUrlPatterns(e) {
    return e.map((t) => {
      let r = "", n = !0, o = !0, a = !0, c = !0, f = !0;
      switch (t.type) {
        case "string": {
          r = Zr(t.pattern);
          break;
        }
        case "pattern": {
          if (t.protocol === void 0)
            n = !1, r += "http";
          else {
            if (t.protocol === "")
              throw new Q.InvalidArgumentException("URL pattern must specify a protocol");
            if (t.protocol = Zr(t.protocol), !t.protocol.match(/^[a-zA-Z+-.]+$/))
              throw new Q.InvalidArgumentException("Forbidden characters");
            r += t.protocol;
          }
          const d = r.toLocaleLowerCase();
          if (r += ":", (0, Dh.isSpecialScheme)(d) && (r += "//"), t.hostname === void 0)
            d !== "file" && (r += "placeholder"), o = !1;
          else {
            if (t.hostname === "")
              throw new Q.InvalidArgumentException("URL pattern must specify a hostname");
            if (t.protocol === "file")
              throw new Q.InvalidArgumentException("URL pattern protocol cannot be 'file'");
            t.hostname = Zr(t.hostname);
            let h = !1;
            for (const w of t.hostname) {
              if (w === "/" || w === "?" || w === "#")
                throw new Q.InvalidArgumentException("'/', '?', '#' are forbidden in hostname");
              if (!h && w === ":")
                throw new Q.InvalidArgumentException("':' is only allowed inside brackets in hostname");
              w === "[" && (h = !0), w === "]" && (h = !1);
            }
            r += t.hostname;
          }
          if (t.port === void 0)
            a = !1;
          else {
            if (t.port === "")
              throw new Q.InvalidArgumentException("URL pattern must specify a port");
            if (t.port = Zr(t.port), r += ":", !t.port.match(/^\d+$/))
              throw new Q.InvalidArgumentException("Forbidden characters");
            r += t.port;
          }
          if (t.pathname === void 0)
            c = !1;
          else {
            if (t.pathname = Zr(t.pathname), t.pathname[0] !== "/" && (r += "/"), t.pathname.includes("#") || t.pathname.includes("?"))
              throw new Q.InvalidArgumentException("Forbidden characters");
            r += t.pathname;
          }
          if (t.search === void 0)
            f = !1;
          else {
            if (t.search = Zr(t.search), t.search[0] !== "?" && (r += "?"), t.search.includes("#"))
              throw new Q.InvalidArgumentException("Forbidden characters");
            r += t.search;
          }
          break;
        }
      }
      const p = (d) => {
        const h = {
          "ftp:": 21,
          "file:": null,
          "http:": 80,
          "https:": 443,
          "ws:": 80,
          "wss:": 443
        };
        if ((0, Dh.isSpecialScheme)(d.protocol) && h[d.protocol] !== null && (!d.port || String(h[d.protocol]) === d.port))
          return "";
        if (d.port)
          return d.port;
      };
      try {
        const d = new URL(r);
        return {
          protocol: n ? d.protocol.replace(/:$/, "") : void 0,
          hostname: o ? d.hostname : void 0,
          port: a ? p(d) : void 0,
          pathname: c && d.pathname ? d.pathname : void 0,
          search: f ? d.search : void 0
        };
      } catch (d) {
        throw new Q.InvalidArgumentException(`${d.message} '${r}'`);
      }
    });
  }
  static wrapInterceptionError(e) {
    return e != null && e.message.includes("Invalid header") || e != null && e.message.includes("Unsafe header") ? new Q.InvalidArgumentException(e.message) : e;
  }
  async addDataCollector(e) {
    if (e.userContexts !== void 0 && e.contexts !== void 0)
      throw new Q.InvalidArgumentException("'contexts' and 'userContexts' are mutually exclusive");
    if (e.userContexts !== void 0 && await s(this, _n).verifyUserContextIdList(e.userContexts), e.contexts !== void 0) {
      for (const r of e.contexts)
        if (!s(this, Xe).getContext(r).isTopLevelContext())
          throw new Q.InvalidArgumentException("Data collectors are available only on top-level browsing contexts");
    }
    const t = s(this, Je).addDataCollector(e);
    return await g(this, ke, Xi).call(this), { collector: t };
  }
  async getData(e) {
    return await s(this, Je).getCollectedData(e);
  }
  async removeDataCollector(e) {
    return s(this, Je).removeDataCollector(e), await g(this, ke, Xi).call(this), {};
  }
  disownData(e) {
    return s(this, Je).disownData(e), {};
  }
  async setExtraHeaders(e) {
    const t = await g(this, ke, Wp).call(this, e.contexts, e.userContexts), r = Gp(e.headers);
    return e.userContexts === void 0 && e.contexts === void 0 && s(this, ws).updateGlobalConfig({
      extraHeaders: r
    }), e.userContexts !== void 0 && e.userContexts.forEach((n) => {
      s(this, ws).updateUserContextConfig(n, {
        extraHeaders: r
      });
    }), e.contexts !== void 0 && e.contexts.forEach((n) => {
      s(this, ws).updateBrowsingContextConfig(n, { extraHeaders: r });
    }), await Promise.all(t.map(async (n) => {
      const o = s(this, ws).getActiveConfig(n.id, n.userContext).extraHeaders ?? {};
      await n.setExtraHeaders(o);
    })), {};
  }
};
Xe = new WeakMap(), Je = new WeakMap(), _n = new WeakMap(), ws = new WeakMap(), ke = new WeakSet(), Xi = async function() {
  await Promise.all(s(this, Xe).getAllContexts().map((e) => e.cdpTarget.toggleNetwork()));
}, $d = function(e) {
  const t = s(this, Je).getRequestById(e);
  if (!t)
    throw new Q.NoSuchRequestException(`Network request with ID '${e}' doesn't exist`);
  return t;
}, Ji = function(e, t) {
  const r = g(this, ke, $d).call(this, e);
  if (!r.interceptPhase)
    throw new Q.NoSuchRequestException(`No blocked request found for network id '${e}'`);
  if (r.interceptPhase && !t.includes(r.interceptPhase))
    throw new Q.InvalidArgumentException(`Blocked request for network id '${e}' is in '${r.interceptPhase}' phase`);
  return r;
}, Wp = async function(e, t) {
  if (e === void 0 && t === void 0)
    return s(this, Xe).getTopLevelContexts();
  if (e !== void 0 && t !== void 0)
    throw new Q.InvalidArgumentException("User contexts and browsing contexts are mutually exclusive");
  const r = [];
  if (t !== void 0) {
    if (t.length === 0)
      throw new Q.InvalidArgumentException("user context should be provided");
    await s(this, _n).verifyUserContextIdList(t);
    for (const n of t) {
      const o = s(this, Xe).getTopLevelContexts().filter((a) => a.userContext === n);
      r.push(...o);
    }
  }
  if (e !== void 0) {
    if (e.length === 0)
      throw new Q.InvalidArgumentException("browsing context should be provided");
    for (const n of e) {
      const o = s(this, Xe).getContext(n);
      if (!o.isTopLevelContext())
        throw new Q.InvalidArgumentException("The command is only supported on the top-level context");
      r.push(o);
    }
  }
  return [...new Set(r).values()];
};
let Ud = st;
Ai.NetworkProcessor = Ud;
function Zr(i) {
  const e = /* @__PURE__ */ new Set(["(", ")", "*", "{", "}"]);
  let t = "", r = !1;
  for (const n of i) {
    if (!r) {
      if (e.has(n))
        throw new Q.InvalidArgumentException("Forbidden characters");
      if (n === "\\") {
        r = !0;
        continue;
      }
    }
    t += n, r = !1;
  }
  return t;
}
const by = /* @__PURE__ */ new Set([
  " ",
  "	",
  `
`,
  '"',
  "(",
  ")",
  ",",
  "/",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "@",
  "[",
  "\\",
  "]",
  "{",
  "}"
]), Cy = /* @__PURE__ */ new Set(["\0", `
`, "\r"]);
function Nh(i, e) {
  for (const t of i)
    if (e.has(t))
      return !0;
  return !1;
}
function Gp(i) {
  const e = {};
  for (const t of i)
    if (t.value.type === "string") {
      const r = t.name, n = t.value.value;
      if (r.length === 0)
        throw new Q.InvalidArgumentException("Empty header name is not allowed");
      if (Nh(r, by))
        throw new Q.InvalidArgumentException(`Header name '${r}' contains forbidden symbols`);
      if (Nh(n, Cy))
        throw new Q.InvalidArgumentException(`Header value '${n}' contains forbidden symbols`);
      if (n.trim() !== n)
        throw new Q.InvalidArgumentException("Header value should not contain trailing or ending whitespaces");
      e[t.name] = t.value.value;
    } else
      throw new Q.UnsupportedOperationException("Only string headers values are supported");
  return e;
}
var Fu = {};
Object.defineProperty(Fu, "__esModule", { value: !0 });
Fu.PermissionsProcessor = void 0;
const xy = ee;
var Eo;
class Ey {
  constructor(e) {
    u(this, Eo);
    m(this, Eo, e);
  }
  async setPermissions(e) {
    try {
      const t = e["goog:userContext"] || e.userContext;
      await s(this, Eo).sendCommand("Browser.setPermission", {
        origin: e.origin,
        embeddedOrigin: e.embeddedOrigin,
        browserContextId: t && t !== "default" ? t : void 0,
        permission: {
          name: e.descriptor.name
        },
        setting: e.state
      });
    } catch (t) {
      if (t.message === "Permission can't be granted to opaque origins.")
        return {};
      throw new xy.InvalidArgumentException(t.message);
    }
    return {};
  }
}
Eo = new WeakMap();
Fu.PermissionsProcessor = Ey;
var ju = {}, Uu = {}, Ft = {};
Object.defineProperty(Ft, "__esModule", { value: !0 });
Ft.uuidv4 = Sy;
function Li(i) {
  return i.reduce((e, t) => e + t.toString(16).padStart(2, "0"), "");
}
function Sy() {
  if ("crypto" in globalThis && "randomUUID" in globalThis.crypto)
    return globalThis.crypto.randomUUID();
  const i = new Uint8Array(16);
  return "crypto" in globalThis && "getRandomValues" in globalThis.crypto ? globalThis.crypto.getRandomValues(i) : Kg.webcrypto.getRandomValues(i), i[6] = i[6] & 15 | 64, i[8] = i[8] & 63 | 128, [
    Li(i.subarray(0, 4)),
    Li(i.subarray(4, 6)),
    Li(i.subarray(6, 8)),
    Li(i.subarray(8, 10)),
    Li(i.subarray(10, 16))
  ].join("-");
}
var Ya = {};
Object.defineProperty(Ya, "__esModule", { value: !0 });
Ya.ChannelProxy = void 0;
const Py = ee, Oh = Te, Iy = Ft;
var nr, kn, Tn, is, qd, Vp, Xp, Kr, Hd, Jp;
const wn = class wn {
  constructor(e, t) {
    u(this, Kr);
    u(this, nr);
    u(this, kn, (0, Iy.uuidv4)());
    u(this, Tn);
    m(this, nr, e), m(this, Tn, t);
  }
  /**
   * Creates a channel proxy in the given realm, initialises listener and
   * returns a handle to `sendMessage` delegate.
   */
  async init(e, t) {
    var o, a;
    const r = await g(o = wn, is, Vp).call(o, e), n = await g(a = wn, is, Xp).call(a, e, r);
    return g(this, Kr, Hd).call(this, e, r, t), n;
  }
  /** Gets a ChannelProxy from window and returns its handle. */
  async startListenerFromWindow(e, t) {
    var r;
    try {
      const n = await g(this, Kr, Jp).call(this, e);
      g(this, Kr, Hd).call(this, e, n, t);
    } catch (n) {
      (r = s(this, Tn)) == null || r.call(this, Oh.LogType.debugError, n);
    }
  }
  /**
   * String to be evaluated to create a ProxyChannel and put it to window.
   * Returns the delegate `sendMessage`. Used to provide an argument for preload
   * script. Does the following:
   * 1. Creates a ChannelProxy.
   * 2. Puts the ChannelProxy to window['${this.#id}'] or resolves the promise
   *    by calling delegate stored in window['${this.#id}'].
   *    This is needed because `#getHandleFromWindow` can be called before or
   *    after this method.
   * 3. Returns the delegate `sendMessage` of the created ChannelProxy.
   */
  getEvalInWindowStr() {
    var r;
    const e = String((n, o) => {
      const a = window;
      return a[n] === void 0 ? a[n] = o : (a[n](o), delete a[n]), o.sendMessage;
    }), t = g(r = wn, is, qd).call(r);
    return `(${e})('${s(this, kn)}',${t})`;
  }
};
nr = new WeakMap(), kn = new WeakMap(), Tn = new WeakMap(), is = new WeakSet(), qd = function() {
  return `(${String(() => {
    const t = [];
    let r = null;
    return {
      /**
       * Gets a promise, which is resolved as soon as a message occurs
       * in the queue.
       */
      async getMessage() {
        return await (t.length > 0 ? Promise.resolve() : new Promise((o) => {
          r = o;
        })), t.shift();
      },
      /**
       * Adds a message to the queue.
       * Resolves the pending promise if needed.
       */
      sendMessage(n) {
        t.push(n), r !== null && (r(), r = null);
      }
    };
  })})()`;
}, Vp = async function(e) {
  const t = await e.cdpClient.sendCommand("Runtime.evaluate", {
    expression: g(this, is, qd).call(this),
    contextId: e.executionContextId,
    serializationOptions: {
      serialization: "idOnly"
    }
  });
  if (t.exceptionDetails || t.result.objectId === void 0)
    throw new Error("Cannot create channel");
  return t.result.objectId;
}, Xp = async function(e, t) {
  return (await e.cdpClient.sendCommand("Runtime.callFunctionOn", {
    functionDeclaration: String((n) => n.sendMessage),
    arguments: [{ objectId: t }],
    executionContextId: e.executionContextId,
    serializationOptions: {
      serialization: "idOnly"
    }
  })).result.objectId;
}, Kr = new WeakSet(), Hd = async function(e, t, r) {
  var n, o;
  for (; ; )
    try {
      const a = await e.cdpClient.sendCommand("Runtime.callFunctionOn", {
        functionDeclaration: String(async (c) => await c.getMessage()),
        arguments: [
          {
            objectId: t
          }
        ],
        awaitPromise: !0,
        executionContextId: e.executionContextId,
        serializationOptions: {
          serialization: "deep",
          maxDepth: ((n = s(this, nr).serializationOptions) == null ? void 0 : n.maxObjectDepth) ?? void 0
        }
      });
      if (a.exceptionDetails)
        throw new Error("Runtime.callFunctionOn in ChannelProxy", {
          cause: a.exceptionDetails
        });
      for (const c of e.associatedBrowsingContexts)
        r.registerEvent({
          type: "event",
          method: Py.ChromiumBidi.Script.EventNames.Message,
          params: {
            channel: s(this, nr).channel,
            data: e.cdpToBidiValue(
              a,
              s(this, nr).ownership ?? "none"
              /* Script.ResultOwnership.None */
            ),
            source: e.source
          }
        }, c.id);
    } catch (a) {
      (o = s(this, Tn)) == null || o.call(this, Oh.LogType.debugError, a);
      break;
    }
}, Jp = async function(e) {
  const t = await e.cdpClient.sendCommand("Runtime.callFunctionOn", {
    functionDeclaration: String((r) => {
      const n = window;
      if (n[r] === void 0)
        return new Promise((a) => n[r] = a);
      const o = n[r];
      return delete n[r], o;
    }),
    arguments: [{ value: s(this, kn) }],
    executionContextId: e.executionContextId,
    awaitPromise: !0,
    serializationOptions: {
      serialization: "idOnly"
    }
  });
  if (t.exceptionDetails !== void 0 || t.result.objectId === void 0)
    throw new Error(`ChannelHandle not found in window["${s(this, kn)}"]`);
  return t.result.objectId;
}, u(wn, is);
let Ld = wn;
Ya.ChannelProxy = Ld;
Object.defineProperty(Uu, "__esModule", { value: !0 });
Uu.PreloadScript = void 0;
const _y = Ft, ky = Ya;
var Xc, ir, So, Dn, Po, Io, _o, ko, Jc, Yp;
class Ty {
  constructor(e, t) {
    u(this, Jc);
    /** BiDi ID, an automatically generated UUID. */
    u(this, Xc, (0, _y.uuidv4)());
    /** CDP preload scripts. */
    u(this, ir, []);
    /** The script itself, in a format expected by the spec i.e. a function. */
    u(this, So);
    /** Targets, in which the preload script is initialized. */
    u(this, Dn, /* @__PURE__ */ new Set());
    /** Channels to be added as arguments to functionDeclaration. */
    u(this, Po);
    /** The script sandbox / world name. */
    u(this, Io);
    /** The browsing contexts to execute the preload scripts in, if any. */
    u(this, _o);
    /** The browsing contexts to execute the preload scripts in, if any. */
    u(this, ko);
    var r;
    m(this, Po, ((r = e.arguments) == null ? void 0 : r.map((n) => new ky.ChannelProxy(n.value, t))) ?? []), m(this, So, e.functionDeclaration), m(this, Io, e.sandbox), m(this, _o, e.contexts), m(this, ko, e.userContexts);
  }
  get id() {
    return s(this, Xc);
  }
  get targetIds() {
    return s(this, Dn);
  }
  /** Channels of the preload script. */
  get channels() {
    return s(this, Po);
  }
  /** Contexts of the preload script, if any */
  get contexts() {
    return s(this, _o);
  }
  /** UserContexts of the preload script, if any */
  get userContexts() {
    return s(this, ko);
  }
  /**
   * Adds the script to the given CDP targets by calling the
   * `Page.addScriptToEvaluateOnNewDocument` command.
   */
  async initInTargets(e, t) {
    await Promise.all(Array.from(e).map((r) => this.initInTarget(r, t)));
  }
  /**
   * Adds the script to the given CDP target by calling the
   * `Page.addScriptToEvaluateOnNewDocument` command.
   */
  async initInTarget(e, t) {
    const r = await e.cdpClient.sendCommand("Page.addScriptToEvaluateOnNewDocument", {
      source: g(this, Jc, Yp).call(this),
      worldName: s(this, Io),
      runImmediately: t
    });
    s(this, ir).push({
      target: e,
      preloadScriptId: r.identifier
    }), s(this, Dn).add(e.id);
  }
  /**
   * Removes this script from all CDP targets.
   */
  async remove() {
    await Promise.all([
      s(this, ir).map(async (e) => {
        const t = e.target, r = e.preloadScriptId;
        return await t.cdpClient.sendCommand("Page.removeScriptToEvaluateOnNewDocument", {
          identifier: r
        });
      })
    ]);
  }
  /** Removes the provided cdp target from the list of cdp preload scripts. */
  dispose(e) {
    m(this, ir, s(this, ir).filter((t) => {
      var r;
      return ((r = t.target) == null ? void 0 : r.id) !== e;
    })), s(this, Dn).delete(e);
  }
}
Xc = new WeakMap(), ir = new WeakMap(), So = new WeakMap(), Dn = new WeakMap(), Po = new WeakMap(), Io = new WeakMap(), _o = new WeakMap(), ko = new WeakMap(), Jc = new WeakSet(), /**
 * String to be evaluated. Wraps user-provided function so that the following
 * steps are run:
 * 1. Create channels.
 * 2. Store the created channels in window.
 * 3. Call the user-provided function with channels as arguments.
 */
Yp = function() {
  const e = `[${this.channels.map((t) => t.getEvalInWindowStr()).join(", ")}]`;
  return `(()=>{(${s(this, So)})(...${e})})()`;
};
Uu.PreloadScript = Ty;
Object.defineProperty(ju, "__esModule", { value: !0 });
ju.ScriptProcessor = void 0;
const fd = ee, Dy = Uu;
var Nn, rt, or, ar, To, Do, Fs, Qp, mc;
class Ny {
  constructor(e, t, r, n, o, a) {
    u(this, Fs);
    u(this, Nn);
    u(this, rt);
    u(this, or);
    u(this, ar);
    u(this, To);
    u(this, Do);
    m(this, rt, t), m(this, or, r), m(this, ar, n), m(this, To, o), m(this, Do, a), m(this, Nn, e), s(this, Nn).addSubscribeHook(fd.ChromiumBidi.Script.EventNames.RealmCreated, g(this, Fs, Qp).bind(this));
  }
  async addPreloadScript(e) {
    var c, f;
    if ((c = e.userContexts) != null && c.length && ((f = e.contexts) != null && f.length))
      throw new fd.InvalidArgumentException("Both userContexts and contexts cannot be specified.");
    const t = await s(this, To).verifyUserContextIdList(e.userContexts ?? []), r = s(this, rt).verifyTopLevelContextsList(e.contexts), n = new Dy.PreloadScript(e, s(this, Do));
    s(this, ar).add(n);
    let o = [];
    t.size ? o = s(this, rt).getTopLevelContexts().filter((p) => t.has(p.userContext)) : r.size ? o = [...r.values()] : o = s(this, rt).getTopLevelContexts();
    const a = new Set(o.map((p) => p.cdpTarget));
    return await n.initInTargets(a, !1), {
      script: n.id
    };
  }
  async removePreloadScript(e) {
    const { script: t } = e;
    return await s(this, ar).getPreloadScript(t).remove(), s(this, ar).remove(t), {};
  }
  async callFunction(e) {
    return await (await g(this, Fs, mc).call(this, e.target)).callFunction(e.functionDeclaration, e.awaitPromise, e.this, e.arguments, e.resultOwnership, e.serializationOptions, e.userActivation);
  }
  async evaluate(e) {
    return await (await g(this, Fs, mc).call(this, e.target)).evaluate(e.expression, e.awaitPromise, e.resultOwnership, e.serializationOptions, e.userActivation);
  }
  async disown(e) {
    const t = await g(this, Fs, mc).call(this, e.target);
    return await Promise.all(e.handles.map(async (r) => await t.disown(r))), {};
  }
  getRealms(e) {
    return e.context !== void 0 && s(this, rt).getContext(e.context), { realms: s(this, or).findRealms({
      browsingContextId: e.context,
      type: e.type,
      isHidden: !1
    }).map((r) => r.realmInfo) };
  }
}
Nn = new WeakMap(), rt = new WeakMap(), or = new WeakMap(), ar = new WeakMap(), To = new WeakMap(), Do = new WeakMap(), Fs = new WeakSet(), Qp = function(e) {
  const t = s(this, rt).getContext(e), r = [
    t,
    ...s(this, rt).getContext(e).allChildren
  ], n = /* @__PURE__ */ new Set();
  for (const o of r) {
    const a = s(this, or).findRealms({
      browsingContextId: o.id
    });
    for (const c of a)
      n.add(c);
  }
  for (const o of n)
    s(this, Nn).registerEvent({
      type: "event",
      method: fd.ChromiumBidi.Script.EventNames.RealmCreated,
      params: o.realmInfo
    }, t.id);
  return Promise.resolve();
}, mc = async function(e) {
  return "context" in e ? await s(this, rt).getContext(e.context).getOrCreateUserSandbox(e.sandbox) : s(this, or).getRealm({
    realmId: e.realm,
    isHidden: !1
  });
};
ju.ScriptProcessor = Ny;
var $u = {};
Object.defineProperty($u, "__esModule", { value: !0 });
$u.SessionProcessor = void 0;
const md = ee;
var cr, No, Oo, Ro, Ni, Zp, ef;
class Oy {
  constructor(e, t, r) {
    u(this, Ni);
    u(this, cr);
    u(this, No);
    u(this, Oo);
    u(this, Ro, !1);
    m(this, cr, e), m(this, No, t), m(this, Oo, r);
  }
  status() {
    return { ready: !1, message: "already connected" };
  }
  async new(e) {
    if (s(this, Ro))
      throw new Error("Session has been already created.");
    m(this, Ro, !0);
    const t = g(this, Ni, Zp).call(this, e.capabilities);
    await s(this, Oo).call(this, t);
    const r = await s(this, No).sendCommand("Browser.getVersion");
    return {
      sessionId: "unknown",
      capabilities: {
        ...t,
        acceptInsecureCerts: t.acceptInsecureCerts ?? !1,
        browserName: r.product,
        browserVersion: r.revision,
        platformName: "",
        setWindowRect: !1,
        webSocketUrl: "",
        userAgent: r.userAgent
      }
    };
  }
  async subscribe(e, t = null) {
    return {
      subscription: await s(this, cr).subscribe(e.events, e.contexts ?? [], e.userContexts ?? [], t)
    };
  }
  async unsubscribe(e, t = null) {
    return "subscriptions" in e ? (await s(this, cr).unsubscribeByIds(e.subscriptions), {}) : (await s(this, cr).unsubscribe(e.events, t), {});
  }
}
cr = new WeakMap(), No = new WeakMap(), Oo = new WeakMap(), Ro = new WeakMap(), Ni = new WeakSet(), Zp = function(e) {
  const t = [];
  for (const n of e.firstMatch ?? [{}]) {
    const o = {
      ...e.alwaysMatch
    };
    for (const a of Object.keys(n)) {
      if (o[a] !== void 0)
        throw new md.InvalidArgumentException(`Capability ${a} in firstMatch is already defined in alwaysMatch`);
      o[a] = n[a];
    }
    t.push(o);
  }
  const r = t.find((n) => n.browserName === "chrome") ?? t[0] ?? {};
  return r.unhandledPromptBehavior = g(this, Ni, ef).call(this, r.unhandledPromptBehavior), r;
}, ef = function(e) {
  if (e !== void 0) {
    if (typeof e == "object")
      return e;
    if (typeof e != "string")
      throw new md.InvalidArgumentException(`Unexpected 'unhandledPromptBehavior' type: ${typeof e}`);
    switch (e) {
      case "accept":
      case "accept and notify":
        return {
          default: "accept",
          beforeUnload: "accept"
        };
      case "dismiss":
      case "dismiss and notify":
        return {
          default: "dismiss",
          beforeUnload: "accept"
        };
      case "ignore":
        return {
          default: "ignore",
          beforeUnload: "accept"
        };
      default:
        throw new md.InvalidArgumentException(`Unexpected 'unhandledPromptBehavior' value: ${e}`);
    }
  }
};
$u.SessionProcessor = Oy;
var Lu = {};
Object.defineProperty(Lu, "__esModule", { value: !0 });
Lu.StorageProcessor = void 0;
const uc = ee, Ry = os, Rh = Te, Ay = Ai, qi = ye;
var ys, Ao, On, we, gc, Yi, tf, sf, wc, zd;
class My {
  constructor(e, t, r) {
    u(this, we);
    u(this, ys);
    u(this, Ao);
    u(this, On);
    m(this, Ao, t), m(this, ys, e), m(this, On, r);
  }
  async deleteCookies(e) {
    const t = g(this, we, wc).call(this, e.partition);
    let r;
    try {
      r = await s(this, ys).sendCommand("Storage.getCookies", {
        browserContextId: g(this, we, Yi).call(this, t)
      });
    } catch (o) {
      throw g(this, we, gc).call(this, o) ? new uc.NoSuchUserContextException(o.message) : o;
    }
    const n = r.cookies.filter(
      // CDP's partition key is the source origin. If the request specifies the
      // `sourceOrigin` partition key, only cookies with the requested source origin
      // are returned.
      (o) => {
        var a;
        return t.sourceOrigin === void 0 || ((a = o.partitionKey) == null ? void 0 : a.topLevelSite) === t.sourceOrigin;
      }
    ).filter((o) => {
      const a = (0, qi.cdpToBiDiCookie)(o);
      return g(this, we, zd).call(this, a, e.filter);
    }).map((o) => ({
      ...o,
      // Set expiry to pass date to delete the cookie.
      expires: 1
    }));
    return await s(this, ys).sendCommand("Storage.setCookies", {
      cookies: n,
      browserContextId: g(this, we, Yi).call(this, t)
    }), {
      partitionKey: t
    };
  }
  async getCookies(e) {
    const t = g(this, we, wc).call(this, e.partition);
    let r;
    try {
      r = await s(this, ys).sendCommand("Storage.getCookies", {
        browserContextId: g(this, we, Yi).call(this, t)
      });
    } catch (o) {
      throw g(this, we, gc).call(this, o) ? new uc.NoSuchUserContextException(o.message) : o;
    }
    return {
      cookies: r.cookies.filter(
        // CDP's partition key is the source origin. If the request specifies the
        // `sourceOrigin` partition key, only cookies with the requested source origin
        // are returned.
        (o) => {
          var a;
          return t.sourceOrigin === void 0 || ((a = o.partitionKey) == null ? void 0 : a.topLevelSite) === t.sourceOrigin;
        }
      ).map((o) => (0, qi.cdpToBiDiCookie)(o)).filter((o) => g(this, we, zd).call(this, o, e.filter)),
      partitionKey: t
    };
  }
  async setCookie(e) {
    var n;
    const t = g(this, we, wc).call(this, e.partition), r = (0, qi.bidiToCdpCookie)(e, t);
    try {
      await s(this, ys).sendCommand("Storage.setCookies", {
        cookies: [r],
        browserContextId: g(this, we, Yi).call(this, t)
      });
    } catch (o) {
      throw g(this, we, gc).call(this, o) ? new uc.NoSuchUserContextException(o.message) : ((n = s(this, On)) == null || n.call(this, Rh.LogType.debugError, o), new uc.UnableToSetCookieException(o.toString()));
    }
    return {
      partitionKey: t
    };
  }
}
ys = new WeakMap(), Ao = new WeakMap(), On = new WeakMap(), we = new WeakSet(), gc = function(e) {
  var t;
  return (t = e.message) == null ? void 0 : t.startsWith("Failed to find browser context for id");
}, Yi = function(e) {
  return e.userContext === "default" ? void 0 : e.userContext;
}, tf = function(e) {
  const t = e.context;
  return {
    userContext: s(this, Ao).getContext(t).userContext
  };
}, sf = function(e) {
  var o;
  const t = /* @__PURE__ */ new Map();
  let r = e.sourceOrigin;
  if (r !== void 0) {
    const a = Ay.NetworkProcessor.parseUrlString(r);
    a.origin === "null" ? r = a.origin : r = `${a.protocol}//${a.hostname}`;
  }
  for (const [a, c] of Object.entries(e))
    a !== void 0 && c !== void 0 && !["type", "sourceOrigin", "userContext"].includes(a) && t.set(a, c);
  return t.size > 0 && ((o = s(this, On)) == null || o.call(this, Rh.LogType.debugInfo, `Unsupported partition keys: ${JSON.stringify(Object.fromEntries(t))}`)), {
    userContext: e.userContext ?? "default",
    ...r === void 0 ? {} : { sourceOrigin: r }
  };
}, wc = function(e) {
  return e === void 0 ? { userContext: "default" } : e.type === "context" ? g(this, we, tf).call(this, e) : ((0, Ry.assert)(e.type === "storageKey", "Unknown partition type"), g(this, we, sf).call(this, e));
}, zd = function(e, t) {
  return t === void 0 ? !0 : (t.domain === void 0 || t.domain === e.domain) && (t.name === void 0 || t.name === e.name) && // `value` contains fields `type` and `value`.
  (t.value === void 0 || (0, qi.deserializeByteValue)(t.value) === (0, qi.deserializeByteValue)(e.value)) && (t.path === void 0 || t.path === e.path) && (t.size === void 0 || t.size === e.size) && (t.httpOnly === void 0 || t.httpOnly === e.httpOnly) && (t.secure === void 0 || t.secure === e.secure) && (t.sameSite === void 0 || t.sameSite === e.sameSite) && (t.expiry === void 0 || t.expiry === e.expiry);
};
Lu.StorageProcessor = My;
var qu = {};
Object.defineProperty(qu, "__esModule", { value: !0 });
qu.WebExtensionProcessor = void 0;
const gd = ee;
var Rn;
class By {
  constructor(e) {
    u(this, Rn);
    m(this, Rn, e);
  }
  async install(e) {
    switch (e.extensionData.type) {
      case "archivePath":
      case "base64":
        throw new gd.UnsupportedOperationException("Archived and Base64 extensions are not supported");
    }
    try {
      return {
        extension: (await s(this, Rn).sendCommand("Extensions.loadUnpacked", {
          path: e.extensionData.path
        })).id
      };
    } catch (t) {
      throw t.message.startsWith("invalid web extension") ? new gd.InvalidWebExtensionException(t.message) : t;
    }
  }
  async uninstall(e) {
    try {
      return await s(this, Rn).sendCommand("Extensions.uninstall", {
        id: e.extension
      }), {};
    } catch (t) {
      throw t.message === "Uninstall failed. Reason: could not find extension." ? new gd.NoSuchWebExtensionException("no such web extension") : t;
    }
  }
}
Rn = new WeakMap();
qu.WebExtensionProcessor = By;
var Mi = {};
Object.defineProperty(Mi, "__esModule", { value: !0 });
Mi.OutgoingMessage = void 0;
var Mo, Bo;
const Yc = class Yc {
  constructor(e, t = null) {
    u(this, Mo);
    u(this, Bo);
    m(this, Mo, e), m(this, Bo, t);
  }
  static createFromPromise(e, t) {
    return e.then((r) => r.kind === "success" ? {
      kind: "success",
      value: new Yc(r.value, t)
    } : r);
  }
  static createResolved(e, t = null) {
    return Promise.resolve({
      kind: "success",
      value: new Yc(e, t)
    });
  }
  get message() {
    return s(this, Mo);
  }
  get googChannel() {
    return s(this, Bo);
  }
};
Mo = new WeakMap(), Bo = new WeakMap();
let Kd = Yc;
Mi.OutgoingMessage = Kd;
Object.defineProperty(Iu, "__esModule", { value: !0 });
Iu.CommandProcessor = void 0;
const zs = ee, Fy = Ls, jy = Te, Uy = _u, $y = Xa, Ly = ku, qy = Tu, Hy = Gr, zy = Du, Ky = Ai, Wy = Fu, Gy = ju, Vy = $u, Xy = Lu, Jy = qu, wd = Mi;
var De, Fo, Ct, Ne, ur, nt, dr, Ie, jo, xt, vs, lr, An, B, Uo, js, rf, yc;
class Yy extends Fy.EventEmitter {
  constructor(t, r, n, o, a, c, f, p, d, h, w = new Uy.BidiNoOpParser(), x, S) {
    super();
    u(this, js);
    // keep-sorted start
    u(this, De);
    u(this, Fo);
    u(this, Ct);
    u(this, Ne);
    u(this, ur);
    u(this, nt);
    u(this, dr);
    u(this, Ie);
    u(this, jo);
    u(this, xt);
    u(this, vs);
    u(this, lr);
    u(this, An);
    // keep-sorted end
    u(this, B);
    u(this, Uo);
    m(this, Fo, r), m(this, B, w), m(this, Uo, S), m(this, De, d), m(this, Ct, new $y.BrowserProcessor(r, o, p, h)), m(this, Ne, new qy.BrowsingContextProcessor(r, o, h, p, n)), m(this, ur, new Ly.CdpProcessor(o, a, t, r)), m(this, nt, new Hy.EmulationProcessor(o, h, p)), m(this, dr, new zy.InputProcessor(o)), m(this, Ie, new Ky.NetworkProcessor(o, f, h, p)), m(this, jo, new Wy.PermissionsProcessor(r)), m(this, xt, new Gy.ScriptProcessor(n, o, a, c, h, S)), m(this, vs, new Vy.SessionProcessor(n, r, x)), m(this, lr, new Xy.StorageProcessor(r, o, S)), m(this, An, new Jy.WebExtensionProcessor(r));
  }
  async processCommand(t) {
    var r;
    try {
      const n = await g(this, js, rf).call(this, t), o = {
        type: "success",
        id: t.id,
        result: n
      };
      this.emit("response", {
        message: wd.OutgoingMessage.createResolved(o, t["goog:channel"]),
        event: t.method
      });
    } catch (n) {
      if (n instanceof zs.Exception)
        this.emit("response", {
          message: wd.OutgoingMessage.createResolved(n.toErrorResponse(t.id), t["goog:channel"]),
          event: t.method
        });
      else {
        const o = n;
        (r = s(this, Uo)) == null || r.call(this, jy.LogType.bidi, o);
        const a = s(this, Fo).isCloseError(n) ? new zs.NoSuchFrameException("Browsing context is gone") : new zs.UnknownErrorException(o.message, o.stack);
        this.emit("response", {
          message: wd.OutgoingMessage.createResolved(a.toErrorResponse(t.id), t["goog:channel"]),
          event: t.method
        });
      }
    }
  }
}
De = new WeakMap(), Fo = new WeakMap(), Ct = new WeakMap(), Ne = new WeakMap(), ur = new WeakMap(), nt = new WeakMap(), dr = new WeakMap(), Ie = new WeakMap(), jo = new WeakMap(), xt = new WeakMap(), vs = new WeakMap(), lr = new WeakMap(), An = new WeakMap(), B = new WeakMap(), Uo = new WeakMap(), js = new WeakSet(), rf = async function(t) {
  switch (t.method) {
    case "bluetooth.disableSimulation":
      return await s(this, De).disableSimulation(s(this, B).parseDisableSimulationParameters(t.params));
    case "bluetooth.handleRequestDevicePrompt":
      return await s(this, De).handleRequestDevicePrompt(s(this, B).parseHandleRequestDevicePromptParams(t.params));
    case "bluetooth.simulateAdapter":
      return await s(this, De).simulateAdapter(s(this, B).parseSimulateAdapterParameters(t.params));
    case "bluetooth.simulateAdvertisement":
      return await s(this, De).simulateAdvertisement(s(this, B).parseSimulateAdvertisementParameters(t.params));
    case "bluetooth.simulateCharacteristic":
      return await s(this, De).simulateCharacteristic(s(this, B).parseSimulateCharacteristicParameters(t.params));
    case "bluetooth.simulateCharacteristicResponse":
      return await s(this, De).simulateCharacteristicResponse(s(this, B).parseSimulateCharacteristicResponseParameters(t.params));
    case "bluetooth.simulateDescriptor":
      return await s(this, De).simulateDescriptor(s(this, B).parseSimulateDescriptorParameters(t.params));
    case "bluetooth.simulateDescriptorResponse":
      return await s(this, De).simulateDescriptorResponse(s(this, B).parseSimulateDescriptorResponseParameters(t.params));
    case "bluetooth.simulateGattConnectionResponse":
      return await s(this, De).simulateGattConnectionResponse(s(this, B).parseSimulateGattConnectionResponseParameters(t.params));
    case "bluetooth.simulateGattDisconnection":
      return await s(this, De).simulateGattDisconnection(s(this, B).parseSimulateGattDisconnectionParameters(t.params));
    case "bluetooth.simulatePreconnectedPeripheral":
      return await s(this, De).simulatePreconnectedPeripheral(s(this, B).parseSimulatePreconnectedPeripheralParameters(t.params));
    case "bluetooth.simulateService":
      return await s(this, De).simulateService(s(this, B).parseSimulateServiceParameters(t.params));
    case "browser.close":
      return s(this, Ct).close();
    case "browser.createUserContext":
      return await s(this, Ct).createUserContext(s(this, B).parseCreateUserContextParameters(t.params));
    case "browser.getClientWindows":
      return await s(this, Ct).getClientWindows();
    case "browser.getUserContexts":
      return await s(this, Ct).getUserContexts();
    case "browser.removeUserContext":
      return await s(this, Ct).removeUserContext(s(this, B).parseRemoveUserContextParameters(t.params));
    case "browser.setClientWindowState":
      throw s(this, B).parseSetClientWindowStateParameters(t.params), new zs.UnsupportedOperationException(`Method ${t.method} is not implemented.`);
    case "browser.setDownloadBehavior":
      return await s(this, Ct).setDownloadBehavior(s(this, B).parseSetDownloadBehaviorParameters(t.params));
    case "browsingContext.activate":
      return await s(this, Ne).activate(s(this, B).parseActivateParams(t.params));
    case "browsingContext.captureScreenshot":
      return await s(this, Ne).captureScreenshot(s(this, B).parseCaptureScreenshotParams(t.params));
    case "browsingContext.close":
      return await s(this, Ne).close(s(this, B).parseCloseParams(t.params));
    case "browsingContext.create":
      return await s(this, Ne).create(s(this, B).parseCreateParams(t.params));
    case "browsingContext.getTree":
      return s(this, Ne).getTree(s(this, B).parseGetTreeParams(t.params));
    case "browsingContext.handleUserPrompt":
      return await s(this, Ne).handleUserPrompt(s(this, B).parseHandleUserPromptParams(t.params));
    case "browsingContext.locateNodes":
      return await s(this, Ne).locateNodes(s(this, B).parseLocateNodesParams(t.params));
    case "browsingContext.navigate":
      return await s(this, Ne).navigate(s(this, B).parseNavigateParams(t.params));
    case "browsingContext.print":
      return await s(this, Ne).print(s(this, B).parsePrintParams(t.params));
    case "browsingContext.reload":
      return await s(this, Ne).reload(s(this, B).parseReloadParams(t.params));
    case "browsingContext.setViewport":
      return await s(this, Ne).setViewport(s(this, B).parseSetViewportParams(t.params));
    case "browsingContext.traverseHistory":
      return await s(this, Ne).traverseHistory(s(this, B).parseTraverseHistoryParams(t.params));
    case "goog:cdp.getSession":
      return s(this, ur).getSession(s(this, B).parseGetSessionParams(t.params));
    case "goog:cdp.resolveRealm":
      return s(this, ur).resolveRealm(s(this, B).parseResolveRealmParams(t.params));
    case "goog:cdp.sendCommand":
      return await s(this, ur).sendCommand(s(this, B).parseSendCommandParams(t.params));
    case "emulation.setForcedColorsModeThemeOverride":
      throw s(this, B).parseSetForcedColorsModeThemeOverrideParams(t.params), new zs.UnsupportedOperationException(`Method ${t.method} is not implemented.`);
    case "emulation.setGeolocationOverride":
      return await s(this, nt).setGeolocationOverride(s(this, B).parseSetGeolocationOverrideParams(t.params));
    case "emulation.setLocaleOverride":
      return await s(this, nt).setLocaleOverride(s(this, B).parseSetLocaleOverrideParams(t.params));
    case "emulation.setNetworkConditions":
      return await s(this, nt).setNetworkConditions(s(this, B).parseSetNetworkConditionsParams(t.params));
    case "emulation.setScreenOrientationOverride":
      return await s(this, nt).setScreenOrientationOverride(s(this, B).parseSetScreenOrientationOverrideParams(t.params));
    case "emulation.setScriptingEnabled":
      return await s(this, nt).setScriptingEnabled(s(this, B).parseSetScriptingEnabledParams(t.params));
    case "emulation.setTimezoneOverride":
      return await s(this, nt).setTimezoneOverride(s(this, B).parseSetTimezoneOverrideParams(t.params));
    case "emulation.setUserAgentOverride":
      return await s(this, nt).setUserAgentOverrideParams(s(this, B).parseSetUserAgentOverrideParams(t.params));
    case "input.performActions":
      return await s(this, dr).performActions(s(this, B).parsePerformActionsParams(t.params));
    case "input.releaseActions":
      return await s(this, dr).releaseActions(s(this, B).parseReleaseActionsParams(t.params));
    case "input.setFiles":
      return await s(this, dr).setFiles(s(this, B).parseSetFilesParams(t.params));
    case "network.addDataCollector":
      return await s(this, Ie).addDataCollector(s(this, B).parseAddDataCollectorParams(t.params));
    case "network.addIntercept":
      return await s(this, Ie).addIntercept(s(this, B).parseAddInterceptParams(t.params));
    case "network.continueRequest":
      return await s(this, Ie).continueRequest(s(this, B).parseContinueRequestParams(t.params));
    case "network.continueResponse":
      return await s(this, Ie).continueResponse(s(this, B).parseContinueResponseParams(t.params));
    case "network.continueWithAuth":
      return await s(this, Ie).continueWithAuth(s(this, B).parseContinueWithAuthParams(t.params));
    case "network.disownData":
      return s(this, Ie).disownData(s(this, B).parseDisownDataParams(t.params));
    case "network.failRequest":
      return await s(this, Ie).failRequest(s(this, B).parseFailRequestParams(t.params));
    case "network.getData":
      return await s(this, Ie).getData(s(this, B).parseGetDataParams(t.params));
    case "network.provideResponse":
      return await s(this, Ie).provideResponse(s(this, B).parseProvideResponseParams(t.params));
    case "network.removeDataCollector":
      return await s(this, Ie).removeDataCollector(s(this, B).parseRemoveDataCollectorParams(t.params));
    case "network.removeIntercept":
      return await s(this, Ie).removeIntercept(s(this, B).parseRemoveInterceptParams(t.params));
    case "network.setCacheBehavior":
      return await s(this, Ie).setCacheBehavior(s(this, B).parseSetCacheBehaviorParams(t.params));
    case "network.setExtraHeaders":
      return await s(this, Ie).setExtraHeaders(s(this, B).parseSetExtraHeadersParams(t.params));
    case "permissions.setPermission":
      return await s(this, jo).setPermissions(s(this, B).parseSetPermissionsParams(t.params));
    case "script.addPreloadScript":
      return await s(this, xt).addPreloadScript(s(this, B).parseAddPreloadScriptParams(t.params));
    case "script.callFunction":
      return await s(this, xt).callFunction(s(this, B).parseCallFunctionParams(g(this, js, yc).call(this, t.params)));
    case "script.disown":
      return await s(this, xt).disown(s(this, B).parseDisownParams(g(this, js, yc).call(this, t.params)));
    case "script.evaluate":
      return await s(this, xt).evaluate(s(this, B).parseEvaluateParams(g(this, js, yc).call(this, t.params)));
    case "script.getRealms":
      return s(this, xt).getRealms(s(this, B).parseGetRealmsParams(t.params));
    case "script.removePreloadScript":
      return await s(this, xt).removePreloadScript(s(this, B).parseRemovePreloadScriptParams(t.params));
    case "session.end":
      throw new zs.UnsupportedOperationException(`Method ${t.method} is not implemented.`);
    case "session.new":
      return await s(this, vs).new(t.params);
    case "session.status":
      return s(this, vs).status();
    case "session.subscribe":
      return await s(this, vs).subscribe(s(this, B).parseSubscribeParams(t.params), t["goog:channel"]);
    case "session.unsubscribe":
      return await s(this, vs).unsubscribe(s(this, B).parseUnsubscribeParams(t.params), t["goog:channel"]);
    case "storage.deleteCookies":
      return await s(this, lr).deleteCookies(s(this, B).parseDeleteCookiesParams(t.params));
    case "storage.getCookies":
      return await s(this, lr).getCookies(s(this, B).parseGetCookiesParams(t.params));
    case "storage.setCookie":
      return await s(this, lr).setCookie(s(this, B).parseSetCookieParams(t.params));
    case "webExtension.install":
      return await s(this, An).install(s(this, B).parseInstallParams(t.params));
    case "webExtension.uninstall":
      return await s(this, An).uninstall(s(this, B).parseUninstallParams(t.params));
  }
  throw new zs.UnknownCommandException(`Unknown command '${t == null ? void 0 : t.method}'.`);
}, // Workaround for as zod.union always take the first schema
// https://github.com/w3c/webdriver-bidi/issues/635
yc = function(t) {
  return typeof t == "object" && t && "target" in t && typeof t.target == "object" && t.target && "context" in t.target && delete t.target.realm, t;
};
Iu.CommandProcessor = Yy;
var Hu = {};
Object.defineProperty(Hu, "__esModule", { value: !0 });
Hu.BluetoothProcessor = void 0;
const Fe = ee;
class Xl {
  constructor(e, t) {
    N(this, "id");
    N(this, "uuid");
    this.id = e, this.uuid = t;
  }
}
class Qy extends Xl {
  constructor(t, r, n) {
    super(t, r);
    N(this, "characteristic");
    this.characteristic = n;
  }
}
class Zy extends Xl {
  constructor(t, r, n) {
    super(t, r);
    N(this, "descriptors", /* @__PURE__ */ new Map());
    N(this, "service");
    this.service = n;
  }
}
class ev extends Xl {
  constructor(t, r, n) {
    super(t, r);
    N(this, "characteristics", /* @__PURE__ */ new Map());
    N(this, "device");
    this.device = n;
  }
}
class tv {
  constructor(e) {
    N(this, "address");
    N(this, "services", /* @__PURE__ */ new Map());
    this.address = e;
  }
}
var bs, Oe, Cs, Wt, Gt, ge, un, dn, Qi, Wd;
class sv {
  constructor(e, t) {
    u(this, ge);
    u(this, bs);
    u(this, Oe);
    u(this, Cs, /* @__PURE__ */ new Map());
    // A map from a characteristic id from CDP to its BluetoothCharacteristic object.
    u(this, Wt, /* @__PURE__ */ new Map());
    // A map from a descriptor id from CDP to its BluetoothDescriptor object.
    u(this, Gt, /* @__PURE__ */ new Map());
    m(this, bs, e), m(this, Oe, t);
  }
  async simulateAdapter(e) {
    if (e.state === void 0)
      throw new Fe.InvalidArgumentException('Parameter "state" is required for creating a Bluetooth adapter');
    const t = s(this, Oe).getContext(e.context);
    return await t.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.disable"), s(this, Cs).clear(), s(this, Wt).clear(), s(this, Gt).clear(), await t.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.enable", {
      state: e.state,
      leSupported: e.leSupported ?? !0
    }), {};
  }
  async disableSimulation(e) {
    return await s(this, Oe).getContext(e.context).cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.disable"), s(this, Cs).clear(), s(this, Wt).clear(), s(this, Gt).clear(), {};
  }
  async simulatePreconnectedPeripheral(e) {
    if (s(this, Cs).has(e.address))
      throw new Fe.InvalidArgumentException(`Bluetooth device with address ${e.address} already exists`);
    return await s(this, Oe).getContext(e.context).cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.simulatePreconnectedPeripheral", {
      address: e.address,
      name: e.name,
      knownServiceUuids: e.knownServiceUuids,
      manufacturerData: e.manufacturerData
    }), s(this, Cs).set(e.address, new tv(e.address)), {};
  }
  async simulateAdvertisement(e) {
    return await s(this, Oe).getContext(e.context).cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.simulateAdvertisement", {
      entry: e.scanEntry
    }), {};
  }
  async simulateCharacteristic(e) {
    const t = g(this, ge, un).call(this, e.address), r = g(this, ge, dn).call(this, t, e.serviceUuid), n = s(this, Oe).getContext(e.context);
    switch (e.type) {
      case "add": {
        if (e.characteristicProperties === void 0)
          throw new Fe.InvalidArgumentException('Parameter "characteristicProperties" is required for adding a Bluetooth characteristic');
        if (r.characteristics.has(e.characteristicUuid))
          throw new Fe.InvalidArgumentException(`Characteristic with UUID ${e.characteristicUuid} already exists`);
        const o = await n.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.addCharacteristic", {
          serviceId: r.id,
          characteristicUuid: e.characteristicUuid,
          properties: e.characteristicProperties
        }), a = new Zy(o.characteristicId, e.characteristicUuid, r);
        return r.characteristics.set(e.characteristicUuid, a), s(this, Wt).set(a.id, a), {};
      }
      case "remove": {
        if (e.characteristicProperties !== void 0)
          throw new Fe.InvalidArgumentException('Parameter "characteristicProperties" should not be provided for removing a Bluetooth characteristic');
        const o = g(this, ge, Qi).call(this, r, e.characteristicUuid);
        return await n.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.removeCharacteristic", {
          characteristicId: o.id
        }), r.characteristics.delete(e.characteristicUuid), s(this, Wt).delete(o.id), {};
      }
      default:
        throw new Fe.InvalidArgumentException(`Parameter "type" of ${e.type} is not supported`);
    }
  }
  async simulateCharacteristicResponse(e) {
    const t = s(this, Oe).getContext(e.context), r = g(this, ge, un).call(this, e.address), n = g(this, ge, dn).call(this, r, e.serviceUuid), o = g(this, ge, Qi).call(this, n, e.characteristicUuid);
    return await t.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.simulateCharacteristicOperationResponse", {
      characteristicId: o.id,
      type: e.type,
      code: e.code,
      ...e.data && {
        data: btoa(String.fromCharCode(...e.data))
      }
    }), {};
  }
  async simulateDescriptor(e) {
    const t = g(this, ge, un).call(this, e.address), r = g(this, ge, dn).call(this, t, e.serviceUuid), n = g(this, ge, Qi).call(this, r, e.characteristicUuid), o = s(this, Oe).getContext(e.context);
    switch (e.type) {
      case "add": {
        if (n.descriptors.has(e.descriptorUuid))
          throw new Fe.InvalidArgumentException(`Descriptor with UUID ${e.descriptorUuid} already exists`);
        const a = await o.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.addDescriptor", {
          characteristicId: n.id,
          descriptorUuid: e.descriptorUuid
        }), c = new Qy(a.descriptorId, e.descriptorUuid, n);
        return n.descriptors.set(e.descriptorUuid, c), s(this, Gt).set(c.id, c), {};
      }
      case "remove": {
        const a = g(this, ge, Wd).call(this, n, e.descriptorUuid);
        return await o.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.removeDescriptor", {
          descriptorId: a.id
        }), n.descriptors.delete(e.descriptorUuid), s(this, Gt).delete(a.id), {};
      }
      default:
        throw new Fe.InvalidArgumentException(`Parameter "type" of ${e.type} is not supported`);
    }
  }
  async simulateDescriptorResponse(e) {
    const t = s(this, Oe).getContext(e.context), r = g(this, ge, un).call(this, e.address), n = g(this, ge, dn).call(this, r, e.serviceUuid), o = g(this, ge, Qi).call(this, n, e.characteristicUuid), a = g(this, ge, Wd).call(this, o, e.descriptorUuid);
    return await t.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.simulateDescriptorOperationResponse", {
      descriptorId: a.id,
      type: e.type,
      code: e.code,
      ...e.data && {
        data: btoa(String.fromCharCode(...e.data))
      }
    }), {};
  }
  async simulateGattConnectionResponse(e) {
    return await s(this, Oe).getContext(e.context).cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.simulateGATTOperationResponse", {
      address: e.address,
      type: "connection",
      code: e.code
    }), {};
  }
  async simulateGattDisconnection(e) {
    return await s(this, Oe).getContext(e.context).cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.simulateGATTDisconnection", {
      address: e.address
    }), {};
  }
  async simulateService(e) {
    const t = g(this, ge, un).call(this, e.address), r = s(this, Oe).getContext(e.context);
    switch (e.type) {
      case "add": {
        if (t.services.has(e.uuid))
          throw new Fe.InvalidArgumentException(`Service with UUID ${e.uuid} already exists`);
        const n = await r.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.addService", {
          address: e.address,
          serviceUuid: e.uuid
        });
        return t.services.set(e.uuid, new ev(n.serviceId, e.uuid, t)), {};
      }
      case "remove": {
        const n = g(this, ge, dn).call(this, t, e.uuid);
        return await r.cdpTarget.browserCdpClient.sendCommand("BluetoothEmulation.removeService", {
          serviceId: n.id
        }), t.services.delete(e.uuid), {};
      }
      default:
        throw new Fe.InvalidArgumentException(`Parameter "type" of ${e.type} is not supported`);
    }
  }
  onCdpTargetCreated(e) {
    e.cdpClient.on("DeviceAccess.deviceRequestPrompted", (t) => {
      s(this, bs).registerEvent({
        type: "event",
        method: "bluetooth.requestDevicePromptUpdated",
        params: {
          context: e.id,
          prompt: t.id,
          devices: t.devices
        }
      }, e.id);
    }), e.browserCdpClient.on("BluetoothEmulation.gattOperationReceived", async (t) => {
      switch (t.type) {
        case "connection":
          s(this, bs).registerEvent({
            type: "event",
            method: "bluetooth.gattConnectionAttempted",
            params: {
              context: e.id,
              address: t.address
            }
          }, e.id);
          return;
        case "discovery":
          await e.browserCdpClient.sendCommand("BluetoothEmulation.simulateGATTOperationResponse", {
            address: t.address,
            type: "discovery",
            code: 0
          });
      }
    }), e.browserCdpClient.on("BluetoothEmulation.characteristicOperationReceived", (t) => {
      if (!s(this, Wt).has(t.characteristicId))
        return;
      let r;
      if (t.type === "write") {
        if (t.writeType === "write-default-deprecated")
          return;
        r = t.writeType;
      } else
        r = t.type;
      const n = s(this, Wt).get(t.characteristicId);
      s(this, bs).registerEvent({
        type: "event",
        method: "bluetooth.characteristicEventGenerated",
        params: {
          context: e.id,
          address: n.service.device.address,
          serviceUuid: n.service.uuid,
          characteristicUuid: n.uuid,
          type: r,
          ...t.data && {
            data: Array.from(atob(t.data), (o) => o.charCodeAt(0))
          }
        }
      }, e.id);
    }), e.browserCdpClient.on("BluetoothEmulation.descriptorOperationReceived", (t) => {
      if (!s(this, Gt).has(t.descriptorId))
        return;
      const r = s(this, Gt).get(t.descriptorId);
      s(this, bs).registerEvent({
        type: "event",
        method: "bluetooth.descriptorEventGenerated",
        params: {
          context: e.id,
          address: r.characteristic.service.device.address,
          serviceUuid: r.characteristic.service.uuid,
          characteristicUuid: r.characteristic.uuid,
          descriptorUuid: r.uuid,
          type: t.type,
          ...t.data && {
            data: Array.from(atob(t.data), (n) => n.charCodeAt(0))
          }
        }
      }, e.id);
    });
  }
  async handleRequestDevicePrompt(e) {
    const t = s(this, Oe).getContext(e.context);
    return e.accept ? await t.cdpTarget.cdpClient.sendCommand("DeviceAccess.selectPrompt", {
      id: e.prompt,
      deviceId: e.device
    }) : await t.cdpTarget.cdpClient.sendCommand("DeviceAccess.cancelPrompt", {
      id: e.prompt
    }), {};
  }
}
bs = new WeakMap(), Oe = new WeakMap(), Cs = new WeakMap(), Wt = new WeakMap(), Gt = new WeakMap(), ge = new WeakSet(), un = function(e) {
  const t = s(this, Cs).get(e);
  if (!t)
    throw new Fe.InvalidArgumentException(`Bluetooth device with address ${e} does not exist`);
  return t;
}, dn = function(e, t) {
  const r = e.services.get(t);
  if (!r)
    throw new Fe.InvalidArgumentException(`Service with UUID ${t} on device ${e.address} does not exist`);
  return r;
}, Qi = function(e, t) {
  const r = e.characteristics.get(t);
  if (!r)
    throw new Fe.InvalidArgumentException(`Characteristic with UUID ${t} does not exist for service ${e.uuid} on device ${e.device.address}`);
  return r;
}, Wd = function(e, t) {
  const r = e.descriptors.get(t);
  if (!r)
    throw new Fe.InvalidArgumentException(`Descriptor with UUID ${t} does not exist for characteristic ${e.uuid} on service ${e.service.uuid} on device ${e.service.device.address}`);
  return r;
};
Hu.BluetoothProcessor = sv;
var zu = {}, Ku = {};
Object.defineProperty(Ku, "__esModule", { value: !0 });
Ku.ContextConfig = void 0;
class Jl {
  constructor() {
    // keep-sorted start block=yes
    N(this, "acceptInsecureCerts");
    N(this, "devicePixelRatio");
    N(this, "disableNetworkDurableMessages");
    N(this, "downloadBehavior");
    N(this, "emulatedNetworkConditions");
    // Extra headers are kept in CDP format.
    N(this, "extraHeaders");
    N(this, "geolocation");
    N(this, "locale");
    N(this, "prerenderingDisabled");
    N(this, "screenOrientation");
    N(this, "scriptingEnabled");
    // Timezone is kept in CDP format with GMT prefix for offset values.
    N(this, "timezone");
    N(this, "userAgent");
    N(this, "userPromptHandler");
    N(this, "viewport");
  }
  // keep-sorted end
  /**
   * Merges multiple `ContextConfig` objects. The configs are merged in the order they are
   * provided. For each property, the value from the last config that defines it will be
   * used. The final result will not contain any `undefined` or `null` properties.
   * `undefined` values are ignored. `null` values remove the already set value.
   */
  static merge(...e) {
    const t = new Jl();
    for (const r of e)
      if (r)
        for (const n in r) {
          const o = r[n];
          o === null ? delete t[n] : o !== void 0 && (t[n] = o);
        }
    return t;
  }
}
Ku.ContextConfig = Jl;
Object.defineProperty(zu, "__esModule", { value: !0 });
zu.ContextConfigStorage = void 0;
const en = Ku;
var xs, hr, pr, Qc, nf;
class rv {
  constructor() {
    u(this, Qc);
    u(this, xs, new en.ContextConfig());
    u(this, hr, /* @__PURE__ */ new Map());
    u(this, pr, /* @__PURE__ */ new Map());
  }
  /**
   * Updates the global configuration. Properties with `undefined` values in the
   * provided `config` are ignored.
   */
  updateGlobalConfig(e) {
    m(this, xs, en.ContextConfig.merge(s(this, xs), e));
  }
  /**
   * Updates the configuration for a specific browsing context. Properties with
   * `undefined` values in the provided `config` are ignored.
   */
  updateBrowsingContextConfig(e, t) {
    s(this, pr).set(e, en.ContextConfig.merge(s(this, pr).get(e), t));
  }
  /**
   * Updates the configuration for a specific user context. Properties with
   * `undefined` values in the provided `config` are ignored.
   */
  updateUserContextConfig(e, t) {
    s(this, hr).set(e, en.ContextConfig.merge(s(this, hr).get(e), t));
  }
  /**
   * Returns the current global configuration.
   */
  getGlobalConfig() {
    return s(this, xs);
  }
  /**
   * Calculates the active configuration by merging global, user context, and
   * browsing context settings.
   */
  getActiveConfig(e, t) {
    let r = en.ContextConfig.merge(s(this, xs), s(this, hr).get(t));
    e !== void 0 && (r = en.ContextConfig.merge(r, s(this, pr).get(e)));
    const n = g(this, Qc, nf).call(this, e, t);
    return r.extraHeaders = Object.keys(n).length > 0 ? n : void 0, r;
  }
}
xs = new WeakMap(), hr = new WeakMap(), pr = new WeakMap(), Qc = new WeakSet(), /**
 * Extra headers is a special case. The headers from the different levels have to be
 * merged instead of being overridden.
 */
nf = function(e, t) {
  var a, c;
  const r = s(this, xs).extraHeaders ?? {}, n = ((a = s(this, hr).get(t)) == null ? void 0 : a.extraHeaders) ?? {}, o = e === void 0 ? {} : ((c = s(this, pr).get(e)) == null ? void 0 : c.extraHeaders) ?? {};
  return { ...r, ...n, ...o };
};
zu.ContextConfigStorage = rv;
var Wu = {};
Object.defineProperty(Wu, "__esModule", { value: !0 });
Wu.UserContextStorage = void 0;
const nv = ee;
var $o;
class iv {
  constructor(e) {
    u(this, $o);
    m(this, $o, e);
  }
  async getUserContexts() {
    const e = await s(this, $o).sendCommand("Target.getBrowserContexts");
    return [
      {
        userContext: "default"
      },
      ...e.browserContextIds.map((t) => ({
        userContext: t
      }))
    ];
  }
  async verifyUserContextIdList(e) {
    const t = /* @__PURE__ */ new Set();
    if (!e.length)
      return t;
    const r = await this.getUserContexts(), n = new Set(r.map((o) => o.userContext));
    for (const o of e) {
      if (!n.has(o))
        throw new nv.NoSuchUserContextException(`User context ${o} not found`);
      t.add(o);
    }
    return t;
  }
}
$o = new WeakMap();
Wu.UserContextStorage = iv;
var Gu = {}, Bi = {}, Vr = {};
Object.defineProperty(Vr, "__esModule", { value: !0 });
Vr.Deferred = void 0;
var dp, Vt, Es, Lo, qo, Ho;
dp = Symbol.toStringTag;
class ov {
  constructor() {
    u(this, Vt, !1);
    u(this, Es);
    u(this, Lo);
    u(this, qo);
    u(this, Ho);
    N(this, dp, "Promise");
    m(this, Es, new Promise((e, t) => {
      m(this, qo, e), m(this, Ho, t);
    })), s(this, Es).catch((e) => {
    });
  }
  get isFinished() {
    return s(this, Vt);
  }
  get result() {
    if (!s(this, Vt))
      throw new Error("Deferred is not finished yet");
    return s(this, Lo);
  }
  then(e, t) {
    return s(this, Es).then(e, t);
  }
  catch(e) {
    return s(this, Es).catch(e);
  }
  resolve(e) {
    m(this, Lo, e), s(this, Vt) || (m(this, Vt, !0), s(this, qo).call(this, e));
  }
  reject(e) {
    s(this, Vt) || (m(this, Vt, !0), s(this, Ho).call(this, e));
  }
  finally(e) {
    return s(this, Es).finally(e);
  }
}
Vt = new WeakMap(), Es = new WeakMap(), Lo = new WeakMap(), qo = new WeakMap(), Ho = new WeakMap();
Vr.Deferred = ov;
var Vu = {};
Object.defineProperty(Vu, "__esModule", { value: !0 });
Vu.getTimestamp = av;
function av() {
  return (/* @__PURE__ */ new Date()).getTime();
}
var Yl = {};
Object.defineProperty(Yl, "__esModule", { value: !0 });
Yl.inchesFromCm = cv;
function cv(i) {
  return i / 2.54;
}
var Qa = {};
Object.defineProperty(Qa, "__esModule", { value: !0 });
Qa.getSharedId = dv;
Qa.parseSharedId = hv;
const uv = "_element_";
function dv(i, e, t) {
  return `f.${i}.d.${e}.e.${t}`;
}
function lv(i) {
  const e = i.match(new RegExp(`(.*)${uv}(.*)`));
  if (!e)
    return null;
  const t = e[1], r = e[2];
  if (t === void 0 || r === void 0)
    return null;
  const n = parseInt(r ?? "");
  return isNaN(n) ? null : {
    documentId: t,
    backendNodeId: n
  };
}
function hv(i) {
  const e = lv(i);
  if (e !== null)
    return { ...e, frameId: void 0 };
  const t = i.match(/f\.(.*)\.d\.(.*)\.e\.([0-9]*)/);
  if (!t)
    return null;
  const r = t[1], n = t[2], o = t[3];
  if (r === void 0 || n === void 0 || o === void 0)
    return null;
  const a = parseInt(o ?? "");
  return isNaN(a) ? null : {
    frameId: r,
    documentId: n,
    backendNodeId: a
  };
}
var Za = {}, ec = {};
Object.defineProperty(ec, "__esModule", { value: !0 });
ec.Realm = void 0;
const dc = ee, pv = Te, fv = Ft, mv = Ya;
var zo, fr, Ko, Mn, Wo, Go, Ce, Gd, pt, lt, of, Vd, Xd, af, Jd, Yd, cf, uf, Qd;
let gv = (lt = class {
  constructor(e, t, r, n, o, a, c) {
    u(this, Ce);
    u(this, zo);
    u(this, fr);
    u(this, Ko);
    u(this, Mn);
    u(this, Wo);
    u(this, Go);
    N(this, "realmStorage");
    m(this, zo, e), m(this, fr, t), m(this, Ko, r), m(this, Mn, n), m(this, Wo, o), m(this, Go, a), this.realmStorage = c, this.realmStorage.addRealm(this);
  }
  cdpToBidiValue(e, t) {
    const r = this.serializeForBiDi(e.result.deepSerializedValue, /* @__PURE__ */ new Map());
    if (e.result.objectId) {
      const n = e.result.objectId;
      t === "root" ? (r.handle = n, this.realmStorage.knownHandlesToRealmMap.set(n, this.realmId)) : g(this, Ce, Qd).call(this, n).catch((o) => {
        var a;
        return (a = s(this, Mn)) == null ? void 0 : a.call(this, pv.LogType.debugError, o);
      });
    }
    return r;
  }
  isHidden() {
    return !1;
  }
  /**
   * Relies on the CDP to implement proper BiDi serialization, except:
   * * CDP integer property `backendNodeId` is replaced with `sharedId` of
   * `{documentId}_element_{backendNodeId}`;
   * * CDP integer property `weakLocalObjectReference` is replaced with UUID `internalId`
   * using unique-per serialization `internalIdMap`.
   * * CDP type `platformobject` is replaced with `object`.
   * @param deepSerializedValue - CDP value to be converted to BiDi.
   * @param internalIdMap - Map from CDP integer `weakLocalObjectReference` to BiDi UUID
   * `internalId`.
   */
  serializeForBiDi(e, t) {
    if (Object.hasOwn(e, "weakLocalObjectReference")) {
      const n = e.weakLocalObjectReference;
      t.has(n) || t.set(n, (0, fv.uuidv4)()), e.internalId = t.get(n), delete e.weakLocalObjectReference;
    }
    if (e.type === "node" && e.value && Object.hasOwn(e.value, "frameId") && delete e.value.frameId, e.type === "platformobject")
      return { type: "object" };
    const r = e.value;
    if (r === void 0)
      return e;
    if (["array", "set", "htmlcollection", "nodelist"].includes(e.type))
      for (const n in r)
        r[n] = this.serializeForBiDi(r[n], t);
    if (["object", "map"].includes(e.type))
      for (const n in r)
        r[n] = [
          this.serializeForBiDi(r[n][0], t),
          this.serializeForBiDi(r[n][1], t)
        ];
    return e;
  }
  get realmId() {
    return s(this, Go);
  }
  get executionContextId() {
    return s(this, Ko);
  }
  get origin() {
    return s(this, Wo);
  }
  get source() {
    return {
      realm: this.realmId
    };
  }
  get cdpClient() {
    return s(this, zo);
  }
  get baseInfo() {
    return {
      realm: this.realmId,
      origin: this.origin
    };
  }
  async evaluate(e, t, r = "none", n = {}, o = !1, a = !1) {
    var f;
    const c = await this.cdpClient.sendCommand("Runtime.evaluate", {
      contextId: this.executionContextId,
      expression: e,
      awaitPromise: t,
      serializationOptions: g(f = lt, pt, Yd).call(f, "deep", n),
      userGesture: o,
      includeCommandLineAPI: a
    });
    return c.exceptionDetails ? await g(this, Ce, Jd).call(this, c.exceptionDetails, 0, r) : {
      realm: this.realmId,
      result: this.cdpToBidiValue(c, r),
      type: "success"
    };
  }
  initialize() {
    this.isHidden() || g(this, Ce, Gd).call(this, {
      type: "event",
      method: dc.ChromiumBidi.Script.EventNames.RealmCreated,
      params: this.realmInfo
    });
  }
  /**
   * Serializes a given CDP object into BiDi, keeping references in the
   * target's `globalThis`.
   */
  async serializeCdpObject(e, t) {
    var o;
    const r = g(o = lt, pt, of).call(o, e), n = await this.cdpClient.sendCommand("Runtime.callFunctionOn", {
      functionDeclaration: String((a) => a),
      awaitPromise: !1,
      arguments: [r],
      serializationOptions: {
        serialization: "deep"
      },
      executionContextId: this.executionContextId
    });
    return this.cdpToBidiValue(n, t);
  }
  /**
   * Gets the string representation of an object. This is equivalent to
   * calling `toString()` on the object value.
   */
  async stringifyObject(e) {
    const { result: t } = await this.cdpClient.sendCommand("Runtime.callFunctionOn", {
      functionDeclaration: String((r) => String(r)),
      awaitPromise: !1,
      arguments: [e],
      returnByValue: !0,
      executionContextId: this.executionContextId
    });
    return t.value;
  }
  async callFunction(e, t, r = {
    type: "undefined"
  }, n = [], o = "none", a = {}, c = !1) {
    var h;
    const f = `(...args) => {
      function callFunction(f, args) {
        const deserializedThis = args.shift();
        const deserializedArgs = args;
        return f.apply(deserializedThis, deserializedArgs);
      }
      return callFunction((
        ${e}
      ), args);
    }`, p = [
      await this.deserializeForCdp(r),
      ...await Promise.all(n.map(async (w) => await this.deserializeForCdp(w)))
    ];
    let d;
    try {
      d = await this.cdpClient.sendCommand("Runtime.callFunctionOn", {
        functionDeclaration: f,
        awaitPromise: t,
        arguments: p,
        serializationOptions: g(h = lt, pt, Yd).call(h, "deep", a),
        executionContextId: this.executionContextId,
        userGesture: c
      });
    } catch (w) {
      throw w.code === -32e3 && [
        "Could not find object with given id",
        "Argument should belong to the same JavaScript world as target object",
        "Invalid remote object id"
      ].includes(w.message) ? new dc.NoSuchHandleException("Handle was not found.") : w;
    }
    return d.exceptionDetails ? await g(this, Ce, Jd).call(this, d.exceptionDetails, 1, o) : {
      type: "success",
      result: this.cdpToBidiValue(d, o),
      realm: this.realmId
    };
  }
  async deserializeForCdp(e) {
    if ("handle" in e && e.handle)
      return { objectId: e.handle };
    if ("handle" in e || "sharedId" in e)
      throw new dc.NoSuchHandleException("Handle was not found.");
    switch (e.type) {
      case "undefined":
        return { unserializableValue: "undefined" };
      case "null":
        return { unserializableValue: "null" };
      case "string":
        return { value: e.value };
      case "number":
        return e.value === "NaN" ? { unserializableValue: "NaN" } : e.value === "-0" ? { unserializableValue: "-0" } : e.value === "Infinity" ? { unserializableValue: "Infinity" } : e.value === "-Infinity" ? { unserializableValue: "-Infinity" } : {
          value: e.value
        };
      case "boolean":
        return { value: !!e.value };
      case "bigint":
        return {
          unserializableValue: `BigInt(${JSON.stringify(e.value)})`
        };
      case "date":
        return {
          unserializableValue: `new Date(Date.parse(${JSON.stringify(e.value)}))`
        };
      case "regexp":
        return {
          unserializableValue: `new RegExp(${JSON.stringify(e.value.pattern)}, ${JSON.stringify(e.value.flags)})`
        };
      case "map": {
        const t = await g(this, Ce, Vd).call(this, e.value), { result: r } = await this.cdpClient.sendCommand("Runtime.callFunctionOn", {
          functionDeclaration: String((...n) => {
            const o = /* @__PURE__ */ new Map();
            for (let a = 0; a < n.length; a += 2)
              o.set(n[a], n[a + 1]);
            return o;
          }),
          awaitPromise: !1,
          arguments: t,
          returnByValue: !1,
          executionContextId: this.executionContextId
        });
        return { objectId: r.objectId };
      }
      case "object": {
        const t = await g(this, Ce, Vd).call(this, e.value), { result: r } = await this.cdpClient.sendCommand("Runtime.callFunctionOn", {
          functionDeclaration: String((...n) => {
            const o = {};
            for (let a = 0; a < n.length; a += 2) {
              const c = n[a];
              o[c] = n[a + 1];
            }
            return o;
          }),
          awaitPromise: !1,
          arguments: t,
          returnByValue: !1,
          executionContextId: this.executionContextId
        });
        return { objectId: r.objectId };
      }
      case "array": {
        const t = await g(this, Ce, Xd).call(this, e.value), { result: r } = await this.cdpClient.sendCommand("Runtime.callFunctionOn", {
          functionDeclaration: String((...n) => n),
          awaitPromise: !1,
          arguments: t,
          returnByValue: !1,
          executionContextId: this.executionContextId
        });
        return { objectId: r.objectId };
      }
      case "set": {
        const t = await g(this, Ce, Xd).call(this, e.value), { result: r } = await this.cdpClient.sendCommand("Runtime.callFunctionOn", {
          functionDeclaration: String((...n) => new Set(n)),
          awaitPromise: !1,
          arguments: t,
          returnByValue: !1,
          executionContextId: this.executionContextId
        });
        return { objectId: r.objectId };
      }
      case "channel":
        return { objectId: await new mv.ChannelProxy(e.value, s(this, Mn)).init(this, s(this, fr)) };
    }
    throw new Error(`Value ${JSON.stringify(e)} is not deserializable.`);
  }
  async disown(e) {
    this.realmStorage.knownHandlesToRealmMap.get(e) === this.realmId && (await g(this, Ce, Qd).call(this, e), this.realmStorage.knownHandlesToRealmMap.delete(e));
  }
  dispose() {
    g(this, Ce, Gd).call(this, {
      type: "event",
      method: dc.ChromiumBidi.Script.EventNames.RealmDestroyed,
      params: {
        realm: this.realmId
      }
    });
  }
}, zo = new WeakMap(), fr = new WeakMap(), Ko = new WeakMap(), Mn = new WeakMap(), Wo = new WeakMap(), Go = new WeakMap(), Ce = new WeakSet(), Gd = function(e) {
  if (this.associatedBrowsingContexts.length === 0)
    s(this, fr).registerGlobalEvent(e);
  else
    for (const t of this.associatedBrowsingContexts)
      s(this, fr).registerEvent(e, t.id);
}, pt = new WeakSet(), of = function(e) {
  return e.objectId !== void 0 ? { objectId: e.objectId } : e.unserializableValue !== void 0 ? { unserializableValue: e.unserializableValue } : { value: e.value };
}, Vd = async function(e) {
  return (await Promise.all(e.map(async ([r, n]) => {
    let o;
    typeof r == "string" ? o = { value: r } : o = await this.deserializeForCdp(r);
    const a = await this.deserializeForCdp(n);
    return [o, a];
  }))).flat();
}, Xd = async function(e) {
  return await Promise.all(e.map((t) => this.deserializeForCdp(t)));
}, af = async function(e, t, r) {
  var a;
  const n = ((a = e.stackTrace) == null ? void 0 : a.callFrames.map((c) => ({
    url: c.url,
    functionName: c.functionName,
    lineNumber: c.lineNumber - t,
    columnNumber: c.columnNumber
  }))) ?? [], o = e.exception;
  return {
    exception: await this.serializeCdpObject(o, r),
    columnNumber: e.columnNumber,
    lineNumber: e.lineNumber - t,
    stackTrace: {
      callFrames: n
    },
    text: await this.stringifyObject(o) || e.text
  };
}, Jd = async function(e, t, r) {
  return {
    exceptionDetails: await g(this, Ce, af).call(this, e, t, r),
    realm: this.realmId,
    type: "exception"
  };
}, Yd = function(e, t) {
  var r, n;
  return {
    serialization: e,
    additionalParameters: g(r = lt, pt, cf).call(r, t),
    ...g(n = lt, pt, uf).call(n, t)
  };
}, cf = function(e) {
  const t = {};
  return e.maxDomDepth !== void 0 && (t.maxNodeDepth = e.maxDomDepth === null ? 1e3 : e.maxDomDepth), e.includeShadowTree !== void 0 && (t.includeShadowTree = e.includeShadowTree), t;
}, uf = function(e) {
  return e.maxObjectDepth === void 0 || e.maxObjectDepth === null ? {} : { maxDepth: e.maxObjectDepth };
}, Qd = async function(e) {
  try {
    await this.cdpClient.sendCommand("Runtime.releaseObject", {
      objectId: e
    });
  } catch (t) {
    if (!(t.code === -32e3 && t.message === "Invalid remote object id"))
      throw t;
  }
}, u(lt, pt), lt);
ec.Realm = gv;
Object.defineProperty(Za, "__esModule", { value: !0 });
Za.WindowRealm = void 0;
const lc = ee, wv = ec, Ah = Qa;
var Ss, Ps, Zc, df, lp;
let yv = (lp = class extends wv.Realm {
  constructor(t, r, n, o, a, c, f, p, d, h) {
    super(n, o, a, c, f, p, d);
    u(this, Zc);
    u(this, Ss);
    u(this, Ps);
    N(this, "sandbox");
    m(this, Ss, t), m(this, Ps, r), this.sandbox = h, this.initialize();
  }
  get browsingContext() {
    return s(this, Ps).getContext(s(this, Ss));
  }
  /**
   * Do not expose to user hidden realms.
   */
  isHidden() {
    return this.realmStorage.hiddenSandboxes.has(this.sandbox);
  }
  get associatedBrowsingContexts() {
    return [this.browsingContext];
  }
  get realmType() {
    return "window";
  }
  get realmInfo() {
    return {
      ...this.baseInfo,
      type: this.realmType,
      context: s(this, Ss),
      sandbox: this.sandbox
    };
  }
  get source() {
    return {
      realm: this.realmId,
      context: this.browsingContext.id
    };
  }
  serializeForBiDi(t, r) {
    const n = t.value;
    if (t.type === "node" && n !== void 0) {
      if (Object.hasOwn(n, "backendNodeId")) {
        let o = this.browsingContext.navigableId ?? "UNKNOWN";
        Object.hasOwn(n, "loaderId") && (o = n.loaderId, delete n.loaderId), t.sharedId = (0, Ah.getSharedId)(g(this, Zc, df).call(this, o), o, n.backendNodeId), delete n.backendNodeId;
      }
      if (Object.hasOwn(n, "children"))
        for (const o in n.children)
          n.children[o] = this.serializeForBiDi(n.children[o], r);
      Object.hasOwn(n, "shadowRoot") && n.shadowRoot !== null && (n.shadowRoot = this.serializeForBiDi(n.shadowRoot, r)), n.namespaceURI === "" && (n.namespaceURI = null);
    }
    return super.serializeForBiDi(t, r);
  }
  async deserializeForCdp(t) {
    if ("sharedId" in t && t.sharedId) {
      const r = (0, Ah.parseSharedId)(t.sharedId);
      if (r === null)
        throw new lc.NoSuchNodeException(`SharedId "${t.sharedId}" was not found.`);
      const { documentId: n, backendNodeId: o } = r;
      if (this.browsingContext.navigableId !== n)
        throw new lc.NoSuchNodeException(`SharedId "${t.sharedId}" belongs to different document. Current document is ${this.browsingContext.navigableId}.`);
      try {
        const { object: a } = await this.cdpClient.sendCommand("DOM.resolveNode", {
          backendNodeId: o,
          executionContextId: this.executionContextId
        });
        return { objectId: a.objectId };
      } catch (a) {
        throw a.code === -32e3 && a.message === "No node with given id found" ? new lc.NoSuchNodeException(`SharedId "${t.sharedId}" was not found.`) : new lc.UnknownErrorException(a.message, a.stack);
      }
    }
    return await super.deserializeForCdp(t);
  }
  async evaluate(t, r, n, o, a, c) {
    return await s(this, Ps).getContext(s(this, Ss)).targetUnblockedOrThrow(), await super.evaluate(t, r, n, o, a, c);
  }
  async callFunction(t, r, n, o, a, c, f) {
    return await s(this, Ps).getContext(s(this, Ss)).targetUnblockedOrThrow(), await super.callFunction(t, r, n, o, a, c, f);
  }
}, Ss = new WeakMap(), Ps = new WeakMap(), Zc = new WeakSet(), df = function(t) {
  const r = s(this, Ps).getAllContexts().find((n) => n.navigableId === t);
  return (r == null ? void 0 : r.id) ?? "UNKNOWN";
}, lp);
Za.WindowRealm = yv;
var Bs = {}, Ql = {};
Object.defineProperty(Ql, "__esModule", { value: !0 });
Ql.urlMatchesAboutBlank = vv;
function vv(i) {
  if (i === "")
    return !0;
  try {
    const e = new URL(i);
    return e.protocol.replace(/:$/, "").toLowerCase() === "about" && e.pathname.toLowerCase() === "blank" && e.username === "" && e.password === "" && e.host === "";
  } catch (e) {
    if (e instanceof TypeError)
      return !1;
    throw e;
  }
}
Object.defineProperty(Bs, "__esModule", { value: !0 });
Bs.NavigationTracker = Bs.NavigationState = Bs.NavigationResult = void 0;
const Mh = ee, Bh = Vr, us = Te, bv = Vu, Fh = Ql, Cv = Ft;
class vc {
  constructor(e, t) {
    N(this, "eventName");
    N(this, "message");
    this.eventName = e, this.message = t;
  }
}
Bs.NavigationResult = vc;
var Is, Bn, Fn, mr, gr, jn, Cc;
class bc {
  constructor(e, t, r, n) {
    u(this, jn);
    N(this, "navigationId", (0, Cv.uuidv4)());
    u(this, Is);
    u(this, Bn, !1);
    u(this, Fn, new Bh.Deferred());
    N(this, "url");
    N(this, "loaderId");
    u(this, mr);
    u(this, gr);
    N(this, "committed", new Bh.Deferred());
    N(this, "isFragmentNavigation");
    m(this, Is, t), this.url = e, m(this, mr, r), m(this, gr, n);
  }
  get finished() {
    return s(this, Fn);
  }
  navigationInfo() {
    return {
      context: s(this, Is),
      navigation: this.navigationId,
      timestamp: (0, bv.getTimestamp)(),
      url: this.url
    };
  }
  start() {
    // Initial navigation should not be reported.
    !s(this, mr) && // No need in reporting started navigation twice.
    !s(this, Bn) && // No need for reporting fragment navigations. Step 13 vs step 16 of the spec:
    // https://html.spec.whatwg.org/#beginning-navigation:webdriver-bidi-navigation-started
    !this.isFragmentNavigation && s(this, gr).registerEvent({
      type: "event",
      method: Mh.ChromiumBidi.BrowsingContext.EventNames.NavigationStarted,
      params: this.navigationInfo()
    }, s(this, Is)), m(this, Bn, !0);
  }
  frameNavigated() {
    this.committed.resolve(), s(this, mr) || s(this, gr).registerEvent({
      type: "event",
      method: Mh.ChromiumBidi.BrowsingContext.EventNames.NavigationCommitted,
      params: this.navigationInfo()
    }, s(this, Is));
  }
  fragmentNavigated() {
    this.committed.resolve(), g(this, jn, Cc).call(this, new vc(
      "browsingContext.fragmentNavigated"
      /* NavigationEventName.FragmentNavigated */
    ));
  }
  load() {
    g(this, jn, Cc).call(this, new vc(
      "browsingContext.load"
      /* NavigationEventName.Load */
    ));
  }
  fail(e) {
    g(this, jn, Cc).call(this, new vc(this.committed.isFinished ? "browsingContext.navigationAborted" : "browsingContext.navigationFailed", e));
  }
}
Is = new WeakMap(), Bn = new WeakMap(), Fn = new WeakMap(), mr = new WeakMap(), gr = new WeakMap(), jn = new WeakSet(), Cc = function(e) {
  m(this, Bn, !0), !s(this, mr) && !s(this, Fn).isFinished && e.eventName !== "browsingContext.load" && s(this, gr).registerEvent({
    type: "event",
    method: e.eventName,
    params: this.navigationInfo()
  }, s(this, Is)), s(this, Fn).resolve(e);
};
Bs.NavigationState = bc;
var wr, Ye, He, Un, Qe, ue, Xt, eu, lf, Vo, el;
const no = class no {
  constructor(e, t, r, n) {
    u(this, eu);
    u(this, wr);
    u(this, Ye);
    u(this, He, /* @__PURE__ */ new Map());
    u(this, Un);
    /**
     * Last committed navigation is committed, but is not guaranteed to be finished, as it
     * can still wait for `load` or `DOMContentLoaded` events.
     */
    u(this, Qe);
    /**
     * Pending navigation is a navigation that is started but not yet committed.
     */
    u(this, ue);
    // Flags if the initial navigation to `about:blank` is in progress.
    u(this, Xt, !0);
    m(this, Un, t), m(this, wr, r), m(this, Ye, n), m(this, Xt, !0), m(this, Qe, new bc(e, t, (0, Fh.urlMatchesAboutBlank)(e), s(this, wr)));
  }
  /**
   * Returns current started ongoing navigation. It can be either a started pending
   * navigation, or one is already navigated.
   */
  get currentNavigationId() {
    var e;
    return ((e = s(this, ue)) == null ? void 0 : e.isFragmentNavigation) === !1 ? s(this, ue).navigationId : s(this, Qe).navigationId;
  }
  /**
   * Flags if the current navigation relates to the initial to `about:blank` navigation.
   */
  get isInitialNavigation() {
    return s(this, Xt);
  }
  /**
   * Url of the last navigated navigation.
   */
  get url() {
    return s(this, Qe).url;
  }
  /**
   * Creates a pending navigation e.g. when navigation command is called. Required to
   * provide navigation id before the actual navigation is started. It will be used when
   * navigation started. Can be aborted, failed, fragment navigated, or became a current
   * navigation.
   */
  createPendingNavigation(e, t = !1) {
    var n, o;
    (n = s(this, Ye)) == null || n.call(this, us.LogType.debug, "createCommandNavigation"), m(this, Xt, t && s(this, Xt) && (0, Fh.urlMatchesAboutBlank)(e)), (o = s(this, ue)) == null || o.fail("navigation canceled by concurrent navigation");
    const r = new bc(e, s(this, Un), s(this, Xt), s(this, wr));
    return m(this, ue, r), r;
  }
  dispose() {
    var e;
    (e = s(this, ue)) == null || e.fail("navigation canceled by context disposal"), s(this, Qe).fail("navigation canceled by context disposal");
  }
  // Update the current url.
  onTargetInfoChanged(e) {
    var t;
    (t = s(this, Ye)) == null || t.call(this, us.LogType.debug, `onTargetInfoChanged ${e}`), s(this, Qe).url = e;
  }
  /**
   * @param {string} unreachableUrl indicated the navigation is actually failed.
   */
  frameNavigated(e, t, r) {
    var o;
    if ((o = s(this, Ye)) == null || o.call(this, us.LogType.debug, `frameNavigated ${e}`), r !== void 0) {
      const a = s(this, He).get(t) ?? s(this, ue) ?? this.createPendingNavigation(r, !0);
      a.url = r, a.start(), a.fail("the requested url is unreachable");
      return;
    }
    const n = g(this, eu, lf).call(this, e, t);
    n !== s(this, Qe) && s(this, Qe).fail("navigation canceled by concurrent navigation"), n.url = e, n.loaderId = t, s(this, He).set(t, n), n.start(), n.frameNavigated(), m(this, Qe, n), s(this, ue) === n && m(this, ue, void 0);
  }
  navigatedWithinDocument(e, t) {
    var n, o;
    if ((n = s(this, Ye)) == null || n.call(this, us.LogType.debug, `navigatedWithinDocument ${e}, ${t}`), s(this, Qe).url = e, t !== "fragment")
      return;
    const r = ((o = s(this, ue)) == null ? void 0 : o.isFragmentNavigation) === !0 ? s(this, ue) : new bc(e, s(this, Un), !1, s(this, wr));
    r.fragmentNavigated(), r === s(this, ue) && m(this, ue, void 0);
  }
  /**
   * Required to mark navigation as fully complete.
   * TODO: navigation should be complete when it became the current one on
   * `Page.frameNavigated` or on navigating command finished with a new loader Id.
   */
  loadPageEvent(e) {
    var t, r;
    (t = s(this, Ye)) == null || t.call(this, us.LogType.debug, "loadPageEvent"), m(this, Xt, !1), (r = s(this, He).get(e)) == null || r.load();
  }
  /**
   * Fail navigation due to navigation command failed.
   */
  failNavigation(e, t) {
    var r;
    (r = s(this, Ye)) == null || r.call(this, us.LogType.debug, "failCommandNavigation"), e.fail(t);
  }
  /**
   * Updates the navigation's `loaderId` and sets it as current one, if it is a
   * cross-document navigation.
   */
  navigationCommandFinished(e, t) {
    var r;
    (r = s(this, Ye)) == null || r.call(this, us.LogType.debug, `finishCommandNavigation ${e.navigationId}, ${t}`), t !== void 0 && (e.loaderId = t, s(this, He).set(t, e)), e.isFragmentNavigation = t === void 0;
  }
  frameStartedNavigating(e, t, r) {
    var o, a, c, f, p, d;
    if ((o = s(this, Ye)) == null || o.call(this, us.LogType.debug, `frameStartedNavigating ${e}, ${t}`), s(this, ue) && ((a = s(this, ue)) == null ? void 0 : a.loaderId) !== void 0 && ((c = s(this, ue)) == null ? void 0 : c.loaderId) !== t && ((f = s(this, ue)) == null || f.fail("navigation canceled by concurrent navigation"), m(this, ue, void 0)), s(this, He).has(t)) {
      const h = s(this, He).get(t);
      h.isFragmentNavigation = g(p = no, Vo, el).call(p, r), m(this, ue, h);
      return;
    }
    const n = s(this, ue) ?? this.createPendingNavigation(e, !0);
    s(this, He).set(t, n), n.isFragmentNavigation = g(d = no, Vo, el).call(d, r), n.url = e, n.loaderId = t, n.start();
  }
  /**
   * If there is a navigation with the loaderId equals to the network request id, it means
   * that the navigation failed.
   */
  networkLoadingFailed(e, t) {
    var r;
    (r = s(this, He).get(e)) == null || r.fail(t);
  }
};
wr = new WeakMap(), Ye = new WeakMap(), He = new WeakMap(), Un = new WeakMap(), Qe = new WeakMap(), ue = new WeakMap(), Xt = new WeakMap(), eu = new WeakSet(), lf = function(e, t) {
  return s(this, He).has(t) ? s(this, He).get(t) : s(this, ue) !== void 0 && s(this, ue).loaderId === void 0 ? s(this, ue) : this.createPendingNavigation(e, !0);
}, Vo = new WeakSet(), el = function(e) {
  return ["historySameDocument", "sameDocument"].includes(e);
}, u(no, Vo);
let Zd = no;
Bs.NavigationTracker = Zd;
var ln;
Object.defineProperty(Bi, "__esModule", { value: !0 });
Bi.BrowsingContextImpl = void 0;
Bi.serializeOrigin = yf;
const K = ee, Hi = os, Ks = Vr, zi = Te, tn = Vu, sn = Yl, xv = Ft, Ev = Qa, Sv = Za, yd = Bs;
var $n, Ln, Xo, qn, Ze, ze, Jo, Re, W, Me, it, _e, et, de, ot, Yo, yr, G, xc, tl, sl, tu, hf, pf, Ec, rl, ff, nl, mf, gf, wf, ps;
class $c {
  constructor(e, t, r, n, o, a, c, f, p, d, h) {
    u(this, G);
    /** Direct children browsing contexts. */
    u(this, $n, /* @__PURE__ */ new Set());
    /** The ID of this browsing context. */
    u(this, Ln);
    N(this, "userContext");
    // Used for running helper scripts.
    u(this, Xo, (0, xv.uuidv4)());
    u(this, qn, /* @__PURE__ */ new Map());
    /**
     * The ID of the parent browsing context.
     * If null, this is a top-level context.
     */
    u(this, Ze);
    u(this, ze, null);
    u(this, Jo);
    u(this, Re, {
      DOMContentLoaded: new Ks.Deferred(),
      load: new Ks.Deferred()
    });
    u(this, W);
    u(this, Me, new Ks.Deferred());
    u(this, it);
    u(this, _e);
    u(this, et);
    u(this, de);
    u(this, ot);
    u(this, Yo);
    // Set when the user prompt is opened. Required to provide the type in closing event.
    u(this, yr);
    m(this, W, n), m(this, Ln, e), m(this, ze, t), this.userContext = r, m(this, _e, o), m(this, it, a), m(this, ot, c), m(this, Yo, f), m(this, et, h), m(this, Jo, d), s(this, ot).hiddenSandboxes.add(s(this, Xo)), m(this, de, new yd.NavigationTracker(p, e, o, h));
  }
  static create(e, t, r, n, o, a, c, f, p, d, h) {
    var x;
    const w = new ln(e, t, r, n, o, a, c, f, p, d, h);
    return g(x = w, G, sl).call(x), a.addContext(w), w.isTopLevelContext() || w.parent.addChild(w.id), o.registerPromiseEvent(w.targetUnblockedOrThrow().then(() => ({
      kind: "success",
      value: {
        type: "event",
        method: K.ChromiumBidi.BrowsingContext.EventNames.ContextCreated,
        params: {
          ...w.serializeToBidiValue(),
          // Hack to provide the initial URL of the context, as it can be changed
          // between the page target is attached and unblocked, as the page is not
          // fully paused in MPArch session (https://crbug.com/372842894).
          // TODO: remove once https://crbug.com/372842894 is addressed.
          url: p
        }
      }
    }), (S) => ({
      kind: "error",
      error: S
    })), w.id, K.ChromiumBidi.BrowsingContext.EventNames.ContextCreated), w;
  }
  /**
   * @see https://html.spec.whatwg.org/multipage/document-sequences.html#navigable
   */
  get navigableId() {
    return s(this, Ze);
  }
  get navigationId() {
    return s(this, de).currentNavigationId;
  }
  dispose(e) {
    s(this, de).dispose(), s(this, ot).deleteRealms({
      browsingContextId: this.id
    }), this.isTopLevelContext() || s(this.parent, $n).delete(this.id), g(this, G, ff).call(this), e && s(this, _e).registerEvent({
      type: "event",
      method: K.ChromiumBidi.BrowsingContext.EventNames.ContextDestroyed,
      params: this.serializeToBidiValue(null)
    }, this.id), g(this, G, xc).call(this), s(this, _e).clearBufferedEvents(this.id), s(this, it).deleteContextById(this.id);
  }
  /** Returns the ID of this context. */
  get id() {
    return s(this, Ln);
  }
  /** Returns the parent context ID. */
  get parentId() {
    return s(this, ze);
  }
  /** Sets the parent context ID and updates parent's children. */
  set parentId(e) {
    var t;
    if (s(this, ze) !== null) {
      (t = s(this, et)) == null || t.call(this, zi.LogType.debugError, "Parent context already set");
      return;
    }
    m(this, ze, e), this.isTopLevelContext() || this.parent.addChild(this.id);
  }
  /** Returns the parent context. */
  get parent() {
    return this.parentId === null ? null : s(this, it).getContext(this.parentId);
  }
  /** Returns all direct children contexts. */
  get directChildren() {
    return [...s(this, $n)].map((e) => s(this, it).getContext(e));
  }
  /** Returns all children contexts, flattened. */
  get allChildren() {
    const e = this.directChildren;
    return e.concat(...e.map((t) => t.allChildren));
  }
  /**
   * Returns true if this is a top-level context.
   * This is the case whenever the parent context ID is null.
   */
  isTopLevelContext() {
    return s(this, ze) === null;
  }
  get top() {
    let e = this, t = e.parent;
    for (; t; )
      e = t, t = e.parent;
    return e;
  }
  addChild(e) {
    s(this, $n).add(e);
  }
  get cdpTarget() {
    return s(this, W);
  }
  updateCdpTarget(e) {
    m(this, W, e), g(this, G, sl).call(this);
  }
  get url() {
    return s(this, de).url;
  }
  async lifecycleLoaded() {
    await s(this, Re).load;
  }
  async targetUnblockedOrThrow() {
    const e = await s(this, W).unblocked;
    if (e.kind === "error")
      throw e.error;
  }
  /** Returns a sandbox for internal helper scripts which is not exposed to the user.*/
  async getOrCreateHiddenSandbox() {
    return await g(this, G, tl).call(this, s(this, Xo));
  }
  /** Returns a sandbox which is exposed to user. */
  async getOrCreateUserSandbox(e) {
    const t = await g(this, G, tl).call(this, e);
    if (t.isHidden())
      throw new K.NoSuchFrameException(`Realm "${e}" not found`);
    return t;
  }
  /**
   * Implements https://w3c.github.io/webdriver-bidi/#get-the-navigable-info.
   */
  serializeToBidiValue(e = 0, t = !0) {
    return {
      context: s(this, Ln),
      url: this.url,
      userContext: this.userContext,
      originalOpener: s(this, Jo) ?? null,
      clientWindow: `${this.cdpTarget.windowId}`,
      children: e === null || e > 0 ? this.directChildren.map((r) => r.serializeToBidiValue(e === null ? e : e - 1, !1)) : null,
      ...t ? { parent: s(this, ze) } : {}
    };
  }
  onTargetInfoChanged(e) {
    s(this, de).onTargetInfoChanged(e.targetInfo.url);
  }
  async navigate(e, t) {
    try {
      new URL(e);
    } catch {
      throw new K.InvalidArgumentException(`Invalid URL: ${e}`);
    }
    const r = s(this, de).createPendingNavigation(e), n = (async () => {
      const a = await s(this, W).cdpClient.sendCommand("Page.navigate", {
        url: e,
        frameId: this.id
      });
      if (a.errorText)
        throw s(this, de).failNavigation(r, a.errorText), new K.UnknownErrorException(a.errorText);
      s(this, de).navigationCommandFinished(r, a.loaderId), g(this, G, Ec).call(this, a.loaderId);
    })(), o = await Promise.race([
      // No `loaderId` means same-document navigation.
      g(this, G, nl).call(this, t, n, r),
      // Throw an error if the navigation is canceled.
      r.finished
    ]);
    if (o instanceof yd.NavigationResult && // TODO: check after decision on the spec is done:
    //  https://github.com/w3c/webdriver-bidi/issues/799.
    (o.eventName === "browsingContext.navigationAborted" || o.eventName === "browsingContext.navigationFailed"))
      throw new K.UnknownErrorException(o.message ?? "unknown exception");
    return {
      navigation: r.navigationId,
      // Url can change due to redirects. Get the one from commandNavigation.
      url: r.url
    };
  }
  // TODO: support concurrent navigations analogous to `navigate`.
  async reload(e, t) {
    await this.targetUnblockedOrThrow(), g(this, G, rl).call(this);
    const r = s(this, de).createPendingNavigation(s(this, de).url), n = s(this, W).cdpClient.sendCommand("Page.reload", {
      ignoreCache: e
    }), o = await Promise.race([
      // No `loaderId` means same-document navigation.
      g(this, G, nl).call(this, t, n, r),
      // Throw an error if the navigation is canceled.
      r.finished
    ]);
    if (o instanceof yd.NavigationResult && (o.eventName === "browsingContext.navigationAborted" || o.eventName === "browsingContext.navigationFailed"))
      throw new K.UnknownErrorException(o.message ?? "unknown exception");
    return {
      navigation: r.navigationId,
      // Url can change due to redirects. Get the one from commandNavigation.
      url: r.url
    };
  }
  async setViewport(e, t, r) {
    await this.cdpTarget.setDeviceMetricsOverride(e, t, r);
  }
  async handleUserPrompt(e, t) {
    await s(this.top, W).cdpClient.sendCommand("Page.handleJavaScriptDialog", {
      accept: e ?? !0,
      promptText: t
    });
  }
  async activate() {
    await s(this, W).cdpClient.sendCommand("Page.bringToFront");
  }
  async captureScreenshot(e) {
    if (!this.isTopLevelContext())
      throw new K.UnsupportedOperationException(`Non-top-level 'context' (${e.context}) is currently not supported`);
    const t = Pv(e);
    let r = !1, n;
    switch (e.origin ?? (e.origin = "viewport"), e.origin) {
      case "document": {
        n = String(() => {
          const p = document.documentElement;
          return {
            x: 0,
            y: 0,
            width: p.scrollWidth,
            height: p.scrollHeight
          };
        }), r = !0;
        break;
      }
      case "viewport": {
        n = String(() => {
          const p = window.visualViewport;
          return {
            x: p.pageLeft,
            y: p.pageTop,
            width: p.width,
            height: p.height
          };
        });
        break;
      }
    }
    const a = await (await this.getOrCreateHiddenSandbox()).callFunction(n, !1);
    (0, Hi.assert)(a.type === "success");
    const c = jh(a.result);
    (0, Hi.assert)(c);
    let f = c;
    if (e.clip) {
      const p = e.clip;
      e.origin === "viewport" && p.type === "box" && (p.x += c.x, p.y += c.y), f = Iv(await g(this, G, mf).call(this, p), c);
    }
    if (f.width === 0 || f.height === 0)
      throw new K.UnableToCaptureScreenException(`Unable to capture screenshot with zero dimensions: width=${f.width}, height=${f.height}`);
    return await s(this, W).cdpClient.sendCommand("Page.captureScreenshot", {
      clip: { ...f, scale: 1 },
      ...t,
      captureBeyondViewport: r
    });
  }
  async print(e) {
    var r, n, o, a, c, f;
    if (!this.isTopLevelContext())
      throw new K.UnsupportedOperationException("Printing of non-top level contexts is not supported");
    const t = {};
    if (e.background !== void 0 && (t.printBackground = e.background), ((r = e.margin) == null ? void 0 : r.bottom) !== void 0 && (t.marginBottom = (0, sn.inchesFromCm)(e.margin.bottom)), ((n = e.margin) == null ? void 0 : n.left) !== void 0 && (t.marginLeft = (0, sn.inchesFromCm)(e.margin.left)), ((o = e.margin) == null ? void 0 : o.right) !== void 0 && (t.marginRight = (0, sn.inchesFromCm)(e.margin.right)), ((a = e.margin) == null ? void 0 : a.top) !== void 0 && (t.marginTop = (0, sn.inchesFromCm)(e.margin.top)), e.orientation !== void 0 && (t.landscape = e.orientation === "landscape"), ((c = e.page) == null ? void 0 : c.height) !== void 0 && (t.paperHeight = (0, sn.inchesFromCm)(e.page.height)), ((f = e.page) == null ? void 0 : f.width) !== void 0 && (t.paperWidth = (0, sn.inchesFromCm)(e.page.width)), e.pageRanges !== void 0) {
      for (const p of e.pageRanges) {
        if (typeof p == "number")
          continue;
        const d = p.split("-");
        if (d.length < 1 || d.length > 2)
          throw new K.InvalidArgumentException(`Invalid page range: ${p} is not a valid integer range.`);
        if (d.length === 1) {
          vd(d[0] ?? "");
          continue;
        }
        let h, w;
        const [x = "", S = ""] = d;
        if (x === "" ? h = 1 : h = vd(x), S === "" ? w = Number.MAX_SAFE_INTEGER : w = vd(S), h > w)
          throw new K.InvalidArgumentException(`Invalid page range: ${x} > ${S}`);
      }
      t.pageRanges = e.pageRanges.join(",");
    }
    e.scale !== void 0 && (t.scale = e.scale), e.shrinkToFit !== void 0 && (t.preferCSSPageSize = !e.shrinkToFit);
    try {
      return {
        data: (await s(this, W).cdpClient.sendCommand("Page.printToPDF", t)).data
      };
    } catch (p) {
      throw p.message === "invalid print parameters: content area is empty" ? new K.UnsupportedOperationException(p.message) : p;
    }
  }
  async close() {
    await s(this, W).cdpClient.sendCommand("Page.close");
  }
  async traverseHistory(e) {
    if (e === 0)
      return;
    const t = await s(this, W).cdpClient.sendCommand("Page.getNavigationHistory"), r = t.entries[t.currentIndex + e];
    if (!r)
      throw new K.NoSuchHistoryEntryException(`No history entry at delta ${e}`);
    await s(this, W).cdpClient.sendCommand("Page.navigateToHistoryEntry", {
      entryId: r.id
    });
  }
  async toggleModulesIfNeeded() {
    await Promise.all([
      s(this, W).toggleNetworkIfNeeded(),
      s(this, W).toggleDeviceAccessIfNeeded(),
      s(this, W).togglePreloadIfNeeded()
    ]);
  }
  async locateNodes(e) {
    return await g(this, G, wf).call(this, await s(this, Me), e.locator, e.startNodes ?? [], e.maxNodeCount, e.serializationOptions);
  }
  async setTimezoneOverride(e) {
    await Promise.all(g(this, G, ps).call(this).map(async (t) => await t.setTimezoneOverride(e)));
  }
  async setLocaleOverride(e) {
    await Promise.all(g(this, G, ps).call(this).map(async (t) => await t.setLocaleOverride(e)));
  }
  async setGeolocationOverride(e) {
    await Promise.all(g(this, G, ps).call(this).map(async (t) => await t.setGeolocationOverride(e)));
  }
  async setScriptingEnabled(e) {
    await Promise.all(g(this, G, ps).call(this).map(async (t) => await t.setScriptingEnabled(e)));
  }
  async setUserAgentAndAcceptLanguage(e, t) {
    await Promise.all(g(this, G, ps).call(this).map(async (r) => await r.setUserAgentAndAcceptLanguage(e, t)));
  }
  async setEmulatedNetworkConditions(e) {
    await Promise.all(g(this, G, ps).call(this).map(async (t) => await t.setEmulatedNetworkConditions(e)));
  }
  async setExtraHeaders(e) {
    await Promise.all(g(this, G, ps).call(this).map(async (t) => await t.setExtraHeaders(e)));
  }
}
$n = new WeakMap(), Ln = new WeakMap(), Xo = new WeakMap(), qn = new WeakMap(), Ze = new WeakMap(), ze = new WeakMap(), Jo = new WeakMap(), Re = new WeakMap(), W = new WeakMap(), Me = new WeakMap(), it = new WeakMap(), _e = new WeakMap(), et = new WeakMap(), de = new WeakMap(), ot = new WeakMap(), Yo = new WeakMap(), yr = new WeakMap(), G = new WeakSet(), xc = function(e = !1) {
  this.directChildren.map((t) => t.dispose(e));
}, tl = async function(e) {
  if (e === void 0 || e === "")
    return await s(this, Me);
  let t = s(this, ot).findRealms({
    browsingContextId: this.id,
    sandbox: e
  });
  return t.length === 0 && (await s(this, W).cdpClient.sendCommand("Page.createIsolatedWorld", {
    frameId: this.id,
    worldName: e
  }), t = s(this, ot).findRealms({
    browsingContextId: this.id,
    sandbox: e
  }), (0, Hi.assert)(t.length !== 0)), t[0];
}, sl = function() {
  s(this, W).cdpClient.on("Network.loadingFailed", (e) => {
    s(this, de).networkLoadingFailed(e.requestId, e.errorText);
  }), s(this, W).cdpClient.on("Page.fileChooserOpened", (e) => {
    var r;
    if (this.id !== e.frameId)
      return;
    if (s(this, Ze) === void 0) {
      (r = s(this, et)) == null || r.call(this, zi.LogType.debugError, "LoaderId should be defined when file upload is shown", e);
      return;
    }
    const t = e.backendNodeId === void 0 ? void 0 : {
      sharedId: (0, Ev.getSharedId)(this.id, s(this, Ze), e.backendNodeId)
    };
    s(this, _e).registerEvent({
      type: "event",
      method: K.ChromiumBidi.Input.EventNames.FileDialogOpened,
      params: {
        context: this.id,
        multiple: e.mode === "selectMultiple",
        element: t
      }
    }, this.id);
  }), s(this, W).cdpClient.on("Page.frameNavigated", (e) => {
    this.id === e.frame.id && (s(this, de).frameNavigated(
      e.frame.url + (e.frame.urlFragment ?? ""),
      e.frame.loaderId,
      // `unreachableUrl` indicates if the navigation failed.
      e.frame.unreachableUrl
    ), g(this, G, xc).call(this), g(this, G, Ec).call(this, e.frame.loaderId));
  }), s(this, W).cdpClient.on("Page.frameStartedNavigating", (e) => {
    this.id === e.frameId && s(this, de).frameStartedNavigating(e.url, e.loaderId, e.navigationType);
  }), s(this, W).cdpClient.on("Page.navigatedWithinDocument", (e) => {
    if (this.id === e.frameId && (s(this, de).navigatedWithinDocument(e.url, e.navigationType), e.navigationType === "historyApi")) {
      s(this, _e).registerEvent({
        type: "event",
        method: "browsingContext.historyUpdated",
        params: {
          context: this.id,
          timestamp: (0, tn.getTimestamp)(),
          url: s(this, de).url
        }
      }, this.id);
      return;
    }
  }), s(this, W).cdpClient.on("Page.lifecycleEvent", (e) => {
    if (this.id === e.frameId) {
      if (e.name === "init") {
        g(this, G, Ec).call(this, e.loaderId);
        return;
      }
      if (e.name === "commit") {
        m(this, Ze, e.loaderId);
        return;
      }
      if (s(this, Ze) || m(this, Ze, e.loaderId), e.loaderId === s(this, Ze))
        switch (e.name) {
          case "DOMContentLoaded":
            s(this, de).isInitialNavigation || s(this, _e).registerEvent({
              type: "event",
              method: K.ChromiumBidi.BrowsingContext.EventNames.DomContentLoaded,
              params: {
                context: this.id,
                navigation: s(this, de).currentNavigationId,
                timestamp: (0, tn.getTimestamp)(),
                url: s(this, de).url
              }
            }, this.id), s(this, Re).DOMContentLoaded.resolve();
            break;
          case "load":
            s(this, de).isInitialNavigation || s(this, _e).registerEvent({
              type: "event",
              method: K.ChromiumBidi.BrowsingContext.EventNames.Load,
              params: {
                context: this.id,
                navigation: s(this, de).currentNavigationId,
                timestamp: (0, tn.getTimestamp)(),
                url: s(this, de).url
              }
            }, this.id), s(this, de).loadPageEvent(e.loaderId), s(this, Re).load.resolve();
            break;
        }
    }
  }), s(this, W).cdpClient.on("Runtime.executionContextCreated", (e) => {
    var p;
    const { auxData: t, name: r, uniqueId: n, id: o } = e.context;
    if (!t || t.frameId !== this.id)
      return;
    let a, c;
    switch (t.type) {
      case "isolated":
        c = r, s(this, Me).isFinished || (p = s(this, et)) == null || p.call(this, zi.LogType.debugError, "Unexpectedly, isolated realm created before the default one"), a = s(this, Me).isFinished ? s(this, Me).result.origin : (
          // This fallback is not expected to be ever reached.
          ""
        );
        break;
      case "default":
        a = yf(e.context.origin);
        break;
      default:
        return;
    }
    const f = new Sv.WindowRealm(this.id, s(this, it), s(this, W).cdpClient, s(this, _e), o, s(this, et), a, n, s(this, ot), c);
    t.isDefault && (s(this, Me).resolve(f), Promise.all(s(this, W).getChannels().map((d) => d.startListenerFromWindow(f, s(this, _e)))));
  }), s(this, W).cdpClient.on("Runtime.executionContextDestroyed", (e) => {
    s(this, Me).isFinished && s(this, Me).result.executionContextId === e.executionContextId && m(this, Me, new Ks.Deferred()), s(this, ot).deleteRealms({
      cdpSessionId: s(this, W).cdpSessionId,
      executionContextId: e.executionContextId
    });
  }), s(this, W).cdpClient.on("Runtime.executionContextsCleared", () => {
    s(this, Me).isFinished || s(this, Me).reject(new K.UnknownErrorException("execution contexts cleared")), m(this, Me, new Ks.Deferred()), s(this, ot).deleteRealms({
      cdpSessionId: s(this, W).cdpSessionId
    });
  }), s(this, W).cdpClient.on("Page.javascriptDialogClosed", (e) => {
    var r, n;
    if (e.frameId && this.id !== e.frameId || !e.frameId && s(this, ze) && s(this, W).cdpClient !== ((r = s(this, it).getContext(s(this, ze))) == null ? void 0 : r.cdpTarget.cdpClient))
      return;
    const t = e.result;
    s(this, yr) === void 0 && ((n = s(this, et)) == null || n.call(this, zi.LogType.debugError, "Unexpectedly no opening prompt event before closing one")), s(this, _e).registerEvent({
      type: "event",
      method: K.ChromiumBidi.BrowsingContext.EventNames.UserPromptClosed,
      params: {
        context: this.id,
        accepted: t,
        // `lastUserPromptType` should never be undefined here, so fallback to
        // `UNKNOWN`. The fallback is required to prevent tests from hanging while
        // waiting for the closing event. The cast is required, as the `UNKNOWN` value
        // is not standard.
        type: s(this, yr) ?? "UNKNOWN",
        userText: t && e.userInput ? e.userInput : void 0
      }
    }, this.id), m(this, yr, void 0);
  }), s(this, W).cdpClient.on("Page.javascriptDialogOpening", (e) => {
    var n, o;
    if (e.frameId && this.id !== e.frameId || !e.frameId && s(this, ze) && s(this, W).cdpClient !== ((n = s(this, it).getContext(s(this, ze))) == null ? void 0 : n.cdpTarget.cdpClient))
      return;
    const t = g(o = ln, tu, hf).call(o, e.type);
    m(this, yr, t);
    const r = g(this, G, pf).call(this, t);
    switch (s(this, _e).registerEvent({
      type: "event",
      method: K.ChromiumBidi.BrowsingContext.EventNames.UserPromptOpened,
      params: {
        context: this.id,
        handler: r,
        type: t,
        message: e.message,
        ...e.type === "prompt" ? { defaultValue: e.defaultPrompt } : {}
      }
    }, this.id), r) {
      case "accept":
        this.handleUserPrompt(!0);
        break;
      case "dismiss":
        this.handleUserPrompt(!1);
        break;
    }
  }), s(this, W).browserCdpClient.on("Browser.downloadWillBegin", (e) => {
    this.id === e.frameId && (s(this, qn).set(e.guid, e.url), s(this, _e).registerEvent({
      type: "event",
      method: K.ChromiumBidi.BrowsingContext.EventNames.DownloadWillBegin,
      params: {
        context: this.id,
        suggestedFilename: e.suggestedFilename,
        navigation: e.guid,
        timestamp: (0, tn.getTimestamp)(),
        url: e.url
      }
    }, this.id));
  }), s(this, W).browserCdpClient.on("Browser.downloadProgress", (e) => {
    if (!s(this, qn).has(e.guid) || e.state === "inProgress")
      return;
    const t = s(this, qn).get(e.guid);
    switch (e.state) {
      case "canceled":
        s(this, _e).registerEvent({
          type: "event",
          method: K.ChromiumBidi.BrowsingContext.EventNames.DownloadEnd,
          params: {
            status: "canceled",
            context: this.id,
            navigation: e.guid,
            timestamp: (0, tn.getTimestamp)(),
            url: t
          }
        }, this.id);
        break;
      case "completed":
        s(this, _e).registerEvent({
          type: "event",
          method: K.ChromiumBidi.BrowsingContext.EventNames.DownloadEnd,
          params: {
            filepath: e.filePath ?? null,
            status: "complete",
            context: this.id,
            navigation: e.guid,
            timestamp: (0, tn.getTimestamp)(),
            url: t
          }
        }, this.id);
        break;
      default:
        throw new K.UnknownErrorException(`Unknown download state: ${e.state}`);
    }
  });
}, tu = new WeakSet(), hf = function(e) {
  switch (e) {
    case "alert":
      return "alert";
    case "beforeunload":
      return "beforeunload";
    case "confirm":
      return "confirm";
    case "prompt":
      return "prompt";
  }
}, /**
 * Returns either custom UserContext's prompt handler, global or default one.
 */
pf = function(e) {
  var n, o, a, c, f, p, d, h;
  const t = "dismiss", r = s(this, Yo).getActiveConfig(this.top.id, this.userContext);
  switch (e) {
    case "alert":
      return ((n = r.userPromptHandler) == null ? void 0 : n.alert) ?? ((o = r.userPromptHandler) == null ? void 0 : o.default) ?? t;
    case "beforeunload":
      return ((a = r.userPromptHandler) == null ? void 0 : a.beforeUnload) ?? ((c = r.userPromptHandler) == null ? void 0 : c.default) ?? "accept";
    case "confirm":
      return ((f = r.userPromptHandler) == null ? void 0 : f.confirm) ?? ((p = r.userPromptHandler) == null ? void 0 : p.default) ?? t;
    case "prompt":
      return ((d = r.userPromptHandler) == null ? void 0 : d.prompt) ?? ((h = r.userPromptHandler) == null ? void 0 : h.default) ?? t;
  }
}, Ec = function(e) {
  e === void 0 || s(this, Ze) === e || (g(this, G, rl).call(this), m(this, Ze, e), g(this, G, xc).call(this, !0));
}, rl = function() {
  var e, t;
  s(this, Re).DOMContentLoaded.isFinished ? s(this, Re).DOMContentLoaded = new Ks.Deferred() : (e = s(this, et)) == null || e.call(this, ln.LOGGER_PREFIX, "Document changed (DOMContentLoaded)"), s(this, Re).load.isFinished ? s(this, Re).load = new Ks.Deferred() : (t = s(this, et)) == null || t.call(this, ln.LOGGER_PREFIX, "Document changed (load)");
}, ff = function() {
  s(this, Re).DOMContentLoaded.isFinished || s(this, Re).DOMContentLoaded.reject(new K.UnknownErrorException("navigation canceled")), s(this, Re).load.isFinished || s(this, Re).load.reject(new K.UnknownErrorException("navigation canceled"));
}, nl = async function(e, t, r) {
  if (await Promise.all([r.committed, t]), e !== "none") {
    if (r.isFragmentNavigation === !0) {
      await r.finished;
      return;
    }
    if (e === "interactive") {
      await s(this, Re).DOMContentLoaded;
      return;
    }
    if (e === "complete") {
      await s(this, Re).load;
      return;
    }
    throw new K.InvalidArgumentException(`Wait condition ${e} is not supported`);
  }
}, mf = async function(e) {
  switch (e.type) {
    case "box":
      return { x: e.x, y: e.y, width: e.width, height: e.height };
    case "element": {
      const t = await this.getOrCreateHiddenSandbox(), r = await t.callFunction(String((n) => n instanceof Element), !1, { type: "undefined" }, [e.element]);
      if (r.type === "exception")
        throw new K.NoSuchElementException(`Element '${e.element.sharedId}' was not found`);
      if ((0, Hi.assert)(r.result.type === "boolean"), !r.result.value)
        throw new K.NoSuchElementException(`Node '${e.element.sharedId}' is not an Element`);
      {
        const n = await t.callFunction(String((a) => {
          const c = a.getBoundingClientRect();
          return {
            x: c.x,
            y: c.y,
            height: c.height,
            width: c.width
          };
        }), !1, { type: "undefined" }, [e.element]);
        (0, Hi.assert)(n.type === "success");
        const o = jh(n.result);
        if (!o)
          throw new K.UnableToCaptureScreenException(`Could not get bounding box for Element '${e.element.sharedId}'`);
        return o;
      }
    }
  }
}, gf = async function(e, t, r, n) {
  switch (t.type) {
    case "context":
      throw new Error("Unreachable");
    case "css":
      return {
        functionDeclaration: String((o, a, ...c) => {
          const f = (d) => {
            if (!(d instanceof HTMLElement || d instanceof Document || d instanceof DocumentFragment || d instanceof SVGElement))
              throw new Error("startNodes in css selector should be HTMLElement, SVGElement or Document or DocumentFragment");
            return [...d.querySelectorAll(o)];
          };
          c = c.length > 0 ? c : [document];
          const p = c.map((d) => (
            // TODO: stop search early if `maxNodeCount` is reached.
            f(d)
          )).flat(1);
          return a === 0 ? p : p.slice(0, a);
        }),
        argumentsLocalValues: [
          // `cssSelector`
          { type: "string", value: t.value },
          // `maxNodeCount` with `0` means no limit.
          { type: "number", value: r ?? 0 },
          // `startNodes`
          ...n
        ]
      };
    case "xpath":
      return {
        functionDeclaration: String((o, a, ...c) => {
          const p = new XPathEvaluator().createExpression(o), d = (w) => {
            const x = p.evaluate(w, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE), S = [];
            for (let P = 0; P < x.snapshotLength; P++)
              S.push(x.snapshotItem(P));
            return S;
          };
          c = c.length > 0 ? c : [document];
          const h = c.map((w) => (
            // TODO: stop search early if `maxNodeCount` is reached.
            d(w)
          )).flat(1);
          return a === 0 ? h : h.slice(0, a);
        }),
        argumentsLocalValues: [
          // `xPathSelector`
          { type: "string", value: t.value },
          // `maxNodeCount` with `0` means no limit.
          { type: "number", value: r ?? 0 },
          // `startNodes`
          ...n
        ]
      };
    case "innerText":
      if (t.value === "")
        throw new K.InvalidSelectorException("innerText locator cannot be empty");
      return {
        functionDeclaration: String((o, a, c, f, p, ...d) => {
          const h = c ? o.toUpperCase() : o, w = (S, P) => {
            var E;
            const C = [];
            if (S instanceof DocumentFragment || S instanceof Document)
              return [...S.children].forEach((R) => (
                // `currentMaxDepth` is not decremented intentionally according to
                // https://github.com/w3c/webdriver-bidi/pull/713.
                C.push(...w(R, P))
              )), C;
            if (!(S instanceof HTMLElement))
              return [];
            const b = S, D = c ? (E = b.innerText) == null ? void 0 : E.toUpperCase() : b.innerText;
            if (!D.includes(h))
              return [];
            const v = [];
            for (const A of b.children)
              A instanceof HTMLElement && v.push(A);
            if (v.length === 0)
              a && D === h ? C.push(b) : a || C.push(b);
            else {
              const A = (
                // Don't search deeper if `maxDepth` is reached.
                P <= 0 ? [] : v.map((R) => w(R, P - 1)).flat(1)
              );
              A.length === 0 ? (!a || D === h) && C.push(b) : C.push(...A);
            }
            return C;
          };
          d = d.length > 0 ? d : [document];
          const x = d.map((S) => (
            // TODO: stop search early if `maxNodeCount` is reached.
            w(S, p)
          )).flat(1);
          return f === 0 ? x : x.slice(0, f);
        }),
        argumentsLocalValues: [
          // `innerTextSelector`
          { type: "string", value: t.value },
          // `fullMatch` with default `true`.
          { type: "boolean", value: t.matchType !== "partial" },
          // `ignoreCase` with default `false`.
          { type: "boolean", value: t.ignoreCase === !0 },
          // `maxNodeCount` with `0` means no limit.
          { type: "number", value: r ?? 0 },
          // `maxDepth` with default `1000` (same as default full serialization depth).
          { type: "number", value: t.maxDepth ?? 1e3 },
          // `startNodes`
          ...n
        ]
      };
    case "accessibility": {
      if (!t.value.name && !t.value.role)
        throw new K.InvalidSelectorException("Either name or role has to be specified");
      await Promise.all([
        s(this, W).cdpClient.sendCommand("Accessibility.enable"),
        s(this, W).cdpClient.sendCommand("Accessibility.getRootAXNode")
      ]);
      const o = await e.evaluate(
        /* expression=*/
        "({getAccessibleName, getAccessibleRole})",
        /* awaitPromise=*/
        !1,
        "root",
        /* serializationOptions= */
        void 0,
        /* userActivation=*/
        !1,
        /* includeCommandLineApi=*/
        !0
      );
      if (o.type !== "success")
        throw new Error("Could not get bindings");
      if (o.result.type !== "object")
        throw new Error("Could not get bindings");
      return {
        functionDeclaration: String((a, c, f, p, ...d) => {
          const h = [];
          let w = !1;
          function x(S, P) {
            if (!w)
              for (const C of S) {
                let b = !0;
                if (P.role) {
                  const v = f.getAccessibleRole(C);
                  P.role !== v && (b = !1);
                }
                if (P.name) {
                  const v = f.getAccessibleName(C);
                  P.name !== v && (b = !1);
                }
                if (b) {
                  if (p !== 0 && h.length === p) {
                    w = !0;
                    break;
                  }
                  h.push(C);
                }
                const D = [];
                for (const v of C.children)
                  v instanceof HTMLElement && D.push(v);
                x(D, P);
              }
          }
          return d = d.length > 0 ? d : Array.from(document.documentElement.children).filter((S) => S instanceof HTMLElement), x(d, {
            role: c,
            name: a
          }), h;
        }),
        argumentsLocalValues: [
          // `name`
          { type: "string", value: t.value.name || "" },
          // `role`
          { type: "string", value: t.value.role || "" },
          // `bindings`.
          { handle: o.result.handle },
          // `maxNodeCount` with `0` means no limit.
          { type: "number", value: r ?? 0 },
          // `startNodes`
          ...n
        ]
      };
    }
  }
}, wf = async function(e, t, r, n, o) {
  var p, d, h;
  if (t.type === "context") {
    if (r.length !== 0)
      throw new K.InvalidArgumentException("Start nodes are not supported");
    const w = t.value.context;
    if (!w)
      throw new K.InvalidSelectorException("Invalid context");
    const S = s(this, it).getContext(w).parent;
    if (!S)
      throw new K.InvalidArgumentException("This context has no container");
    try {
      const { backendNodeId: P } = await s(S, W).cdpClient.sendCommand("DOM.getFrameOwner", {
        frameId: w
      }), { object: C } = await s(S, W).cdpClient.sendCommand("DOM.resolveNode", {
        backendNodeId: P
      }), b = await e.callFunction("function () { return this; }", !1, { handle: C.objectId }, [], "none", o);
      if (b.type === "exception")
        throw new Error("Unknown exception");
      return { nodes: [b.result] };
    } catch {
      throw new K.InvalidArgumentException("Context does not exist");
    }
  }
  const a = await g(this, G, gf).call(this, e, t, n, r);
  o = {
    ...o,
    // The returned object is an array of nodes, so no need in deeper JS serialization.
    maxObjectDepth: 1
  };
  const c = await e.callFunction(a.functionDeclaration, !1, { type: "undefined" }, a.argumentsLocalValues, "none", o);
  if (c.type !== "success")
    throw (p = s(this, et)) == null || p.call(this, ln.LOGGER_PREFIX, "Failed locateNodesByLocator", c), // CSS selector.
    (d = c.exceptionDetails.text) != null && d.endsWith("is not a valid selector.") || // XPath selector.
    (h = c.exceptionDetails.text) != null && h.endsWith("is not a valid XPath expression.") ? new K.InvalidSelectorException(`Not valid selector ${typeof t.value == "string" ? t.value : JSON.stringify(t.value)}`) : c.exceptionDetails.text === "Error: startNodes in css selector should be HTMLElement, SVGElement or Document or DocumentFragment" ? new K.InvalidArgumentException("startNodes in css selector should be HTMLElement, SVGElement or Document or DocumentFragment") : new K.UnknownErrorException(`Unexpected error in selector script: ${c.exceptionDetails.text}`);
  if (c.result.type !== "array")
    throw new K.UnknownErrorException(`Unexpected selector script result type: ${c.result.type}`);
  return { nodes: c.result.value.map((w) => {
    if (w.type !== "node")
      throw new K.UnknownErrorException(`Unexpected selector script result element: ${w.type}`);
    return w;
  }) };
}, ps = function() {
  const e = /* @__PURE__ */ new Set();
  return e.add(this.cdpTarget), this.allChildren.forEach((t) => e.add(t.cdpTarget)), Array.from(e);
}, u($c, tu), N($c, "LOGGER_PREFIX", `${zi.LogType.debug}:browsingContext`);
Bi.BrowsingContextImpl = $c;
ln = $c;
function yf(i) {
  return ["://", ""].includes(i) && (i = "null"), i;
}
function Pv(i) {
  const { quality: e, type: t } = i.format ?? {
    type: "image/png"
  };
  switch (t) {
    case "image/png":
      return { format: "png" };
    case "image/jpeg":
      return {
        format: "jpeg",
        ...e === void 0 ? {} : { quality: Math.round(e * 100) }
      };
    case "image/webp":
      return {
        format: "webp",
        ...e === void 0 ? {} : { quality: Math.round(e * 100) }
      };
  }
  throw new K.InvalidArgumentException(`Image format '${t}' is not a supported format`);
}
function jh(i) {
  var o, a, c, f;
  if (i.type !== "object" || i.value === void 0)
    return;
  const e = (o = i.value.find(([p]) => p === "x")) == null ? void 0 : o[1], t = (a = i.value.find(([p]) => p === "y")) == null ? void 0 : a[1], r = (c = i.value.find(([p]) => p === "height")) == null ? void 0 : c[1], n = (f = i.value.find(([p]) => p === "width")) == null ? void 0 : f[1];
  if (!((e == null ? void 0 : e.type) !== "number" || (t == null ? void 0 : t.type) !== "number" || (r == null ? void 0 : r.type) !== "number" || (n == null ? void 0 : n.type) !== "number"))
    return {
      x: e.value,
      y: t.value,
      width: n.value,
      height: r.value
    };
}
function Uh(i) {
  return {
    ...i.width < 0 ? {
      x: i.x + i.width,
      width: -i.width
    } : {
      x: i.x,
      width: i.width
    },
    ...i.height < 0 ? {
      y: i.y + i.height,
      height: -i.height
    } : {
      y: i.y,
      height: i.height
    }
  };
}
function Iv(i, e) {
  i = Uh(i), e = Uh(e);
  const t = Math.max(i.x, e.x), r = Math.max(i.y, e.y);
  return {
    x: t,
    y: r,
    width: Math.max(Math.min(i.x + i.width, e.x + e.width) - t, 0),
    height: Math.max(Math.min(i.y + i.height, e.y + e.height) - r, 0)
  };
}
function vd(i) {
  if (i = i.trim(), !/^[0-9]+$/.test(i))
    throw new K.InvalidArgumentException(`Invalid integer: ${i}`);
  return parseInt(i);
}
var Xu = {};
Object.defineProperty(Xu, "__esModule", { value: !0 });
Xu.WorkerRealm = void 0;
const _v = ec;
var Qo, Hn;
class kv extends _v.Realm {
  constructor(t, r, n, o, a, c, f, p, d) {
    super(t, r, n, o, a, f, p);
    u(this, Qo);
    u(this, Hn);
    m(this, Hn, c), m(this, Qo, d), this.initialize();
  }
  get associatedBrowsingContexts() {
    return s(this, Hn).flatMap((t) => t.associatedBrowsingContexts);
  }
  get realmType() {
    return s(this, Qo);
  }
  get source() {
    var t;
    return {
      realm: this.realmId,
      // This is a hack to make Puppeteer able to track workers.
      // TODO: remove after Puppeteer tracks workers by owners and use the base version.
      context: (t = this.associatedBrowsingContexts[0]) == null ? void 0 : t.id
    };
  }
  get realmInfo() {
    const t = s(this, Hn).map((n) => n.realmId), { realmType: r } = this;
    switch (r) {
      case "dedicated-worker": {
        const n = t[0];
        if (n === void 0 || t.length !== 1)
          throw new Error("Dedicated worker must have exactly one owner");
        return {
          ...this.baseInfo,
          type: r,
          owners: [n]
        };
      }
      case "service-worker":
      case "shared-worker":
        return {
          ...this.baseInfo,
          type: r
        };
    }
  }
}
Qo = new WeakMap(), Hn = new WeakMap();
Xu.WorkerRealm = kv;
var Ju = {}, Yu = {}, Qu = {};
Object.defineProperty(Qu, "__esModule", { value: !0 });
Qu.logMessageFormatter = Cf;
Qu.getRemoteValuesText = ol;
const Tv = os, vf = ["%s", "%d", "%i", "%f", "%o", "%O", "%c"];
function bf(i) {
  return vf.some((e) => i.includes(e));
}
function Cf(i) {
  let e = "";
  const t = i[0].value.toString(), r = i.slice(1, void 0), n = t.split(new RegExp(vf.map((o) => `(${o})`).join("|"), "g"));
  for (const o of n)
    if (!(o === void 0 || o === ""))
      if (bf(o)) {
        const a = r.shift();
        (0, Tv.assert)(a, `Less value is provided: "${ol(i, !1)}"`), o === "%s" ? e += Zl(a) : o === "%d" || o === "%i" ? a.type === "bigint" || a.type === "number" || a.type === "string" ? e += parseInt(a.value.toString(), 10) : e += "NaN" : o === "%f" ? a.type === "bigint" || a.type === "number" || a.type === "string" ? e += parseFloat(a.value.toString()) : e += "NaN" : e += il(a);
      } else
        e += o;
  if (r.length > 0)
    throw new Error(`More value is provided: "${ol(i, !1)}"`);
  return e;
}
function il(i) {
  var e;
  if (i.type !== "array" && i.type !== "bigint" && i.type !== "date" && i.type !== "number" && i.type !== "object" && i.type !== "string")
    return Zl(i);
  if (i.type === "bigint")
    return `${i.value.toString()}n`;
  if (i.type === "number")
    return i.value.toString();
  if (["date", "string"].includes(i.type))
    return JSON.stringify(i.value);
  if (i.type === "object")
    return `{${i.value.map((t) => `${JSON.stringify(t[0])}:${il(t[1])}`).join(",")}}`;
  if (i.type === "array")
    return `[${((e = i.value) == null ? void 0 : e.map((t) => il(t)).join(",")) ?? ""}]`;
  throw Error(`Invalid value type: ${i}`);
}
function Zl(i) {
  var e, t, r, n;
  if (!Object.hasOwn(i, "value"))
    return i.type;
  switch (i.type) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
      return String(i.value);
    case "regexp":
      return `/${i.value.pattern}/${i.value.flags ?? ""}`;
    case "date":
      return new Date(i.value).toString();
    case "object":
      return `Object(${((e = i.value) == null ? void 0 : e.length) ?? ""})`;
    case "array":
      return `Array(${((t = i.value) == null ? void 0 : t.length) ?? ""})`;
    case "map":
      return `Map(${(r = i.value) == null ? void 0 : r.length})`;
    case "set":
      return `Set(${(n = i.value) == null ? void 0 : n.length})`;
    default:
      return i.type;
  }
}
function ol(i, e) {
  const t = i[0];
  return t ? t.type === "string" && bf(t.value.toString()) && e ? Cf(i) : i.map((r) => Zl(r)).join(" ") : "";
}
var al;
Object.defineProperty(Yu, "__esModule", { value: !0 });
Yu.LogManager = void 0;
const hc = ee, $h = Te, Dv = Qu;
function Lh(i) {
  const e = i == null ? void 0 : i.callFrames.map((t) => ({
    columnNumber: t.columnNumber,
    functionName: t.functionName,
    lineNumber: t.lineNumber,
    url: t.url
  }));
  return e ? { callFrames: e } : void 0;
}
function Nv(i) {
  return ["error", "assert"].includes(i) ? "error" : ["debug", "trace"].includes(i) ? "debug" : ["warn", "warning"].includes(i) ? "warn" : "info";
}
function Ov(i) {
  switch (i) {
    case "warning":
      return "warn";
    case "startGroup":
      return "group";
    case "startGroupCollapsed":
      return "groupCollapsed";
    case "endGroup":
      return "groupEnd";
  }
  return i;
}
var zn, Kn, _s, Wn, Oi, xf, Ef, su, Sf;
class eh {
  constructor(e, t, r, n) {
    u(this, Oi);
    u(this, zn);
    u(this, Kn);
    u(this, _s);
    u(this, Wn);
    m(this, _s, e), m(this, Kn, t), m(this, zn, r), m(this, Wn, n);
  }
  static create(e, t, r, n) {
    var a;
    const o = new al(e, t, r, n);
    return g(a = o, Oi, Ef).call(a), o;
  }
}
zn = new WeakMap(), Kn = new WeakMap(), _s = new WeakMap(), Wn = new WeakMap(), Oi = new WeakSet(), xf = async function(e, t) {
  switch (e.type) {
    case "undefined":
      return { type: "undefined" };
    case "boolean":
      return { type: "boolean", value: e.value };
    case "string":
      return { type: "string", value: e.value };
    case "number":
      return { type: "number", value: e.unserializableValue ?? e.value };
    case "bigint":
      if (e.unserializableValue !== void 0 && e.unserializableValue[e.unserializableValue.length - 1] === "n")
        return {
          type: e.type,
          value: e.unserializableValue.slice(0, -1)
        };
      break;
    case "object":
      if (e.subtype === "null")
        return { type: "null" };
      break;
  }
  return await t.serializeCdpObject(
    e,
    "none"
    /* Script.ResultOwnership.None */
  );
}, Ef = function() {
  s(this, _s).cdpClient.on("Runtime.consoleAPICalled", (e) => {
    var n;
    const t = s(this, Kn).findRealm({
      cdpSessionId: s(this, _s).cdpSessionId,
      executionContextId: e.executionContextId
    });
    if (t === void 0) {
      (n = s(this, Wn)) == null || n.call(this, $h.LogType.cdp, e);
      return;
    }
    const r = Promise.all(e.args.map((o) => g(this, Oi, xf).call(this, o, t)));
    for (const o of t.associatedBrowsingContexts)
      s(this, zn).registerPromiseEvent(r.then((a) => ({
        kind: "success",
        value: {
          type: "event",
          method: hc.ChromiumBidi.Log.EventNames.LogEntryAdded,
          params: {
            level: Nv(e.type),
            source: t.source,
            text: (0, Dv.getRemoteValuesText)(a, !0),
            timestamp: Math.round(e.timestamp),
            stackTrace: Lh(e.stackTrace),
            type: "console",
            method: Ov(e.type),
            args: a
          }
        }
      }), (a) => ({
        kind: "error",
        error: a
      })), o.id, hc.ChromiumBidi.Log.EventNames.LogEntryAdded);
  }), s(this, _s).cdpClient.on("Runtime.exceptionThrown", (e) => {
    var r, n;
    const t = s(this, Kn).findRealm({
      cdpSessionId: s(this, _s).cdpSessionId,
      executionContextId: e.exceptionDetails.executionContextId
    });
    if (t === void 0) {
      (r = s(this, Wn)) == null || r.call(this, $h.LogType.cdp, e);
      return;
    }
    for (const o of t.associatedBrowsingContexts)
      s(this, zn).registerPromiseEvent(g(n = al, su, Sf).call(n, e, t).then((a) => ({
        kind: "success",
        value: {
          type: "event",
          method: hc.ChromiumBidi.Log.EventNames.LogEntryAdded,
          params: {
            level: "error",
            source: t.source,
            text: a,
            timestamp: Math.round(e.timestamp),
            stackTrace: Lh(e.exceptionDetails.stackTrace),
            type: "javascript"
          }
        }
      }), (a) => ({
        kind: "error",
        error: a
      })), o.id, hc.ChromiumBidi.Log.EventNames.LogEntryAdded);
  });
}, su = new WeakSet(), Sf = async function(e, t) {
  return e.exceptionDetails.exception ? t === void 0 ? JSON.stringify(e.exceptionDetails.exception) : await t.stringifyObject(e.exceptionDetails.exception) : e.exceptionDetails.text;
}, u(eh, su);
Yu.LogManager = eh;
al = eh;
var th = {}, Zu = {};
Object.defineProperty(Zu, "__esModule", { value: !0 });
Zu.CollectorsStorage = void 0;
const Ki = F, bd = Te, Rv = Ft;
var Jt, Gn, Vn, Xn, vr, Us, Sc, Pf;
class Av {
  constructor(e, t) {
    u(this, Us);
    u(this, Jt, /* @__PURE__ */ new Map());
    u(this, Gn, /* @__PURE__ */ new Map());
    u(this, Vn, /* @__PURE__ */ new Map());
    u(this, Xn);
    u(this, vr);
    m(this, Xn, e), m(this, vr, t);
  }
  addDataCollector(e) {
    if (e.maxEncodedDataSize < 1 || e.maxEncodedDataSize > s(this, Xn))
      throw new Ki.InvalidArgumentException(`Max encoded data size should be between 1 and ${s(this, Xn)}`);
    const t = (0, Rv.uuidv4)();
    return s(this, Jt).set(t, e), t;
  }
  isCollected(e, t, r) {
    if (r !== void 0 && !s(this, Jt).has(r))
      throw new Ki.NoSuchNetworkCollectorException(`Unknown collector ${r}`);
    if (t === void 0)
      return this.isCollected(e, "response", r) || this.isCollected(e, "request", r);
    const n = g(this, Us, Sc).call(this, t).get(e);
    return n === void 0 || n.size === 0 ? !1 : r === void 0 ? !0 : !!n.has(r);
  }
  disownData(e, t, r) {
    var o, a;
    const n = g(this, Us, Sc).call(this, t);
    r !== void 0 && ((o = n.get(e)) == null || o.delete(r)), (r === void 0 || ((a = n.get(e)) == null ? void 0 : a.size) === 0) && n.delete(e);
  }
  collectIfNeeded(e, t, r, n) {
    const o = [...s(this, Jt).keys()].filter((a) => g(this, Us, Pf).call(this, a, e, t, r, n));
    o.length > 0 && g(this, Us, Sc).call(this, t).set(e.id, new Set(o));
  }
  removeDataCollector(e) {
    if (!s(this, Jt).has(e))
      throw new Ki.NoSuchNetworkCollectorException(`Collector ${e} does not exist`);
    s(this, Jt).delete(e);
    const t = [];
    for (const [r, n] of s(this, Gn))
      n.has(e) && (n.delete(e), n.size === 0 && (s(this, Gn).delete(r), t.push(r)));
    for (const [r, n] of s(this, Vn))
      n.has(e) && (n.delete(e), n.size === 0 && (s(this, Vn).delete(r), t.push(r)));
    return t;
  }
}
Jt = new WeakMap(), Gn = new WeakMap(), Vn = new WeakMap(), Xn = new WeakMap(), vr = new WeakMap(), Us = new WeakSet(), Sc = function(e) {
  switch (e) {
    case "response":
      return s(this, Gn);
    case "request":
      return s(this, Vn);
    default:
      throw new Ki.UnsupportedOperationException(`Unsupported data type ${e}`);
  }
}, Pf = function(e, t, r, n, o) {
  var c, f, p;
  const a = s(this, Jt).get(e);
  if (a === void 0)
    throw new Ki.NoSuchNetworkCollectorException(`Unknown collector ${e}`);
  return a.userContexts && !a.userContexts.includes(o) || a.contexts && !a.contexts.includes(n) || !a.dataTypes.includes(r) ? !1 : r === "request" && t.bodySize > a.maxEncodedDataSize ? ((c = s(this, vr)) == null || c.call(this, bd.LogType.debug, `Request's ${t.id} body size is too big for the collector ${e}`), !1) : r === "response" && t.bytesReceived > a.maxEncodedDataSize ? ((f = s(this, vr)) == null || f.call(this, bd.LogType.debug, `Request's ${t.id} response is too big for the collector ${e}`), !1) : ((p = s(this, vr)) == null || p.call(this, bd.LogType.debug, `Collector ${e} collected ${r} of ${t.id}`), !0);
};
Zu.CollectorsStorage = Av;
var ed = {}, tc = {};
Object.defineProperty(tc, "__esModule", { value: !0 });
tc.DefaultMap = void 0;
var Zo;
class Mv extends Map {
  constructor(t, r) {
    super(r);
    /** The default value to return whenever a key is not present in the map. */
    u(this, Zo);
    m(this, Zo, t);
  }
  get(t) {
    return this.has(t) || this.set(t, s(this, Zo).call(this, t)), super.get(t);
  }
}
Zo = new WeakMap();
tc.DefaultMap = Mv;
var Pc;
Object.defineProperty(ed, "__esModule", { value: !0 });
ed.NetworkRequest = void 0;
const qe = ee, rn = os, Bv = tc, qh = Vr, Cd = Te, ie = ye, Fv = new RegExp('(?<=realm=").*(?=")');
var Jn, be, Ke, ks, Yn, j, Et, Qn, U, Zn, St, Pt, br, Cr, O, cl, ul, If, _f, kf, dl, Zi, hn, ll, Tf, Df, Nf, hl, pn, Ut, Ic, pl, fn, mn, gn, _c, Of, Rf, Af, Mf, Bf, Ff, jf, kc, ru, Uf;
class Lc {
  constructor(e, t, r, n, o = 0, a) {
    u(this, O);
    /**
     * Each network request has an associated request id, which is a string
     * uniquely identifying that request.
     *
     * The identifier for a request resulting from a redirect matches that of the
     * request that initiated it.
     */
    u(this, Jn);
    u(this, be);
    /**
     * Indicates the network intercept phase, if the request is currently blocked.
     * Undefined necessarily implies that the request is not blocked.
     */
    u(this, Ke);
    u(this, ks, !1);
    u(this, Yn);
    u(this, j, {});
    u(this, Et);
    u(this, Qn);
    u(this, U, {});
    u(this, Zn);
    u(this, St);
    u(this, Pt);
    u(this, br);
    u(this, Cr, {
      [qe.ChromiumBidi.Network.EventNames.AuthRequired]: !1,
      [qe.ChromiumBidi.Network.EventNames.BeforeRequestSent]: !1,
      [qe.ChromiumBidi.Network.EventNames.FetchError]: !1,
      [qe.ChromiumBidi.Network.EventNames.ResponseCompleted]: !1,
      [qe.ChromiumBidi.Network.EventNames.ResponseStarted]: !1
    });
    N(this, "waitNextPhase", new qh.Deferred());
    m(this, Jn, e), m(this, Zn, t), m(this, St, r), m(this, Pt, n), m(this, Yn, o), m(this, br, a);
  }
  get id() {
    return s(this, Jn);
  }
  get fetchId() {
    return s(this, be);
  }
  /**
   * When blocked returns the phase for it
   */
  get interceptPhase() {
    return s(this, Ke);
  }
  get url() {
    var r, n, o, a, c, f, p, d;
    const e = ((r = s(this, j).info) == null ? void 0 : r.request.urlFragment) ?? ((n = s(this, j).paused) == null ? void 0 : n.request.urlFragment) ?? "";
    return `${((o = s(this, U).paused) == null ? void 0 : o.request.url) ?? ((a = s(this, Et)) == null ? void 0 : a.url) ?? ((c = s(this, U).info) == null ? void 0 : c.url) ?? ((f = s(this, j).auth) == null ? void 0 : f.request.url) ?? ((p = s(this, j).info) == null ? void 0 : p.request.url) ?? ((d = s(this, j).paused) == null ? void 0 : d.request.url) ?? Pc.unknownParameter}${e}`;
  }
  get redirectCount() {
    return s(this, Yn);
  }
  get cdpTarget() {
    return s(this, Pt);
  }
  /** CdpTarget can be changed when frame is moving out of process. */
  updateCdpTarget(e) {
    var t;
    e !== s(this, Pt) && ((t = s(this, br)) == null || t.call(this, Cd.LogType.debugInfo, `Request ${this.id} was moved from ${s(this, Pt).id} to ${e.id}`), m(this, Pt, e));
  }
  get cdpClient() {
    return s(this, Pt).cdpClient;
  }
  isRedirecting() {
    return !!s(this, j).info;
  }
  get bodySize() {
    var e, t, r, n, o;
    return typeof ((e = s(this, Et)) == null ? void 0 : e.bodySize) == "number" ? s(this, Et).bodySize : ((t = s(this, j).info) == null ? void 0 : t.request.postDataEntries) !== void 0 ? (0, ie.bidiBodySizeFromCdpPostDataEntries)((r = s(this, j).info) == null ? void 0 : r.request.postDataEntries) : g(this, O, dl).call(this, (n = s(this, j).info) == null ? void 0 : n.request.headers) ?? g(this, O, dl).call(this, (o = s(this, j).extraInfo) == null ? void 0 : o.headers) ?? 0;
  }
  handleRedirect(e) {
    s(this, U).hasExtraInfo = !1, s(this, U).info = e.redirectResponse, g(this, O, Ut).call(this, {
      wasRedirected: !0
    });
  }
  onRequestWillBeSentEvent(e) {
    s(this, j).info = e, s(this, St).collectIfNeeded(
      this,
      "request"
      /* Network.DataType.Request */
    ), g(this, O, Ut).call(this);
  }
  onRequestWillBeSentExtraInfoEvent(e) {
    s(this, j).extraInfo = e, g(this, O, Ut).call(this);
  }
  onResponseReceivedExtraInfoEvent(e) {
    e.statusCode >= 300 && e.statusCode <= 399 && s(this, j).info && e.headers.location === s(this, j).info.request.url || (s(this, U).extraInfo = e, g(this, O, Ut).call(this));
  }
  onResponseReceivedEvent(e) {
    s(this, U).hasExtraInfo = e.hasExtraInfo, s(this, U).info = e.response, s(this, St).collectIfNeeded(
      this,
      "response"
      /* Network.DataType.Response */
    ), g(this, O, Ut).call(this);
  }
  onServedFromCache() {
    m(this, ks, !0), g(this, O, Ut).call(this);
  }
  onLoadingFailedEvent(e) {
    g(this, O, Ut).call(this, {
      hasFailed: !0
    }), g(this, O, mn).call(this, () => ({
      method: qe.ChromiumBidi.Network.EventNames.FetchError,
      params: {
        ...g(this, O, gn).call(this),
        errorText: e.errorText
      }
    }));
  }
  /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-failRequest */
  async failRequest(e) {
    (0, rn.assert)(s(this, be), "Network Interception not set-up."), await this.cdpClient.sendCommand("Fetch.failRequest", {
      requestId: s(this, be),
      errorReason: e
    }), m(this, Ke, void 0);
  }
  onRequestPaused(e) {
    m(this, be, e.requestId), e.responseStatusCode || e.responseErrorReason ? (s(this, U).paused = e, g(this, O, pn).call(this, "responseStarted") && // CDP may emit multiple events for a single request
    !s(this, Cr)[qe.ChromiumBidi.Network.EventNames.ResponseStarted] && // Continue all response that have not enabled Network domain
    s(this, be) !== this.id ? m(this, Ke, "responseStarted") : g(this, O, pl).call(this)) : (s(this, j).paused = e, g(this, O, pn).call(this, "beforeRequestSent") && // CDP may emit multiple events for a single request
    !s(this, Cr)[qe.ChromiumBidi.Network.EventNames.BeforeRequestSent] && // Continue all requests that have not enabled Network domain
    s(this, be) !== this.id ? m(this, Ke, "beforeRequestSent") : g(this, O, Ic).call(this)), g(this, O, Ut).call(this);
  }
  onAuthRequired(e) {
    m(this, be, e.requestId), s(this, j).auth = e, g(this, O, pn).call(this, "authRequired") && // Continue all auth requests that have not enabled Network domain
    s(this, be) !== this.id ? m(this, Ke, "authRequired") : g(this, O, fn).call(this, {
      response: "Default"
    }), g(this, O, mn).call(this, () => ({
      method: qe.ChromiumBidi.Network.EventNames.AuthRequired,
      params: {
        ...g(this, O, gn).call(this, "authRequired"),
        response: g(this, O, _c).call(this)
      }
    }));
  }
  /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueRequest */
  async continueRequest(e = {}) {
    const t = g(this, O, kc).call(this, e.headers, e.cookies), r = (0, ie.cdpFetchHeadersFromBidiNetworkHeaders)(t), n = Hh(e.body);
    await g(this, O, Ic).call(this, {
      url: e.url,
      method: e.method,
      headers: r,
      postData: n
    }), m(this, Et, {
      url: e.url,
      method: e.method,
      headers: e.headers,
      cookies: e.cookies,
      bodySize: jv(e.body)
    });
  }
  /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueResponse */
  async continueResponse(e = {}) {
    var t, r, n;
    if (this.interceptPhase === "authRequired")
      if (e.credentials)
        await Promise.all([
          this.waitNextPhase,
          await g(this, O, fn).call(this, {
            response: "ProvideCredentials",
            username: e.credentials.username,
            password: e.credentials.password
          })
        ]);
      else
        return await g(this, O, fn).call(this, {
          response: "ProvideCredentials"
        });
    if (s(this, Ke) === "responseStarted") {
      const o = g(this, O, kc).call(this, e.headers, e.cookies), a = (0, ie.cdpFetchHeadersFromBidiNetworkHeaders)(o);
      await g(this, O, pl).call(this, {
        responseCode: e.statusCode ?? ((t = s(this, U).paused) == null ? void 0 : t.responseStatusCode),
        responsePhrase: e.reasonPhrase ?? ((r = s(this, U).paused) == null ? void 0 : r.responseStatusText),
        responseHeaders: a ?? ((n = s(this, U).paused) == null ? void 0 : n.responseHeaders)
      }), m(this, Qn, {
        statusCode: e.statusCode,
        headers: o
      });
    }
  }
  /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueWithAuth */
  async continueWithAuth(e) {
    let t, r;
    if (e.action === "provideCredentials") {
      const { credentials: o } = e;
      t = o.username, r = o.password;
    }
    const n = (0, ie.cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction)(e.action);
    await g(this, O, fn).call(this, {
      response: n,
      username: t,
      password: r
    });
  }
  /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-provideResponse */
  async provideResponse(e) {
    if ((0, rn.assert)(s(this, be), "Network Interception not set-up."), this.interceptPhase === "authRequired")
      return await g(this, O, fn).call(this, {
        response: "ProvideCredentials"
      });
    if (!e.body && !e.headers)
      return await g(this, O, Ic).call(this);
    const t = g(this, O, kc).call(this, e.headers, e.cookies), r = (0, ie.cdpFetchHeadersFromBidiNetworkHeaders)(t), n = e.statusCode ?? s(this, O, hn) ?? 200;
    await this.cdpClient.sendCommand("Fetch.fulfillRequest", {
      requestId: s(this, be),
      responseCode: n,
      responsePhrase: e.reasonPhrase,
      responseHeaders: r,
      body: Hh(e.body)
    }), m(this, Ke, void 0);
  }
  dispose() {
    this.waitNextPhase.reject(new Error("waitNextPhase disposed"));
  }
  get bytesReceived() {
    var e;
    return ((e = s(this, U).info) == null ? void 0 : e.encodedDataLength) || 0;
  }
}
Jn = new WeakMap(), be = new WeakMap(), Ke = new WeakMap(), ks = new WeakMap(), Yn = new WeakMap(), j = new WeakMap(), Et = new WeakMap(), Qn = new WeakMap(), U = new WeakMap(), Zn = new WeakMap(), St = new WeakMap(), Pt = new WeakMap(), br = new WeakMap(), Cr = new WeakMap(), O = new WeakSet(), cl = function() {
  return this.url.startsWith("data:");
}, ul = function() {
  return (
    // We can't intercept data urls from CDP
    g(this, O, cl).call(this) || // Cached requests never hit the network
    s(this, ks)
  );
}, If = function() {
  var e, t, r, n, o;
  return ((e = s(this, Et)) == null ? void 0 : e.method) ?? ((t = s(this, j).info) == null ? void 0 : t.request.method) ?? ((r = s(this, j).paused) == null ? void 0 : r.request.method) ?? ((n = s(this, j).auth) == null ? void 0 : n.request.method) ?? ((o = s(this, U).paused) == null ? void 0 : o.request.method);
}, _f = function() {
  return !s(this, j).info || !s(this, j).info.loaderId || // When we navigate all CDP network events have `loaderId`
  // CDP's `loaderId` and `requestId` match when
  // that request triggered the loading
  s(this, j).info.loaderId !== s(this, j).info.requestId ? null : s(this, St).getNavigationId(s(this, O, Zi) ?? void 0);
}, kf = function() {
  let e = [];
  return s(this, j).extraInfo && (e = s(this, j).extraInfo.associatedCookies.filter(({ blockedReasons: t }) => !Array.isArray(t) || t.length === 0).map(({ cookie: t }) => (0, ie.cdpToBiDiCookie)(t))), e;
}, dl = function(e) {
  var t;
  if (e !== void 0 && e["Content-Length"] !== void 0) {
    const r = Number.parseInt(e["Content-Length"]);
    if (Number.isInteger(r))
      return r;
    (t = s(this, br)) == null || t.call(this, Cd.LogType.debugError, "Unexpected non-integer 'Content-Length' header");
  }
}, Zi = function() {
  var t, r, n, o, a, c, f, p, d, h, w;
  const e = ((t = s(this, U).paused) == null ? void 0 : t.frameId) ?? ((r = s(this, j).info) == null ? void 0 : r.frameId) ?? ((n = s(this, j).paused) == null ? void 0 : n.frameId) ?? ((o = s(this, j).auth) == null ? void 0 : o.frameId);
  if (e !== void 0)
    return e;
  if (((c = (a = s(this, j)) == null ? void 0 : a.info) == null ? void 0 : c.initiator.type) === "preflight" && ((p = (f = s(this, j)) == null ? void 0 : f.info) == null ? void 0 : p.initiator.requestId) !== void 0) {
    const x = s(this, St).getRequestById((h = (d = s(this, j)) == null ? void 0 : d.info) == null ? void 0 : h.initiator.requestId);
    if (x !== void 0)
      return ((w = s(x, j).info) == null ? void 0 : w.frameId) ?? null;
  }
  return null;
}, hn = function() {
  var e, t, r, n;
  return ((e = s(this, Qn)) == null ? void 0 : e.statusCode) ?? ((t = s(this, U).paused) == null ? void 0 : t.responseStatusCode) ?? ((r = s(this, U).extraInfo) == null ? void 0 : r.statusCode) ?? ((n = s(this, U).info) == null ? void 0 : n.status);
}, ll = function() {
  var t, r, n;
  let e = [];
  if ((t = s(this, Et)) != null && t.headers) {
    const o = new Bv.DefaultMap(() => []);
    for (const a of s(this, Et).headers)
      o.get(a.name).push(a.value.value);
    for (const [a, c] of o.entries())
      e.push({
        name: a,
        value: {
          type: "string",
          value: c.join(`
`).trimEnd()
        }
      });
  } else
    e = [
      ...(0, ie.bidiNetworkHeadersFromCdpNetworkHeaders)((r = s(this, j).info) == null ? void 0 : r.request.headers),
      ...(0, ie.bidiNetworkHeadersFromCdpNetworkHeaders)((n = s(this, j).extraInfo) == null ? void 0 : n.headers)
    ];
  return e;
}, Tf = function() {
  var r;
  if (!s(this, U).info || !(s(this, O, hn) === 401 || s(this, O, hn) === 407))
    return;
  const e = s(this, O, hn) === 401 ? "WWW-Authenticate" : "Proxy-Authenticate", t = [];
  for (const [n, o] of Object.entries(s(this, U).info.headers))
    n.localeCompare(e, void 0, { sensitivity: "base" }) === 0 && t.push({
      scheme: o.split(" ").at(0) ?? "",
      realm: ((r = o.match(Fv)) == null ? void 0 : r.at(0)) ?? ""
    });
  return t;
}, Df = function() {
  var t, r, n, o, a, c, f, p, d, h, w, x, S, P, C, b, D, v, E, A, R, l;
  const e = (0, ie.getTiming)((0, ie.getTiming)((r = (t = s(this, U).info) == null ? void 0 : t.timing) == null ? void 0 : r.requestTime) - (0, ie.getTiming)((n = s(this, j).info) == null ? void 0 : n.timestamp));
  return {
    // TODO: Verify this is correct
    timeOrigin: Math.round((0, ie.getTiming)((o = s(this, j).info) == null ? void 0 : o.wallTime) * 1e3),
    // Timing baseline.
    // TODO: Verify this is correct.
    requestTime: 0,
    // TODO: set if redirect detected.
    redirectStart: 0,
    // TODO: set if redirect detected.
    redirectEnd: 0,
    // TODO: Verify this is correct
    // https://source.chromium.org/chromium/chromium/src/+/main:net/base/load_timing_info.h;l=145
    fetchStart: (0, ie.getTiming)((c = (a = s(this, U).info) == null ? void 0 : a.timing) == null ? void 0 : c.workerFetchStart, e),
    // fetchStart: 0,
    dnsStart: (0, ie.getTiming)((p = (f = s(this, U).info) == null ? void 0 : f.timing) == null ? void 0 : p.dnsStart, e),
    dnsEnd: (0, ie.getTiming)((h = (d = s(this, U).info) == null ? void 0 : d.timing) == null ? void 0 : h.dnsEnd, e),
    connectStart: (0, ie.getTiming)((x = (w = s(this, U).info) == null ? void 0 : w.timing) == null ? void 0 : x.connectStart, e),
    connectEnd: (0, ie.getTiming)((P = (S = s(this, U).info) == null ? void 0 : S.timing) == null ? void 0 : P.connectEnd, e),
    tlsStart: (0, ie.getTiming)((b = (C = s(this, U).info) == null ? void 0 : C.timing) == null ? void 0 : b.sslStart, e),
    requestStart: (0, ie.getTiming)((v = (D = s(this, U).info) == null ? void 0 : D.timing) == null ? void 0 : v.sendStart, e),
    // https://source.chromium.org/chromium/chromium/src/+/main:net/base/load_timing_info.h;l=196
    responseStart: (0, ie.getTiming)((A = (E = s(this, U).info) == null ? void 0 : E.timing) == null ? void 0 : A.receiveHeadersStart, e),
    responseEnd: (0, ie.getTiming)((l = (R = s(this, U).info) == null ? void 0 : R.timing) == null ? void 0 : l.receiveHeadersEnd, e)
  };
}, Nf = function() {
  this.waitNextPhase.resolve(), this.waitNextPhase = new qh.Deferred();
}, hl = function(e) {
  return g(this, O, ul).call(this) || !s(this, Pt).isSubscribedTo(`network.${e}`) ? /* @__PURE__ */ new Set() : s(this, St).getInterceptsForPhase(this, e);
}, pn = function(e) {
  return g(this, O, hl).call(this, e).size > 0;
}, Ut = function(e = {}) {
  const t = (
    // Flush redirects
    e.wasRedirected || e.hasFailed || g(this, O, cl).call(this) || !!s(this, j).extraInfo || // Requests from cache don't have extra info
    s(this, ks) || // Sometimes there is no extra info and the response
    // is the only place we can find out
    !!(s(this, U).info && !s(this, U).hasExtraInfo)
  ), r = g(this, O, ul).call(this), n = !r && g(this, O, pn).call(this, "beforeRequestSent"), o = !n || n && !!s(this, j).paused;
  s(this, j).info && (n ? o : t) && g(this, O, mn).call(this, g(this, O, Mf).bind(this));
  const a = !!s(this, U).extraInfo || // Response from cache don't have extra info
  s(this, ks) || // Don't expect extra info if the flag is false
  !!(s(this, U).info && !s(this, U).hasExtraInfo), c = !r && g(this, O, pn).call(this, "responseStarted");
  (s(this, U).info || c && s(this, U).paused) && g(this, O, mn).call(this, g(this, O, Bf).bind(this));
  const f = !c || c && !!s(this, U).paused;
  s(this, U).info && a && f && (g(this, O, mn).call(this, g(this, O, Ff).bind(this)), s(this, St).disposeRequest(this.id));
}, Ic = async function(e = {}) {
  (0, rn.assert)(s(this, be), "Network Interception not set-up."), await this.cdpClient.sendCommand("Fetch.continueRequest", {
    requestId: s(this, be),
    url: e.url,
    method: e.method,
    headers: e.headers,
    postData: e.postData
  }), m(this, Ke, void 0);
}, pl = async function({ responseCode: e, responsePhrase: t, responseHeaders: r } = {}) {
  (0, rn.assert)(s(this, be), "Network Interception not set-up."), await this.cdpClient.sendCommand("Fetch.continueResponse", {
    requestId: s(this, be),
    responseCode: e,
    responsePhrase: t,
    responseHeaders: r
  }), m(this, Ke, void 0);
}, fn = async function(e) {
  (0, rn.assert)(s(this, be), "Network Interception not set-up."), await this.cdpClient.sendCommand("Fetch.continueWithAuth", {
    requestId: s(this, be),
    authChallengeResponse: e
  }), m(this, Ke, void 0);
}, mn = function(e) {
  var r;
  let t;
  try {
    t = e();
  } catch (n) {
    (r = s(this, br)) == null || r.call(this, Cd.LogType.debugError, n);
    return;
  }
  g(this, O, jf).call(this) || s(this, Cr)[t.method] && // Special case this event can be emitted multiple times
  t.method !== qe.ChromiumBidi.Network.EventNames.AuthRequired || (g(this, O, Nf).call(this), s(this, Cr)[t.method] = !0, s(this, O, Zi) ? s(this, Zn).registerEvent(Object.assign(t, {
    type: "event"
  }), s(this, O, Zi)) : s(this, Zn).registerGlobalEvent(Object.assign(t, {
    type: "event"
  })));
}, gn = function(e) {
  var r;
  const t = {
    isBlocked: !1
  };
  if (e) {
    const n = g(this, O, hl).call(this, e);
    t.isBlocked = n.size > 0, t.isBlocked && (t.intercepts = [...n]);
  }
  return {
    context: s(this, O, Zi),
    navigation: s(this, O, _f),
    redirectCount: s(this, Yn),
    request: g(this, O, Of).call(this),
    // Timestamp should be in milliseconds, while CDP provides it in seconds.
    timestamp: Math.round((0, ie.getTiming)((r = s(this, j).info) == null ? void 0 : r.wallTime) * 1e3),
    // Contains isBlocked and intercepts
    ...t
  };
}, _c = function() {
  var a, c, f, p, d, h, w, x, S, P, C;
  (a = s(this, U).info) != null && a.fromDiskCache && (s(this, U).extraInfo = void 0);
  const e = ((c = s(this, U).info) == null ? void 0 : c.headers) ?? {}, t = ((f = s(this, U).extraInfo) == null ? void 0 : f.headers) ?? {};
  for (const [b, D] of Object.entries(t))
    e[b] = D;
  const r = (0, ie.bidiNetworkHeadersFromCdpNetworkHeaders)(e), n = s(this, O, Tf);
  return {
    ...{
      url: this.url,
      protocol: ((p = s(this, U).info) == null ? void 0 : p.protocol) ?? "",
      status: s(this, O, hn) ?? -1,
      // TODO: Throw an exception or use some other status code?
      statusText: ((d = s(this, U).info) == null ? void 0 : d.statusText) || ((h = s(this, U).paused) == null ? void 0 : h.responseStatusText) || "",
      fromCache: ((w = s(this, U).info) == null ? void 0 : w.fromDiskCache) || ((x = s(this, U).info) == null ? void 0 : x.fromPrefetchCache) || s(this, ks),
      headers: ((S = s(this, Qn)) == null ? void 0 : S.headers) ?? r,
      mimeType: ((P = s(this, U).info) == null ? void 0 : P.mimeType) || "",
      bytesReceived: this.bytesReceived,
      headersSize: (0, ie.computeHeadersSize)(r),
      // TODO: consider removing from spec.
      bodySize: 0,
      content: {
        // TODO: consider removing from spec.
        size: 0
      },
      ...n ? { authChallenges: n } : {}
    },
    "goog:securityDetails": (C = s(this, U).info) == null ? void 0 : C.securityDetails
  };
}, Of = function() {
  var r, n, o, a, c, f;
  const e = s(this, O, ll);
  return {
    ...{
      request: s(this, Jn),
      url: this.url,
      method: s(this, O, If) ?? Pc.unknownParameter,
      headers: e,
      cookies: s(this, O, kf),
      headersSize: (0, ie.computeHeadersSize)(e),
      bodySize: this.bodySize,
      // TODO: populate
      destination: g(this, O, Rf).call(this),
      // TODO: populate
      initiatorType: g(this, O, Af).call(this),
      timings: s(this, O, Df)
    },
    "goog:postData": (n = (r = s(this, j).info) == null ? void 0 : r.request) == null ? void 0 : n.postData,
    "goog:hasPostData": (a = (o = s(this, j).info) == null ? void 0 : o.request) == null ? void 0 : a.hasPostData,
    "goog:resourceType": (c = s(this, j).info) == null ? void 0 : c.type,
    "goog:resourceInitiator": (f = s(this, j).info) == null ? void 0 : f.initiator
  };
}, /**
 * Heuristic trying to guess the destination.
 * Specification: https://fetch.spec.whatwg.org/#concept-request-destination.
 * Specified values: "audio", "audioworklet", "document", "embed", "font", "frame",
 * "iframe", "image", "json", "manifest", "object", "paintworklet", "report", "script",
 * "serviceworker", "sharedworker", "style", "track", "video", "webidentity", "worker",
 * "xslt".
 */
Rf = function() {
  var e, t;
  switch ((e = s(this, j).info) == null ? void 0 : e.type) {
    case "Script":
      return "script";
    case "Stylesheet":
      return "style";
    case "Image":
      return "image";
    case "Document":
      return ((t = s(this, j).info) == null ? void 0 : t.initiator.type) === "parser" ? "iframe" : "document";
    default:
      return "";
  }
}, /**
 * Heuristic trying to guess the initiator type.
 * Specification: https://fetch.spec.whatwg.org/#request-initiator-type.
 * Specified values: "audio", "beacon", "body", "css", "early-hints", "embed", "fetch",
 * "font", "frame", "iframe", "image", "img", "input", "link", "object", "ping",
 * "script", "track", "video", "xmlhttprequest", "other".
 */
Af = function() {
  var e, t, r, n, o, a, c, f, p, d;
  if (((e = s(this, j).info) == null ? void 0 : e.initiator.type) === "parser")
    switch ((t = s(this, j).info) == null ? void 0 : t.type) {
      case "Document":
        return "iframe";
      case "Font":
        return ((n = (r = s(this, j).info) == null ? void 0 : r.initiator) == null ? void 0 : n.url) === ((o = s(this, j).info) == null ? void 0 : o.documentURL) ? "font" : "css";
      case "Image":
        return ((c = (a = s(this, j).info) == null ? void 0 : a.initiator) == null ? void 0 : c.url) === ((f = s(this, j).info) == null ? void 0 : f.documentURL) ? "img" : "css";
      case "Script":
        return "script";
      case "Stylesheet":
        return "link";
      default:
        return null;
    }
  return ((d = (p = s(this, j)) == null ? void 0 : p.info) == null ? void 0 : d.type) === "Fetch" ? "fetch" : null;
}, Mf = function() {
  var e;
  return (0, rn.assert)(s(this, j).info, "RequestWillBeSentEvent is not set"), {
    method: qe.ChromiumBidi.Network.EventNames.BeforeRequestSent,
    params: {
      ...g(this, O, gn).call(this, "beforeRequestSent"),
      initiator: {
        type: g(e = Pc, ru, Uf).call(e, s(this, j).info.initiator.type),
        columnNumber: s(this, j).info.initiator.columnNumber,
        lineNumber: s(this, j).info.initiator.lineNumber,
        stackTrace: s(this, j).info.initiator.stack,
        request: s(this, j).info.initiator.requestId
      }
    }
  };
}, Bf = function() {
  return {
    method: qe.ChromiumBidi.Network.EventNames.ResponseStarted,
    params: {
      ...g(this, O, gn).call(this, "responseStarted"),
      response: g(this, O, _c).call(this)
    }
  };
}, Ff = function() {
  return {
    method: qe.ChromiumBidi.Network.EventNames.ResponseCompleted,
    params: {
      ...g(this, O, gn).call(this),
      response: g(this, O, _c).call(this)
    }
  };
}, jf = function() {
  var t, r;
  const e = "/favicon.ico";
  return ((t = s(this, j).paused) == null ? void 0 : t.request.url.endsWith(e)) ?? ((r = s(this, j).info) == null ? void 0 : r.request.url.endsWith(e)) ?? !1;
}, kc = function(e, t) {
  if (!e && !t)
    return;
  let r = e;
  const n = (0, ie.networkHeaderFromCookieHeaders)(t);
  return n && !r && (r = s(this, O, ll)), n && r && (r.filter((o) => o.name.localeCompare("cookie", void 0, {
    sensitivity: "base"
  }) !== 0), r.push(n)), r;
}, ru = new WeakSet(), Uf = function(e) {
  switch (e) {
    case "parser":
    case "script":
    case "preflight":
      return e;
    default:
      return "other";
  }
}, u(Lc, ru), N(Lc, "unknownParameter", "UNKNOWN");
ed.NetworkRequest = Lc;
Pc = Lc;
function Hh(i) {
  let e;
  return (i == null ? void 0 : i.type) === "string" ? e = (0, ie.stringToBase64)(i.value) : (i == null ? void 0 : i.type) === "base64" && (e = i.value), e;
}
function jv(i) {
  return (i == null ? void 0 : i.type) === "string" ? i.value.length : (i == null ? void 0 : i.type) === "base64" ? atob(i.value).length : 0;
}
(function(i) {
  var c, f, p, d, h, w, x, S, wt, $f, Lf;
  Object.defineProperty(i, "__esModule", { value: !0 }), i.NetworkStorage = i.MAX_TOTAL_COLLECTED_SIZE = void 0;
  const e = ee, t = Ft, r = Zu, n = ed, o = ye;
  i.MAX_TOTAL_COLLECTED_SIZE = 2e8;
  class a {
    constructor(v, E, A, R) {
      u(this, S);
      u(this, c);
      u(this, f);
      u(this, p);
      u(this, d);
      /**
       * A map from network request ID to Network Request objects.
       * Needed as long as information about requests comes from different events.
       */
      u(this, h, /* @__PURE__ */ new Map());
      /** A map from intercept ID to track active network intercepts. */
      u(this, w, /* @__PURE__ */ new Map());
      u(this, x, "default");
      m(this, c, E), m(this, f, v), m(this, p, new r.CollectorsStorage(i.MAX_TOTAL_COLLECTED_SIZE, R)), A.on("Target.detachedFromTarget", ({ sessionId: l }) => {
        this.disposeRequestMap(l);
      }), m(this, d, R);
    }
    onCdpTargetCreated(v) {
      const E = v.cdpClient, A = [
        [
          "Network.requestWillBeSent",
          (R) => {
            const l = this.getRequestById(R.requestId);
            l == null || l.updateCdpTarget(v), l && l.isRedirecting() ? (l.handleRedirect(R), this.disposeRequest(R.requestId), g(this, S, wt).call(this, R.requestId, v, l.redirectCount + 1).onRequestWillBeSentEvent(R)) : g(this, S, wt).call(this, R.requestId, v).onRequestWillBeSentEvent(R);
          }
        ],
        [
          "Network.requestWillBeSentExtraInfo",
          (R) => {
            const l = g(this, S, wt).call(this, R.requestId, v);
            l.updateCdpTarget(v), l.onRequestWillBeSentExtraInfoEvent(R);
          }
        ],
        [
          "Network.responseReceived",
          (R) => {
            const l = g(this, S, wt).call(this, R.requestId, v);
            l.updateCdpTarget(v), l.onResponseReceivedEvent(R);
          }
        ],
        [
          "Network.responseReceivedExtraInfo",
          (R) => {
            const l = g(this, S, wt).call(this, R.requestId, v);
            l.updateCdpTarget(v), l.onResponseReceivedExtraInfoEvent(R);
          }
        ],
        [
          "Network.requestServedFromCache",
          (R) => {
            const l = g(this, S, wt).call(this, R.requestId, v);
            l.updateCdpTarget(v), l.onServedFromCache();
          }
        ],
        [
          "Network.loadingFailed",
          (R) => {
            const l = g(this, S, wt).call(this, R.requestId, v);
            l.updateCdpTarget(v), l.onLoadingFailedEvent(R);
          }
        ],
        [
          "Fetch.requestPaused",
          (R) => {
            const l = g(this, S, wt).call(
              this,
              // CDP quirk if the Network domain is not present this is undefined
              R.networkId ?? R.requestId,
              v
            );
            l.updateCdpTarget(v), l.onRequestPaused(R);
          }
        ],
        [
          "Fetch.authRequired",
          (R) => {
            let l = this.getRequestByFetchId(R.requestId);
            l || (l = g(this, S, wt).call(this, R.requestId, v)), l.updateCdpTarget(v), l.onAuthRequired(R);
          }
        ],
        [
          "Network.dataReceived",
          (R) => {
            var l;
            (l = this.getRequestById(R.requestId)) == null || l.updateCdpTarget(v);
          }
        ],
        [
          "Network.loadingFinished",
          (R) => {
            var l;
            (l = this.getRequestById(R.requestId)) == null || l.updateCdpTarget(v);
          }
        ]
      ];
      for (const [R, l] of A)
        E.on(R, l);
    }
    async getCollectedData(v) {
      if (!s(this, p).isCollected(v.request, v.dataType, v.collector))
        throw new e.NoSuchNetworkDataException(v.collector === void 0 ? `No collected ${v.dataType} data` : `Collector ${v.collector} didn't collect ${v.dataType} data`);
      if (v.disown && v.collector === void 0)
        throw new e.InvalidArgumentException("Cannot disown collected data without collector ID");
      const E = this.getRequestById(v.request);
      if (E === void 0)
        throw new e.NoSuchNetworkDataException(`No data for ${v.request}`);
      let A;
      switch (v.dataType) {
        case "response":
          A = await g(this, S, $f).call(this, E);
          break;
        case "request":
          A = await g(this, S, Lf).call(this, E);
          break;
        default:
          throw new e.UnsupportedOperationException(`Unsupported data type ${v.dataType}`);
      }
      return v.disown && v.collector !== void 0 && (s(this, p).disownData(E.id, v.dataType, v.collector), this.disposeRequest(E.id)), A;
    }
    collectIfNeeded(v, E) {
      s(this, p).collectIfNeeded(v, E, v.cdpTarget.topLevelId, v.cdpTarget.userContext);
    }
    getInterceptionStages(v) {
      const E = {
        request: !1,
        response: !1,
        auth: !1
      };
      for (const A of s(this, w).values())
        A.contexts && !A.contexts.includes(v) || (E.request || (E.request = A.phases.includes(
          "beforeRequestSent"
          /* Network.InterceptPhase.BeforeRequestSent */
        )), E.response || (E.response = A.phases.includes(
          "responseStarted"
          /* Network.InterceptPhase.ResponseStarted */
        )), E.auth || (E.auth = A.phases.includes(
          "authRequired"
          /* Network.InterceptPhase.AuthRequired */
        )));
      return E;
    }
    getInterceptsForPhase(v, E) {
      if (v.url === n.NetworkRequest.unknownParameter)
        return /* @__PURE__ */ new Set();
      const A = /* @__PURE__ */ new Set();
      for (const [R, l] of s(this, w).entries())
        if (!(!l.phases.includes(E) || l.contexts && !l.contexts.includes(v.cdpTarget.topLevelId))) {
          if (l.urlPatterns.length === 0) {
            A.add(R);
            continue;
          }
          for (const y of l.urlPatterns)
            if ((0, o.matchUrlPattern)(y, v.url)) {
              A.add(R);
              break;
            }
        }
      return A;
    }
    disposeRequestMap(v) {
      for (const E of s(this, h).values())
        E.cdpClient.sessionId === v && (s(this, h).delete(E.id), E.dispose());
    }
    /**
     * Adds the given entry to the intercept map.
     * URL patterns are assumed to be parsed.
     *
     * @return The intercept ID.
     */
    addIntercept(v) {
      const E = (0, t.uuidv4)();
      return s(this, w).set(E, v), E;
    }
    /**
     * Removes the given intercept from the intercept map.
     * Throws NoSuchInterceptException if the intercept does not exist.
     */
    removeIntercept(v) {
      if (!s(this, w).has(v))
        throw new e.NoSuchInterceptException(`Intercept '${v}' does not exist.`);
      s(this, w).delete(v);
    }
    getRequestsByTarget(v) {
      const E = [];
      for (const A of s(this, h).values())
        A.cdpTarget === v && E.push(A);
      return E;
    }
    getRequestById(v) {
      return s(this, h).get(v);
    }
    getRequestByFetchId(v) {
      for (const E of s(this, h).values())
        if (E.fetchId === v)
          return E;
    }
    addRequest(v) {
      s(this, h).set(v.id, v);
    }
    /**
     * Disposes the given request, if no collectors targeting it are left.
     */
    disposeRequest(v) {
      s(this, p).isCollected(v) || s(this, h).delete(v);
    }
    /**
     * Gets the virtual navigation ID for the given navigable ID.
     */
    getNavigationId(v) {
      var E;
      return v === void 0 ? null : ((E = s(this, c).findContext(v)) == null ? void 0 : E.navigationId) ?? null;
    }
    set defaultCacheBehavior(v) {
      m(this, x, v);
    }
    get defaultCacheBehavior() {
      return s(this, x);
    }
    addDataCollector(v) {
      return s(this, p).addDataCollector(v);
    }
    removeDataCollector(v) {
      s(this, p).removeDataCollector(v.collector).map((A) => this.disposeRequest(A));
    }
    disownData(v) {
      if (!s(this, p).isCollected(v.request, v.dataType, v.collector))
        throw new e.NoSuchNetworkDataException(`Collector ${v.collector} didn't collect ${v.dataType} data`);
      s(this, p).disownData(v.request, v.dataType, v.collector), this.disposeRequest(v.request);
    }
  }
  c = new WeakMap(), f = new WeakMap(), p = new WeakMap(), d = new WeakMap(), h = new WeakMap(), w = new WeakMap(), x = new WeakMap(), S = new WeakSet(), /**
   * Gets the network request with the given ID, if any.
   * Otherwise, creates a new network request with the given ID and cdp target.
   */
  wt = function(v, E, A) {
    let R = this.getRequestById(v);
    return A === void 0 && R || (R = new n.NetworkRequest(v, s(this, f), this, E, A, s(this, d)), this.addRequest(R)), R;
  }, $f = async function(v) {
    try {
      const E = await v.cdpClient.sendCommand("Network.getResponseBody", { requestId: v.id });
      return {
        bytes: {
          type: E.base64Encoded ? "base64" : "string",
          value: E.body
        }
      };
    } catch (E) {
      throw E.code === -32e3 && E.message === "No resource with given identifier found" ? new e.NoSuchNetworkDataException("Response data was disposed") : E.code === -32001 ? new e.NoSuchNetworkDataException("Response data is disposed after the related page") : E;
    }
  }, Lf = async function(v) {
    return {
      bytes: {
        type: "string",
        value: (await v.cdpClient.sendCommand("Network.getRequestPostData", { requestId: v.id })).postData
      }
    };
  }, i.NetworkStorage = a;
})(th);
Object.defineProperty(Ju, "__esModule", { value: !0 });
Ju.CdpTarget = void 0;
const zh = ve, nn = ee, Uv = Vr, ds = Te, $v = Bi, Lv = Yu, qv = th;
var ea, pe, ei, ti, ta, xr, si, Ts, It, sa, We, ri, ni, ii, oi, je, re, qf, ml, eo, Hf, zf, Kf, Wf, Gf, Vf, Xf, Jf;
const ih = class ih {
  constructor(e, t, r, n, o, a, c, f, p, d, h, w) {
    u(this, re);
    u(this, ea);
    N(this, "userContext");
    u(this, pe);
    u(this, ei);
    u(this, ti);
    u(this, ta);
    u(this, xr);
    u(this, si);
    u(this, Ts);
    u(this, It);
    N(this, "contextConfigStorage");
    u(this, sa, new Uv.Deferred());
    u(this, We);
    /**
     * Target's window id. Is filled when the CDP target is created and do not reflect
     * moving targets from one window to another. The actual values
     * will be set during `#unblock`.
     * */
    u(this, ri);
    u(this, ni, !1);
    u(this, ii, !1);
    u(this, oi, !1);
    u(this, je, {
      request: !1,
      response: !1,
      auth: !1
    });
    this.userContext = h, m(this, ea, e), m(this, pe, t), m(this, ei, r), m(this, ti, n), m(this, xr, o), m(this, ta, a), m(this, si, c), m(this, It, d), m(this, Ts, f), this.contextConfigStorage = p, m(this, We, w);
  }
  static create(e, t, r, n, o, a, c, f, p, d, h, w) {
    var S, P;
    const x = new ih(e, t, r, n, a, o, c, f, d, p, h, w);
    return Lv.LogManager.create(x, o, a, w), g(S = x, re, Hf).call(S), g(P = x, re, qf).call(P), x;
  }
  /** Returns a deferred that resolves when the target is unblocked. */
  get unblocked() {
    return s(this, sa);
  }
  get id() {
    return s(this, ea);
  }
  get cdpClient() {
    return s(this, pe);
  }
  get parentCdpClient() {
    return s(this, ti);
  }
  get browserCdpClient() {
    return s(this, ei);
  }
  /** Needed for CDP escape path. */
  get cdpSessionId() {
    return s(this, pe).sessionId;
  }
  /**
   * Window id the target belongs to. If not known, returns 0.
   */
  get windowId() {
    var e;
    return s(this, ri) === void 0 && ((e = s(this, We)) == null || e.call(this, ds.LogType.debugError, "Getting windowId before it was set, returning 0")), s(this, ri) ?? 0;
  }
  async toggleFetchIfNeeded() {
    const e = s(this, It).getInterceptionStages(this.topLevelId);
    if (s(this, je).request === e.request && s(this, je).response === e.response && s(this, je).auth === e.auth)
      return;
    const t = [];
    if (m(this, je, e), (e.request || e.auth) && t.push({
      urlPattern: "*",
      requestStage: "Request"
    }), e.response && t.push({
      urlPattern: "*",
      requestStage: "Response"
    }), t.length)
      await s(this, pe).sendCommand("Fetch.enable", {
        patterns: t,
        handleAuthRequests: e.auth
      });
    else {
      const r = s(this, It).getRequestsByTarget(this).filter((n) => n.interceptPhase);
      Promise.allSettled(r.map((n) => n.waitNextPhase)).then(async () => s(this, It).getRequestsByTarget(this).filter((o) => o.interceptPhase).length ? await this.toggleFetchIfNeeded() : await s(this, pe).sendCommand("Fetch.disable")).catch((n) => {
        var o;
        (o = s(this, We)) == null || o.call(this, ds.LogType.bidi, "Disable failed", n);
      });
    }
  }
  /**
   * Toggles CDP "Fetch" domain and enable/disable network cache.
   */
  async toggleNetworkIfNeeded() {
    var e;
    try {
      await Promise.all([
        this.toggleSetCacheDisabled(),
        this.toggleFetchIfNeeded()
      ]);
    } catch (t) {
      if ((e = s(this, We)) == null || e.call(this, ds.LogType.debugError, t), !g(this, re, eo).call(this, t))
        throw t;
    }
  }
  async toggleSetCacheDisabled(e) {
    var n;
    const t = s(this, It).defaultCacheBehavior === "bypass", r = e ?? t;
    if (s(this, ii) !== r) {
      m(this, ii, r);
      try {
        await s(this, pe).sendCommand("Network.setCacheDisabled", {
          cacheDisabled: r
        });
      } catch (o) {
        if ((n = s(this, We)) == null || n.call(this, ds.LogType.debugError, o), m(this, ii, !r), !g(this, re, eo).call(this, o))
          throw o;
      }
    }
  }
  async toggleDeviceAccessIfNeeded() {
    var t;
    const e = this.isSubscribedTo(zh.Bluetooth.EventNames.RequestDevicePromptUpdated);
    if (s(this, ni) !== e) {
      m(this, ni, e);
      try {
        await s(this, pe).sendCommand(e ? "DeviceAccess.enable" : "DeviceAccess.disable");
      } catch (r) {
        if ((t = s(this, We)) == null || t.call(this, ds.LogType.debugError, r), m(this, ni, !e), !g(this, re, eo).call(this, r))
          throw r;
      }
    }
  }
  async togglePreloadIfNeeded() {
    var t;
    const e = this.isSubscribedTo(zh.Speculation.EventNames.PrefetchStatusUpdated);
    if (s(this, oi) !== e) {
      m(this, oi, e);
      try {
        await s(this, pe).sendCommand(e ? "Preload.enable" : "Preload.disable");
      } catch (r) {
        if ((t = s(this, We)) == null || t.call(this, ds.LogType.debugError, r), m(this, oi, !e), !g(this, re, eo).call(this, r))
          throw r;
      }
    }
  }
  async toggleNetwork() {
    var n;
    const e = s(this, It).getInterceptionStages(this.topLevelId), t = Object.values(e).some((o) => o), r = s(this, je).request !== e.request || s(this, je).response !== e.response || s(this, je).auth !== e.auth;
    (n = s(this, We)) == null || n.call(this, ds.LogType.debugInfo, "Toggle Network", `Fetch (${t}) ${r}`), t && r && await g(this, re, zf).call(this, e), !t && r && await g(this, re, Kf).call(this);
  }
  /**
   * All the ProxyChannels from all the preload scripts of the given
   * BrowsingContext.
   */
  getChannels() {
    return s(this, si).find().flatMap((e) => e.channels);
  }
  async setDeviceMetricsOverride(e, t, r) {
    if (e === null && t === null && r === null) {
      await this.cdpClient.sendCommand("Emulation.clearDeviceMetricsOverride");
      return;
    }
    const n = {
      width: (e == null ? void 0 : e.width) ?? 0,
      height: (e == null ? void 0 : e.height) ?? 0,
      deviceScaleFactor: t ?? 0,
      screenOrientation: g(this, re, Jf).call(this, r) ?? void 0,
      mobile: !1
    };
    await this.cdpClient.sendCommand("Emulation.setDeviceMetricsOverride", n);
  }
  get topLevelId() {
    return s(this, Ts).findTopLevelContextId(this.id) ?? this.id;
  }
  isSubscribedTo(e) {
    return s(this, xr).subscriptionManager.isSubscribedTo(e, this.topLevelId);
  }
  async setGeolocationOverride(e) {
    if (e === null)
      await this.cdpClient.sendCommand("Emulation.clearGeolocationOverride");
    else if ("type" in e) {
      if (e.type !== "positionUnavailable")
        throw new nn.UnknownErrorException(`Unknown geolocation error ${e.type}`);
      await this.cdpClient.sendCommand("Emulation.setGeolocationOverride", {});
    } else if ("latitude" in e)
      await this.cdpClient.sendCommand("Emulation.setGeolocationOverride", {
        latitude: e.latitude,
        longitude: e.longitude,
        accuracy: e.accuracy ?? 1,
        // `null` value is treated as "missing".
        altitude: e.altitude ?? void 0,
        altitudeAccuracy: e.altitudeAccuracy ?? void 0,
        heading: e.heading ?? void 0,
        speed: e.speed ?? void 0
      });
    else
      throw new nn.UnknownErrorException("Unexpected geolocation coordinates value");
  }
  async setLocaleOverride(e) {
    e === null ? await this.cdpClient.sendCommand("Emulation.setLocaleOverride", {}) : await this.cdpClient.sendCommand("Emulation.setLocaleOverride", {
      locale: e
    });
  }
  async setScriptingEnabled(e) {
    await this.cdpClient.sendCommand("Emulation.setScriptExecutionDisabled", {
      value: e === !1
    });
  }
  async setTimezoneOverride(e) {
    e === null ? await this.cdpClient.sendCommand("Emulation.setTimezoneOverride", {
      // If empty, disables the override and restores default host system timezone.
      timezoneId: ""
    }) : await this.cdpClient.sendCommand("Emulation.setTimezoneOverride", {
      timezoneId: e
    });
  }
  async setExtraHeaders(e) {
    await this.cdpClient.sendCommand("Network.setExtraHTTPHeaders", {
      headers: e
    });
  }
  async setUserAgentAndAcceptLanguage(e, t) {
    await this.cdpClient.sendCommand("Emulation.setUserAgentOverride", {
      userAgent: e ?? "",
      acceptLanguage: t ?? void 0
    });
  }
  async setEmulatedNetworkConditions(e) {
    if (e !== null && e.type !== "offline")
      throw new nn.UnsupportedOperationException(`Unsupported network conditions ${e.type}`);
    await Promise.all([
      this.cdpClient.sendCommand("Network.emulateNetworkConditionsByRule", {
        offline: (e == null ? void 0 : e.type) === "offline",
        matchedNetworkConditions: [
          {
            urlPattern: "",
            latency: 0,
            downloadThroughput: -1,
            uploadThroughput: -1
          }
        ]
      }),
      this.cdpClient.sendCommand("Network.overrideNetworkState", {
        offline: (e == null ? void 0 : e.type) === "offline",
        // TODO: restore the original `latency` value when emulation is removed.
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1
      })
    ]);
  }
};
ea = new WeakMap(), pe = new WeakMap(), ei = new WeakMap(), ti = new WeakMap(), ta = new WeakMap(), xr = new WeakMap(), si = new WeakMap(), Ts = new WeakMap(), It = new WeakMap(), sa = new WeakMap(), We = new WeakMap(), ri = new WeakMap(), ni = new WeakMap(), ii = new WeakMap(), oi = new WeakMap(), je = new WeakMap(), re = new WeakSet(), qf = async function() {
  var r;
  const e = this.contextConfigStorage.getActiveConfig(this.topLevelId, this.userContext), t = await Promise.allSettled([
    s(this, pe).sendCommand("Page.enable", {
      enableFileChooserOpenedEvent: !0
    }),
    ...g(this, re, Xf).call(this) ? [] : [
      s(this, pe).sendCommand("Page.setInterceptFileChooserDialog", {
        enabled: !0,
        // The intercepted dialog should be canceled.
        cancel: !0
      })
    ],
    // There can be some existing frames in the target, if reconnecting to an
    // existing browser instance, e.g. via Puppeteer. Need to restore the browsing
    // contexts for the frames to correctly handle further events, like
    // `Runtime.executionContextCreated`.
    // It's important to schedule this task together with enabling domains commands to
    // prepare the tree before the events (e.g. Runtime.executionContextCreated) start
    // coming.
    // https://github.com/GoogleChromeLabs/chromium-bidi/issues/2282
    s(this, pe).sendCommand("Page.getFrameTree").then((n) => g(this, re, ml).call(this, n.frameTree)),
    s(this, pe).sendCommand("Runtime.enable"),
    s(this, pe).sendCommand("Page.setLifecycleEventsEnabled", {
      enabled: !0
    }),
    // Enabling CDP Network domain is required for navigation detection:
    // https://github.com/GoogleChromeLabs/chromium-bidi/issues/2856.
    s(this, pe).sendCommand("Network.enable", {
      // If `googDisableNetworkDurableMessages` flag is set, do not enable durable
      // messages.
      enableDurableMessages: e.disableNetworkDurableMessages !== !0,
      maxTotalBufferSize: qv.MAX_TOTAL_COLLECTED_SIZE
    }).then(() => this.toggleNetworkIfNeeded()),
    s(this, pe).sendCommand("Target.setAutoAttach", {
      autoAttach: !0,
      waitForDebuggerOnStart: !0,
      flatten: !0
    }),
    g(this, re, Wf).call(this),
    g(this, re, Vf).call(this, e),
    g(this, re, Gf).call(this),
    s(this, pe).sendCommand("Runtime.runIfWaitingForDebugger"),
    // Resume tab execution as well if it was paused by the debugger.
    s(this, ti).sendCommand("Runtime.runIfWaitingForDebugger"),
    this.toggleDeviceAccessIfNeeded(),
    this.togglePreloadIfNeeded()
  ]);
  for (const n of t)
    n instanceof Error && ((r = s(this, We)) == null || r.call(this, ds.LogType.debugError, "Error happened when configuring a new target", n));
  s(this, sa).resolve({
    kind: "success",
    value: void 0
  });
}, ml = function(e) {
  var n;
  const t = e.frame, r = s(this, Ts).findContext(t.id);
  if (r !== void 0 && r.parentId === null && t.parentId !== null && t.parentId !== void 0 && (r.parentId = t.parentId), r === void 0 && t.parentId !== void 0) {
    const o = s(this, Ts).getContext(t.parentId);
    $v.BrowsingContextImpl.create(t.id, t.parentId, this.userContext, o.cdpTarget, s(this, xr), s(this, Ts), s(this, ta), this.contextConfigStorage, t.url, void 0, s(this, We));
  }
  (n = e.childFrames) == null || n.map((o) => g(this, re, ml).call(this, o));
}, /**
 * Heuristic checking if the error is due to the session being closed. If so, ignore the
 * error.
 */
eo = function(e) {
  const t = e;
  return t.code === -32001 && t.message === "Session with given id not found." || s(this, pe).isCloseError(e);
}, Hf = function() {
  s(this, pe).on("*", (e, t) => {
    typeof e == "string" && s(this, xr).registerEvent({
      type: "event",
      method: `goog:cdp.${e}`,
      params: {
        event: e,
        params: t,
        session: this.cdpSessionId
      }
    }, this.id);
  });
}, zf = async function(e) {
  const t = [];
  if ((e.request || e.auth) && t.push({
    urlPattern: "*",
    requestStage: "Request"
  }), e.response && t.push({
    urlPattern: "*",
    requestStage: "Response"
  }), t.length) {
    const r = s(this, je);
    m(this, je, e);
    try {
      await s(this, pe).sendCommand("Fetch.enable", {
        patterns: t,
        handleAuthRequests: e.auth
      });
    } catch {
      m(this, je, r);
    }
  }
}, Kf = async function() {
  s(this, It).getRequestsByTarget(this).filter((t) => t.interceptPhase).length === 0 && (m(this, je, {
    request: !1,
    response: !1,
    auth: !1
  }), await s(this, pe).sendCommand("Fetch.disable"));
}, Wf = async function() {
  const { windowId: e } = await s(this, ei).sendCommand("Browser.getWindowForTarget", { targetId: this.id });
  m(this, ri, e);
}, Gf = async function() {
  await Promise.all(s(this, si).find({
    // Needed for OOPIF
    targetId: this.topLevelId
  }).map((e) => e.initInTarget(this, !0)));
}, Vf = async function(e) {
  const t = [];
  t.push(s(this, pe).sendCommand("Page.setPrerenderingAllowed", {
    isAllowed: !e.prerenderingDisabled
  }).catch(() => {
  })), (e.viewport !== void 0 || e.devicePixelRatio !== void 0 || e.screenOrientation !== void 0) && t.push(this.setDeviceMetricsOverride(e.viewport ?? null, e.devicePixelRatio ?? null, e.screenOrientation ?? null).catch(() => {
  })), e.geolocation !== void 0 && e.geolocation !== null && t.push(this.setGeolocationOverride(e.geolocation)), e.locale !== void 0 && t.push(this.setLocaleOverride(e.locale)), e.timezone !== void 0 && t.push(this.setTimezoneOverride(e.timezone)), e.extraHeaders !== void 0 && t.push(this.setExtraHeaders(e.extraHeaders)), (e.userAgent !== void 0 || e.locale !== void 0) && t.push(this.setUserAgentAndAcceptLanguage(e.userAgent, e.locale)), e.scriptingEnabled !== void 0 && t.push(this.setScriptingEnabled(e.scriptingEnabled)), e.acceptInsecureCerts !== void 0 && t.push(this.cdpClient.sendCommand("Security.setIgnoreCertificateErrors", {
    ignore: e.acceptInsecureCerts
  })), e.emulatedNetworkConditions !== void 0 && t.push(this.setEmulatedNetworkConditions(e.emulatedNetworkConditions)), await Promise.all(t);
}, Xf = function() {
  var t, r;
  const e = this.contextConfigStorage.getActiveConfig(this.topLevelId, this.userContext);
  return (((t = e.userPromptHandler) == null ? void 0 : t.file) ?? ((r = e.userPromptHandler) == null ? void 0 : r.default) ?? "ignore") === "ignore";
}, Jf = function(e) {
  if (e === null)
    return null;
  if (e.natural === "portrait")
    switch (e.type) {
      case "portrait-primary":
        return {
          angle: 0,
          type: "portraitPrimary"
        };
      case "landscape-primary":
        return {
          angle: 90,
          type: "landscapePrimary"
        };
      case "portrait-secondary":
        return {
          angle: 180,
          type: "portraitSecondary"
        };
      case "landscape-secondary":
        return {
          angle: 270,
          type: "landscapeSecondary"
        };
      default:
        throw new nn.UnknownErrorException(`Unexpected screen orientation type ${e.type}`);
    }
  if (e.natural === "landscape")
    switch (e.type) {
      case "landscape-primary":
        return {
          angle: 0,
          type: "landscapePrimary"
        };
      case "portrait-primary":
        return {
          angle: 90,
          type: "portraitPrimary"
        };
      case "landscape-secondary":
        return {
          angle: 180,
          type: "landscapeSecondary"
        };
      case "portrait-secondary":
        return {
          angle: 270,
          type: "portraitSecondary"
        };
      default:
        throw new nn.UnknownErrorException(`Unexpected screen orientation type ${e.type}`);
    }
  throw new nn.UnknownErrorException(`Unexpected orientation natural ${e.natural}`);
};
let fl = ih;
Ju.CdpTarget = fl;
Object.defineProperty(Gu, "__esModule", { value: !0 });
Gu.CdpTargetManager = void 0;
const Hv = Te, xd = Bi, zv = Xu, Kv = Ju, Kh = {
  service_worker: "service-worker",
  shared_worker: "shared-worker",
  worker: "dedicated-worker"
};
var ra, na, ai, ia, Ds, Ge, ci, oa, Er, at, Sr, aa, ca, Yt, ce, Tc, Yf, Qf, Zf, em, Dc, ua, gl, tm, sm, rm;
class Wv {
  constructor(e, t, r, n, o, a, c, f, p, d, h, w, x) {
    u(this, ce);
    u(this, ra);
    u(this, na);
    u(this, ai, /* @__PURE__ */ new Set());
    u(this, ia);
    u(this, Ds);
    u(this, Ge);
    u(this, ci);
    u(this, oa);
    u(this, Er);
    u(this, at);
    u(this, Sr);
    u(this, aa);
    u(this, ca);
    u(this, Yt);
    u(this, ua, /* @__PURE__ */ new Map());
    m(this, na, e), m(this, ra, t), s(this, ai).add(r), m(this, ia, r), m(this, Ds, n), m(this, Ge, o), m(this, Er, h), m(this, ci, c), m(this, Sr, f), m(this, oa, p), m(this, aa, d), m(this, at, a), m(this, ca, w), m(this, Yt, x), g(this, ce, Tc).call(this, t);
  }
}
ra = new WeakMap(), na = new WeakMap(), ai = new WeakMap(), ia = new WeakMap(), Ds = new WeakMap(), Ge = new WeakMap(), ci = new WeakMap(), oa = new WeakMap(), Er = new WeakMap(), at = new WeakMap(), Sr = new WeakMap(), aa = new WeakMap(), ca = new WeakMap(), Yt = new WeakMap(), ce = new WeakSet(), /**
 * This method is called for each CDP session, since this class is responsible
 * for creating and destroying all targets and browsing contexts.
 */
Tc = function(e) {
  e.on("Target.attachedToTarget", (t) => {
    g(this, ce, Zf).call(this, t, e);
  }), e.on("Target.detachedFromTarget", g(this, ce, tm).bind(this)), e.on("Target.targetInfoChanged", g(this, ce, sm).bind(this)), e.on("Inspector.targetCrashed", () => {
    g(this, ce, rm).call(this, e);
  }), e.on("Page.frameAttached", g(this, ce, Yf).bind(this)), e.on("Page.frameSubtreeWillBeDetached", g(this, ce, Qf).bind(this));
}, Yf = function(e) {
  const t = s(this, Ge).findContext(e.parentFrameId);
  t !== void 0 && xd.BrowsingContextImpl.create(
    e.frameId,
    e.parentFrameId,
    t.userContext,
    t.cdpTarget,
    s(this, Ds),
    s(this, Ge),
    s(this, at),
    s(this, Sr),
    // At this point, we don't know the URL of the frame yet, so it will be updated
    // later.
    "about:blank",
    void 0,
    s(this, Yt)
  );
}, Qf = function(e) {
  var t;
  (t = s(this, Ge).findContext(e.frameId)) == null || t.dispose(!0);
}, Zf = function(e, t) {
  const { sessionId: r, targetInfo: n } = e, o = s(this, na).getCdpClient(r), a = async () => {
    await o.sendCommand("Runtime.runIfWaitingForDebugger").then(() => t.sendCommand("Target.detachFromTarget", e)).catch((p) => {
      var d;
      return (d = s(this, Yt)) == null ? void 0 : d.call(this, Hv.LogType.debugError, p);
    });
  };
  if (s(this, ia) === n.targetId) {
    a();
    return;
  }
  const c = n.type === "service_worker" ? `${t.sessionId}_${n.targetId}` : n.targetId;
  if (s(this, ai).has(c))
    return;
  s(this, ai).add(c);
  const f = n.browserContextId && n.browserContextId !== s(this, ca) ? n.browserContextId : "default";
  switch (n.type) {
    case "tab": {
      g(this, ce, Tc).call(this, o), (async () => await o.sendCommand("Target.setAutoAttach", {
        autoAttach: !0,
        waitForDebuggerOnStart: !0,
        flatten: !0
      }))();
      return;
    }
    case "page":
    case "iframe": {
      const p = g(this, ce, Dc).call(this, o, t, n, f), d = s(this, Ge).findContext(n.targetId);
      if (d && n.type === "iframe")
        d.updateCdpTarget(p);
      else {
        const h = g(this, ce, em).call(this, n, t.sessionId);
        xd.BrowsingContextImpl.create(
          n.targetId,
          h,
          f,
          p,
          s(this, Ds),
          s(this, Ge),
          s(this, at),
          s(this, Sr),
          // Hack: when a new target created, CDP emits targetInfoChanged with an empty
          // url, and navigates it to about:blank later. When the event is emitted for
          // an existing target (reconnect), the url is already known, and navigation
          // events will not be emitted anymore. Replacing empty url with `about:blank`
          // allows to handle both cases in the same way.
          // "7.3.2.1 Creating browsing contexts".
          // https://html.spec.whatwg.org/multipage/document-sequences.html#creating-browsing-contexts
          // TODO: check who to deal with non-null creator and its `creatorOrigin`.
          n.url === "" ? "about:blank" : n.url,
          n.openerFrameId ?? n.openerId,
          s(this, Yt)
        );
      }
      return;
    }
    case "service_worker":
    case "worker": {
      const p = s(this, at).findRealm({
        cdpSessionId: t.sessionId,
        sandbox: null
        // Non-sandboxed realms.
      });
      if (!p) {
        a();
        return;
      }
      const d = g(this, ce, Dc).call(this, o, t, n, f);
      g(this, ce, gl).call(this, Kh[n.type], d, p);
      return;
    }
    case "shared_worker": {
      const p = g(this, ce, Dc).call(this, o, t, n, f);
      g(this, ce, gl).call(this, Kh[n.type], p);
      return;
    }
  }
  a();
}, /** Try to find the parent browsing context ID for the given attached target. */
em = function(e, t) {
  var n;
  if (e.type !== "iframe")
    return null;
  const r = e.openerFrameId ?? e.openerId;
  return r !== void 0 ? r : t !== void 0 ? ((n = s(this, Ge).findContextBySession(t)) == null ? void 0 : n.id) ?? null : null;
}, Dc = function(e, t, r, n) {
  g(this, ce, Tc).call(this, e), s(this, Er).onCdpTargetCreated(r.targetId, n);
  const o = Kv.CdpTarget.create(r.targetId, e, s(this, ra), t, s(this, at), s(this, Ds), s(this, Er), s(this, Ge), s(this, ci), s(this, Sr), n, s(this, Yt));
  return s(this, ci).onCdpTargetCreated(o), s(this, oa).onCdpTargetCreated(o), s(this, aa).onCdpTargetCreated(o), o;
}, ua = new WeakMap(), gl = function(e, t, r) {
  t.cdpClient.on("Runtime.executionContextCreated", (n) => {
    const { uniqueId: o, id: a, origin: c } = n.context, f = new zv.WorkerRealm(t.cdpClient, s(this, Ds), a, s(this, Yt), (0, xd.serializeOrigin)(c), r ? [r] : [], o, s(this, at), e);
    s(this, ua).set(t.cdpSessionId, f);
  });
}, tm = function({ sessionId: e, targetId: t }) {
  t && s(this, Er).find({ targetId: t }).map((o) => {
    o.dispose(t);
  });
  const r = s(this, Ge).findContextBySession(e);
  if (r) {
    r.dispose(!0);
    return;
  }
  const n = s(this, ua).get(e);
  n && s(this, at).deleteRealms({
    cdpSessionId: n.cdpClient.sessionId
  });
}, sm = function(e) {
  const t = s(this, Ge).findContext(e.targetInfo.targetId);
  t && t.onTargetInfoChanged(e);
}, rm = function(e) {
  const t = s(this, at).findRealms({
    cdpSessionId: e.sessionId
  });
  for (const r of t)
    r.dispose();
};
Gu.CdpTargetManager = Wv;
var td = {};
Object.defineProperty(td, "__esModule", { value: !0 });
td.BrowsingContextStorage = void 0;
const Wh = ee, Gv = Ls;
var ct, ui;
class Vv {
  constructor() {
    /** Map from context ID to context implementation. */
    u(this, ct, /* @__PURE__ */ new Map());
    /** Event emitter for browsing context storage eventsis not expected to be exposed to
     * the outside world. */
    u(this, ui, new Gv.EventEmitter());
  }
  /** Gets all top-level contexts, i.e. those with no parent. */
  getTopLevelContexts() {
    return this.getAllContexts().filter((e) => e.isTopLevelContext());
  }
  /** Gets all contexts. */
  getAllContexts() {
    return Array.from(s(this, ct).values());
  }
  /** Deletes the context with the given ID. */
  deleteContextById(e) {
    s(this, ct).delete(e);
  }
  /** Deletes the given context. */
  deleteContext(e) {
    s(this, ct).delete(e.id);
  }
  /** Tracks the given context. */
  addContext(e) {
    s(this, ct).set(e.id, e), s(this, ui).emit("added", {
      browsingContext: e
    });
  }
  /**
   * Waits for a context with the given ID to be added and returns it.
   */
  waitForContext(e) {
    return s(this, ct).has(e) ? Promise.resolve(this.getContext(e)) : new Promise((t) => {
      const r = (n) => {
        n.browsingContext.id === e && (s(this, ui).off("added", r), t(n.browsingContext));
      };
      s(this, ui).on("added", r);
    });
  }
  /** Returns true whether there is an existing context with the given ID. */
  hasContext(e) {
    return s(this, ct).has(e);
  }
  /** Gets the context with the given ID, if any. */
  findContext(e) {
    return s(this, ct).get(e);
  }
  /** Returns the top-level context ID of the given context, if any. */
  findTopLevelContextId(e) {
    if (e === null)
      return null;
    const t = this.findContext(e);
    if (!t)
      return null;
    const r = t.parentId ?? null;
    return r === null ? e : this.findTopLevelContextId(r);
  }
  findContextBySession(e) {
    for (const t of s(this, ct).values())
      if (t.cdpTarget.cdpSessionId === e)
        return t;
  }
  /** Gets the context with the given ID, if any, otherwise throws. */
  getContext(e) {
    const t = this.findContext(e);
    if (t === void 0)
      throw new Wh.NoSuchFrameException(`Context ${e} not found`);
    return t;
  }
  verifyTopLevelContextsList(e) {
    const t = /* @__PURE__ */ new Set();
    if (!e)
      return t;
    for (const r of e) {
      const n = this.getContext(r);
      if (n.isTopLevelContext())
        t.add(n);
      else
        throw new Wh.InvalidArgumentException(`Non top-level context '${r}' given.`);
    }
    return t;
  }
  verifyContextsList(e) {
    if (e.length)
      for (const t of e)
        this.getContext(t);
  }
}
ct = new WeakMap(), ui = new WeakMap();
td.BrowsingContextStorage = Vv;
var sd = {};
Object.defineProperty(sd, "__esModule", { value: !0 });
sd.PreloadScriptStorage = void 0;
const Gh = F;
var _t;
class Xv {
  constructor() {
    /** Tracks all BiDi preload scripts.  */
    u(this, _t, /* @__PURE__ */ new Set());
  }
  /**
   * Finds all entries that match the given filter (OR logic).
   */
  find(e) {
    return e ? [...s(this, _t)].filter((t) => !!(t.contexts === void 0 && t.userContexts === void 0 || e.targetId !== void 0 && t.targetIds.has(e.targetId))) : [...s(this, _t)];
  }
  add(e) {
    s(this, _t).add(e);
  }
  /** Deletes all BiDi preload script entries that match the given filter. */
  remove(e) {
    const t = [...s(this, _t)].find((r) => r.id === e);
    if (t === void 0)
      throw new Gh.NoSuchScriptException(`No preload script with id '${e}'`);
    s(this, _t).delete(t);
  }
  /** Gets the preload script with the given ID, if any, otherwise throws. */
  getPreloadScript(e) {
    const t = [...s(this, _t)].find((r) => r.id === e);
    if (t === void 0)
      throw new Gh.NoSuchScriptException(`No preload script with id '${e}'`);
    return t;
  }
  onCdpTargetCreated(e, t) {
    const r = [...s(this, _t)].filter((n) => {
      var o;
      return !n.userContexts && !n.contexts ? !0 : (o = n.userContexts) == null ? void 0 : o.includes(t);
    });
    for (const n of r)
      n.targetIds.add(e);
  }
}
_t = new WeakMap();
sd.PreloadScriptStorage = Xv;
var rd = {};
Object.defineProperty(rd, "__esModule", { value: !0 });
rd.RealmStorage = void 0;
const Jv = ee, Yv = Za;
var nu, di;
class Qv {
  constructor() {
    /** Tracks handles and their realms sent to the client. */
    u(this, nu, /* @__PURE__ */ new Map());
    /** Map from realm ID to Realm. */
    u(this, di, /* @__PURE__ */ new Map());
    /** List of the internal sandboxed realms which should not be reported to the user. */
    N(this, "hiddenSandboxes", /* @__PURE__ */ new Set());
  }
  get knownHandlesToRealmMap() {
    return s(this, nu);
  }
  addRealm(e) {
    s(this, di).set(e.realmId, e);
  }
  /** Finds all realms that match the given filter. */
  findRealms(e) {
    const t = e.sandbox === null ? void 0 : e.sandbox;
    return Array.from(s(this, di).values()).filter((r) => !(e.realmId !== void 0 && e.realmId !== r.realmId || e.browsingContextId !== void 0 && !r.associatedBrowsingContexts.map((n) => n.id).includes(e.browsingContextId) || e.sandbox !== void 0 && (!(r instanceof Yv.WindowRealm) || t !== r.sandbox) || e.executionContextId !== void 0 && e.executionContextId !== r.executionContextId || e.origin !== void 0 && e.origin !== r.origin || e.type !== void 0 && e.type !== r.realmType || e.cdpSessionId !== void 0 && e.cdpSessionId !== r.cdpClient.sessionId || e.isHidden !== void 0 && e.isHidden !== r.isHidden()));
  }
  findRealm(e) {
    return this.findRealms(e)[0];
  }
  /** Gets the only realm that matches the given filter, if any, otherwise throws. */
  getRealm(e) {
    const t = this.findRealm(e);
    if (t === void 0)
      throw new Jv.NoSuchFrameException(`Realm ${JSON.stringify(e)} not found`);
    return t;
  }
  /** Deletes all realms that match the given filter. */
  deleteRealms(e) {
    this.findRealms(e).map((t) => {
      t.dispose(), s(this, di).delete(t.realmId), Array.from(this.knownHandlesToRealmMap.entries()).filter(([, r]) => r === t.realmId).map(([r]) => this.knownHandlesToRealmMap.delete(r));
    });
  }
}
nu = new WeakMap(), di = new WeakMap();
rd.RealmStorage = Qv;
var nd = {}, id = {};
Object.defineProperty(id, "__esModule", { value: !0 });
id.Buffer = void 0;
var da, Pr, la, hp;
let Zv = (hp = class {
  /**
   * @param capacity The buffer capacity.
   * @param onItemRemoved Delegate called for each removed element.
   */
  constructor(e, t) {
    u(this, da);
    u(this, Pr, []);
    u(this, la);
    m(this, da, e), m(this, la, t);
  }
  get() {
    return s(this, Pr);
  }
  add(e) {
    var t;
    for (s(this, Pr).push(e); s(this, Pr).length > s(this, da); ) {
      const r = s(this, Pr).shift();
      r !== void 0 && ((t = s(this, la)) == null || t.call(this, r));
    }
  }
}, da = new WeakMap(), Pr = new WeakMap(), la = new WeakMap(), hp);
id.Buffer = Zv;
var od = {};
Object.defineProperty(od, "__esModule", { value: !0 });
od.IdWrapper = void 0;
var iu, ha;
const ou = class ou {
  constructor() {
    u(this, ha);
    m(this, ha, ++mh(ou, iu)._);
  }
  get id() {
    return s(this, ha);
  }
};
iu = new WeakMap(), ha = new WeakMap(), u(ou, iu, 0);
let wl = ou;
od.IdWrapper = wl;
var ad = {};
Object.defineProperty(ad, "__esModule", { value: !0 });
ad.isCdpEvent = nm;
ad.assertSupportedEvent = eb;
const yl = ee;
function nm(i) {
  var e;
  return ((e = i.split(".").at(0)) == null ? void 0 : e.startsWith(yl.ChromiumBidi.BiDiModule.Cdp)) ?? !1;
}
function eb(i) {
  if (!yl.ChromiumBidi.EVENT_NAMES.has(i) && !nm(i))
    throw new yl.InvalidArgumentException(`Unknown event: ${i}`);
}
var Xr = {};
Object.defineProperty(Xr, "__esModule", { value: !0 });
Xr.SubscriptionManager = void 0;
Xr.cartesianProduct = sb;
Xr.unrollEvents = vl;
Xr.difference = bl;
const Pe = ee, tb = Ft;
function sb(...i) {
  return i.reduce((e, t) => e.flatMap((r) => t.map((n) => [r, n].flat())));
}
function vl(i) {
  const e = /* @__PURE__ */ new Set();
  function t(r) {
    for (const n of r)
      e.add(n);
  }
  for (const r of i)
    switch (r) {
      case Pe.ChromiumBidi.BiDiModule.Bluetooth:
        t(Object.values(Pe.ChromiumBidi.Bluetooth.EventNames));
        break;
      case Pe.ChromiumBidi.BiDiModule.BrowsingContext:
        t(Object.values(Pe.ChromiumBidi.BrowsingContext.EventNames));
        break;
      case Pe.ChromiumBidi.BiDiModule.Input:
        t(Object.values(Pe.ChromiumBidi.Input.EventNames));
        break;
      case Pe.ChromiumBidi.BiDiModule.Log:
        t(Object.values(Pe.ChromiumBidi.Log.EventNames));
        break;
      case Pe.ChromiumBidi.BiDiModule.Network:
        t(Object.values(Pe.ChromiumBidi.Network.EventNames));
        break;
      case Pe.ChromiumBidi.BiDiModule.Script:
        t(Object.values(Pe.ChromiumBidi.Script.EventNames));
        break;
      case Pe.ChromiumBidi.BiDiModule.Speculation:
        t(Object.values(Pe.ChromiumBidi.Speculation.EventNames));
        break;
      default:
        e.add(r);
    }
  return e.values();
}
var ut, Ir, _r, li, Nc;
class rb {
  constructor(e) {
    u(this, li);
    u(this, ut, []);
    u(this, Ir, /* @__PURE__ */ new Set());
    u(this, _r);
    m(this, _r, e);
  }
  getGoogChannelsSubscribedToEvent(e, t) {
    const r = /* @__PURE__ */ new Set();
    for (const n of s(this, ut))
      g(this, li, Nc).call(this, n, e, t) && r.add(n.googChannel);
    return Array.from(r);
  }
  getGoogChannelsSubscribedToEventGlobally(e) {
    const t = /* @__PURE__ */ new Set();
    for (const r of s(this, ut))
      g(this, li, Nc).call(this, r, e) && t.add(r.googChannel);
    return Array.from(t);
  }
  isSubscribedTo(e, t) {
    for (const r of s(this, ut))
      if (g(this, li, Nc).call(this, r, e, t))
        return !0;
    return !1;
  }
  /**
   * Subscribes to event in the given context and goog:channel.
   * @return {SubscriptionItem[]} List of
   * subscriptions. If the event is a whole module, it will return all the specific
   * events. If the contextId is null, it will return all the top-level contexts which were
   * not subscribed before the command.
   */
  subscribe(e, t, r, n) {
    const o = {
      id: (0, tb.uuidv4)(),
      eventNames: new Set(vl(e)),
      topLevelTraversableIds: new Set(t.map((a) => {
        const c = s(this, _r).findTopLevelContextId(a);
        if (!c)
          throw new Pe.NoSuchFrameException(`Top-level navigable not found for context id ${a}`);
        return c;
      })),
      userContextIds: new Set(r),
      googChannel: n
    };
    return s(this, ut).push(o), s(this, Ir).add(o.id), o;
  }
  /**
   * Unsubscribes atomically from all events in the given contexts and channel.
   *
   * This is a legacy spec branch to unsubscribe by attributes.
   */
  unsubscribe(e, t) {
    const r = new Set(vl(e)), n = [], o = /* @__PURE__ */ new Set();
    for (const a of s(this, ut)) {
      if (a.googChannel !== t) {
        n.push(a);
        continue;
      }
      if (a.userContextIds.size !== 0) {
        n.push(a);
        continue;
      }
      if (nb(a.eventNames, r).size === 0) {
        n.push(a);
        continue;
      }
      if (a.topLevelTraversableIds.size !== 0) {
        n.push(a);
        continue;
      }
      const c = new Set(a.eventNames);
      for (const f of r)
        c.has(f) && (o.add(f), c.delete(f));
      c.size !== 0 && n.push({
        ...a,
        eventNames: c
      });
    }
    if (!ib(o, r))
      throw new Pe.InvalidArgumentException("No subscription found");
    m(this, ut, n);
  }
  /**
   * Unsubscribes by subscriptionId.
   */
  unsubscribeById(e) {
    const t = new Set(e);
    if (bl(t, s(this, Ir)).size !== 0)
      throw new Pe.InvalidArgumentException("No subscription found");
    m(this, ut, s(this, ut).filter((n) => !t.has(n.id))), m(this, Ir, bl(s(this, Ir), t));
  }
}
ut = new WeakMap(), Ir = new WeakMap(), _r = new WeakMap(), li = new WeakSet(), Nc = function(e, t, r) {
  let n = !1;
  for (const o of e.eventNames)
    if (
      // Event explicitly subscribed
      o === t || // Event subscribed via module
      o === t.split(".").at(0) || // Event explicitly subscribed compared to module
      o.split(".").at(0) === t
    ) {
      n = !0;
      break;
    }
  if (!n)
    return !1;
  if (e.userContextIds.size !== 0) {
    if (!r)
      return !1;
    const o = s(this, _r).findContext(r);
    return o ? e.userContextIds.has(o.userContext) : !1;
  }
  if (e.topLevelTraversableIds.size !== 0) {
    if (!r)
      return !1;
    const o = s(this, _r).findTopLevelContextId(r);
    return o !== null && e.topLevelTraversableIds.has(o);
  }
  return !0;
};
Xr.SubscriptionManager = rb;
function nb(i, e) {
  const t = /* @__PURE__ */ new Set();
  for (const r of i)
    e.has(r) && t.add(r);
  return t;
}
function bl(i, e) {
  const t = /* @__PURE__ */ new Set();
  for (const r of i)
    e.has(r) || t.add(r);
  return t;
}
function ib(i, e) {
  if (i.size !== e.size)
    return !1;
  for (const t of i)
    if (!e.has(t))
      return !1;
  return !0;
}
var to;
Object.defineProperty(nd, "__esModule", { value: !0 });
nd.EventManager = void 0;
const Cl = ee, ob = id, Vh = tc, ab = Ls, cb = od, Ed = Mi, Xh = ad, Sd = Xr;
var au, pa, fa;
class Jh {
  constructor(e, t) {
    u(this, au, new cb.IdWrapper());
    u(this, pa);
    u(this, fa);
    m(this, fa, e), m(this, pa, t);
  }
  get id() {
    return s(this, au).id;
  }
  get contextId() {
    return s(this, pa);
  }
  get event() {
    return s(this, fa);
  }
}
au = new WeakMap(), pa = new WeakMap(), fa = new WeakMap();
const pc = /* @__PURE__ */ new Map([[Cl.ChromiumBidi.Log.EventNames.LogEntryAdded, 100]]);
var ma, Ns, kr, dt, kt, hi, ga, Tr, so, tt, xl, Oc, El;
class sh extends ab.EventEmitter {
  constructor(t, r) {
    super();
    u(this, tt);
    /**
     * Maps event name to a set of contexts where this event already happened.
     * Needed for getting buffered events from all the contexts in case of
     * subscripting to all contexts.
     */
    u(this, ma, new Vh.DefaultMap(() => /* @__PURE__ */ new Set()));
    /**
     * Maps `eventName` + `browsingContext` to buffer. Used to get buffered events
     * during subscription. Channel-agnostic.
     */
    u(this, Ns, /* @__PURE__ */ new Map());
    /**
     * Maps `eventName` + `browsingContext` to  Map of goog:channel to last id.
     * Used to avoid sending duplicated events when user
     * subscribes -> unsubscribes -> subscribes.
     */
    u(this, kr, /* @__PURE__ */ new Map());
    u(this, dt);
    u(this, kt);
    /**
     * Map of event name to hooks to be called when client is subscribed to the event.
     */
    u(this, hi);
    u(this, ga);
    m(this, kt, t), m(this, ga, r), m(this, dt, new Sd.SubscriptionManager(t)), m(this, hi, new Vh.DefaultMap(() => []));
  }
  get subscriptionManager() {
    return s(this, dt);
  }
  addSubscribeHook(t, r) {
    s(this, hi).get(t).push(r);
  }
  registerEvent(t, r) {
    this.registerPromiseEvent(Promise.resolve({
      kind: "success",
      value: t
    }), r, t.method);
  }
  registerGlobalEvent(t) {
    this.registerGlobalPromiseEvent(Promise.resolve({
      kind: "success",
      value: t
    }), t.method);
  }
  registerPromiseEvent(t, r, n) {
    const o = new Jh(t, r), a = s(this, dt).getGoogChannelsSubscribedToEvent(n, r);
    g(this, tt, xl).call(this, o, n);
    for (const c of a)
      this.emit("event", {
        message: Ed.OutgoingMessage.createFromPromise(t, c),
        event: n
      }), g(this, tt, Oc).call(this, o, c, n);
  }
  registerGlobalPromiseEvent(t, r) {
    const n = new Jh(t, null), o = s(this, dt).getGoogChannelsSubscribedToEventGlobally(r);
    g(this, tt, xl).call(this, n, r);
    for (const a of o)
      this.emit("event", {
        message: Ed.OutgoingMessage.createFromPromise(t, a),
        event: r
      }), g(this, tt, Oc).call(this, n, a, r);
  }
  async subscribe(t, r, n, o) {
    for (const d of t)
      (0, Xh.assertSupportedEvent)(d);
    if (n.length && r.length)
      throw new Cl.InvalidArgumentException("Both userContexts and contexts cannot be specified.");
    s(this, kt).verifyContextsList(r), await s(this, ga).verifyUserContextIdList(n);
    const a = new Set((0, Sd.unrollEvents)(t)), c = /* @__PURE__ */ new Map(), f = new Set(r.length ? r.map((d) => {
      const h = s(this, kt).findTopLevelContextId(d);
      if (!h)
        throw new Cl.InvalidArgumentException("Invalid context id");
      return h;
    }) : s(this, kt).getTopLevelContexts().map((d) => d.id));
    for (const d of a) {
      const h = new Set(s(this, kt).getTopLevelContexts().map((w) => w.id).filter((w) => s(this, dt).isSubscribedTo(d, w)));
      c.set(d, (0, Sd.difference)(f, h));
    }
    const p = s(this, dt).subscribe(t, r, n, o);
    for (const d of p.eventNames)
      for (const h of f)
        for (const w of g(this, tt, El).call(this, d, h, o))
          this.emit("event", {
            message: Ed.OutgoingMessage.createFromPromise(w.event, o),
            event: d
          }), g(this, tt, Oc).call(this, w, o, d);
    for (const [d, h] of c)
      for (const w of h)
        s(this, hi).get(d).forEach((x) => x(w));
    return await this.toggleModulesIfNeeded(), p.id;
  }
  async unsubscribe(t, r) {
    for (const n of t)
      (0, Xh.assertSupportedEvent)(n);
    s(this, dt).unsubscribe(t, r), await this.toggleModulesIfNeeded();
  }
  async unsubscribeByIds(t) {
    s(this, dt).unsubscribeById(t), await this.toggleModulesIfNeeded();
  }
  async toggleModulesIfNeeded() {
    await Promise.all(s(this, kt).getAllContexts().map(async (t) => await t.toggleModulesIfNeeded()));
  }
  clearBufferedEvents(t) {
    var r;
    for (const n of pc.keys()) {
      const o = g(r = to, Tr, so).call(r, n, t);
      s(this, Ns).delete(o);
    }
  }
}
ma = new WeakMap(), Ns = new WeakMap(), kr = new WeakMap(), dt = new WeakMap(), kt = new WeakMap(), hi = new WeakMap(), ga = new WeakMap(), Tr = new WeakSet(), so = function(t, r) {
  return JSON.stringify({ eventName: t, browsingContext: r });
}, tt = new WeakSet(), /**
 * If the event is buffer-able, put it in the buffer.
 */
xl = function(t, r) {
  var o;
  if (!pc.has(r))
    return;
  const n = g(o = to, Tr, so).call(o, r, t.contextId);
  s(this, Ns).has(n) || s(this, Ns).set(n, new ob.Buffer(pc.get(r))), s(this, Ns).get(n).add(t), s(this, ma).get(r).add(t.contextId);
}, /**
 * If the event is buffer-able, mark it as sent to the given contextId and goog:channel.
 */
Oc = function(t, r, n) {
  var f, p;
  if (!pc.has(n))
    return;
  const o = g(f = to, Tr, so).call(f, n, t.contextId), a = Math.max(((p = s(this, kr).get(o)) == null ? void 0 : p.get(r)) ?? 0, t.id), c = s(this, kr).get(o);
  c ? c.set(r, a) : s(this, kr).set(o, /* @__PURE__ */ new Map([[r, a]]));
}, /**
 * Returns events which are buffered and not yet sent to the given goog:channel events.
 */
El = function(t, r, n) {
  var f, p, d;
  const o = g(f = to, Tr, so).call(f, t, r), a = ((p = s(this, kr).get(o)) == null ? void 0 : p.get(n)) ?? -1 / 0, c = ((d = s(this, Ns).get(o)) == null ? void 0 : d.get().filter((h) => h.id > a)) ?? [];
  return r === null && Array.from(s(this, ma).get(t).keys()).filter((h) => (
    // Events without context are already in the result.
    h !== null && // Events from deleted contexts should not be sent.
    s(this, kt).hasContext(h)
  )).map((h) => g(this, tt, El).call(this, t, h, n)).forEach((h) => c.push(...h)), c.sort((h, w) => h.id - w.id);
}, u(sh, Tr);
nd.EventManager = sh;
to = sh;
var cd = {};
Object.defineProperty(cd, "__esModule", { value: !0 });
cd.SpeculationProcessor = void 0;
const ub = Te;
var wa, ya;
class db {
  constructor(e, t) {
    u(this, wa);
    u(this, ya);
    m(this, wa, e), m(this, ya, t);
  }
  onCdpTargetCreated(e) {
    e.cdpClient.on("Preload.prefetchStatusUpdated", (t) => {
      var n;
      let r;
      switch (t.status) {
        case "Running":
          r = "pending";
          break;
        case "Ready":
          r = "ready";
          break;
        case "Success":
          r = "success";
          break;
        case "Failure":
          r = "failure";
          break;
        default:
          (n = s(this, ya)) == null || n.call(this, ub.LogType.debugWarn, `Unknown prefetch status: ${t.status}`);
          return;
      }
      s(this, wa).registerEvent({
        type: "event",
        method: "speculation.prefetchStatusUpdated",
        params: {
          context: t.initiatingFrameId,
          url: t.prefetchUrl,
          status: r
        }
      }, e.id);
    });
  }
}
wa = new WeakMap(), ya = new WeakMap();
cd.SpeculationProcessor = db;
Object.defineProperty(Su, "__esModule", { value: !0 });
Su.BidiServer = void 0;
const lb = Ls, hb = Te, pb = Pu, fb = Iu, mb = Hu, gb = zu, wb = Wu, yb = Gu, vb = td, bb = th, Cb = sd, xb = rd, Eb = nd, Sb = cd;
var va, Dr, pi, Tt, Qt, ba, Ca, fi, xa, Os, cu, uu, du, im;
const oh = class oh extends lb.EventEmitter {
  constructor(t, r, n, o, a, c, f) {
    super();
    u(this, du);
    u(this, va);
    u(this, Dr);
    u(this, pi);
    u(this, Tt);
    u(this, Qt, new vb.BrowsingContextStorage());
    u(this, ba, new xb.RealmStorage());
    u(this, Ca, new Cb.PreloadScriptStorage());
    u(this, fi);
    u(this, xa);
    u(this, Os);
    u(this, cu, (t) => {
      s(this, pi).processCommand(t).catch((r) => {
        var n;
        (n = s(this, Os)) == null || n.call(this, hb.LogType.debugError, r);
      });
    });
    u(this, uu, async (t) => {
      const r = t.message;
      t.googChannel !== null && (r["goog:channel"] = t.googChannel), await s(this, Dr).sendMessage(r);
    });
    m(this, Os, f), m(this, va, new pb.ProcessingQueue(s(this, uu), s(this, Os))), m(this, Dr, t), s(this, Dr).setOnMessage(s(this, cu));
    const p = new gb.ContextConfigStorage(), d = new wb.UserContextStorage(n);
    m(this, Tt, new Eb.EventManager(s(this, Qt), d));
    const h = new bb.NetworkStorage(s(this, Tt), s(this, Qt), n, f);
    m(this, fi, new mb.BluetoothProcessor(s(this, Tt), s(this, Qt))), m(this, xa, new Sb.SpeculationProcessor(s(this, Tt), s(this, Os))), m(this, pi, new fb.CommandProcessor(r, n, s(this, Tt), s(this, Qt), s(this, ba), s(this, Ca), h, p, s(this, fi), d, c, async (w) => {
      await n.sendCommand("Security.setIgnoreCertificateErrors", {
        ignore: w.acceptInsecureCerts ?? !1
      }), p.updateGlobalConfig({
        acceptInsecureCerts: w.acceptInsecureCerts ?? !1,
        userPromptHandler: w.unhandledPromptBehavior,
        prerenderingDisabled: (w == null ? void 0 : w["goog:prerenderingDisabled"]) ?? !1,
        disableNetworkDurableMessages: w == null ? void 0 : w["goog:disableNetworkDurableMessages"]
      }), new yb.CdpTargetManager(r, n, o, s(this, Tt), s(this, Qt), s(this, ba), h, p, s(this, fi), s(this, xa), s(this, Ca), a, f), await n.sendCommand("Target.setDiscoverTargets", {
        discover: !0
      }), await n.sendCommand("Target.setAutoAttach", {
        autoAttach: !0,
        waitForDebuggerOnStart: !0,
        flatten: !0,
        // Browser session should attach to tab instead of the page, so that
        // prerendering is not blocked.
        filter: [
          {
            type: "page",
            exclude: !0
          },
          {}
        ]
      }), await g(this, du, im).call(this);
    }, s(this, Os))), s(this, Tt).on("event", ({ message: w, event: x }) => {
      this.emitOutgoingMessage(w, x);
    }), s(this, pi).on("response", ({ message: w, event: x }) => {
      this.emitOutgoingMessage(w, x);
    });
  }
  /**
   * Creates and starts BiDi Mapper instance.
   */
  static async createAndStart(t, r, n, o, a, c) {
    const [{ browserContextIds: f }, { targetInfos: p }] = await Promise.all([
      n.sendCommand("Target.getBrowserContexts"),
      n.sendCommand("Target.getTargets"),
      // Required for `Browser.downloadWillBegin` events.
      n.sendCommand("Browser.setDownloadBehavior", {
        behavior: "default",
        eventsEnabled: !0
      })
    ]);
    let d = "default";
    for (const w of p)
      if (w.browserContextId && !f.includes(w.browserContextId)) {
        d = w.browserContextId;
        break;
      }
    return new oh(t, r, n, o, d, a, c);
  }
  /**
   * Sends BiDi message.
   */
  emitOutgoingMessage(t, r) {
    s(this, va).add(t, r);
  }
  close() {
    s(this, Dr).close();
  }
};
va = new WeakMap(), Dr = new WeakMap(), pi = new WeakMap(), Tt = new WeakMap(), Qt = new WeakMap(), ba = new WeakMap(), Ca = new WeakMap(), fi = new WeakMap(), xa = new WeakMap(), Os = new WeakMap(), cu = new WeakMap(), uu = new WeakMap(), du = new WeakSet(), im = async function() {
  await Promise.all(s(this, Qt).getTopLevelContexts().map((t) => t.lifecycleLoaded()));
};
let Sl = oh;
Su.BidiServer = Sl;
(function(i) {
  Object.defineProperty(i, "__esModule", { value: !0 }), i.OutgoingMessage = i.EventEmitter = i.BidiServer = void 0;
  var e = Su;
  Object.defineProperty(i, "BidiServer", { enumerable: !0, get: function() {
    return e.BidiServer;
  } });
  var t = Ls;
  Object.defineProperty(i, "EventEmitter", { enumerable: !0, get: function() {
    return t.EventEmitter;
  } });
  var r = Mi;
  Object.defineProperty(i, "OutgoingMessage", { enumerable: !0, get: function() {
    return r.OutgoingMessage;
  } });
})(Eu);
var Nr, Rs, Zt;
const Js = class Js extends Ym {
  constructor(t, r) {
    super();
    u(this, Nr, !1);
    u(this, Rs);
    u(this, Zt, zl.create());
    N(this, "frame");
    /**
     * @internal
     */
    N(this, "onClose", () => {
      Js.sessions.delete(this.id()), m(this, Nr, !0);
    });
    if (this.frame = t, !this.frame.page().browser().cdpSupported)
      return;
    const n = this.frame.page().browser().connection;
    m(this, Rs, n), r ? (s(this, Zt).resolve(r), Js.sessions.set(r, this)) : (async () => {
      try {
        const { result: o } = await n.send("goog:cdp.getSession", {
          context: t._id
        });
        s(this, Zt).resolve(o.session), Js.sessions.set(o.session, this);
      } catch (o) {
        s(this, Zt).reject(o);
      }
    })(), Js.sessions.set(s(this, Zt).value(), this);
  }
  connection() {
  }
  get detached() {
    return s(this, Nr);
  }
  async send(t, r, n) {
    if (s(this, Rs) === void 0)
      throw new H("CDP support is required for this feature. The current browser does not support CDP.");
    if (s(this, Nr))
      throw new Kl(`Protocol error (${t}): Session closed. Most likely the page has been closed.`);
    const o = await s(this, Zt).valueOrThrow(), { result: a } = await s(this, Rs).send("goog:cdp.sendCommand", {
      method: t,
      params: r,
      session: o
    }, n == null ? void 0 : n.timeout);
    return a.result;
  }
  async detach() {
    if (!(s(this, Rs) === void 0 || s(this, Rs).closed || s(this, Nr)))
      try {
        await this.frame.client.send("Target.detachFromTarget", {
          sessionId: this.id()
        });
      } finally {
        this.onClose();
      }
  }
  id() {
    const t = s(this, Zt).value();
    return typeof t == "string" ? t : "";
  }
};
Nr = new WeakMap(), Rs = new WeakMap(), Zt = new WeakMap(), N(Js, "sessions", /* @__PURE__ */ new Map());
let io = Js;
/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
const Pb = Wl("puppeteer:webDriverBiDi:SEND ►"), Ib = Wl("puppeteer:webDriverBiDi:RECV ◀");
var Ea, Dt, mi, Sa, Or, Nt, Pa, Ia, Pl;
class _b extends X {
  constructor(t, r, n, o = 0, a) {
    super();
    u(this, Ia);
    u(this, Ea);
    u(this, Dt);
    u(this, mi);
    u(this, Sa, 0);
    u(this, Or, !1);
    u(this, Nt);
    u(this, Pa, []);
    m(this, Ea, t), m(this, mi, o), m(this, Sa, a ?? 18e4), m(this, Nt, new Qm(n)), m(this, Dt, r), s(this, Dt).onmessage = this.onMessage.bind(this), s(this, Dt).onclose = this.unbind.bind(this);
  }
  get closed() {
    return s(this, Or);
  }
  get url() {
    return s(this, Ea);
  }
  pipeTo(t) {
    s(this, Pa).push(t);
  }
  emit(t, r) {
    process.env.PUPPETEER_WEBDRIVER_BIDI_ONLY === "true" && g(this, Ia, Pl).call(this, r);
    for (const n of s(this, Pa))
      n.emit(t, r);
    return super.emit(t, r);
  }
  send(t, r, n) {
    return s(this, Or) ? Promise.reject(new Zm("Connection closed.")) : s(this, Nt).create(t, n ?? s(this, Sa), (o) => {
      const a = JSON.stringify({
        id: o,
        method: t,
        params: r
      });
      Pb(a), s(this, Dt).send(a);
    });
  }
  /**
   * @internal
   */
  async onMessage(t) {
    var n;
    s(this, mi) && await new Promise((o) => setTimeout(o, s(this, mi))), Ib(t);
    const r = JSON.parse(t);
    if ("type" in r)
      switch (r.type) {
        case "success":
          s(this, Nt).resolve(r.id, r);
          return;
        case "error":
          if (r.id === null)
            break;
          s(this, Nt).reject(r.id, kb(r), `${r.error}: ${r.message}`);
          return;
        case "event":
          if (Tb(r)) {
            (n = io.sessions.get(r.params.session)) == null || n.emit(r.params.event, r.params.params);
            return;
          }
          this.emit(r.method, r.params);
          return;
      }
    "id" in r && s(this, Nt).reject(r.id, `Protocol Error. Message is not in BiDi protocol format: '${t}'`, r.message), Ae(r);
  }
  /**
   * Unbinds the connection, but keeps the transport open. Useful when the transport will
   * be reused by other connection e.g. with different protocol.
   * @internal
   */
  unbind() {
    s(this, Or) || (m(this, Or, !0), s(this, Dt).onmessage = () => {
    }, s(this, Dt).onclose = () => {
    }, s(this, Nt).clear());
  }
  /**
   * Unbinds the connection and closes the transport.
   */
  dispose() {
    this.unbind(), s(this, Dt).close();
  }
  getPendingProtocolErrors() {
    return s(this, Nt).getPendingProtocolErrors();
  }
}
Ea = new WeakMap(), Dt = new WeakMap(), mi = new WeakMap(), Sa = new WeakMap(), Or = new WeakMap(), Nt = new WeakMap(), Pa = new WeakMap(), Ia = new WeakSet(), Pl = function(t) {
  for (const r in t)
    r.startsWith("goog:") ? delete t[r] : typeof t[r] == "object" && t[r] !== null && g(this, Ia, Pl).call(this, t[r]);
};
function kb(i) {
  let e = `${i.error} ${i.message}`;
  return i.stacktrace && (e += ` ${i.stacktrace}`), e;
}
function Tb(i) {
  return i.method.startsWith("goog:cdp.");
}
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
const Db = (i, ...e) => {
  Wl(`bidi:${i}`)(e);
};
async function LC(i) {
  const e = new Ob(), t = new Nb(i), r = {
    send(a) {
      e.emitMessage(JSON.parse(a));
    },
    close() {
      o.close(), t.close(), i.dispose();
    },
    onmessage(a) {
    }
  };
  e.on("bidiResponse", (a) => {
    r.onmessage(JSON.stringify(a));
  });
  const n = new _b(i.url(), r, i._idGenerator, i.delay, i.timeout), o = await Eu.BidiServer.createAndStart(
    e,
    t,
    t.browserClient(),
    /* selfTargetId= */
    "",
    void 0,
    Db
  );
  return n;
}
var _a, Rr, Ar;
class Nb {
  constructor(e) {
    u(this, _a);
    u(this, Rr, /* @__PURE__ */ new Map());
    u(this, Ar);
    m(this, _a, e), m(this, Ar, new Yh(e));
  }
  browserClient() {
    return s(this, Ar);
  }
  getCdpClient(e) {
    const t = s(this, _a).session(e);
    if (!t)
      throw new Error(`Unknown CDP session with id ${e}`);
    if (!s(this, Rr).has(t)) {
      const r = new Yh(t, e, s(this, Ar));
      return s(this, Rr).set(t, r), r;
    }
    return s(this, Rr).get(t);
  }
  close() {
    s(this, Ar).close();
    for (const e of s(this, Rr).values())
      e.close();
  }
}
_a = new WeakMap(), Rr = new WeakMap(), Ar = new WeakMap();
var gi, Mr, ka, Ta;
class Yh extends Eu.EventEmitter {
  constructor(t, r, n) {
    super();
    u(this, gi, !1);
    u(this, Mr);
    N(this, "sessionId");
    u(this, ka);
    u(this, Ta, (t, r) => {
      this.emit(t, r);
    });
    m(this, Mr, t), this.sessionId = r, m(this, ka, n), s(this, Mr).on("*", s(this, Ta));
  }
  browserClient() {
    return s(this, ka);
  }
  async sendCommand(t, ...r) {
    if (!s(this, gi))
      try {
        return await s(this, Mr).send(t, ...r);
      } catch (n) {
        if (s(this, gi))
          return;
        throw n;
      }
  }
  close() {
    s(this, Mr).off("*", s(this, Ta)), m(this, gi, !0);
  }
  isCloseError(t) {
    return t instanceof Kl;
  }
}
gi = new WeakMap(), Mr = new WeakMap(), ka = new WeakMap(), Ta = new WeakMap();
var wi;
class Ob extends Eu.EventEmitter {
  constructor() {
    super(...arguments);
    u(this, wi, async (t) => {
    });
  }
  emitMessage(t) {
    s(this, wi).call(this, t);
  }
  setOnMessage(t) {
    m(this, wi, t);
  }
  async sendMessage(t) {
    this.emit("bidiResponse", t);
  }
  close() {
    m(this, wi, async (t) => {
    });
  }
}
wi = new WeakMap();
/**
 * @license
 * Copyright 2025 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Br, Fr;
class Rb {
  constructor(e, t) {
    u(this, Br);
    u(this, Fr);
    m(this, Fr, e), m(this, Br, t);
  }
  async emulateAdapter(e, t = !0) {
    await s(this, Br).send("bluetooth.simulateAdapter", {
      context: s(this, Fr),
      state: e,
      leSupported: t
    });
  }
  async disableEmulation() {
    await s(this, Br).send("bluetooth.disableSimulation", {
      context: s(this, Fr)
    });
  }
  async simulatePreconnectedPeripheral(e) {
    await s(this, Br).send("bluetooth.simulatePreconnectedPeripheral", {
      context: s(this, Fr),
      address: e.address,
      name: e.name,
      manufacturerData: e.manufacturerData,
      knownServiceUuids: e.knownServiceUuids
    });
  }
}
Br = new WeakMap(), Fr = new WeakMap();
/**
 * @license
 * Copyright 2025 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var As, jr, Da, lu, om;
class Ab {
  constructor(e, t) {
    u(this, lu);
    u(this, As);
    u(this, jr);
    u(this, Da, !1);
    m(this, As, t), m(this, jr, e);
  }
  async waitForDevicePrompt(e, t) {
    const r = zl.create({
      message: `Waiting for \`DeviceRequestPrompt\` failed: ${e}ms exceeded`,
      timeout: e
    }), n = (o) => {
      o.context === s(this, jr) && (r.resolve(new Mb(s(this, jr), o.prompt, s(this, As), o.devices)), s(this, As).off("bluetooth.requestDevicePromptUpdated", n));
    };
    return s(this, As).on("bluetooth.requestDevicePromptUpdated", n), t && t.addEventListener("abort", () => {
      r.reject(t.reason);
    }, { once: !0 }), await g(this, lu, om).call(this), await r.valueOrThrow();
  }
}
As = new WeakMap(), jr = new WeakMap(), Da = new WeakMap(), lu = new WeakSet(), om = async function() {
  s(this, Da) || (m(this, Da, !0), await s(this, As).subscribe(["bluetooth.requestDevicePromptUpdated"], [s(this, jr)]));
};
var yi, vi, bi;
class Mb extends eg {
  constructor(t, r, n, o) {
    super();
    u(this, yi);
    u(this, vi);
    u(this, bi);
    m(this, yi, n), m(this, vi, r), m(this, bi, t), this.devices.push(...o.map((a) => ({
      id: a.id,
      name: a.name ?? "UNKNOWN"
    })));
  }
  async cancel() {
    await s(this, yi).send("bluetooth.handleRequestDevicePrompt", {
      context: s(this, bi),
      prompt: s(this, vi),
      accept: !1
    });
  }
  async select(t) {
    await s(this, yi).send("bluetooth.handleRequestDevicePrompt", {
      context: s(this, bi),
      prompt: s(this, vi),
      accept: !0,
      device: t.id
    });
  }
  waitForDevice() {
    throw new H();
  }
}
yi = new WeakMap(), vi = new WeakMap(), bi = new WeakMap();
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Bb = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, Fb = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
};
let jb = (() => {
  var r, n, o, a, c, f, am, Rc, cm, w;
  let i = X, e = [], t;
  return w = class extends i {
    constructor(P) {
      super();
      u(this, f);
      u(this, r, Bb(this, e));
      u(this, n);
      u(this, o);
      u(this, a, new Mt());
      u(this, c);
      m(this, o, P);
    }
    static from(P) {
      var b;
      const C = new w(P);
      return g(b = C, f, am).call(b), C;
    }
    get disposed() {
      return s(this, a).disposed;
    }
    get request() {
      return s(this, r);
    }
    get navigation() {
      return s(this, n);
    }
    dispose() {
      this[he]();
    }
    [(t = [$s], he)]() {
      s(this, a).dispose(), super[he]();
    }
  }, r = new WeakMap(), n = new WeakMap(), o = new WeakMap(), a = new WeakMap(), c = new WeakMap(), f = new WeakSet(), am = function() {
    const P = s(this, a).use(new X(s(this, o)));
    P.once("closed", () => {
      this.emit("failed", {
        url: s(this, o).url,
        timestamp: /* @__PURE__ */ new Date()
      }), this.dispose();
    }), P.on("request", ({ request: b }) => {
      if (b.navigation === void 0 || // If a request with a navigation ID comes in, then the navigation ID is
      // for this navigation.
      !g(this, f, Rc).call(this, b.navigation))
        return;
      m(this, r, b), this.emit("request", b), s(this, a).use(new X(s(this, r))).on("redirect", (v) => {
        m(this, r, v);
      });
    });
    const C = s(this, a).use(new X(s(this, f, cm)));
    C.on("browsingContext.navigationStarted", (b) => {
      b.context !== s(this, o).id || s(this, n) !== void 0 || m(this, n, w.from(s(this, o)));
    });
    for (const b of [
      "browsingContext.domContentLoaded",
      "browsingContext.load"
    ])
      C.on(b, (D) => {
        D.context !== s(this, o).id || D.navigation === null || !g(this, f, Rc).call(this, D.navigation) || this.dispose();
      });
    for (const [b, D] of [
      ["browsingContext.fragmentNavigated", "fragment"],
      ["browsingContext.navigationFailed", "failed"],
      ["browsingContext.navigationAborted", "aborted"]
    ])
      C.on(b, (v) => {
        v.context !== s(this, o).id || // Note we don't check if `navigation` is null since `null` means the
        // fragment navigated.
        !g(this, f, Rc).call(this, v.navigation) || (this.emit(D, {
          url: v.url,
          timestamp: new Date(v.timestamp)
        }), this.dispose());
      });
  }, Rc = function(P) {
    return s(this, n) !== void 0 && !s(this, n).disposed ? !1 : s(this, c) === void 0 ? (m(this, c, P), !0) : s(this, c) === P;
  }, cm = function() {
    return s(this, o).userContext.browser.session;
  }, (() => {
    const P = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    Fb(w, null, t, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (C) => "dispose" in C, get: (C) => C.dispose }, metadata: P }, null, e), P && Object.defineProperty(w, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: P });
  })(), w;
})();
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Ub = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, Wi = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
}, Il;
let rh = (() => {
  var c, f;
  let i = X, e = [], t, r, n, o, a;
  return f = class extends i {
    constructor(h, w) {
      super();
      u(this, c, Ub(this, e));
      N(this, "disposables", new Mt());
      N(this, "id");
      N(this, "origin");
      N(this, "executionContextId");
      this.id = h, this.origin = w;
    }
    get disposed() {
      return s(this, c) !== void 0;
    }
    get target() {
      return { realm: this.id };
    }
    dispose(h) {
      m(this, c, h), this[he]();
    }
    async disown(h) {
      await this.session.send("script.disown", {
        target: this.target,
        handles: h
      });
    }
    async callFunction(h, w, x = {}) {
      const { result: S } = await this.session.send("script.callFunction", {
        functionDeclaration: h,
        awaitPromise: w,
        target: this.target,
        ...x
      });
      return S;
    }
    async evaluate(h, w, x = {}) {
      const { result: S } = await this.session.send("script.evaluate", {
        expression: h,
        awaitPromise: w,
        target: this.target,
        ...x
      });
      return S;
    }
    async resolveExecutionContextId() {
      if (!this.executionContextId) {
        const { result: h } = await this.session.connection.send("goog:cdp.resolveRealm", { realm: this.id });
        this.executionContextId = h.executionContextId;
      }
      return this.executionContextId;
    }
    [(t = [$s], r = [q((h) => s(h, c))], n = [q((h) => s(h, c))], o = [q((h) => s(h, c))], a = [q((h) => s(h, c))], he)]() {
      s(this, c) ?? m(this, c, "Realm already destroyed, probably because all associated browsing contexts closed."), this.emit("destroyed", { reason: s(this, c) }), this.disposables.dispose(), super[he]();
    }
  }, c = new WeakMap(), (() => {
    const h = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    Wi(f, null, t, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (w) => "dispose" in w, get: (w) => w.dispose }, metadata: h }, null, e), Wi(f, null, r, { kind: "method", name: "disown", static: !1, private: !1, access: { has: (w) => "disown" in w, get: (w) => w.disown }, metadata: h }, null, e), Wi(f, null, n, { kind: "method", name: "callFunction", static: !1, private: !1, access: { has: (w) => "callFunction" in w, get: (w) => w.callFunction }, metadata: h }, null, e), Wi(f, null, o, { kind: "method", name: "evaluate", static: !1, private: !1, access: { has: (w) => "evaluate" in w, get: (w) => w.evaluate }, metadata: h }, null, e), Wi(f, null, a, { kind: "method", name: "resolveExecutionContextId", static: !1, private: !1, access: { has: (w) => "resolveExecutionContextId" in w, get: (w) => w.resolveExecutionContextId }, metadata: h }, null, e), h && Object.defineProperty(f, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: h });
  })(), f;
})();
var Na, hu, um;
const ah = class ah extends rh {
  constructor(t, r) {
    super("", "");
    u(this, hu);
    N(this, "browsingContext");
    N(this, "sandbox");
    u(this, Na, /* @__PURE__ */ new Map());
    this.browsingContext = t, this.sandbox = r;
  }
  static from(t, r) {
    var o;
    const n = new ah(t, r);
    return g(o = n, hu, um).call(o), n;
  }
  get session() {
    return this.browsingContext.userContext.browser.session;
  }
  get target() {
    return { context: this.browsingContext.id, sandbox: this.sandbox };
  }
};
Na = new WeakMap(), hu = new WeakSet(), um = function() {
  this.disposables.use(new X(this.browsingContext)).on("closed", ({ reason: n }) => {
    this.dispose(n);
  });
  const r = this.disposables.use(new X(this.session));
  r.on("script.realmCreated", (n) => {
    n.type !== "window" || n.context !== this.browsingContext.id || n.sandbox !== this.sandbox || (this.id = n.realm, this.origin = n.origin, this.executionContextId = void 0, this.emit("updated", this));
  }), r.on("script.realmCreated", (n) => {
    if (n.type !== "dedicated-worker" || !n.owners.includes(this.id))
      return;
    const o = nh.from(this, n.realm, n.origin);
    s(this, Na).set(o.id, o);
    const a = this.disposables.use(new X(o));
    a.once("destroyed", () => {
      a.removeAllListeners(), s(this, Na).delete(o.id);
    }), this.emit("worker", o);
  });
};
let _l = ah;
var Oa, pu, dm;
class nh extends rh {
  constructor(t, r, n) {
    super(r, n);
    u(this, pu);
    u(this, Oa, /* @__PURE__ */ new Map());
    N(this, "owners");
    this.owners = /* @__PURE__ */ new Set([t]);
  }
  static from(t, r, n) {
    var a;
    const o = new Il(t, r, n);
    return g(a = o, pu, dm).call(a), o;
  }
  get session() {
    return this.owners.values().next().value.session;
  }
}
Oa = new WeakMap(), pu = new WeakSet(), dm = function() {
  const t = this.disposables.use(new X(this.session));
  t.on("script.realmDestroyed", (r) => {
    r.realm === this.id && this.dispose("Realm already destroyed.");
  }), t.on("script.realmCreated", (r) => {
    if (r.type !== "dedicated-worker" || !r.owners.includes(this.id))
      return;
    const n = Il.from(this, r.realm, r.origin);
    s(this, Oa).set(n.id, n), this.disposables.use(new X(n)).once("destroyed", () => {
      s(this, Oa).delete(n.id);
    }), this.emit("worker", n);
  });
};
Il = nh;
var Ra, fu, lm;
const ch = class ch extends rh {
  constructor(t, r, n) {
    super(r, n);
    u(this, fu);
    u(this, Ra, /* @__PURE__ */ new Map());
    N(this, "browser");
    this.browser = t;
  }
  static from(t, r, n) {
    var a;
    const o = new ch(t, r, n);
    return g(a = o, fu, lm).call(a), o;
  }
  get session() {
    return this.browser.session;
  }
};
Ra = new WeakMap(), fu = new WeakSet(), lm = function() {
  const t = this.disposables.use(new X(this.session));
  t.on("script.realmDestroyed", (r) => {
    r.realm === this.id && this.dispose("Realm already destroyed.");
  }), t.on("script.realmCreated", (r) => {
    if (r.type !== "dedicated-worker" || !r.owners.includes(this.id))
      return;
    const n = nh.from(this, r.realm, r.origin);
    s(this, Ra).set(n.id, n), this.disposables.use(new X(n)).once("destroyed", () => {
      s(this, Ra).delete(n.id);
    }), this.emit("worker", n);
  });
};
let kl = ch;
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var $b = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, Lb = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
};
let qb = (() => {
  var r, n, o, a, c, f, p, d, h, hm, $t, S;
  let i = X, e = [], t;
  return S = class extends i {
    constructor(b, D) {
      super();
      u(this, h);
      u(this, r, ($b(this, e), null));
      u(this, n, null);
      u(this, o);
      u(this, a);
      u(this, c);
      u(this, f);
      u(this, p, new Mt());
      u(this, d);
      m(this, f, b), m(this, d, D);
    }
    static from(b, D) {
      var E;
      const v = new S(b, D);
      return g(E = v, h, hm).call(E), v;
    }
    get disposed() {
      return s(this, p).disposed;
    }
    get error() {
      return s(this, o);
    }
    get headers() {
      return s(this, d).request.headers;
    }
    get id() {
      return s(this, d).request.request;
    }
    get initiator() {
      var b, D;
      return {
        ...s(this, d).initiator,
        // Initiator URL is not specified in BiDi.
        // @ts-expect-error non-standard property.
        url: (b = s(this, d).request["goog:resourceInitiator"]) == null ? void 0 : b.url,
        // @ts-expect-error non-standard property.
        stack: (D = s(this, d).request["goog:resourceInitiator"]) == null ? void 0 : D.stack
      };
    }
    get method() {
      return s(this, d).request.method;
    }
    get navigation() {
      return s(this, d).navigation ?? void 0;
    }
    get redirect() {
      return s(this, a);
    }
    get lastRedirect() {
      let b = s(this, a);
      for (; b; ) {
        if (b && !s(b, a))
          return b;
        b = s(b, a);
      }
      return b;
    }
    get response() {
      return s(this, c);
    }
    get url() {
      return s(this, d).request.url;
    }
    get isBlocked() {
      return s(this, d).isBlocked;
    }
    get resourceType() {
      return s(this, d).request["goog:resourceType"] ?? void 0;
    }
    get postData() {
      return s(this, d).request["goog:postData"] ?? void 0;
    }
    get hasPostData() {
      return (s(this, d).request.bodySize ?? 0) > 0;
    }
    async continueRequest({ url: b, method: D, headers: v, cookies: E, body: A }) {
      await s(this, h, $t).send("network.continueRequest", {
        request: this.id,
        url: b,
        method: D,
        headers: v,
        body: A,
        cookies: E
      });
    }
    async failRequest() {
      await s(this, h, $t).send("network.failRequest", {
        request: this.id
      });
    }
    async provideResponse({ statusCode: b, reasonPhrase: D, headers: v, body: E }) {
      await s(this, h, $t).send("network.provideResponse", {
        request: this.id,
        statusCode: b,
        reasonPhrase: D,
        headers: v,
        body: E
      });
    }
    async fetchPostData() {
      if (this.hasPostData)
        return s(this, n) || m(this, n, (async () => {
          const b = await s(this, h, $t).send("network.getData", {
            dataType: "request",
            request: this.id
          });
          if (b.result.bytes.type === "string")
            return b.result.bytes.value;
          throw new H(`Collected request body data of type ${b.result.bytes.type} is not supported`);
        })()), await s(this, n);
    }
    async getResponseContent() {
      return s(this, r) || m(this, r, (async () => {
        try {
          const b = await s(this, h, $t).send("network.getData", {
            dataType: "response",
            request: this.id
          });
          return pp(b.result.bytes.value, b.result.bytes.type === "base64");
        } catch (b) {
          throw b instanceof Fc && b.originalMessage.includes("No resource with given identifier found") ? new Fc("Could not load response body for this request. This might happen if the request is a preflight request.") : b;
        }
      })()), await s(this, r);
    }
    async continueWithAuth(b) {
      b.action === "provideCredentials" ? await s(this, h, $t).send("network.continueWithAuth", {
        request: this.id,
        action: b.action,
        credentials: b.credentials
      }) : await s(this, h, $t).send("network.continueWithAuth", {
        request: this.id,
        action: b.action
      });
    }
    dispose() {
      this[he]();
    }
    [(t = [$s], he)]() {
      s(this, p).dispose(), super[he]();
    }
    timing() {
      return s(this, d).request.timings;
    }
  }, r = new WeakMap(), n = new WeakMap(), o = new WeakMap(), a = new WeakMap(), c = new WeakMap(), f = new WeakMap(), p = new WeakMap(), d = new WeakMap(), h = new WeakSet(), hm = function() {
    s(this, p).use(new X(s(this, f))).once("closed", ({ reason: v }) => {
      m(this, o, v), this.emit("error", s(this, o)), this.dispose();
    });
    const D = s(this, p).use(new X(s(this, h, $t)));
    D.on("network.beforeRequestSent", (v) => {
      if (v.context !== s(this, f).id || v.request.request !== this.id)
        return;
      const E = s(this, d).request.headers.find((l) => l.name.toLowerCase() === "authorization"), R = v.request.headers.find((l) => l.name.toLowerCase() === "authorization") && !E;
      v.redirectCount !== s(this, d).redirectCount + 1 && !R || (m(this, a, S.from(s(this, f), v)), this.emit("redirect", s(this, a)), this.dispose());
    }), D.on("network.authRequired", (v) => {
      v.context !== s(this, f).id || v.request.request !== this.id || // Don't try to authenticate for events that are not blocked
      !v.isBlocked || this.emit("authenticate", void 0);
    }), D.on("network.fetchError", (v) => {
      v.context !== s(this, f).id || v.request.request !== this.id || s(this, d).redirectCount !== v.redirectCount || (m(this, o, v.errorText), this.emit("error", s(this, o)), this.dispose());
    }), D.on("network.responseCompleted", (v) => {
      v.context !== s(this, f).id || v.request.request !== this.id || s(this, d).redirectCount !== v.redirectCount || (m(this, c, v.response), s(this, d).request.timings = v.request.timings, this.emit("success", s(this, c)), !(s(this, c).status >= 300 && s(this, c).status < 400) && this.dispose());
    });
  }, $t = function() {
    return s(this, f).userContext.browser.session;
  }, (() => {
    const b = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    Lb(S, null, t, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (D) => "dispose" in D, get: (D) => D.dispose }, metadata: b }, null, e), b && Object.defineProperty(S, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: b });
  })(), S;
})();
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Hb = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, Qh = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
};
let zb = (() => {
  var n, o, a, c, pm, Tl, d;
  let i = X, e = [], t, r;
  return d = class extends i {
    constructor(x, S) {
      super();
      u(this, c);
      u(this, n, Hb(this, e));
      u(this, o);
      u(this, a, new Mt());
      N(this, "browsingContext");
      N(this, "info");
      this.browsingContext = x, this.info = S;
    }
    static from(x, S) {
      var C;
      const P = new d(x, S);
      return g(C = P, c, pm).call(C), P;
    }
    get closed() {
      return s(this, n) !== void 0;
    }
    get disposed() {
      return this.closed;
    }
    get handled() {
      return this.info.handler === "accept" || this.info.handler === "dismiss" ? !0 : s(this, o) !== void 0;
    }
    get result() {
      return s(this, o);
    }
    dispose(x) {
      m(this, n, x), this[he]();
    }
    async handle(x = {}) {
      return await s(this, c, Tl).send("browsingContext.handleUserPrompt", {
        ...x,
        context: this.info.context
      }), s(this, o);
    }
    [(t = [$s], r = [q((x) => s(x, n))], he)]() {
      s(this, n) ?? m(this, n, "User prompt already closed, probably because the associated browsing context was destroyed."), this.emit("closed", { reason: s(this, n) }), s(this, a).dispose(), super[he]();
    }
  }, n = new WeakMap(), o = new WeakMap(), a = new WeakMap(), c = new WeakSet(), pm = function() {
    s(this, a).use(new X(this.browsingContext)).once("closed", ({ reason: P }) => {
      this.dispose(`User prompt already closed: ${P}`);
    }), s(this, a).use(new X(s(this, c, Tl))).on("browsingContext.userPromptClosed", (P) => {
      P.context === this.browsingContext.id && (m(this, o, P), this.emit("handled", P), this.dispose("User prompt already handled."));
    });
  }, Tl = function() {
    return this.browsingContext.userContext.browser.session;
  }, (() => {
    const x = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    Qh(d, null, t, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (S) => "dispose" in S, get: (S) => S.dispose }, metadata: x }, null, e), Qh(d, null, r, { kind: "method", name: "handle", static: !1, private: !1, access: { has: (S) => "handle" in S, get: (S) => S.handle }, metadata: x }, null, e), x && Object.defineProperty(d, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: x });
  })(), d;
})();
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Kb = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, ne = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
};
let Wb = (() => {
  var Z, L, fe, Ee, ft, Jr, jt, as, Fi, ji, Y, fm, oe, Dl, J;
  let i = X, e = [], t, r, n, o, a, c, f, p, d, h, w, x, S, P, C, b, D, v, E, A, R, l, y, k, T, M, $;
  return J = class extends i {
    constructor(I, _, z, Se, mt) {
      super();
      u(this, Y);
      u(this, Z, Kb(this, e));
      u(this, L);
      u(this, fe);
      u(this, Ee, /* @__PURE__ */ new Map());
      u(this, ft, new Mt());
      u(this, Jr, /* @__PURE__ */ new Map());
      u(this, jt, /* @__PURE__ */ new Map());
      N(this, "defaultRealm");
      N(this, "id");
      N(this, "parent");
      N(this, "userContext");
      N(this, "originalOpener");
      u(this, as, { javaScriptEnabled: !0 });
      u(this, Fi);
      u(this, ji);
      m(this, fe, Se), this.id = z, this.parent = _, this.userContext = I, this.originalOpener = mt, this.defaultRealm = g(this, Y, Dl).call(this), m(this, Fi, new Rb(this.id, s(this, Y, oe))), m(this, ji, new Ab(this.id, s(this, Y, oe)));
    }
    static from(I, _, z, Se, mt) {
      var fh;
      const Yr = new J(I, _, z, Se, mt);
      return g(fh = Yr, Y, fm).call(fh), Yr;
    }
    get children() {
      return s(this, Ee).values();
    }
    get closed() {
      return s(this, L) !== void 0;
    }
    get disposed() {
      return this.closed;
    }
    get realms() {
      const I = this;
      return function* () {
        yield I.defaultRealm, yield* s(I, Jr).values();
      }();
    }
    get top() {
      let I = this;
      for (let { parent: _ } = I; _; { parent: _ } = I)
        I = _;
      return I;
    }
    get url() {
      return s(this, fe);
    }
    dispose(I) {
      m(this, L, I);
      for (const _ of s(this, Ee).values())
        _.dispose("Parent browsing context was disposed");
      this[he]();
    }
    async activate() {
      await s(this, Y, oe).send("browsingContext.activate", {
        context: this.id
      });
    }
    async captureScreenshot(I = {}) {
      const { result: { data: _ } } = await s(this, Y, oe).send("browsingContext.captureScreenshot", {
        context: this.id,
        ...I
      });
      return _;
    }
    async close(I) {
      await Promise.all([...s(this, Ee).values()].map(async (_) => {
        await _.close(I);
      })), await s(this, Y, oe).send("browsingContext.close", {
        context: this.id,
        promptUnload: I
      });
    }
    async traverseHistory(I) {
      await s(this, Y, oe).send("browsingContext.traverseHistory", {
        context: this.id,
        delta: I
      });
    }
    async navigate(I, _) {
      await s(this, Y, oe).send("browsingContext.navigate", {
        context: this.id,
        url: I,
        wait: _
      });
    }
    async reload(I = {}) {
      await s(this, Y, oe).send("browsingContext.reload", {
        context: this.id,
        ...I
      });
    }
    async setCacheBehavior(I) {
      await s(this, Y, oe).send("network.setCacheBehavior", {
        contexts: [this.id],
        cacheBehavior: I
      });
    }
    async print(I = {}) {
      const { result: { data: _ } } = await s(this, Y, oe).send("browsingContext.print", {
        context: this.id,
        ...I
      });
      return _;
    }
    async handleUserPrompt(I = {}) {
      await s(this, Y, oe).send("browsingContext.handleUserPrompt", {
        context: this.id,
        ...I
      });
    }
    async setViewport(I = {}) {
      await s(this, Y, oe).send("browsingContext.setViewport", {
        context: this.id,
        ...I
      });
    }
    async performActions(I) {
      await s(this, Y, oe).send("input.performActions", {
        context: this.id,
        actions: I
      });
    }
    async releaseActions() {
      await s(this, Y, oe).send("input.releaseActions", {
        context: this.id
      });
    }
    createWindowRealm(I) {
      return g(this, Y, Dl).call(this, I);
    }
    async addPreloadScript(I, _ = {}) {
      return await this.userContext.browser.addPreloadScript(I, {
        ..._,
        contexts: [this]
      });
    }
    async addIntercept(I) {
      const { result: { intercept: _ } } = await this.userContext.browser.session.send("network.addIntercept", {
        ...I,
        contexts: [this.id]
      });
      return _;
    }
    async removePreloadScript(I) {
      await this.userContext.browser.removePreloadScript(I);
    }
    async setGeolocationOverride(I) {
      if (!("coordinates" in I))
        throw new Error("Missing coordinates");
      await this.userContext.browser.session.send("emulation.setGeolocationOverride", {
        coordinates: I.coordinates,
        contexts: [this.id]
      });
    }
    async setTimezoneOverride(I) {
      I != null && I.startsWith("GMT") && (I = I == null ? void 0 : I.replace("GMT", "")), await this.userContext.browser.session.send("emulation.setTimezoneOverride", {
        timezone: I ?? null,
        contexts: [this.id]
      });
    }
    async setScreenOrientationOverride(I) {
      await s(this, Y, oe).send("emulation.setScreenOrientationOverride", {
        screenOrientation: I,
        contexts: [this.id]
      });
    }
    async getCookies(I = {}) {
      const { result: { cookies: _ } } = await s(this, Y, oe).send("storage.getCookies", {
        ...I,
        partition: {
          type: "context",
          context: this.id
        }
      });
      return _;
    }
    async setCookie(I) {
      await s(this, Y, oe).send("storage.setCookie", {
        cookie: I,
        partition: {
          type: "context",
          context: this.id
        }
      });
    }
    async setFiles(I, _) {
      await s(this, Y, oe).send("input.setFiles", {
        context: this.id,
        element: I,
        files: _
      });
    }
    async subscribe(I) {
      await s(this, Y, oe).subscribe(I, [this.id]);
    }
    async addInterception(I) {
      await s(this, Y, oe).subscribe(I, [this.id]);
    }
    [(t = [$s], r = [q((I) => s(I, L))], n = [q((I) => s(I, L))], o = [q((I) => s(I, L))], a = [q((I) => s(I, L))], c = [q((I) => s(I, L))], f = [q((I) => s(I, L))], p = [q((I) => s(I, L))], d = [q((I) => s(I, L))], h = [q((I) => s(I, L))], w = [q((I) => s(I, L))], x = [q((I) => s(I, L))], S = [q((I) => s(I, L))], P = [q((I) => s(I, L))], C = [q((I) => s(I, L))], b = [q((I) => s(I, L))], D = [q((I) => s(I, L))], v = [q((I) => s(I, L))], E = [q((I) => s(I, L))], A = [q((I) => s(I, L))], R = [q((I) => s(I, L))], l = [q((I) => s(I, L))], y = [q((I) => s(I, L))], k = [q((I) => s(I, L))], T = [q((I) => s(I, L))], he)]() {
      s(this, L) ?? m(this, L, "Browsing context already closed, probably because the user context closed."), this.emit("closed", { reason: s(this, L) }), s(this, ft).dispose(), super[he]();
    }
    async deleteCookie(...I) {
      await Promise.all(I.map(async (_) => {
        await s(this, Y, oe).send("storage.deleteCookies", {
          filter: _,
          partition: {
            type: "context",
            context: this.id
          }
        });
      }));
    }
    async locateNodes(I, _) {
      return (await s(this, Y, oe).send("browsingContext.locateNodes", {
        context: this.id,
        locator: I,
        startNodes: _.length ? _ : void 0
      })).result.nodes;
    }
    async setJavaScriptEnabled(I) {
      await this.userContext.browser.session.send("emulation.setScriptingEnabled", {
        // Enabled `null` means `default`, `false` means `disabled`.
        enabled: I ? null : !1,
        contexts: [this.id]
      }), s(this, as).javaScriptEnabled = I;
    }
    isJavaScriptEnabled() {
      return s(this, as).javaScriptEnabled;
    }
    async setUserAgent(I) {
      await s(this, Y, oe).send("emulation.setUserAgentOverride", {
        userAgent: I,
        contexts: [this.id]
      });
    }
    async setOfflineMode(I) {
      await s(this, Y, oe).send("emulation.setNetworkConditions", {
        networkConditions: I ? {
          type: "offline"
        } : null,
        contexts: [this.id]
      });
    }
    get bluetooth() {
      return s(this, Fi);
    }
    async waitForDevicePrompt(I, _) {
      return await s(this, ji).waitForDevicePrompt(I, _);
    }
    async setExtraHTTPHeaders(I) {
      await s(this, Y, oe).send("network.setExtraHeaders", {
        headers: Object.entries(I).map(([_, z]) => (Ve(fp(z), `Expected value of header "${_}" to be String, but "${typeof z}" is found.`), {
          name: _.toLowerCase(),
          value: { type: "string", value: z }
        })),
        contexts: [this.id]
      });
    }
  }, Z = new WeakMap(), L = new WeakMap(), fe = new WeakMap(), Ee = new WeakMap(), ft = new WeakMap(), Jr = new WeakMap(), jt = new WeakMap(), as = new WeakMap(), Fi = new WeakMap(), ji = new WeakMap(), Y = new WeakSet(), fm = function() {
    s(this, ft).use(new X(this.userContext)).once("closed", ({ reason: z }) => {
      this.dispose(`Browsing context already closed: ${z}`);
    });
    const _ = s(this, ft).use(new X(s(this, Y, oe)));
    _.on("input.fileDialogOpened", (z) => {
      this.id === z.context && this.emit("filedialogopened", z);
    }), _.on("browsingContext.contextCreated", (z) => {
      if (z.parent !== this.id)
        return;
      const Se = J.from(this.userContext, this, z.context, z.url, z.originalOpener);
      s(this, Ee).set(z.context, Se);
      const mt = s(this, ft).use(new X(Se));
      mt.once("closed", () => {
        mt.removeAllListeners(), s(this, Ee).delete(Se.id);
      }), this.emit("browsingcontext", { browsingContext: Se });
    }), _.on("browsingContext.contextDestroyed", (z) => {
      z.context === this.id && this.dispose("Browsing context already closed.");
    }), _.on("browsingContext.historyUpdated", (z) => {
      z.context === this.id && (m(this, fe, z.url), this.emit("historyUpdated", void 0));
    }), _.on("browsingContext.domContentLoaded", (z) => {
      z.context === this.id && (m(this, fe, z.url), this.emit("DOMContentLoaded", void 0));
    }), _.on("browsingContext.load", (z) => {
      z.context === this.id && (m(this, fe, z.url), this.emit("load", void 0));
    }), _.on("browsingContext.navigationStarted", (z) => {
      if (z.context !== this.id)
        return;
      for (const [mt, Yr] of s(this, jt))
        Yr.disposed && s(this, jt).delete(mt);
      if (s(this, Z) !== void 0 && !s(this, Z).disposed)
        return;
      m(this, Z, jb.from(this));
      const Se = s(this, ft).use(new X(s(this, Z)));
      for (const mt of ["fragment", "failed", "aborted"])
        Se.once(mt, ({ url: Yr }) => {
          Se[he](), m(this, fe, Yr);
        });
      this.emit("navigation", { navigation: s(this, Z) });
    }), _.on("network.beforeRequestSent", (z) => {
      if (z.context !== this.id || s(this, jt).has(z.request.request))
        return;
      const Se = qb.from(this, z);
      s(this, jt).set(Se.id, Se), this.emit("request", { request: Se });
    }), _.on("log.entryAdded", (z) => {
      z.source.context === this.id && this.emit("log", { entry: z });
    }), _.on("browsingContext.userPromptOpened", (z) => {
      if (z.context !== this.id)
        return;
      const Se = zb.from(this, z);
      this.emit("userprompt", { userPrompt: Se });
    });
  }, oe = function() {
    return this.userContext.browser.session;
  }, Dl = function(I) {
    const _ = _l.from(this, I);
    return _.on("worker", (z) => {
      this.emit("worker", { realm: z });
    }), _;
  }, (() => {
    const I = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    M = [q((_) => s(_, L))], $ = [q((_) => s(_, L))], ne(J, null, t, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (_) => "dispose" in _, get: (_) => _.dispose }, metadata: I }, null, e), ne(J, null, r, { kind: "method", name: "activate", static: !1, private: !1, access: { has: (_) => "activate" in _, get: (_) => _.activate }, metadata: I }, null, e), ne(J, null, n, { kind: "method", name: "captureScreenshot", static: !1, private: !1, access: { has: (_) => "captureScreenshot" in _, get: (_) => _.captureScreenshot }, metadata: I }, null, e), ne(J, null, o, { kind: "method", name: "close", static: !1, private: !1, access: { has: (_) => "close" in _, get: (_) => _.close }, metadata: I }, null, e), ne(J, null, a, { kind: "method", name: "traverseHistory", static: !1, private: !1, access: { has: (_) => "traverseHistory" in _, get: (_) => _.traverseHistory }, metadata: I }, null, e), ne(J, null, c, { kind: "method", name: "navigate", static: !1, private: !1, access: { has: (_) => "navigate" in _, get: (_) => _.navigate }, metadata: I }, null, e), ne(J, null, f, { kind: "method", name: "reload", static: !1, private: !1, access: { has: (_) => "reload" in _, get: (_) => _.reload }, metadata: I }, null, e), ne(J, null, p, { kind: "method", name: "setCacheBehavior", static: !1, private: !1, access: { has: (_) => "setCacheBehavior" in _, get: (_) => _.setCacheBehavior }, metadata: I }, null, e), ne(J, null, d, { kind: "method", name: "print", static: !1, private: !1, access: { has: (_) => "print" in _, get: (_) => _.print }, metadata: I }, null, e), ne(J, null, h, { kind: "method", name: "handleUserPrompt", static: !1, private: !1, access: { has: (_) => "handleUserPrompt" in _, get: (_) => _.handleUserPrompt }, metadata: I }, null, e), ne(J, null, w, { kind: "method", name: "setViewport", static: !1, private: !1, access: { has: (_) => "setViewport" in _, get: (_) => _.setViewport }, metadata: I }, null, e), ne(J, null, x, { kind: "method", name: "performActions", static: !1, private: !1, access: { has: (_) => "performActions" in _, get: (_) => _.performActions }, metadata: I }, null, e), ne(J, null, S, { kind: "method", name: "releaseActions", static: !1, private: !1, access: { has: (_) => "releaseActions" in _, get: (_) => _.releaseActions }, metadata: I }, null, e), ne(J, null, P, { kind: "method", name: "createWindowRealm", static: !1, private: !1, access: { has: (_) => "createWindowRealm" in _, get: (_) => _.createWindowRealm }, metadata: I }, null, e), ne(J, null, C, { kind: "method", name: "addPreloadScript", static: !1, private: !1, access: { has: (_) => "addPreloadScript" in _, get: (_) => _.addPreloadScript }, metadata: I }, null, e), ne(J, null, b, { kind: "method", name: "addIntercept", static: !1, private: !1, access: { has: (_) => "addIntercept" in _, get: (_) => _.addIntercept }, metadata: I }, null, e), ne(J, null, D, { kind: "method", name: "removePreloadScript", static: !1, private: !1, access: { has: (_) => "removePreloadScript" in _, get: (_) => _.removePreloadScript }, metadata: I }, null, e), ne(J, null, v, { kind: "method", name: "setGeolocationOverride", static: !1, private: !1, access: { has: (_) => "setGeolocationOverride" in _, get: (_) => _.setGeolocationOverride }, metadata: I }, null, e), ne(J, null, E, { kind: "method", name: "setTimezoneOverride", static: !1, private: !1, access: { has: (_) => "setTimezoneOverride" in _, get: (_) => _.setTimezoneOverride }, metadata: I }, null, e), ne(J, null, A, { kind: "method", name: "setScreenOrientationOverride", static: !1, private: !1, access: { has: (_) => "setScreenOrientationOverride" in _, get: (_) => _.setScreenOrientationOverride }, metadata: I }, null, e), ne(J, null, R, { kind: "method", name: "getCookies", static: !1, private: !1, access: { has: (_) => "getCookies" in _, get: (_) => _.getCookies }, metadata: I }, null, e), ne(J, null, l, { kind: "method", name: "setCookie", static: !1, private: !1, access: { has: (_) => "setCookie" in _, get: (_) => _.setCookie }, metadata: I }, null, e), ne(J, null, y, { kind: "method", name: "setFiles", static: !1, private: !1, access: { has: (_) => "setFiles" in _, get: (_) => _.setFiles }, metadata: I }, null, e), ne(J, null, k, { kind: "method", name: "subscribe", static: !1, private: !1, access: { has: (_) => "subscribe" in _, get: (_) => _.subscribe }, metadata: I }, null, e), ne(J, null, T, { kind: "method", name: "addInterception", static: !1, private: !1, access: { has: (_) => "addInterception" in _, get: (_) => _.addInterception }, metadata: I }, null, e), ne(J, null, M, { kind: "method", name: "deleteCookie", static: !1, private: !1, access: { has: (_) => "deleteCookie" in _, get: (_) => _.deleteCookie }, metadata: I }, null, e), ne(J, null, $, { kind: "method", name: "locateNodes", static: !1, private: !1, access: { has: (_) => "locateNodes" in _, get: (_) => _.locateNodes }, metadata: I }, null, e), I && Object.defineProperty(J, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: I });
  })(), J;
})();
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Gb = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, on = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
};
let qc = (() => {
  var f, p, d, h, w, x, mm, Gs;
  let i = X, e = [], t, r, n, o, a, c;
  return f = class extends i {
    constructor(D, v) {
      super();
      u(this, x);
      u(this, p, Gb(this, e));
      // Note these are only top-level contexts.
      u(this, d, /* @__PURE__ */ new Map());
      u(this, h, new Mt());
      u(this, w);
      N(this, "browser");
      m(this, w, v), this.browser = D;
    }
    static create(D, v) {
      var A;
      const E = new f(D, v);
      return g(A = E, x, mm).call(A), E;
    }
    get browsingContexts() {
      return s(this, d).values();
    }
    get closed() {
      return s(this, p) !== void 0;
    }
    get disposed() {
      return this.closed;
    }
    get id() {
      return s(this, w);
    }
    dispose(D) {
      m(this, p, D), this[he]();
    }
    async createBrowsingContext(D, v = {}) {
      var R;
      const { result: { context: E } } = await s(this, x, Gs).send("browsingContext.create", {
        type: D,
        ...v,
        referenceContext: (R = v.referenceContext) == null ? void 0 : R.id,
        userContext: s(this, w)
      }), A = s(this, d).get(E);
      return Ve(A, "The WebDriver BiDi implementation is failing to create a browsing context correctly."), A;
    }
    async remove() {
      try {
        await s(this, x, Gs).send("browser.removeUserContext", {
          userContext: s(this, w)
        });
      } finally {
        this.dispose("User context already closed.");
      }
    }
    async getCookies(D = {}, v = void 0) {
      const { result: { cookies: E } } = await s(this, x, Gs).send("storage.getCookies", {
        ...D,
        partition: {
          type: "storageKey",
          userContext: s(this, w),
          sourceOrigin: v
        }
      });
      return E;
    }
    async setCookie(D, v) {
      await s(this, x, Gs).send("storage.setCookie", {
        cookie: D,
        partition: {
          type: "storageKey",
          sourceOrigin: v,
          userContext: this.id
        }
      });
    }
    async setPermissions(D, v, E) {
      await s(this, x, Gs).send("permissions.setPermission", {
        origin: D,
        descriptor: v,
        state: E,
        userContext: s(this, w)
      });
    }
    [(t = [$s], r = [q((D) => s(D, p))], n = [q((D) => s(D, p))], o = [q((D) => s(D, p))], a = [q((D) => s(D, p))], c = [q((D) => s(D, p))], he)]() {
      s(this, p) ?? m(this, p, "User context already closed, probably because the browser disconnected/closed."), this.emit("closed", { reason: s(this, p) }), s(this, h).dispose(), super[he]();
    }
  }, p = new WeakMap(), d = new WeakMap(), h = new WeakMap(), w = new WeakMap(), x = new WeakSet(), mm = function() {
    const D = s(this, h).use(new X(this.browser));
    D.once("closed", ({ reason: E }) => {
      this.dispose(`User context was closed: ${E}`);
    }), D.once("disconnected", ({ reason: E }) => {
      this.dispose(`User context was closed: ${E}`);
    }), s(this, h).use(new X(s(this, x, Gs))).on("browsingContext.contextCreated", (E) => {
      if (E.parent || E.userContext !== s(this, w))
        return;
      const A = Wb.from(this, void 0, E.context, E.url, E.originalOpener);
      s(this, d).set(A.id, A);
      const R = s(this, h).use(new X(A));
      R.on("closed", () => {
        R.removeAllListeners(), s(this, d).delete(A.id);
      }), this.emit("browsingcontext", { browsingContext: A });
    });
  }, Gs = function() {
    return this.browser.session;
  }, (() => {
    const D = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    on(f, null, t, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (v) => "dispose" in v, get: (v) => v.dispose }, metadata: D }, null, e), on(f, null, r, { kind: "method", name: "createBrowsingContext", static: !1, private: !1, access: { has: (v) => "createBrowsingContext" in v, get: (v) => v.createBrowsingContext }, metadata: D }, null, e), on(f, null, n, { kind: "method", name: "remove", static: !1, private: !1, access: { has: (v) => "remove" in v, get: (v) => v.remove }, metadata: D }, null, e), on(f, null, o, { kind: "method", name: "getCookies", static: !1, private: !1, access: { has: (v) => "getCookies" in v, get: (v) => v.getCookies }, metadata: D }, null, e), on(f, null, a, { kind: "method", name: "setCookie", static: !1, private: !1, access: { has: (v) => "setCookie" in v, get: (v) => v.setCookie }, metadata: D }, null, e), on(f, null, c, { kind: "method", name: "setPermissions", static: !1, private: !1, access: { has: (v) => "setPermissions" in v, get: (v) => v.setPermissions }, metadata: D }, null, e), D && Object.defineProperty(f, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: D });
  })(), N(f, "DEFAULT", "default"), f;
})();
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Wr, gm, Nl;
class sc {
  static deserialize(e) {
    var t, r, n, o;
    if (!e) {
      Ae("Service did not produce a result.");
      return;
    }
    switch (e.type) {
      case "array":
        return (t = e.value) == null ? void 0 : t.map((a) => this.deserialize(a));
      case "set":
        return (r = e.value) == null ? void 0 : r.reduce((a, c) => a.add(this.deserialize(c)), /* @__PURE__ */ new Set());
      case "object":
        return (n = e.value) == null ? void 0 : n.reduce((a, c) => {
          const { key: f, value: p } = g(this, Wr, Nl).call(this, c);
          return a[f] = p, a;
        }, {});
      case "map":
        return (o = e.value) == null ? void 0 : o.reduce((a, c) => {
          const { key: f, value: p } = g(this, Wr, Nl).call(this, c);
          return a.set(f, p);
        }, /* @__PURE__ */ new Map());
      case "promise":
        return {};
      case "regexp":
        return new RegExp(e.value.pattern, e.value.flags);
      case "date":
        return new Date(e.value);
      case "undefined":
        return;
      case "null":
        return null;
      case "number":
        return g(this, Wr, gm).call(this, e.value);
      case "bigint":
        return BigInt(e.value);
      case "boolean":
        return !!e.value;
      case "string":
        return e.value;
    }
    Ae(`Deserialization of type ${e.type} not supported.`);
  }
}
Wr = new WeakSet(), gm = function(e) {
  switch (e) {
    case "-0":
      return -0;
    case "NaN":
      return NaN;
    case "Infinity":
      return 1 / 0;
    case "-Infinity":
      return -1 / 0;
    default:
      return e;
  }
}, Nl = function([e, t]) {
  const r = typeof e == "string" ? e : this.deserialize(e), n = this.deserialize(t);
  return { key: r, value: n };
}, u(sc, Wr);
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Ot, Ci;
const uh = class uh extends tg {
  constructor(t, r) {
    super();
    u(this, Ot);
    N(this, "realm");
    u(this, Ci, !1);
    m(this, Ot, t), this.realm = r;
  }
  static from(t, r) {
    return new uh(t, r);
  }
  get disposed() {
    return s(this, Ci);
  }
  async jsonValue() {
    return await this.evaluate((t) => t);
  }
  asElement() {
    return null;
  }
  async dispose() {
    s(this, Ci) || (m(this, Ci, !0), await this.realm.destroyHandles([this]));
  }
  get isPrimitiveValue() {
    switch (s(this, Ot).type) {
      case "string":
      case "number":
      case "bigint":
      case "boolean":
      case "undefined":
      case "null":
        return !0;
      default:
        return !1;
    }
  }
  toString() {
    return this.isPrimitiveValue ? "JSHandle:" + sc.deserialize(s(this, Ot)) : "JSHandle@" + s(this, Ot).type;
  }
  get id() {
    return "handle" in s(this, Ot) ? s(this, Ot).handle : void 0;
  }
  remoteValue() {
    return s(this, Ot);
  }
  remoteObject() {
    throw new H("Not available in WebDriver BiDi");
  }
};
Ot = new WeakMap(), Ci = new WeakMap();
let zr = uh;
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Vb = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, Zh = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
}, Xb = function(i, e, t) {
  if (e != null) {
    if (typeof e != "object" && typeof e != "function") throw new TypeError("Object expected.");
    var r, n;
    if (t) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      r = e[Symbol.asyncDispose];
    }
    if (r === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      r = e[Symbol.dispose], t && (n = r);
    }
    if (typeof r != "function") throw new TypeError("Object not disposable.");
    n && (r = function() {
      try {
        n.call(this);
      } catch (o) {
        return Promise.reject(o);
      }
    }), i.stack.push({ value: e, dispose: r, async: t });
  } else t && i.stack.push({ async: !0 });
  return e;
}, Jb = /* @__PURE__ */ function(i) {
  return function(e) {
    function t(a) {
      e.error = e.hasError ? new i(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
    }
    var r, n = 0;
    function o() {
      for (; r = e.stack.pop(); )
        try {
          if (!r.async && n === 1) return n = 0, e.stack.push(r), Promise.resolve().then(o);
          if (r.dispose) {
            var a = r.dispose.call(r.value);
            if (r.async) return n |= 2, Promise.resolve(a).then(o, function(c) {
              return t(c), o();
            });
          } else n |= 1;
        } catch (c) {
          t(c);
        }
      if (n === 1) return e.hasError ? Promise.reject(e.error) : Promise.resolve();
      if (e.hasError) throw e.error;
    }
    return o();
  };
}(typeof SuppressedError == "function" ? SuppressedError : function(i, e, t) {
  var r = new Error(t);
  return r.name = "SuppressedError", r.error = i, r.suppressed = e, r;
});
let oo = (() => {
  var n, o;
  let i = sg, e = [], t, r;
  return o = class extends i {
    constructor(f, p) {
      super(zr.from(f, p));
      u(this, n, Vb(this, e));
    }
    static from(f, p) {
      return new o(f, p);
    }
    get realm() {
      return this.handle.realm;
    }
    get frame() {
      return this.realm.environment;
    }
    remoteValue() {
      return this.handle.remoteValue();
    }
    async autofill(f) {
      const p = this.frame.client, h = (await p.send("DOM.describeNode", {
        objectId: this.handle.id
      })).node.backendNodeId, w = this.frame._id;
      await p.send("Autofill.trigger", {
        fieldId: h,
        frameId: w,
        card: f.creditCard
      });
    }
    async contentFrame() {
      const f = { stack: [], error: void 0, hasError: !1 };
      try {
        const d = Xb(f, await this.evaluateHandle((h) => {
          if (h instanceof HTMLIFrameElement || h instanceof HTMLFrameElement)
            return h.contentWindow;
        }), !1).remoteValue();
        return d.type === "window" ? this.frame.page().frames().find((h) => h._id === d.value.context) ?? null : null;
      } catch (p) {
        f.error = p, f.hasError = !0;
      } finally {
        Jb(f);
      }
    }
    async uploadFile(...f) {
      const p = rg.value.path;
      p && (f = f.map((d) => p.win32.isAbsolute(d) || p.posix.isAbsolute(d) ? d : p.resolve(d))), await this.frame.setFiles(this, f);
    }
    async *queryAXTree(f, p) {
      const d = await this.frame.locateNodes(this, {
        type: "accessibility",
        value: {
          role: p,
          name: f
        }
      });
      return yield* mp.map(d, (h) => Promise.resolve(o.from(h, this.realm)));
    }
    async backendNodeId() {
      if (!this.frame.page().browser().cdpSupported)
        throw new H();
      if (s(this, n))
        return s(this, n);
      const { node: f } = await this.frame.client.send("DOM.describeNode", {
        objectId: this.handle.id
      });
      return m(this, n, f.backendNodeId), s(this, n);
    }
  }, n = new WeakMap(), (() => {
    const f = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    t = [q()], r = [q(), ng], Zh(o, null, t, { kind: "method", name: "autofill", static: !1, private: !1, access: { has: (p) => "autofill" in p, get: (p) => p.autofill }, metadata: f }, null, e), Zh(o, null, r, { kind: "method", name: "contentFrame", static: !1, private: !1, access: { has: (p) => "contentFrame" in p, get: (p) => p.contentFrame }, metadata: f }, null, e), f && Object.defineProperty(o, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: f });
  })(), o;
})();
/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Aa;
const dh = class dh extends ig {
  constructor(t) {
    super(t.info.type, t.info.message, t.info.defaultValue);
    u(this, Aa);
    m(this, Aa, t), this.handled = t.handled;
  }
  static from(t) {
    return new dh(t);
  }
  async handle(t) {
    await s(this, Aa).handle({
      accept: t.accept,
      userText: t.text
    });
  }
};
Aa = new WeakMap();
let Ol = dh;
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Pd = function(i, e, t) {
  if (e != null) {
    if (typeof e != "object" && typeof e != "function") throw new TypeError("Object expected.");
    var r, n;
    if (t) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      r = e[Symbol.asyncDispose];
    }
    if (r === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      r = e[Symbol.dispose], t && (n = r);
    }
    if (typeof r != "function") throw new TypeError("Object not disposable.");
    n && (r = function() {
      try {
        n.call(this);
      } catch (o) {
        return Promise.reject(o);
      }
    }), i.stack.push({ value: e, dispose: r, async: t });
  } else t && i.stack.push({ async: !0 });
  return e;
}, ep = /* @__PURE__ */ function(i) {
  return function(e) {
    function t(a) {
      e.error = e.hasError ? new i(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
    }
    var r, n = 0;
    function o() {
      for (; r = e.stack.pop(); )
        try {
          if (!r.async && n === 1) return n = 0, e.stack.push(r), Promise.resolve().then(o);
          if (r.dispose) {
            var a = r.dispose.call(r.value);
            if (r.async) return n |= 2, Promise.resolve(a).then(o, function(c) {
              return t(c), o();
            });
          } else n |= 1;
        } catch (c) {
          t(c);
        }
      if (n === 1) return e.hasError ? Promise.reject(e.error) : Promise.resolve();
      if (e.hasError) throw e.error;
    }
    return o();
  };
}(typeof SuppressedError == "function" ? SuppressedError : function(i, e, t) {
  var r = new Error(t);
  return r.name = "SuppressedError", r.error = i, r.suppressed = e, r;
}), Ms, Ma, xi, Ei, Ba, Fa, Bt, wm, ym, mu, vm, bm;
const lh = class lh {
  constructor(e, t, r, n = !1) {
    u(this, Bt);
    u(this, Ms);
    N(this, "name");
    u(this, Ma);
    u(this, xi);
    u(this, Ei);
    u(this, Ba, []);
    u(this, Fa, new Mt());
    u(this, mu, async (e) => {
      const t = { stack: [], error: void 0, hasError: !1 };
      try {
        if (e.channel !== s(this, Ei))
          return;
        const r = g(this, Bt, vm).call(this, e.source);
        if (!r)
          return;
        const n = Pd(t, zr.from(e.data, r), !1), o = Pd(t, new Mt(), !1), a = [];
        let c;
        try {
          const f = { stack: [], error: void 0, hasError: !1 };
          try {
            const p = Pd(f, await n.evaluateHandle(([, , d]) => d), !1);
            for (const [d, h] of await p.getProperties()) {
              if (o.use(h), h instanceof oo) {
                a[+d] = h, o.use(h);
                continue;
              }
              a[+d] = h.jsonValue();
            }
            c = await s(this, Ma).call(this, ...await Promise.all(a));
          } catch (p) {
            f.error = p, f.hasError = !0;
          } finally {
            ep(f);
          }
        } catch (f) {
          try {
            f instanceof Error ? await n.evaluate(([, p], d, h, w) => {
              const x = new Error(h);
              x.name = d, w && (x.stack = w), p(x);
            }, f.name, f.message, f.stack) : await n.evaluate(([, p], d) => {
              p(d);
            }, f);
          } catch (p) {
            Ae(p);
          }
          return;
        }
        try {
          await n.evaluate(([f], p) => {
            f(p);
          }, c);
        } catch (f) {
          Ae(f);
        }
      } catch (r) {
        t.error = r, t.hasError = !0;
      } finally {
        ep(t);
      }
    });
    m(this, Ms, e), this.name = t, m(this, Ma, r), m(this, xi, n), m(this, Ei, `__puppeteer__${s(this, Ms)._id}_page_exposeFunction_${this.name}`);
  }
  static async from(e, t, r, n = !1) {
    var a;
    const o = new lh(e, t, r, n);
    return await g(a = o, Bt, wm).call(a), o;
  }
  [Symbol.dispose]() {
    this[Symbol.asyncDispose]().catch(Ae);
  }
  async [Symbol.asyncDispose]() {
    s(this, Fa).dispose(), await Promise.all(s(this, Ba).map(async ([e, t]) => {
      const r = s(this, xi) ? e.isolatedRealm() : e.mainRealm();
      try {
        await Promise.all([
          r.evaluate((n) => {
            delete globalThis[n];
          }, this.name),
          ...e.childFrames().map((n) => n.evaluate((o) => {
            delete globalThis[o];
          }, this.name)),
          e.browsingContext.removePreloadScript(t)
        ]);
      } catch (n) {
        Ae(n);
      }
    }));
  }
};
Ms = new WeakMap(), Ma = new WeakMap(), xi = new WeakMap(), Ei = new WeakMap(), Ba = new WeakMap(), Fa = new WeakMap(), Bt = new WeakSet(), wm = async function() {
  const e = s(this, Bt, ym), t = {
    type: "channel",
    value: {
      channel: s(this, Ei),
      ownership: "root"
    }
  };
  s(this, Fa).use(new X(e)).on("script.message", s(this, mu));
  const n = gp(og((a) => {
    Object.assign(globalThis, {
      [PLACEHOLDER("name")]: function(...c) {
        return new Promise((f, p) => {
          a([f, p, c]);
        });
      }
    });
  }, { name: JSON.stringify(this.name) })), o = [s(this, Ms)];
  for (const a of o)
    o.push(...a.childFrames());
  await Promise.all(o.map(async (a) => {
    const c = s(this, xi) ? a.isolatedRealm() : a.mainRealm();
    try {
      const [f] = await Promise.all([
        a.browsingContext.addPreloadScript(n, {
          arguments: [t],
          sandbox: c.sandbox
        }),
        c.realm.callFunction(n, !1, {
          arguments: [t]
        })
      ]);
      s(this, Ba).push([a, f]);
    } catch (f) {
      Ae(f);
    }
  }));
}, ym = function() {
  return s(this, Ms).page().browser().connection;
}, mu = new WeakMap(), vm = function(e) {
  const t = g(this, Bt, bm).call(this, e.context);
  if (t)
    return t.realm(e.realm);
}, bm = function(e) {
  const t = [s(this, Ms)];
  for (const r of t) {
    if (r._id === e)
      return r;
    t.push(...r.childFrames());
  }
};
let ao = lh;
var Yb = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, Qb = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
};
let Zb = (() => {
  var r, n, o, a, c, Cm, p;
  let i = cg, e = [], t;
  return p = class extends i {
    constructor(w, x, S) {
      super();
      u(this, c);
      u(this, r, Yb(this, e));
      u(this, n);
      u(this, o);
      u(this, a, !1);
      m(this, r, w), m(this, n, x), m(this, a, S);
      const P = w["goog:securityDetails"];
      S && P && m(this, o, new ag(P));
    }
    static from(w, x, S) {
      var C;
      const P = new p(w, x, S);
      return g(C = P, c, Cm).call(C), P;
    }
    remoteAddress() {
      return {
        ip: "",
        port: -1
      };
    }
    url() {
      return s(this, r).url;
    }
    status() {
      return s(this, r).status;
    }
    statusText() {
      return s(this, r).statusText;
    }
    headers() {
      const w = {};
      for (const x of s(this, r).headers)
        x.value.type === "string" && (w[x.name.toLowerCase()] = x.value.value);
      return w;
    }
    request() {
      return s(this, n);
    }
    fromCache() {
      return s(this, r).fromCache;
    }
    timing() {
      const w = s(this, n).timing();
      return {
        requestTime: w.requestTime,
        proxyStart: -1,
        proxyEnd: -1,
        dnsStart: w.dnsStart,
        dnsEnd: w.dnsEnd,
        connectStart: w.connectStart,
        connectEnd: w.connectEnd,
        sslStart: w.tlsStart,
        sslEnd: -1,
        workerStart: -1,
        workerReady: -1,
        workerFetchStart: -1,
        workerRespondWithSettled: -1,
        workerRouterEvaluationStart: -1,
        workerCacheLookupStart: -1,
        sendStart: w.requestStart,
        sendEnd: -1,
        pushStart: -1,
        pushEnd: -1,
        receiveHeadersStart: w.responseStart,
        receiveHeadersEnd: w.responseEnd
      };
    }
    frame() {
      return s(this, n).frame();
    }
    fromServiceWorker() {
      return !1;
    }
    securityDetails() {
      if (!s(this, a))
        throw new H();
      return s(this, o) ?? null;
    }
    async content() {
      return await s(this, n).getResponseContent();
    }
  }, r = new WeakMap(), n = new WeakMap(), o = new WeakMap(), a = new WeakMap(), c = new WeakSet(), Cm = function() {
    var w, x;
    s(this, r).fromCache && (s(this, n)._fromMemoryCache = !0, (w = s(this, n).frame()) == null || w.page().trustedEmitter.emit("requestservedfromcache", s(this, n))), (x = s(this, n).frame()) == null || x.page().trustedEmitter.emit("response", this);
  }, (() => {
    const w = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    t = [ug], Qb(p, null, t, { kind: "method", name: "remoteAddress", static: !1, private: !1, access: { has: (x) => "remoteAddress" in x, get: (x) => x.remoteAddress }, metadata: w }, null, e), w && Object.defineProperty(p, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: w });
  })(), p;
})();
var Rl;
const xm = /* @__PURE__ */ new WeakMap();
var Ur, ja, Be, se, gu, Sm, Ua, wu;
class Em extends wh {
  constructor(t, r, n, o) {
    super();
    u(this, gu);
    u(this, Ur);
    u(this, ja, null);
    N(this, "id");
    u(this, Be);
    u(this, se);
    u(this, Ua, !1);
    u(this, wu, async () => {
      if (!s(this, Be))
        return;
      const t = s(this, Be).page()._credentials;
      t && !s(this, Ua) ? (m(this, Ua, !0), s(this, se).continueWithAuth({
        action: "provideCredentials",
        credentials: {
          type: "password",
          username: t.username,
          password: t.password
        }
      })) : s(this, se).continueWithAuth({
        action: "cancel"
      });
    });
    xm.set(t, this), this.interception.enabled = n, m(this, se, t), m(this, Be, r), m(this, Ur, o ? s(o, Ur) : []), this.id = t.id;
  }
  static from(t, r, n, o) {
    var c;
    const a = new Rl(t, r, n, o);
    return g(c = a, gu, Sm).call(c), a;
  }
  get client() {
    return s(this, Be).client;
  }
  canBeIntercepted() {
    return s(this, se).isBlocked;
  }
  interceptResolutionState() {
    return s(this, se).isBlocked ? super.interceptResolutionState() : { action: dg.Disabled };
  }
  url() {
    return s(this, se).url;
  }
  resourceType() {
    if (!s(this, Be).page().browser().cdpSupported)
      throw new H();
    return (s(this, se).resourceType || "other").toLowerCase();
  }
  method() {
    return s(this, se).method;
  }
  postData() {
    if (!s(this, Be).page().browser().cdpSupported)
      throw new H();
    return s(this, se).postData;
  }
  hasPostData() {
    return s(this, se).hasPostData;
  }
  async fetchPostData() {
    return await s(this, se).fetchPostData();
  }
  headers() {
    const t = {};
    for (const r of s(this, se).headers)
      t[r.name.toLowerCase()] = r.value.value;
    return {
      ...t
    };
  }
  response() {
    return s(this, ja);
  }
  failure() {
    return s(this, se).error === void 0 ? null : { errorText: s(this, se).error };
  }
  isNavigationRequest() {
    return s(this, se).navigation !== void 0;
  }
  initiator() {
    var t;
    return {
      ...s(this, se).initiator,
      type: ((t = s(this, se).initiator) == null ? void 0 : t.type) ?? "other"
    };
  }
  redirectChain() {
    return s(this, Ur).slice();
  }
  frame() {
    return s(this, Be);
  }
  async _continue(t = {}) {
    const r = tp(t.headers);
    return this.interception.handled = !0, await s(this, se).continueRequest({
      url: t.url,
      method: t.method,
      body: t.postData ? {
        type: "base64",
        value: lg(t.postData)
      } : void 0,
      headers: r.length > 0 ? r : void 0
    }).catch((n) => (this.interception.handled = !1, hg(n)));
  }
  async _abort() {
    return this.interception.handled = !0, await s(this, se).failRequest().catch((t) => {
      throw this.interception.handled = !1, t;
    });
  }
  async _respond(t, r) {
    this.interception.handled = !0;
    let n;
    t.body && (n = wh.getResponse(t.body));
    const o = tp(t.headers), a = o.some((f) => f.name === "content-length");
    t.contentType && o.push({
      name: "content-type",
      value: {
        type: "string",
        value: t.contentType
      }
    }), n != null && n.contentLength && !a && o.push({
      name: "content-length",
      value: {
        type: "string",
        value: String(n.contentLength)
      }
    });
    const c = t.status || 200;
    return await s(this, se).provideResponse({
      statusCode: c,
      headers: o.length > 0 ? o : void 0,
      reasonPhrase: pg[c],
      body: n != null && n.base64 ? {
        type: "base64",
        value: n == null ? void 0 : n.base64
      } : void 0
    }).catch((f) => {
      throw this.interception.handled = !1, f;
    });
  }
  timing() {
    return s(this, se).timing();
  }
  getResponseContent() {
    return s(this, se).getResponseContent();
  }
}
Ur = new WeakMap(), ja = new WeakMap(), Be = new WeakMap(), se = new WeakMap(), gu = new WeakSet(), Sm = function() {
  s(this, se).on("redirect", (t) => {
    const r = Rl.from(t, s(this, Be), this.interception.enabled, this);
    s(this, Ur).push(this), t.once("success", () => {
      s(this, Be).page().trustedEmitter.emit("requestfinished", r);
    }), t.once("error", () => {
      s(this, Be).page().trustedEmitter.emit("requestfailed", r);
    }), r.finalizeInterceptions();
  }), s(this, se).once("success", (t) => {
    m(this, ja, Zb.from(t, this, s(this, Be).page().browser().cdpSupported));
  }), s(this, se).on("authenticate", s(this, wu)), s(this, Be).page().trustedEmitter.emit("request", this);
}, Ua = new WeakMap(), wu = new WeakMap();
Rl = Em;
function tp(i) {
  const e = [];
  for (const [t, r] of Object.entries(i ?? []))
    if (!Object.is(r, void 0)) {
      const n = Array.isArray(r) ? r : [r];
      for (const o of n)
        e.push({
          name: t.toLowerCase(),
          value: {
            type: "string",
            value: String(o)
          }
        });
    }
  return e;
}
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
class sp extends Error {
}
var Ri, Im, _m;
class Pm {
  static serialize(e) {
    switch (typeof e) {
      case "symbol":
      case "function":
        throw new sp(`Unable to serializable ${typeof e}`);
      case "object":
        return g(this, Ri, _m).call(this, e);
      case "undefined":
        return {
          type: "undefined"
        };
      case "number":
        return g(this, Ri, Im).call(this, e);
      case "bigint":
        return {
          type: "bigint",
          value: e.toString()
        };
      case "string":
        return {
          type: "string",
          value: e
        };
      case "boolean":
        return {
          type: "boolean",
          value: e
        };
    }
  }
}
Ri = new WeakSet(), Im = function(e) {
  let t;
  return Object.is(e, -0) ? t = "-0" : Object.is(e, 1 / 0) ? t = "Infinity" : Object.is(e, -1 / 0) ? t = "-Infinity" : Object.is(e, NaN) ? t = "NaN" : t = e, {
    type: "number",
    value: t
  };
}, _m = function(e) {
  if (e === null)
    return {
      type: "null"
    };
  if (Array.isArray(e))
    return {
      type: "array",
      value: e.map((r) => this.serialize(r))
    };
  if (fg(e)) {
    try {
      JSON.stringify(e);
    } catch (r) {
      throw r instanceof TypeError && r.message.startsWith("Converting circular structure to JSON") && (r.message += " Recursive objects are not allowed."), r;
    }
    const t = [];
    for (const r in e)
      t.push([this.serialize(r), this.serialize(e[r])]);
    return {
      type: "object",
      value: t
    };
  } else {
    if (mg(e))
      return {
        type: "regexp",
        value: {
          pattern: e.source,
          flags: e.flags
        }
      };
    if (gg(e))
      return {
        type: "date",
        value: e.toISOString()
      };
  }
  throw new sp("Custom object serialization not possible. Use plain objects instead.");
}, u(Pm, Ri);
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
function eC(i) {
  if (i.exception.type === "object" && !("value" in i.exception))
    return new Error(i.text);
  if (i.exception.type !== "error")
    return sc.deserialize(i.exception);
  const [e = "", ...t] = i.text.split(": "), r = t.join(": "), n = new Error(r);
  n.name = e;
  const o = [];
  if (i.stackTrace && o.length < Error.stackTraceLimit)
    for (const a of i.stackTrace.callFrames.reverse()) {
      if (fc.isPuppeteerURL(a.url) && a.url !== fc.INTERNAL_URL) {
        const c = fc.parse(a.url);
        o.unshift(`    at ${a.functionName || c.functionName} (${c.functionName} at ${c.siteString}, <anonymous>:${a.lineNumber}:${a.columnNumber})`);
      } else
        o.push(`    at ${a.functionName || "<anonymous>"} (${a.url}:${a.lineNumber}:${a.columnNumber})`);
      if (o.length >= Error.stackTraceLimit)
        break;
    }
  return n.stack = [i.text, ...o].join(`
`), n;
}
function km(i, e) {
  return (t) => {
    throw t instanceof Fc ? t.message += ` at ${i}` : t instanceof wg && (t.message = `Navigation timeout of ${e} ms exceeded`), t;
  };
}
var tC = function(i, e, t) {
  if (e != null) {
    if (typeof e != "object" && typeof e != "function") throw new TypeError("Object expected.");
    var r, n;
    if (t) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      r = e[Symbol.asyncDispose];
    }
    if (r === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      r = e[Symbol.dispose], t && (n = r);
    }
    if (typeof r != "function") throw new TypeError("Object not disposable.");
    n && (r = function() {
      try {
        n.call(this);
      } catch (o) {
        return Promise.reject(o);
      }
    }), i.stack.push({ value: e, dispose: r, async: t });
  } else t && i.stack.push({ async: !0 });
  return e;
}, sC = /* @__PURE__ */ function(i) {
  return function(e) {
    function t(a) {
      e.error = e.hasError ? new i(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
    }
    var r, n = 0;
    function o() {
      for (; r = e.stack.pop(); )
        try {
          if (!r.async && n === 1) return n = 0, e.stack.push(r), Promise.resolve().then(o);
          if (r.dispose) {
            var a = r.dispose.call(r.value);
            if (r.async) return n |= 2, Promise.resolve(a).then(o, function(c) {
              return t(c), o();
            });
          } else n |= 1;
        } catch (c) {
          t(c);
        }
      if (n === 1) return e.hasError ? Promise.reject(e.error) : Promise.resolve();
      if (e.hasError) throw e.error;
    }
    return o();
  };
}(typeof SuppressedError == "function" ? SuppressedError : function(i, e, t) {
  var r = new Error(t);
  return r.name = "SuppressedError", r.error = i, r.suppressed = e, r;
}), $a, Al;
class Tm extends yg {
  constructor(t, r) {
    super(r);
    u(this, $a);
    N(this, "realm");
    N(this, "internalPuppeteerUtil");
    this.realm = t;
  }
  initialize() {
    this.realm.on("destroyed", ({ reason: t }) => {
      this.taskManager.terminateAll(new Error(t)), this.dispose();
    }), this.realm.on("updated", () => {
      this.internalPuppeteerUtil = void 0, this.taskManager.rerunAll();
    });
  }
  get puppeteerUtil() {
    const t = Promise.resolve();
    return vg.inject((r) => {
      this.internalPuppeteerUtil && this.internalPuppeteerUtil.then((n) => {
        n.dispose();
      }), this.internalPuppeteerUtil = t.then(() => this.evaluateHandle(r));
    }, !this.internalPuppeteerUtil), this.internalPuppeteerUtil;
  }
  async evaluateHandle(t, ...r) {
    return await g(this, $a, Al).call(this, !1, t, ...r);
  }
  async evaluate(t, ...r) {
    return await g(this, $a, Al).call(this, !0, t, ...r);
  }
  createHandle(t) {
    return (t.type === "node" || t.type === "window") && this instanceof Hr ? oo.from(t, this) : zr.from(t, this);
  }
  async serializeAsync(t) {
    return t instanceof vh && (t = await t.get(this)), this.serialize(t);
  }
  serialize(t) {
    if (t instanceof zr || t instanceof oo) {
      if (t.realm !== this) {
        if (!(t.realm instanceof Hr) || !(this instanceof Hr))
          throw new Error("Trying to evaluate JSHandle from different global types. Usually this means you're using a handle from a worker in a page or vice versa.");
        if (t.realm.environment !== this.environment)
          throw new Error("Trying to evaluate JSHandle from different frames. Usually this means you're using a handle from a page on a different page.");
      }
      if (t.disposed)
        throw new Error("JSHandle is disposed!");
      return t.remoteValue();
    }
    return Pm.serialize(t);
  }
  async destroyHandles(t) {
    if (this.disposed)
      return;
    const r = t.map(({ id: n }) => n).filter((n) => n !== void 0);
    r.length !== 0 && await this.realm.disown(r).catch((n) => {
      Ae(n);
    });
  }
  async adoptHandle(t) {
    return await this.evaluateHandle((r) => r, t);
  }
  async transferHandle(t) {
    if (t.realm === this)
      return t;
    const r = this.adoptHandle(t);
    return await t.dispose(), await r;
  }
}
$a = new WeakSet(), Al = async function(t, r, ...n) {
  var d;
  const o = bg(((d = Cg(r)) == null ? void 0 : d.toString()) ?? fc.INTERNAL_URL);
  let a;
  const c = t ? "none" : "root", f = t ? {} : {
    maxObjectDepth: 0,
    maxDomDepth: 0
  };
  if (fp(r)) {
    const h = bh.test(r) ? r : `${r}
${o}
`;
    a = this.realm.evaluate(h, !0, {
      resultOwnership: c,
      userActivation: !0,
      serializationOptions: f
    });
  } else {
    let h = gp(r);
    h = bh.test(h) ? h : `${h}
${o}
`, a = this.realm.callFunction(
      h,
      /* awaitPromise= */
      !0,
      {
        // LazyArgs are used only internally and should not affect the order
        // evaluate calls for the public APIs.
        arguments: n.some((w) => w instanceof vh) ? await Promise.all(n.map((w) => this.serializeAsync(w))) : n.map((w) => this.serialize(w)),
        resultOwnership: c,
        userActivation: !0,
        serializationOptions: f
      }
    );
  }
  const p = await a;
  if ("type" in p && p.type === "exception")
    throw eC(p.exceptionDetails);
  return t ? sc.deserialize(p.result) : this.createHandle(p.result);
};
var Si, yu, Dm, Pi;
const vu = class vu extends Tm {
  constructor(t, r) {
    super(t, r.timeoutSettings);
    u(this, yu);
    u(this, Si);
    u(this, Pi, !1);
    m(this, Si, r);
  }
  static from(t, r) {
    var o;
    const n = new vu(t, r);
    return g(o = n, yu, Dm).call(o), n;
  }
  get puppeteerUtil() {
    let t = Promise.resolve();
    return s(this, Pi) || (t = Promise.all([
      ao.from(this.environment, "__ariaQuerySelector", yh.queryOne, !!this.sandbox),
      ao.from(this.environment, "__ariaQuerySelectorAll", async (r, n) => {
        const o = yh.queryAll(r, n);
        return await r.realm.evaluateHandle((...a) => a, ...await mp.collect(o));
      }, !!this.sandbox)
    ]), m(this, Pi, !0)), t.then(() => super.puppeteerUtil);
  }
  get sandbox() {
    return this.realm.sandbox;
  }
  get environment() {
    return s(this, Si);
  }
  async adoptBackendNode(t) {
    const r = { stack: [], error: void 0, hasError: !1 };
    try {
      const { object: n } = await s(this, Si).client.send("DOM.resolveNode", {
        backendNodeId: t,
        executionContextId: await this.realm.resolveExecutionContextId()
      });
      return await tC(r, oo.from({
        handle: n.objectId,
        type: "node"
      }, this), !1).evaluateHandle((a) => a);
    } catch (n) {
      r.error = n, r.hasError = !0;
    } finally {
      sC(r);
    }
  }
};
Si = new WeakMap(), yu = new WeakSet(), Dm = function() {
  gh(vu.prototype, this, "initialize").call(this), this.realm.on("updated", () => {
    this.environment.clearDocumentHandle(), m(this, Pi, !1);
  });
}, Pi = new WeakMap();
let Hr = vu;
var La;
const hh = class hh extends Tm {
  constructor(t, r) {
    super(t, r.timeoutSettings);
    u(this, La);
    m(this, La, r);
  }
  static from(t, r) {
    const n = new hh(t, r);
    return n.initialize(), n;
  }
  get environment() {
    return s(this, La);
  }
  async adoptBackendNode() {
    throw new Error("Cannot adopt DOM nodes into a worker.");
  }
};
La = new WeakMap();
let Ml = hh;
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var qa, Ha;
const ph = class ph extends xg {
  constructor(t, r) {
    super(r.origin);
    u(this, qa);
    u(this, Ha);
    m(this, qa, t), m(this, Ha, Ml.from(r, this));
  }
  static from(t, r) {
    return new ph(t, r);
  }
  get frame() {
    return s(this, qa);
  }
  mainRealm() {
    return s(this, Ha);
  }
  get client() {
    throw new H();
  }
};
qa = new WeakMap(), Ha = new WeakMap();
let Bl = ph;
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var rC = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, Ws = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
}, rp = function(i, e, t) {
  return typeof e == "symbol" && (e = e.description ? "[".concat(e.description, "]") : ""), Object.defineProperty(i, "name", { configurable: !0, value: t ? "".concat(t, " ", e) : e });
};
function nC(i) {
  switch (i) {
    case "group":
      return "startGroup";
    case "groupCollapsed":
      return "startGroupCollapsed";
    case "groupEnd":
      return "endGroup";
    default:
      return i;
  }
}
let iC = (() => {
  var h, w, x, Nm, Fl, Ac, b, Mc, Bc, E;
  let i = Eg, e = [], t, r, n, o, a, c, f, p, d;
  return E = class extends i {
    constructor(l, y) {
      super();
      u(this, x);
      u(this, h, rC(this, e));
      N(this, "browsingContext");
      u(this, w, /* @__PURE__ */ new WeakMap());
      N(this, "realms");
      N(this, "_id");
      N(this, "client");
      N(this, "accessibility");
      u(this, b, /* @__PURE__ */ new Map());
      m(this, h, l), this.browsingContext = y, this._id = y.id, this.client = new io(this), this.realms = {
        default: Hr.from(this.browsingContext.defaultRealm, this),
        internal: Hr.from(this.browsingContext.createWindowRealm(`__puppeteer_internal_${Math.ceil(Math.random() * 1e4)}`), this)
      }, this.accessibility = new Sg(this.realms.default, this._id);
    }
    static from(l, y) {
      var T;
      const k = new E(l, y);
      return g(T = k, x, Nm).call(T), k;
    }
    get timeoutSettings() {
      return this.page()._timeoutSettings;
    }
    mainRealm() {
      return this.realms.default;
    }
    isolatedRealm() {
      return this.realms.internal;
    }
    realm(l) {
      for (const y of Object.values(this.realms))
        if (y.realm.id === l)
          return y;
    }
    page() {
      let l = s(this, h);
      for (; l instanceof E; )
        l = s(l, h);
      return l;
    }
    url() {
      return this.browsingContext.url;
    }
    parentFrame() {
      return s(this, h) instanceof E ? s(this, h) : null;
    }
    childFrames() {
      return [...this.browsingContext.children].map((l) => s(this, w).get(l));
    }
    async goto(l, y = {}) {
      const [k] = await Promise.all([
        this.waitForNavigation(y),
        // Some implementations currently only report errors when the
        // readiness=interactive.
        //
        // Related: https://bugzilla.mozilla.org/show_bug.cgi?id=1846601
        this.browsingContext.navigate(
          l,
          "interactive"
          /* Bidi.BrowsingContext.ReadinessState.Interactive */
        ).catch((T) => {
          if (!(kg(T) && T.message.includes("net::ERR_HTTP_RESPONSE_CODE_FAILURE")) && !T.message.includes("navigation canceled") && !T.message.includes("Navigation was aborted by another navigation"))
            throw T;
        })
      ]).catch(km(l, y.timeout ?? this.timeoutSettings.navigationTimeout()));
      return k;
    }
    async setContent(l, y = {}) {
      await Promise.all([
        this.setFrameContent(l),
        Uc(nc([
          s(this, x, Mc).call(this, y),
          s(this, x, Bc).call(this, y)
        ]))
      ]);
    }
    async waitForNavigation(l = {}) {
      const { timeout: y = this.timeoutSettings.navigationTimeout(), signal: k } = l, T = this.childFrames().map((M) => {
        var $;
        return g($ = M, x, Ac).call($);
      });
      return await Uc(nc([
        Tg(gt(this.browsingContext, "navigation"), gt(this.browsingContext, "historyUpdated").pipe(Ui(() => ({ navigation: null })))).pipe(Ch()).pipe(ld(({ navigation: M }) => M === null ? cs(null) : s(this, x, Mc).call(this, l).pipe(Dg(() => T.length === 0 ? cs(void 0) : nc(T)), Xs(gt(M, "fragment"), gt(M, "failed"), gt(M, "aborted")), ld(() => {
          if (M.request) {
            let $ = function(Z) {
              return M === null ? cs(null) : Z.response || Z.error ? cs(M) : Z.redirect ? $(Z.redirect) : gt(Z, "success").pipe(Xs(gt(Z, "error")), Xs(gt(Z, "redirect"))).pipe(ld(() => $(Z)));
            };
            return $(M.request);
          }
          return cs(M);
        })))),
        s(this, x, Bc).call(this, l)
      ]).pipe(Ui(([M]) => {
        if (!M)
          return null;
        const $ = M.request;
        if (!$)
          return null;
        const Z = $.lastRedirect ?? $;
        return xm.get(Z).response();
      }), Xs(jc(y), Ng(k), g(this, x, Ac).call(this).pipe(Ui(() => {
        throw new Kl("Frame detached.");
      })))));
    }
    waitForDevicePrompt(l = {}) {
      const { timeout: y = this.timeoutSettings.timeout(), signal: k } = l;
      return this.browsingContext.waitForDevicePrompt(y, k);
    }
    get detached() {
      return this.browsingContext.closed;
    }
    async exposeFunction(l, y) {
      if (s(this, b).has(l))
        throw new Error(`Failed to add page binding with name ${l}: globalThis['${l}'] already exists!`);
      const k = await ao.from(this, l, y);
      s(this, b).set(l, k);
    }
    async removeExposedFunction(l) {
      const y = s(this, b).get(l);
      if (!y)
        throw new Error(`Failed to remove page binding with name ${l}: window['${l}'] does not exists!`);
      s(this, b).delete(l), await y[Symbol.asyncDispose]();
    }
    async createCDPSession() {
      if (!this.page().browser().cdpSupported)
        throw new H();
      return await this.page().browser().cdpConnection._createSession({ targetId: this._id });
    }
    async setFiles(l, y) {
      await this.browsingContext.setFiles(
        // SAFETY: ElementHandles are always remote references.
        l.remoteValue(),
        y
      );
    }
    async locateNodes(l, y) {
      return await this.browsingContext.locateNodes(
        y,
        // SAFETY: ElementHandles are always remote references.
        [l.remoteValue()]
      );
    }
  }, h = new WeakMap(), w = new WeakMap(), x = new WeakSet(), Nm = function() {
    for (const l of this.browsingContext.children)
      g(this, x, Fl).call(this, l);
    this.browsingContext.on("browsingcontext", ({ browsingContext: l }) => {
      g(this, x, Fl).call(this, l);
    }), this.browsingContext.on("closed", () => {
      for (const l of io.sessions.values())
        l.frame === this && l.onClose();
      this.page().trustedEmitter.emit("framedetached", this);
    }), this.browsingContext.on("request", ({ request: l }) => {
      const y = Em.from(l, this, this.page().isNetworkInterceptionEnabled);
      l.once("success", () => {
        this.page().trustedEmitter.emit("requestfinished", y);
      }), l.once("error", () => {
        this.page().trustedEmitter.emit("requestfailed", y);
      }), y.finalizeInterceptions();
    }), this.browsingContext.on("navigation", ({ navigation: l }) => {
      l.once("fragment", () => {
        this.page().trustedEmitter.emit("framenavigated", this);
      });
    }), this.browsingContext.on("load", () => {
      this.page().trustedEmitter.emit("load", void 0);
    }), this.browsingContext.on("DOMContentLoaded", () => {
      this._hasStartedLoading = !0, this.page().trustedEmitter.emit("domcontentloaded", void 0), this.page().trustedEmitter.emit("framenavigated", this);
    }), this.browsingContext.on("userprompt", ({ userPrompt: l }) => {
      this.page().trustedEmitter.emit("dialog", Ol.from(l));
    }), this.browsingContext.on("log", ({ entry: l }) => {
      if (this._id === l.source.context)
        if (oC(l)) {
          const y = l.args.map((T) => this.mainRealm().createHandle(T)), k = y.reduce((T, M) => {
            const $ = M instanceof zr && M.isPrimitiveValue ? sc.deserialize(M.remoteValue()) : M.toString();
            return `${T} ${$}`;
          }, "").slice(1);
          this.page().trustedEmitter.emit("console", new Pg(nC(l.method), k, y, cC(l.stackTrace), this));
        } else if (aC(l)) {
          const y = new Error(l.text ?? ""), k = y.message.split(`
`).length, T = y.stack.split(`
`).splice(0, k), M = [];
          if (l.stackTrace) {
            for (const $ of l.stackTrace.callFrames)
              if (M.push(`    at ${$.functionName || "<anonymous>"} (${$.url}:${$.lineNumber + 1}:${$.columnNumber + 1})`), M.length >= Error.stackTraceLimit)
                break;
          }
          y.stack = [...T, ...M].join(`
`), this.page().trustedEmitter.emit("pageerror", y);
        } else
          Ae(`Unhandled LogEntry with type "${l.type}", text "${l.text}" and level "${l.level}"`);
    }), this.browsingContext.on("worker", ({ realm: l }) => {
      const y = Bl.from(this, l);
      l.on("destroyed", () => {
        this.page().trustedEmitter.emit("workerdestroyed", y);
      }), this.page().trustedEmitter.emit("workercreated", y);
    });
  }, Fl = function(l) {
    const y = E.from(this, l);
    return s(this, w).set(l, y), this.page().trustedEmitter.emit("frameattached", y), l.on("closed", () => {
      s(this, w).delete(l);
    }), y;
  }, Ac = function() {
    return Ig(() => this.detached ? cs(this) : gt(
      this.page().trustedEmitter,
      "framedetached"
      /* PageEvent.FrameDetached */
    ).pipe(_g((l) => l === this)));
  }, b = new WeakMap(), Mc = function() {
    return a.value;
  }, Bc = function() {
    return f.value;
  }, (() => {
    const l = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    t = [qs], r = [qs], n = [qs], o = [qs], c = [qs], p = [qs], d = [qs], Ws(E, null, t, { kind: "method", name: "goto", static: !1, private: !1, access: { has: (y) => "goto" in y, get: (y) => y.goto }, metadata: l }, null, e), Ws(E, null, r, { kind: "method", name: "setContent", static: !1, private: !1, access: { has: (y) => "setContent" in y, get: (y) => y.setContent }, metadata: l }, null, e), Ws(E, null, n, { kind: "method", name: "waitForNavigation", static: !1, private: !1, access: { has: (y) => "waitForNavigation" in y, get: (y) => y.waitForNavigation }, metadata: l }, null, e), Ws(E, a = { value: rp(function(y = {}) {
      let { waitUntil: k = "load" } = y;
      const { timeout: T = this.timeoutSettings.navigationTimeout() } = y;
      Array.isArray(k) || (k = [k]);
      const M = /* @__PURE__ */ new Set();
      for (const $ of k)
        switch ($) {
          case "load": {
            M.add("load");
            break;
          }
          case "domcontentloaded": {
            M.add("DOMContentLoaded");
            break;
          }
        }
      return M.size === 0 ? cs(void 0) : nc([...M].map(($) => gt(this.browsingContext, $))).pipe(Ui(() => {
      }), Ch(), Xs(jc(T), g(this, x, Ac).call(this).pipe(Ui(() => {
        throw new Error("Frame detached.");
      }))));
    }, "#waitForLoad$") }, o, { kind: "method", name: "#waitForLoad$", static: !1, private: !0, access: { has: (y) => rc(x, y), get: (y) => s(y, x, Mc) }, metadata: l }, null, e), Ws(E, f = { value: rp(function(y = {}) {
      let { waitUntil: k = "load" } = y;
      Array.isArray(k) || (k = [k]);
      let T = 1 / 0;
      for (const M of k)
        switch (M) {
          case "networkidle0": {
            T = Math.min(0, T);
            break;
          }
          case "networkidle2": {
            T = Math.min(2, T);
            break;
          }
        }
      return T === 1 / 0 ? cs(void 0) : this.page().waitForNetworkIdle$({
        idleTime: 500,
        timeout: y.timeout ?? this.timeoutSettings.timeout(),
        concurrency: T
      });
    }, "#waitForNetworkIdle$") }, c, { kind: "method", name: "#waitForNetworkIdle$", static: !1, private: !0, access: { has: (y) => rc(x, y), get: (y) => s(y, x, Bc) }, metadata: l }, null, e), Ws(E, null, p, { kind: "method", name: "setFiles", static: !1, private: !1, access: { has: (y) => "setFiles" in y, get: (y) => y.setFiles }, metadata: l }, null, e), Ws(E, null, d, { kind: "method", name: "locateNodes", static: !1, private: !1, access: { has: (y) => "locateNodes" in y, get: (y) => y.locateNodes }, metadata: l }, null, e), l && Object.defineProperty(E, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: l });
  })(), E;
})();
function oC(i) {
  return i.type === "console";
}
function aC(i) {
  return i.type === "javascript";
}
function cC(i) {
  const e = [];
  if (i)
    for (const t of i.callFrames)
      e.push({
        url: t.url,
        lineNumber: t.lineNumber,
        columnNumber: t.columnNumber
      });
  return e;
}
/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var Ue;
(function(i) {
  i.None = "none", i.Key = "key", i.Pointer = "pointer", i.Wheel = "wheel";
})(Ue || (Ue = {}));
var le;
(function(i) {
  i.Pause = "pause", i.KeyDown = "keyDown", i.KeyUp = "keyUp", i.PointerUp = "pointerUp", i.PointerDown = "pointerDown", i.PointerMove = "pointerMove", i.Scroll = "scroll";
})(le || (le = {}));
const Gi = (i) => {
  switch (i) {
    case "\r":
    case `
`:
      i = "Enter";
      break;
  }
  if ([...i].length === 1)
    return i;
  switch (i) {
    case "Cancel":
      return "";
    case "Help":
      return "";
    case "Backspace":
      return "";
    case "Tab":
      return "";
    case "Clear":
      return "";
    case "Enter":
      return "";
    case "Shift":
    case "ShiftLeft":
      return "";
    case "Control":
    case "ControlLeft":
      return "";
    case "Alt":
    case "AltLeft":
      return "";
    case "Pause":
      return "";
    case "Escape":
      return "";
    case "PageUp":
      return "";
    case "PageDown":
      return "";
    case "End":
      return "";
    case "Home":
      return "";
    case "ArrowLeft":
      return "";
    case "ArrowUp":
      return "";
    case "ArrowRight":
      return "";
    case "ArrowDown":
      return "";
    case "Insert":
      return "";
    case "Delete":
      return "";
    case "NumpadEqual":
      return "";
    case "Numpad0":
      return "";
    case "Numpad1":
      return "";
    case "Numpad2":
      return "";
    case "Numpad3":
      return "";
    case "Numpad4":
      return "";
    case "Numpad5":
      return "";
    case "Numpad6":
      return "";
    case "Numpad7":
      return "";
    case "Numpad8":
      return "";
    case "Numpad9":
      return "";
    case "NumpadMultiply":
      return "";
    case "NumpadAdd":
      return "";
    case "NumpadSubtract":
      return "";
    case "NumpadDecimal":
      return "";
    case "NumpadDivide":
      return "";
    case "F1":
      return "";
    case "F2":
      return "";
    case "F3":
      return "";
    case "F4":
      return "";
    case "F5":
      return "";
    case "F6":
      return "";
    case "F7":
      return "";
    case "F8":
      return "";
    case "F9":
      return "";
    case "F10":
      return "";
    case "F11":
      return "";
    case "F12":
      return "";
    case "Meta":
    case "MetaLeft":
      return "";
    case "ShiftRight":
      return "";
    case "ControlRight":
      return "";
    case "AltRight":
      return "";
    case "MetaRight":
      return "";
    case "Digit0":
      return "0";
    case "Digit1":
      return "1";
    case "Digit2":
      return "2";
    case "Digit3":
      return "3";
    case "Digit4":
      return "4";
    case "Digit5":
      return "5";
    case "Digit6":
      return "6";
    case "Digit7":
      return "7";
    case "Digit8":
      return "8";
    case "Digit9":
      return "9";
    case "KeyA":
      return "a";
    case "KeyB":
      return "b";
    case "KeyC":
      return "c";
    case "KeyD":
      return "d";
    case "KeyE":
      return "e";
    case "KeyF":
      return "f";
    case "KeyG":
      return "g";
    case "KeyH":
      return "h";
    case "KeyI":
      return "i";
    case "KeyJ":
      return "j";
    case "KeyK":
      return "k";
    case "KeyL":
      return "l";
    case "KeyM":
      return "m";
    case "KeyN":
      return "n";
    case "KeyO":
      return "o";
    case "KeyP":
      return "p";
    case "KeyQ":
      return "q";
    case "KeyR":
      return "r";
    case "KeyS":
      return "s";
    case "KeyT":
      return "t";
    case "KeyU":
      return "u";
    case "KeyV":
      return "v";
    case "KeyW":
      return "w";
    case "KeyX":
      return "x";
    case "KeyY":
      return "y";
    case "KeyZ":
      return "z";
    case "Semicolon":
      return ";";
    case "Equal":
      return "=";
    case "Comma":
      return ",";
    case "Minus":
      return "-";
    case "Period":
      return ".";
    case "Slash":
      return "/";
    case "Backquote":
      return "`";
    case "BracketLeft":
      return "[";
    case "Backslash":
      return "\\";
    case "BracketRight":
      return "]";
    case "Quote":
      return '"';
    default:
      throw new Error(`Unknown key: "${i}"`);
  }
};
var es;
class uC extends Og {
  constructor(t) {
    super();
    u(this, es);
    m(this, es, t);
  }
  async down(t, r) {
    await s(this, es).mainFrame().browsingContext.performActions([
      {
        type: Ue.Key,
        id: "__puppeteer_keyboard",
        actions: [
          {
            type: le.KeyDown,
            value: Gi(t)
          }
        ]
      }
    ]);
  }
  async up(t) {
    await s(this, es).mainFrame().browsingContext.performActions([
      {
        type: Ue.Key,
        id: "__puppeteer_keyboard",
        actions: [
          {
            type: le.KeyUp,
            value: Gi(t)
          }
        ]
      }
    ]);
  }
  async press(t, r = {}) {
    const { delay: n = 0 } = r, o = [
      {
        type: le.KeyDown,
        value: Gi(t)
      }
    ];
    n > 0 && o.push({
      type: le.Pause,
      duration: n
    }), o.push({
      type: le.KeyUp,
      value: Gi(t)
    }), await s(this, es).mainFrame().browsingContext.performActions([
      {
        type: Ue.Key,
        id: "__puppeteer_keyboard",
        actions: o
      }
    ]);
  }
  async type(t, r = {}) {
    const { delay: n = 0 } = r, o = [...t].map(Gi), a = [];
    if (n <= 0)
      for (const c of o)
        a.push({
          type: le.KeyDown,
          value: c
        }, {
          type: le.KeyUp,
          value: c
        });
    else
      for (const c of o)
        a.push({
          type: le.KeyDown,
          value: c
        }, {
          type: le.Pause,
          duration: n
        }, {
          type: le.KeyUp,
          value: c
        });
    await s(this, es).mainFrame().browsingContext.performActions([
      {
        type: Ue.Key,
        id: "__puppeteer_keyboard",
        actions: a
      }
    ]);
  }
  async sendCharacter(t) {
    if ([...t].length > 1)
      throw new Error("Cannot send more than 1 character.");
    await (await s(this, es).focusedFrame()).isolatedRealm().evaluate(async (n) => {
      document.execCommand("insertText", !1, n);
    }, t);
  }
}
es = new WeakMap();
const Id = (i) => {
  switch (i) {
    case fs.Left:
      return 0;
    case fs.Middle:
      return 1;
    case fs.Right:
      return 2;
    case fs.Back:
      return 3;
    case fs.Forward:
      return 4;
  }
};
var Rt, $r;
class dC extends Rg {
  constructor(t) {
    super();
    u(this, Rt);
    u(this, $r, { x: 0, y: 0 });
    m(this, Rt, t);
  }
  async reset() {
    m(this, $r, { x: 0, y: 0 }), await s(this, Rt).mainFrame().browsingContext.releaseActions();
  }
  async move(t, r, n = {}) {
    const o = s(this, $r), a = {
      x: Math.round(t),
      y: Math.round(r)
    }, c = [], f = n.steps ?? 0;
    for (let p = 0; p < f; ++p)
      c.push({
        type: le.PointerMove,
        x: o.x + (a.x - o.x) * (p / f),
        y: o.y + (a.y - o.y) * (p / f),
        origin: n.origin
      });
    c.push({
      type: le.PointerMove,
      ...a,
      origin: n.origin
    }), m(this, $r, a), await s(this, Rt).mainFrame().browsingContext.performActions([
      {
        type: Ue.Pointer,
        id: "__puppeteer_mouse",
        actions: c
      }
    ]);
  }
  async down(t = {}) {
    await s(this, Rt).mainFrame().browsingContext.performActions([
      {
        type: Ue.Pointer,
        id: "__puppeteer_mouse",
        actions: [
          {
            type: le.PointerDown,
            button: Id(t.button ?? fs.Left)
          }
        ]
      }
    ]);
  }
  async up(t = {}) {
    await s(this, Rt).mainFrame().browsingContext.performActions([
      {
        type: Ue.Pointer,
        id: "__puppeteer_mouse",
        actions: [
          {
            type: le.PointerUp,
            button: Id(t.button ?? fs.Left)
          }
        ]
      }
    ]);
  }
  async click(t, r, n = {}) {
    const o = [
      {
        type: le.PointerMove,
        x: Math.round(t),
        y: Math.round(r),
        origin: n.origin
      }
    ], a = {
      type: le.PointerDown,
      button: Id(n.button ?? fs.Left)
    }, c = {
      type: le.PointerUp,
      button: a.button
    };
    for (let f = 1; f < (n.count ?? 1); ++f)
      o.push(a, c);
    o.push(a), n.delay && o.push({
      type: le.Pause,
      duration: n.delay
    }), o.push(c), await s(this, Rt).mainFrame().browsingContext.performActions([
      {
        type: Ue.Pointer,
        id: "__puppeteer_mouse",
        actions: o
      }
    ]);
  }
  async wheel(t = {}) {
    await s(this, Rt).mainFrame().browsingContext.performActions([
      {
        type: Ue.Wheel,
        id: "__puppeteer_wheel",
        actions: [
          {
            type: le.Scroll,
            ...s(this, $r) ?? {
              x: 0,
              y: 0
            },
            deltaX: t.deltaX ?? 0,
            deltaY: t.deltaY ?? 0
          }
        ]
      }
    ]);
  }
  drag() {
    throw new H();
  }
  dragOver() {
    throw new H();
  }
  dragEnter() {
    throw new H();
  }
  drop() {
    throw new H();
  }
  dragAndDrop() {
    throw new H();
  }
}
Rt = new WeakMap(), $r = new WeakMap();
var za, Ka, Wa, Lr, qr, Ga, Ii;
class lC {
  constructor(e, t, r, n, o, a) {
    u(this, za, !1);
    u(this, Ka);
    u(this, Wa);
    u(this, Lr);
    u(this, qr);
    u(this, Ga);
    u(this, Ii);
    m(this, qr, e), m(this, Ga, t), m(this, Ka, Math.round(n)), m(this, Wa, Math.round(o)), m(this, Ii, a), m(this, Lr, `__puppeteer_finger_${r}`);
  }
  async start(e = {}) {
    if (s(this, za))
      throw new Mg("Touch has already started");
    await s(this, qr).mainFrame().browsingContext.performActions([
      {
        type: Ue.Pointer,
        id: s(this, Lr),
        parameters: {
          pointerType: "touch"
        },
        actions: [
          {
            type: le.PointerMove,
            x: s(this, Ka),
            y: s(this, Wa),
            origin: e.origin
          },
          {
            ...s(this, Ii),
            type: le.PointerDown,
            button: 0
          }
        ]
      }
    ]), m(this, za, !0);
  }
  move(e, t) {
    const r = Math.round(e), n = Math.round(t);
    return s(this, qr).mainFrame().browsingContext.performActions([
      {
        type: Ue.Pointer,
        id: s(this, Lr),
        parameters: {
          pointerType: "touch"
        },
        actions: [
          {
            ...s(this, Ii),
            type: le.PointerMove,
            x: r,
            y: n
          }
        ]
      }
    ]);
  }
  async end() {
    await s(this, qr).mainFrame().browsingContext.performActions([
      {
        type: Ue.Pointer,
        id: s(this, Lr),
        parameters: {
          pointerType: "touch"
        },
        actions: [
          {
            type: le.PointerUp,
            button: 0
          }
        ]
      }
    ]), s(this, Ga).removeHandle(this);
  }
}
za = new WeakMap(), Ka = new WeakMap(), Wa = new WeakMap(), Lr = new WeakMap(), qr = new WeakMap(), Ga = new WeakMap(), Ii = new WeakMap();
var Va;
class hC extends Ag {
  constructor(t) {
    super();
    u(this, Va);
    m(this, Va, t);
  }
  async touchStart(t, r, n = {}) {
    const o = this.idGenerator(), a = {
      width: 0.5 * 2,
      // 2 times default touch radius.
      height: 0.5 * 2,
      // 2 times default touch radius.
      pressure: 0.5,
      altitudeAngle: Math.PI / 2
    }, c = new lC(s(this, Va), this, o, t, r, a);
    return await c.start(n), this.touches.push(c), c;
  }
}
Va = new WeakMap();
/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var pC = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
}, np = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, ip = function(i, e, t) {
  if (e != null) {
    if (typeof e != "object" && typeof e != "function") throw new TypeError("Object expected.");
    var r, n;
    if (t) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      r = e[Symbol.asyncDispose];
    }
    if (r === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      r = e[Symbol.dispose], t && (n = r);
    }
    if (typeof r != "function") throw new TypeError("Object not disposable.");
    n && (r = function() {
      try {
        n.call(this);
      } catch (o) {
        return Promise.reject(o);
      }
    }), i.stack.push({ value: e, dispose: r, async: t });
  } else t && i.stack.push({ async: !0 });
  return e;
}, op = /* @__PURE__ */ function(i) {
  return function(e) {
    function t(a) {
      e.error = e.hasError ? new i(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
    }
    var r, n = 0;
    function o() {
      for (; r = e.stack.pop(); )
        try {
          if (!r.async && n === 1) return n = 0, e.stack.push(r), Promise.resolve().then(o);
          if (r.dispose) {
            var a = r.dispose.call(r.value);
            if (r.async) return n |= 2, Promise.resolve(a).then(o, function(c) {
              return t(c), o();
            });
          } else n |= 1;
        } catch (c) {
          t(c);
        }
      if (n === 1) return e.hasError ? Promise.reject(e.error) : Promise.resolve();
      if (e.hasError) throw e.error;
    }
    return o();
  };
}(typeof SuppressedError == "function" ? SuppressedError : function(i, e, t) {
  var r = new Error(t);
  return r.name = "SuppressedError", r.error = i, r.suppressed = e, r;
});
let Hc = (() => {
  var n, o, a, c, f, p, d, h, w, Om, S, P, C, jl, Ul, $l, E;
  let i = Bg, e, t = [], r = [];
  return E = class extends i {
    constructor(l, y) {
      super();
      u(this, w);
      u(this, n, np(this, t, new X()));
      u(this, o, np(this, r));
      u(this, a);
      u(this, c, null);
      u(this, f, /* @__PURE__ */ new Set());
      N(this, "keyboard");
      N(this, "mouse");
      N(this, "touchscreen");
      N(this, "tracing");
      N(this, "coverage");
      u(this, p);
      u(this, d);
      u(this, h, /* @__PURE__ */ new Set());
      /**
       * @internal
       */
      u(this, S);
      u(this, P);
      /**
       * @internal
       */
      N(this, "_credentials", null);
      u(this, C);
      m(this, o, l), m(this, a, iC.from(this, y)), m(this, p, new Fg(s(this, a).client)), this.tracing = new jg(s(this, a).client), this.coverage = new Ug(s(this, a).client), this.keyboard = new uC(this), this.mouse = new dC(this), this.touchscreen = new hC(this);
    }
    static from(l, y) {
      var T;
      const k = new E(l, y);
      return g(T = k, w, Om).call(T), k;
    }
    get trustedEmitter() {
      return s(this, n);
    }
    set trustedEmitter(l) {
      m(this, n, l);
    }
    _client() {
      return s(this, a).client;
    }
    async setUserAgent(l, y) {
      let k, T, M;
      if (typeof l == "string" ? (k = l, T = y) : (k = l.userAgent ?? await s(this, o).browser().userAgent(), T = l.userAgentMetadata, M = l.platform), !s(this, o).browser().cdpSupported && (T || M))
        throw new H("Current Browser does not support `userAgentMetadata` or `platform`");
      if (s(this, o).browser().cdpSupported && (T || M))
        return await this._client().send("Network.setUserAgentOverride", {
          userAgent: k,
          userAgentMetadata: T,
          platform: M
        });
      const $ = k !== "";
      k = k ?? await s(this, o).browser().userAgent(), await s(this, a).browsingContext.setUserAgent($ ? k : null);
      const Z = (Ee) => {
        Ee && Object.defineProperty(navigator, "platform", {
          value: Ee,
          configurable: !0
        });
      }, L = [s(this, a)];
      for (const Ee of L)
        L.push(...Ee.childFrames());
      s(this, S) && await this.removeScriptToEvaluateOnNewDocument(s(this, S));
      const [fe] = await Promise.all([
        $ ? this.evaluateOnNewDocument(Z, M || void 0) : void 0,
        // When we disable the UserAgent we want to
        // evaluate the original value in all Browsing Contexts
        ...L.map((Ee) => Ee.evaluate(Z, M || void 0))
      ]);
      m(this, S, fe == null ? void 0 : fe.identifier);
    }
    async setBypassCSP(l) {
      await this._client().send("Page.setBypassCSP", { enabled: l });
    }
    async queryObjects(l) {
      Ve(!l.disposed, "Prototype JSHandle is disposed!"), Ve(l.id, "Prototype JSHandle must not be referencing primitive value");
      const y = await s(this, a).client.send("Runtime.queryObjects", {
        prototypeObjectId: l.id
      });
      return s(this, a).mainRealm().createHandle({
        type: "array",
        handle: y.objects.objectId
      });
    }
    browser() {
      return this.browserContext().browser();
    }
    browserContext() {
      return s(this, o);
    }
    mainFrame() {
      return s(this, a);
    }
    async emulateFocusedPage(l) {
      return await s(this, p).emulateFocus(l);
    }
    resize(l) {
      throw new H();
    }
    windowId() {
      throw new H();
    }
    openDevTools() {
      throw new H();
    }
    async focusedFrame() {
      const l = { stack: [], error: void 0, hasError: !1 };
      try {
        const k = ip(l, await this.mainFrame().isolatedRealm().evaluateHandle(() => {
          let M = window;
          for (; (M.document.activeElement instanceof M.HTMLIFrameElement || M.document.activeElement instanceof M.HTMLFrameElement) && M.document.activeElement.contentWindow !== null; )
            M = M.document.activeElement.contentWindow;
          return M;
        }), !1).remoteValue();
        Ve(k.type === "window");
        const T = this.frames().find((M) => M._id === k.value.context);
        return Ve(T), T;
      } catch (y) {
        l.error = y, l.hasError = !0;
      } finally {
        op(l);
      }
    }
    frames() {
      const l = [s(this, a)];
      for (const y of l)
        l.push(...y.childFrames());
      return l;
    }
    isClosed() {
      return s(this, a).detached;
    }
    async close(l) {
      const y = { stack: [], error: void 0, hasError: !1 };
      try {
        const k = ip(y, await s(this, o).waitForScreenshotOperations(), !1);
        try {
          await s(this, a).browsingContext.close(l == null ? void 0 : l.runBeforeUnload);
        } catch {
          return;
        }
      } catch (k) {
        y.error = k, y.hasError = !0;
      } finally {
        op(y);
      }
    }
    async reload(l = {}) {
      const [y] = await Promise.all([
        s(this, a).waitForNavigation(l),
        s(this, a).browsingContext.reload({
          ignoreCache: l.ignoreCache ? !0 : void 0
        })
      ]).catch(km(this.url(), l.timeout ?? this._timeoutSettings.navigationTimeout()));
      return y;
    }
    setDefaultNavigationTimeout(l) {
      this._timeoutSettings.setDefaultNavigationTimeout(l);
    }
    setDefaultTimeout(l) {
      this._timeoutSettings.setDefaultTimeout(l);
    }
    getDefaultTimeout() {
      return this._timeoutSettings.timeout();
    }
    getDefaultNavigationTimeout() {
      return this._timeoutSettings.navigationTimeout();
    }
    isJavaScriptEnabled() {
      return s(this, a).browsingContext.isJavaScriptEnabled();
    }
    async setGeolocation(l) {
      const { longitude: y, latitude: k, accuracy: T = 0 } = l;
      if (y < -180 || y > 180)
        throw new Error(`Invalid longitude "${y}": precondition -180 <= LONGITUDE <= 180 failed.`);
      if (k < -90 || k > 90)
        throw new Error(`Invalid latitude "${k}": precondition -90 <= LATITUDE <= 90 failed.`);
      if (T < 0)
        throw new Error(`Invalid accuracy "${T}": precondition 0 <= ACCURACY failed.`);
      return await s(this, a).browsingContext.setGeolocationOverride({
        coordinates: {
          latitude: l.latitude,
          longitude: l.longitude,
          accuracy: l.accuracy
        }
      });
    }
    async setJavaScriptEnabled(l) {
      return await s(this, a).browsingContext.setJavaScriptEnabled(l);
    }
    async emulateMediaType(l) {
      return await s(this, p).emulateMediaType(l);
    }
    async emulateCPUThrottling(l) {
      return await s(this, p).emulateCPUThrottling(l);
    }
    async emulateMediaFeatures(l) {
      return await s(this, p).emulateMediaFeatures(l);
    }
    async emulateTimezone(l) {
      return await s(this, a).browsingContext.setTimezoneOverride(l);
    }
    async emulateIdleState(l) {
      return await s(this, p).emulateIdleState(l);
    }
    async emulateVisionDeficiency(l) {
      return await s(this, p).emulateVisionDeficiency(l);
    }
    async setViewport(l) {
      if (!this.browser().cdpSupported) {
        const k = l != null && l.width && (l != null && l.height) ? {
          width: l.width,
          height: l.height
        } : null, T = l != null && l.deviceScaleFactor ? l.deviceScaleFactor : null, M = l ? l.isLandscape ? {
          natural: "landscape",
          type: "landscape-primary"
        } : {
          natural: "portrait",
          type: "portrait-primary"
        } : null;
        await Promise.all([
          s(this, a).browsingContext.setViewport({
            viewport: k,
            devicePixelRatio: T
          }),
          s(this, a).browsingContext.setScreenOrientationOverride(M)
        ]), m(this, c, l);
        return;
      }
      const y = await s(this, p).emulateViewport(l);
      m(this, c, l), y && await this.reload();
    }
    viewport() {
      return s(this, c);
    }
    async pdf(l = {}) {
      const { timeout: y = this._timeoutSettings.timeout(), path: k = void 0 } = l, { printBackground: T, margin: M, landscape: $, width: Z, height: L, pageRanges: fe, scale: Ee, preferCSSPageSize: ft } = $g(l, "cm"), Jr = fe ? fe.split(", ") : [];
      await Uc(xh(this.mainFrame().isolatedRealm().evaluate(() => document.fonts.ready)).pipe(Xs(jc(y))));
      const jt = await Uc(xh(s(this, a).browsingContext.print({
        background: T,
        margin: M,
        orientation: $ ? "landscape" : "portrait",
        page: {
          width: Z,
          height: L
        },
        pageRanges: Jr,
        scale: Ee,
        shrinkToFit: !ft
      })).pipe(Xs(jc(y)))), as = pp(jt, !0);
      return await this._maybeWriteTypedArrayToFile(k, as), as;
    }
    async createPDFStream(l) {
      const y = await this.pdf(l);
      return new ReadableStream({
        start(k) {
          k.enqueue(y), k.close();
        }
      });
    }
    async _screenshot(l) {
      const { clip: y, type: k, captureBeyondViewport: T, quality: M } = l;
      if (l.omitBackground !== void 0 && l.omitBackground)
        throw new H("BiDi does not support 'omitBackground'.");
      if (l.optimizeForSpeed !== void 0 && l.optimizeForSpeed)
        throw new H("BiDi does not support 'optimizeForSpeed'.");
      if (l.fromSurface !== void 0 && !l.fromSurface)
        throw new H("BiDi does not support 'fromSurface'.");
      if (y !== void 0 && y.scale !== void 0 && y.scale !== 1)
        throw new H("BiDi does not support 'scale' in 'clip'.");
      let $;
      if (y)
        if (T)
          $ = y;
        else {
          const [L, fe] = await this.evaluate(() => {
            if (!window.visualViewport)
              throw new Error("window.visualViewport is not supported.");
            return [
              window.visualViewport.pageLeft,
              window.visualViewport.pageTop
            ];
          });
          $ = {
            ...y,
            x: y.x - L,
            y: y.y - fe
          };
        }
      return await s(this, a).browsingContext.captureScreenshot({
        origin: T ? "document" : "viewport",
        format: {
          type: `image/${k}`,
          ...M !== void 0 ? { quality: M / 100 } : {}
        },
        ...$ ? { clip: { type: "box", ...$ } } : {}
      });
    }
    async createCDPSession() {
      return await s(this, a).createCDPSession();
    }
    async bringToFront() {
      await s(this, a).browsingContext.activate();
    }
    async evaluateOnNewDocument(l, ...y) {
      const k = fC(l, ...y);
      return { identifier: await s(this, a).browsingContext.addPreloadScript(k) };
    }
    async removeScriptToEvaluateOnNewDocument(l) {
      await s(this, a).browsingContext.removePreloadScript(l);
    }
    async exposeFunction(l, y) {
      return await this.mainFrame().exposeFunction(l, "default" in y ? y.default : y);
    }
    isDragInterceptionEnabled() {
      return !1;
    }
    async setCacheEnabled(l) {
      if (!s(this, o).browser().cdpSupported) {
        await s(this, a).browsingContext.setCacheBehavior(l ? "default" : "bypass");
        return;
      }
      await this._client().send("Network.setCacheDisabled", {
        cacheDisabled: !l
      });
    }
    async cookies(...l) {
      const y = (l.length ? l : [this.url()]).map((T) => new URL(T));
      return (await s(this, a).browsingContext.getCookies()).map((T) => Rm(T)).filter((T) => y.some((M) => wC(T, M)));
    }
    isServiceWorkerBypassed() {
      throw new H();
    }
    target() {
      throw new H();
    }
    async waitForFileChooser(l = {}) {
      const { timeout: y = this._timeoutSettings.timeout() } = l, k = zl.create({
        message: `Waiting for \`FileChooser\` failed: ${y}ms exceeded`,
        timeout: y
      });
      s(this, h).add(k), l.signal && l.signal.addEventListener("abort", () => {
        var T;
        k.reject((T = l.signal) == null ? void 0 : T.reason);
      }, { once: !0 }), s(this, a).browsingContext.once("filedialogopened", (T) => {
        if (!T.element)
          return;
        const M = new Lg(oo.from({
          sharedId: T.element.sharedId,
          handle: T.element.handle,
          type: "node"
        }, s(this, a).mainRealm()), T.multiple);
        for (const $ of s(this, h))
          $.resolve(M), s(this, h).delete($);
      });
      try {
        return await k.valueOrThrow();
      } catch (T) {
        throw s(this, h).delete(k), T;
      }
    }
    workers() {
      return [...s(this, f)];
    }
    get isNetworkInterceptionEnabled() {
      return !!s(this, P) || !!s(this, C);
    }
    async setRequestInterception(l) {
      m(this, P, await g(this, w, jl).call(this, [
        "beforeRequestSent"
        /* Bidi.Network.InterceptPhase.BeforeRequestSent */
      ], s(this, P), l));
    }
    /**
     * @internal
     */
    async setExtraHTTPHeaders(l) {
      await s(this, a).browsingContext.setExtraHTTPHeaders(l);
    }
    async authenticate(l) {
      m(this, C, await g(this, w, jl).call(this, [
        "authRequired"
        /* Bidi.Network.InterceptPhase.AuthRequired */
      ], s(this, C), !!l)), this._credentials = l;
    }
    setDragInterception() {
      throw new H();
    }
    setBypassServiceWorker() {
      throw new H();
    }
    async setOfflineMode(l) {
      return s(this, o).browser().cdpSupported ? (s(this, d) || m(this, d, {
        offline: !1,
        upload: -1,
        download: -1,
        latency: 0
      }), s(this, d).offline = l, await g(this, w, Ul).call(this)) : await s(this, a).browsingContext.setOfflineMode(l);
    }
    async emulateNetworkConditions(l) {
      if (!s(this, o).browser().cdpSupported) {
        if (!(l != null && l.offline) && (((l == null ? void 0 : l.upload) ?? -1) >= 0 || ((l == null ? void 0 : l.download) ?? -1) >= 0 || ((l == null ? void 0 : l.latency) ?? 0) > 0))
          throw new H();
        return await s(this, a).browsingContext.setOfflineMode((l == null ? void 0 : l.offline) ?? !1);
      }
      return s(this, d) || m(this, d, {
        offline: (l == null ? void 0 : l.offline) ?? !1,
        upload: -1,
        download: -1,
        latency: 0
      }), s(this, d).upload = l ? l.upload : -1, s(this, d).download = l ? l.download : -1, s(this, d).latency = l ? l.latency : 0, s(this, d).offline = (l == null ? void 0 : l.offline) ?? !1, await g(this, w, Ul).call(this);
    }
    async setCookie(...l) {
      const y = this.url(), k = y.startsWith("http");
      for (const T of l) {
        let M = T.url || "";
        !M && k && (M = y), Ve(M !== "about:blank", `Blank page can not have cookie "${T.name}"`), Ve(!String.prototype.startsWith.call(M || "", "data:"), `Data URL page can not have cookie "${T.name}"`), Ve(T.partitionKey === void 0 || typeof T.partitionKey == "string", "BiDi only allows domain partition keys");
        const $ = URL.canParse(M) ? new URL(M) : void 0, Z = T.domain ?? ($ == null ? void 0 : $.hostname);
        Ve(Z !== void 0, "At least one of the url and domain needs to be specified");
        const L = {
          domain: Z,
          name: T.name,
          value: {
            type: "string",
            value: T.value
          },
          ...T.path !== void 0 ? { path: T.path } : {},
          ...T.httpOnly !== void 0 ? { httpOnly: T.httpOnly } : {},
          ...T.secure !== void 0 ? { secure: T.secure } : {},
          ...T.sameSite !== void 0 ? { sameSite: Mm(T.sameSite) } : {},
          expiry: Bm(T.expires),
          // Chrome-specific properties.
          ...Am(T, "sameParty", "sourceScheme", "priority", "url")
        };
        T.partitionKey !== void 0 ? await this.browserContext().userContext.setCookie(L, T.partitionKey) : await s(this, a).browsingContext.setCookie(L);
      }
    }
    async deleteCookie(...l) {
      await Promise.all(l.map(async (y) => {
        const k = y.url ?? this.url(), T = URL.canParse(k) ? new URL(k) : void 0, M = y.domain ?? (T == null ? void 0 : T.hostname);
        Ve(M !== void 0, "At least one of the url and domain needs to be specified");
        const $ = {
          domain: M,
          name: y.name,
          ...y.path !== void 0 ? { path: y.path } : {}
        };
        await s(this, a).browsingContext.deleteCookie($);
      }));
    }
    async removeExposedFunction(l) {
      await s(this, a).removeExposedFunction(l);
    }
    metrics() {
      throw new H();
    }
    async goBack(l = {}) {
      return await g(this, w, $l).call(this, -1, l);
    }
    async goForward(l = {}) {
      return await g(this, w, $l).call(this, 1, l);
    }
    async waitForDevicePrompt(l = {}) {
      return await this.mainFrame().waitForDevicePrompt(l);
    }
    get bluetooth() {
      return this.mainFrame().browsingContext.bluetooth;
    }
  }, n = new WeakMap(), o = new WeakMap(), a = new WeakMap(), c = new WeakMap(), f = new WeakMap(), p = new WeakMap(), d = new WeakMap(), h = new WeakMap(), w = new WeakSet(), Om = function() {
    s(this, a).browsingContext.on("closed", () => {
      this.trustedEmitter.emit("close", void 0), this.trustedEmitter.removeAllListeners();
    }), this.trustedEmitter.on("workercreated", (l) => {
      s(this, f).add(l);
    }), this.trustedEmitter.on("workerdestroyed", (l) => {
      s(this, f).delete(l);
    });
  }, S = new WeakMap(), P = new WeakMap(), C = new WeakMap(), jl = async function(l, y, k) {
    if (k && !y)
      return await s(this, a).browsingContext.addIntercept({
        phases: l
      });
    if (!k && y) {
      await s(this, a).browsingContext.userContext.browser.removeIntercept(y);
      return;
    }
    return y;
  }, Ul = async function() {
    s(this, d) && await this._client().send("Network.emulateNetworkConditions", {
      offline: s(this, d).offline,
      latency: s(this, d).latency,
      uploadThroughput: s(this, d).upload,
      downloadThroughput: s(this, d).download
    });
  }, $l = async function(l, y) {
    const k = new AbortController();
    try {
      const [T] = await Promise.all([
        this.waitForNavigation({
          ...y,
          signal: k.signal
        }),
        s(this, a).browsingContext.traverseHistory(l)
      ]);
      return T;
    } catch (T) {
      throw k.abort(), T;
    }
  }, (() => {
    const l = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    e = [bu()], pC(E, null, e, { kind: "accessor", name: "trustedEmitter", static: !1, private: !1, access: { has: (y) => "trustedEmitter" in y, get: (y) => y.trustedEmitter, set: (y, k) => {
      y.trustedEmitter = k;
    } }, metadata: l }, t, r), l && Object.defineProperty(E, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: l });
  })(), E;
})();
function fC(i, ...e) {
  return `() => {${qg(i, ...e)}}`;
}
function mC(i, e) {
  const t = i.domain.toLowerCase(), r = e.hostname.toLowerCase();
  return t === r ? !0 : t.startsWith(".") && r.endsWith(t);
}
function gC(i, e) {
  const t = e.pathname, r = i.path;
  return !!(t === r || t.startsWith(r) && (r.endsWith("/") || t[r.length] === "/"));
}
function wC(i, e) {
  const t = new URL(e);
  return Ve(i !== void 0), mC(i, t) ? gC(i, t) : !1;
}
function Rm(i, e = !1) {
  const t = i[zc + "partitionKey"];
  function r() {
    return typeof t == "string" ? { partitionKey: t } : typeof t == "object" && t !== null ? e ? {
      partitionKey: {
        sourceOrigin: t.topLevelSite,
        hasCrossSiteAncestor: t.hasCrossSiteAncestor ?? !1
      }
    } : {
      // TODO: a breaking change in Puppeteer is required to change
      // partitionKey type and report the composite partition key.
      partitionKey: t.topLevelSite
    } : {};
  }
  return {
    name: i.name,
    // Presents binary value as base64 string.
    value: i.value.value,
    domain: i.domain,
    path: i.path,
    size: i.size,
    httpOnly: i.httpOnly,
    secure: i.secure,
    sameSite: vC(i.sameSite),
    expires: i.expiry ?? -1,
    session: i.expiry === void 0 || i.expiry <= 0,
    // Extending with CDP-specific properties with `goog:` prefix.
    ...yC(i, "sameParty", "sourceScheme", "partitionKeyOpaque", "priority"),
    ...r()
  };
}
const zc = "goog:";
function yC(i, ...e) {
  const t = {};
  for (const r of e)
    i[zc + r] !== void 0 && (t[r] = i[zc + r]);
  return t;
}
function Am(i, ...e) {
  const t = {};
  for (const r of e)
    i[r] !== void 0 && (t[zc + r] = i[r]);
  return t;
}
function vC(i) {
  return i === "strict" ? "Strict" : i === "lax" ? "Lax" : "None";
}
function Mm(i) {
  return i === "Strict" ? "strict" : i === "Lax" ? "lax" : "none";
}
function Bm(i) {
  return [void 0, -1].includes(i) ? void 0 : i;
}
function bC(i) {
  if (i === void 0 || typeof i == "string")
    return i;
  if (i.hasCrossSiteAncestor)
    throw new H("WebDriver BiDi does not support `hasCrossSiteAncestor` yet.");
  return i.sourceOrigin;
}
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var _i;
class CC extends Cu {
  constructor(t) {
    super();
    u(this, _i);
    m(this, _i, t);
  }
  asPage() {
    throw new H();
  }
  url() {
    return "";
  }
  createCDPSession() {
    throw new H();
  }
  type() {
    return xu.BROWSER;
  }
  browser() {
    return s(this, _i);
  }
  browserContext() {
    return s(this, _i).defaultBrowserContext();
  }
  opener() {
    throw new H();
  }
}
_i = new WeakMap();
var ts;
class xC extends Cu {
  constructor(t) {
    super();
    u(this, ts);
    m(this, ts, t);
  }
  async page() {
    return s(this, ts);
  }
  async asPage() {
    return Hc.from(this.browserContext(), s(this, ts).mainFrame().browsingContext);
  }
  url() {
    return s(this, ts).url();
  }
  createCDPSession() {
    return s(this, ts).createCDPSession();
  }
  type() {
    return xu.PAGE;
  }
  browser() {
    return this.browserContext().browser();
  }
  browserContext() {
    return s(this, ts).browserContext();
  }
  opener() {
    throw new H();
  }
}
ts = new WeakMap();
var ss, ki;
class EC extends Cu {
  constructor(t) {
    super();
    u(this, ss);
    u(this, ki);
    m(this, ss, t);
  }
  async page() {
    return s(this, ki) === void 0 && m(this, ki, Hc.from(this.browserContext(), s(this, ss).browsingContext)), s(this, ki);
  }
  async asPage() {
    return Hc.from(this.browserContext(), s(this, ss).browsingContext);
  }
  url() {
    return s(this, ss).url();
  }
  createCDPSession() {
    return s(this, ss).createCDPSession();
  }
  type() {
    return xu.PAGE;
  }
  browser() {
    return this.browserContext().browser();
  }
  browserContext() {
    return s(this, ss).page().browserContext();
  }
  opener() {
    throw new H();
  }
}
ss = new WeakMap(), ki = new WeakMap();
var Ti;
class SC extends Cu {
  constructor(t) {
    super();
    u(this, Ti);
    m(this, Ti, t);
  }
  async page() {
    throw new H();
  }
  async asPage() {
    throw new H();
  }
  url() {
    return s(this, Ti).url();
  }
  createCDPSession() {
    throw new H();
  }
  type() {
    return xu.OTHER;
  }
  browser() {
    return this.browserContext().browser();
  }
  browserContext() {
    return s(this, Ti).frame.page().browserContext();
  }
  opener() {
    throw new H();
  }
}
Ti = new WeakMap();
/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var PC = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
}, ap = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, IC = function(i, e, t) {
  if (e != null) {
    if (typeof e != "object" && typeof e != "function") throw new TypeError("Object expected.");
    var r, n;
    if (t) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      r = e[Symbol.asyncDispose];
    }
    if (r === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      r = e[Symbol.dispose], t && (n = r);
    }
    if (typeof r != "function") throw new TypeError("Object not disposable.");
    n && (r = function() {
      try {
        n.call(this);
      } catch (o) {
        return Promise.reject(o);
      }
    }), i.stack.push({ value: e, dispose: r, async: t });
  } else t && i.stack.push({ async: !0 });
  return e;
}, _C = /* @__PURE__ */ function(i) {
  return function(e) {
    function t(a) {
      e.error = e.hasError ? new i(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
    }
    var r, n = 0;
    function o() {
      for (; r = e.stack.pop(); )
        try {
          if (!r.async && n === 1) return n = 0, e.stack.push(r), Promise.resolve().then(o);
          if (r.dispose) {
            var a = r.dispose.call(r.value);
            if (r.async) return n |= 2, Promise.resolve(a).then(o, function(c) {
              return t(c), o();
            });
          } else n |= 1;
        } catch (c) {
          t(c);
        }
      if (n === 1) return e.hasError ? Promise.reject(e.error) : Promise.resolve();
      if (e.hasError) throw e.error;
    }
    return o();
  };
}(typeof SuppressedError == "function" ? SuppressedError : function(i, e, t) {
  var r = new Error(t);
  return r.name = "SuppressedError", r.error = i, r.suppressed = e, r;
});
let kC = (() => {
  var n, o, a, c, f, p, d, Fm, Ll, x;
  let i = Hg, e, t = [], r = [];
  return x = class extends i {
    constructor(C, b, D) {
      super();
      u(this, d);
      u(this, n, ap(this, t, new X()));
      u(this, o, ap(this, r));
      u(this, a);
      // This is public because of cookies.
      N(this, "userContext");
      u(this, c, /* @__PURE__ */ new WeakMap());
      u(this, f, /* @__PURE__ */ new Map());
      u(this, p, []);
      m(this, o, C), this.userContext = b, m(this, a, D.defaultViewport);
    }
    static from(C, b, D) {
      var E;
      const v = new x(C, b, D);
      return g(E = v, d, Fm).call(E), v;
    }
    get trustedEmitter() {
      return s(this, n);
    }
    set trustedEmitter(C) {
      m(this, n, C);
    }
    targets() {
      return [...s(this, f).values()].flatMap(([C, b]) => [C, ...b.values()]);
    }
    async newPage(C) {
      const b = { stack: [], error: void 0, hasError: !1 };
      try {
        const D = IC(b, await this.waitForScreenshotOperations(), !1), v = (C == null ? void 0 : C.type) === "window" ? "window" : "tab", E = await this.userContext.createBrowsingContext(v), A = s(this, c).get(E);
        if (!A)
          throw new Error("Page is not found");
        if (s(this, a))
          try {
            await A.setViewport(s(this, a));
          } catch {
          }
        return A;
      } catch (D) {
        b.error = D, b.hasError = !0;
      } finally {
        _C(b);
      }
    }
    async close() {
      Ve(this.userContext.id !== qc.DEFAULT, "Default BrowserContext cannot be closed!");
      try {
        await this.userContext.remove();
      } catch (C) {
        Ae(C);
      }
      s(this, f).clear();
    }
    browser() {
      return s(this, o);
    }
    async pages(C = !1) {
      return [...this.userContext.browsingContexts].map((b) => s(this, c).get(b));
    }
    async overridePermissions(C, b) {
      const D = new Set(b.map((v) => {
        if (!Eh.get(v))
          throw new Error("Unknown permission: " + v);
        return v;
      }));
      await Promise.all(Array.from(Eh.keys()).map((v) => {
        const E = this.userContext.setPermissions(
          C,
          {
            name: v
          },
          D.has(v) ? "granted" : "denied"
          /* Bidi.Permissions.PermissionState.Denied */
        );
        return s(this, p).push({ origin: C, permission: v }), D.has(v) ? E : E.catch(Ae);
      }));
    }
    async clearPermissionOverrides() {
      const C = s(this, p).map(({ permission: b, origin: D }) => this.userContext.setPermissions(
        D,
        {
          name: b
        },
        "prompt"
        /* Bidi.Permissions.PermissionState.Prompt */
      ).catch(Ae));
      m(this, p, []), await Promise.all(C);
    }
    get id() {
      if (this.userContext.id !== qc.DEFAULT)
        return this.userContext.id;
    }
    async cookies() {
      return (await this.userContext.getCookies()).map((b) => Rm(b, !0));
    }
    async setCookie(...C) {
      await Promise.all(C.map(async (b) => {
        const D = {
          domain: b.domain,
          name: b.name,
          value: {
            type: "string",
            value: b.value
          },
          ...b.path !== void 0 ? { path: b.path } : {},
          ...b.httpOnly !== void 0 ? { httpOnly: b.httpOnly } : {},
          ...b.secure !== void 0 ? { secure: b.secure } : {},
          ...b.sameSite !== void 0 ? { sameSite: Mm(b.sameSite) } : {},
          expiry: Bm(b.expires),
          // Chrome-specific properties.
          ...Am(b, "sameParty", "sourceScheme", "priority", "url")
        };
        return await this.userContext.setCookie(D, bC(b.partitionKey));
      }));
    }
  }, n = new WeakMap(), o = new WeakMap(), a = new WeakMap(), c = new WeakMap(), f = new WeakMap(), p = new WeakMap(), d = new WeakSet(), Fm = function() {
    for (const C of this.userContext.browsingContexts)
      g(this, d, Ll).call(this, C);
    this.userContext.on("browsingcontext", ({ browsingContext: C }) => {
      const b = g(this, d, Ll).call(this, C);
      if (C.originalOpener)
        for (const D of this.userContext.browsingContexts)
          D.id === C.originalOpener && s(this, c).get(D).trustedEmitter.emit("popup", b);
    }), this.userContext.on("closed", () => {
      this.trustedEmitter.removeAllListeners();
    });
  }, Ll = function(C) {
    const b = Hc.from(this, C);
    s(this, c).set(C, b), b.trustedEmitter.on("close", () => {
      s(this, c).delete(C);
    });
    const D = new xC(b), v = /* @__PURE__ */ new Map();
    return s(this, f).set(b, [D, v]), b.trustedEmitter.on("frameattached", (E) => {
      const A = E, R = new EC(A);
      v.set(A, R), this.trustedEmitter.emit("targetcreated", R);
    }), b.trustedEmitter.on("framenavigated", (E) => {
      const A = E, R = v.get(A);
      R === void 0 ? this.trustedEmitter.emit("targetchanged", D) : this.trustedEmitter.emit("targetchanged", R);
    }), b.trustedEmitter.on("framedetached", (E) => {
      const A = E, R = v.get(A);
      R !== void 0 && (v.delete(A), this.trustedEmitter.emit("targetdestroyed", R));
    }), b.trustedEmitter.on("workercreated", (E) => {
      const A = E, R = new SC(A);
      v.set(A, R), this.trustedEmitter.emit("targetcreated", R);
    }), b.trustedEmitter.on("workerdestroyed", (E) => {
      const A = E, R = v.get(A);
      R !== void 0 && (v.delete(E), this.trustedEmitter.emit("targetdestroyed", R));
    }), b.trustedEmitter.on("close", () => {
      s(this, f).delete(b), this.trustedEmitter.emit("targetdestroyed", D);
    }), this.trustedEmitter.emit("targetcreated", D), b;
  }, (() => {
    const C = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    e = [bu()], PC(x, null, e, { kind: "accessor", name: "trustedEmitter", static: !1, private: !1, access: { has: (b) => "trustedEmitter" in b, get: (b) => b.trustedEmitter, set: (b, D) => {
      b.trustedEmitter = D;
    } }, metadata: C }, t, r), C && Object.defineProperty(x, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: C });
  })(), x;
})();
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var TC = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, ls = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
}, DC = function(i, e, t) {
  if (e != null) {
    if (typeof e != "object" && typeof e != "function") throw new TypeError("Object expected.");
    var r, n;
    if (t) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      r = e[Symbol.asyncDispose];
    }
    if (r === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      r = e[Symbol.dispose], t && (n = r);
    }
    if (typeof r != "function") throw new TypeError("Object not disposable.");
    n && (r = function() {
      try {
        n.call(this);
      } catch (o) {
        return Promise.reject(o);
      }
    }), i.stack.push({ value: e, dispose: r, async: t });
  } else t && i.stack.push({ async: !0 });
  return e;
}, NC = /* @__PURE__ */ function(i) {
  return function(e) {
    function t(a) {
      e.error = e.hasError ? new i(a, e.error, "An error was suppressed during disposal.") : a, e.hasError = !0;
    }
    var r, n = 0;
    function o() {
      for (; r = e.stack.pop(); )
        try {
          if (!r.async && n === 1) return n = 0, e.stack.push(r), Promise.resolve().then(o);
          if (r.dispose) {
            var a = r.dispose.call(r.value);
            if (r.async) return n |= 2, Promise.resolve(a).then(o, function(c) {
              return t(c), o();
            });
          } else n |= 1;
        } catch (c) {
          t(c);
        }
      if (n === 1) return e.hasError ? Promise.reject(e.error) : Promise.resolve();
      if (e.hasError) throw e.error;
    }
    return o();
  };
}(typeof SuppressedError == "function" ? SuppressedError : function(i, e, t) {
  var r = new Error(t);
  return r.name = "SuppressedError", r.error = i, r.suppressed = e, r;
});
let OC = (() => {
  var d, h, w, x, S, P, jm, Um, $m, ql, E;
  let i = X, e = [], t, r, n, o, a, c, f, p;
  return E = class extends i {
    constructor(l) {
      super();
      u(this, P);
      u(this, d, (TC(this, e), !1));
      u(this, h);
      u(this, w, new Mt());
      u(this, x, /* @__PURE__ */ new Map());
      N(this, "session");
      u(this, S, /* @__PURE__ */ new Map());
      this.session = l;
    }
    static async from(l) {
      var k;
      const y = new E(l);
      return await g(k = y, P, jm).call(k), y;
    }
    get closed() {
      return s(this, d);
    }
    get defaultUserContext() {
      return s(this, x).get(qc.DEFAULT);
    }
    get disconnected() {
      return s(this, h) !== void 0;
    }
    get disposed() {
      return this.disconnected;
    }
    get userContexts() {
      return s(this, x).values();
    }
    dispose(l, y = !1) {
      m(this, d, y), m(this, h, l), this[he]();
    }
    async close() {
      try {
        await this.session.send("browser.close", {});
      } finally {
        this.dispose("Browser already closed.", !0);
      }
    }
    async addPreloadScript(l, y = {}) {
      var T;
      const { result: { script: k } } = await this.session.send("script.addPreloadScript", {
        functionDeclaration: l,
        ...y,
        contexts: (T = y.contexts) == null ? void 0 : T.map((M) => M.id)
      });
      return k;
    }
    async removeIntercept(l) {
      await this.session.send("network.removeIntercept", {
        intercept: l
      });
    }
    async removePreloadScript(l) {
      await this.session.send("script.removePreloadScript", {
        script: l
      });
    }
    async createUserContext(l) {
      var T, M, $;
      const y = l.proxyServer === void 0 ? void 0 : {
        proxyType: "manual",
        httpProxy: l.proxyServer,
        sslProxy: l.proxyServer,
        noProxy: l.proxyBypassList
      }, { result: { userContext: k } } = await this.session.send("browser.createUserContext", {
        proxy: y
      });
      if (((T = l.downloadBehavior) == null ? void 0 : T.policy) === "allowAndName")
        throw new H("`allowAndName` is not supported in WebDriver BiDi");
      if (((M = l.downloadBehavior) == null ? void 0 : M.policy) === "allow") {
        if (l.downloadBehavior.downloadPath === void 0)
          throw new H("`downloadPath` is required in `allow` download behavior");
        await this.session.send("browser.setDownloadBehavior", {
          downloadBehavior: {
            type: "allowed",
            destinationFolder: l.downloadBehavior.downloadPath
          },
          userContexts: [k]
        });
      }
      return (($ = l.downloadBehavior) == null ? void 0 : $.policy) === "deny" && await this.session.send("browser.setDownloadBehavior", {
        downloadBehavior: { type: "denied" },
        userContexts: [k]
      }), g(this, P, ql).call(this, k);
    }
    async installExtension(l) {
      const { result: { extension: y } } = await this.session.send("webExtension.install", {
        extensionData: { type: "path", path: l }
      });
      return y;
    }
    async uninstallExtension(l) {
      await this.session.send("webExtension.uninstall", { extension: l });
    }
    [(t = [$s], r = [q((l) => s(l, h))], n = [q((l) => s(l, h))], o = [q((l) => s(l, h))], a = [q((l) => s(l, h))], c = [q((l) => s(l, h))], f = [q((l) => s(l, h))], p = [q((l) => s(l, h))], he)]() {
      s(this, h) ?? m(this, h, "Browser was disconnected, probably because the session ended."), this.closed && this.emit("closed", { reason: s(this, h) }), this.emit("disconnected", { reason: s(this, h) }), s(this, w).dispose(), super[he]();
    }
  }, d = new WeakMap(), h = new WeakMap(), w = new WeakMap(), x = new WeakMap(), S = new WeakMap(), P = new WeakSet(), jm = async function() {
    const l = s(this, w).use(new X(this.session));
    l.once("ended", ({ reason: y }) => {
      this.dispose(y);
    }), l.on("script.realmCreated", (y) => {
      y.type === "shared-worker" && s(this, S).set(y.realm, kl.from(this, y.realm, y.origin));
    }), await g(this, P, Um).call(this), await g(this, P, $m).call(this);
  }, Um = async function() {
    const { result: { userContexts: l } } = await this.session.send("browser.getUserContexts", {});
    for (const y of l)
      g(this, P, ql).call(this, y.userContext);
  }, $m = async function() {
    const l = /* @__PURE__ */ new Set();
    let y;
    {
      const k = { stack: [], error: void 0, hasError: !1 };
      try {
        DC(k, new X(this.session), !1).on("browsingContext.contextCreated", ($) => {
          l.add($.context);
        });
        const { result: M } = await this.session.send("browsingContext.getTree", {});
        y = M.contexts;
      } catch (T) {
        k.error = T, k.hasError = !0;
      } finally {
        NC(k);
      }
    }
    for (const k of y)
      l.has(k.context) || this.session.emit("browsingContext.contextCreated", k), k.children && y.push(...k.children);
  }, ql = function(l) {
    const y = qc.create(this, l);
    s(this, x).set(y.id, y);
    const k = s(this, w).use(new X(y));
    return k.once("closed", () => {
      k.removeAllListeners(), s(this, x).delete(y.id);
    }), y;
  }, (() => {
    const l = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    ls(E, null, t, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (y) => "dispose" in y, get: (y) => y.dispose }, metadata: l }, null, e), ls(E, null, r, { kind: "method", name: "close", static: !1, private: !1, access: { has: (y) => "close" in y, get: (y) => y.close }, metadata: l }, null, e), ls(E, null, n, { kind: "method", name: "addPreloadScript", static: !1, private: !1, access: { has: (y) => "addPreloadScript" in y, get: (y) => y.addPreloadScript }, metadata: l }, null, e), ls(E, null, o, { kind: "method", name: "removeIntercept", static: !1, private: !1, access: { has: (y) => "removeIntercept" in y, get: (y) => y.removeIntercept }, metadata: l }, null, e), ls(E, null, a, { kind: "method", name: "removePreloadScript", static: !1, private: !1, access: { has: (y) => "removePreloadScript" in y, get: (y) => y.removePreloadScript }, metadata: l }, null, e), ls(E, null, c, { kind: "method", name: "createUserContext", static: !1, private: !1, access: { has: (y) => "createUserContext" in y, get: (y) => y.createUserContext }, metadata: l }, null, e), ls(E, null, f, { kind: "method", name: "installExtension", static: !1, private: !1, access: { has: (y) => "installExtension" in y, get: (y) => y.installExtension }, metadata: l }, null, e), ls(E, null, p, { kind: "method", name: "uninstallExtension", static: !1, private: !1, access: { has: (y) => "uninstallExtension" in y, get: (y) => y.uninstallExtension }, metadata: l }, null, e), l && Object.defineProperty(E, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: l });
  })(), E;
})();
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var _d = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, an = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
};
let RC = (() => {
  var d, h, w, x, S, Lm, C;
  let i = X, e = [], t, r = [], n = [], o, a, c, f, p;
  return C = class extends i {
    constructor(v, E) {
      super();
      u(this, S);
      u(this, d, _d(this, e));
      u(this, h, new Mt());
      u(this, w);
      N(this, "browser");
      u(this, x, _d(this, r, void 0));
      _d(this, n), m(this, w, E), this.connection = v;
    }
    static async from(v, E) {
      var l;
      const { result: A } = await v.send("session.new", {
        capabilities: E
      }), R = new C(v, A);
      return await g(l = R, S, Lm).call(l), R;
    }
    get connection() {
      return s(this, x);
    }
    set connection(v) {
      m(this, x, v);
    }
    get capabilities() {
      return s(this, w).capabilities;
    }
    get disposed() {
      return this.ended;
    }
    get ended() {
      return s(this, d) !== void 0;
    }
    get id() {
      return s(this, w).sessionId;
    }
    dispose(v) {
      m(this, d, v), this[he]();
    }
    /**
     * Currently, there is a 1:1 relationship between the session and the
     * session. In the future, we might support multiple sessions and in that
     * case we always needs to make sure that the session for the right session
     * object is used, so we implement this method here, although it's not defined
     * in the spec.
     */
    async send(v, E) {
      return await this.connection.send(v, E);
    }
    async subscribe(v, E) {
      await this.send("session.subscribe", {
        events: v,
        contexts: E
      });
    }
    async addIntercepts(v, E) {
      await this.send("session.subscribe", {
        events: v,
        contexts: E
      });
    }
    async end() {
      try {
        await this.send("session.end", {});
      } finally {
        this.dispose("Session already ended.");
      }
    }
    [(t = [bu()], o = [$s], a = [q((v) => s(v, d))], c = [q((v) => s(v, d))], f = [q((v) => s(v, d))], p = [q((v) => s(v, d))], he)]() {
      s(this, d) ?? m(this, d, "Session already destroyed, probably because the connection broke."), this.emit("ended", { reason: s(this, d) }), s(this, h).dispose(), super[he]();
    }
  }, d = new WeakMap(), h = new WeakMap(), w = new WeakMap(), x = new WeakMap(), S = new WeakSet(), Lm = async function() {
    this.browser = await OC.from(this), s(this, h).use(this.browser).once("closed", ({ reason: A }) => {
      this.dispose(A);
    });
    const E = /* @__PURE__ */ new WeakSet();
    this.on("browsingContext.fragmentNavigated", (A) => {
      E.has(A) || (E.add(A), this.emit("browsingContext.navigationStarted", A), this.emit("browsingContext.fragmentNavigated", A));
    });
  }, (() => {
    const v = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    an(C, null, t, { kind: "accessor", name: "connection", static: !1, private: !1, access: { has: (E) => "connection" in E, get: (E) => E.connection, set: (E, A) => {
      E.connection = A;
    } }, metadata: v }, r, n), an(C, null, o, { kind: "method", name: "dispose", static: !1, private: !1, access: { has: (E) => "dispose" in E, get: (E) => E.dispose }, metadata: v }, null, e), an(C, null, a, { kind: "method", name: "send", static: !1, private: !1, access: { has: (E) => "send" in E, get: (E) => E.send }, metadata: v }, null, e), an(C, null, c, { kind: "method", name: "subscribe", static: !1, private: !1, access: { has: (E) => "subscribe" in E, get: (E) => E.subscribe }, metadata: v }, null, e), an(C, null, f, { kind: "method", name: "addIntercepts", static: !1, private: !1, access: { has: (E) => "addIntercepts" in E, get: (E) => E.addIntercepts }, metadata: v }, null, e), an(C, null, p, { kind: "method", name: "end", static: !1, private: !1, access: { has: (E) => "end" in E, get: (E) => E.end }, metadata: v }, null, e), v && Object.defineProperty(C, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: v });
  })(), C;
})();
/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var AC = function(i, e, t, r, n, o) {
  function a(b) {
    if (b !== void 0 && typeof b != "function") throw new TypeError("Function expected");
    return b;
  }
  for (var c = r.kind, f = c === "getter" ? "get" : c === "setter" ? "set" : "value", p = !e && i ? r.static ? i : i.prototype : null, d = e || (p ? Object.getOwnPropertyDescriptor(p, r.name) : {}), h, w = !1, x = t.length - 1; x >= 0; x--) {
    var S = {};
    for (var P in r) S[P] = P === "access" ? {} : r[P];
    for (var P in r.access) S.access[P] = r.access[P];
    S.addInitializer = function(b) {
      if (w) throw new TypeError("Cannot add initializers after decoration has completed");
      o.push(a(b || null));
    };
    var C = (0, t[x])(c === "accessor" ? { get: d.get, set: d.set } : d[f], S);
    if (c === "accessor") {
      if (C === void 0) continue;
      if (C === null || typeof C != "object") throw new TypeError("Object expected");
      (h = a(C.get)) && (d.get = h), (h = a(C.set)) && (d.set = h), (h = a(C.init)) && n.unshift(h);
    } else (h = a(C)) && (c === "field" ? n.unshift(h) : d[f] = h);
  }
  p && Object.defineProperty(p, r.name, d), w = !0;
}, cp = function(i, e, t) {
  for (var r = arguments.length > 2, n = 0; n < e.length; n++)
    t = r ? e[n].call(i, t) : e[n].call(i);
  return r ? t : void 0;
}, up = function(i, e, t) {
  return typeof e == "symbol" && (e = e.description ? "[".concat(e.description, "]") : ""), Object.defineProperty(i, "name", { configurable: !0, value: t ? "".concat(t, " ", e) : e });
};
let qC = (() => {
  var o, a, c, Vs, qm, d, h, w, x, S, P, C, b, Hm, zm, Km, Hl;
  let i = zg, e, t = [], r = [], n;
  return o = class extends i {
    constructor(y, k) {
      super();
      u(this, c);
      N(this, "protocol", "webDriverBiDi");
      u(this, a, cp(this, t, new X()));
      u(this, d, cp(this, r));
      u(this, h);
      u(this, w);
      u(this, x);
      u(this, S, /* @__PURE__ */ new WeakMap());
      u(this, P, new CC(this));
      u(this, C);
      u(this, b);
      m(this, d, k.process), m(this, h, k.closeCallback), m(this, w, y), m(this, x, k.defaultViewport), m(this, C, k.cdpConnection), m(this, b, k.networkEnabled);
    }
    static async create(y) {
      var M, $, Z;
      const k = await RC.from(y.connection, {
        firstMatch: (M = y.capabilities) == null ? void 0 : M.firstMatch,
        alwaysMatch: {
          ...($ = y.capabilities) == null ? void 0 : $.alwaysMatch,
          // Capabilities that come from Puppeteer's API take precedence.
          acceptInsecureCerts: y.acceptInsecureCerts,
          unhandledPromptBehavior: {
            default: "ignore"
          },
          webSocketUrl: !0,
          // Puppeteer with WebDriver BiDi does not support prerendering
          // yet because WebDriver BiDi behavior is not specified. See
          // https://github.com/w3c/webdriver-bidi/issues/321.
          "goog:prerenderingDisabled": !0,
          // TODO: remove after Puppeteer rolled Chrome to 142 after Oct 28, 2025.
          "goog:disableNetworkDurableMessages": !0
        }
      });
      await k.subscribe((y.cdpConnection ? [...o.subscribeModules, ...o.subscribeCdpEvents] : o.subscribeModules).filter((L) => y.networkEnabled ? !0 : L !== "network" && L !== "goog:cdp.Network.requestWillBeSent")), await Promise.all([
        "request",
        "response"
        /* Bidi.Network.DataType.Response */
      ].map(
        // Data collectors might be not implemented for specific data type, so create them
        // separately and ignore protocol errors.
        async (L) => {
          try {
            await k.send("network.addDataCollector", {
              dataTypes: [L],
              // Buffer size of 20 MB is equivalent to the CDP:
              maxEncodedDataSize: 2e7
            });
          } catch (fe) {
            if (fe instanceof Fc)
              Ae(fe);
            else
              throw fe;
          }
        }
      ));
      const T = new o(k.browser, y);
      return g(Z = T, c, Hm).call(Z), T;
    }
    get cdpSupported() {
      return s(this, C) !== void 0;
    }
    get cdpConnection() {
      return s(this, C);
    }
    async userAgent() {
      return s(this, w).session.capabilities.userAgent;
    }
    get connection() {
      return s(this, w).session.connection;
    }
    wsEndpoint() {
      return this.connection.url;
    }
    async close() {
      var y;
      if (!this.connection.closed)
        try {
          await s(this, w).close(), await ((y = s(this, h)) == null ? void 0 : y.call(null));
        } catch (k) {
          Ae(k);
        } finally {
          this.connection.dispose();
        }
    }
    get connected() {
      return !s(this, w).disconnected;
    }
    process() {
      return s(this, d) ?? null;
    }
    async createBrowserContext(y = {}) {
      const k = await s(this, w).createUserContext(y);
      return g(this, c, Hl).call(this, k);
    }
    async version() {
      return `${s(this, c, zm)}/${s(this, c, Km)}`;
    }
    browserContexts() {
      return [...s(this, w).userContexts].map((y) => s(this, S).get(y));
    }
    defaultBrowserContext() {
      return s(this, S).get(s(this, w).defaultUserContext);
    }
    newPage() {
      return this.defaultBrowserContext().newPage();
    }
    installExtension(y) {
      return s(this, w).installExtension(y);
    }
    async uninstallExtension(y) {
      await s(this, w).uninstallExtension(y);
    }
    screens() {
      throw new H();
    }
    addScreen(y) {
      throw new H();
    }
    removeScreen(y) {
      throw new H();
    }
    getWindowBounds(y) {
      throw new H();
    }
    setWindowBounds(y, k) {
      throw new H();
    }
    targets() {
      return [
        s(this, P),
        ...this.browserContexts().flatMap((y) => y.targets())
      ];
    }
    target() {
      return s(this, P);
    }
    async disconnect() {
      try {
        await s(this, w).session.end();
      } catch (y) {
        Ae(y);
      } finally {
        this.connection.dispose();
      }
    }
    get debugInfo() {
      return {
        pendingProtocolErrors: this.connection.getPendingProtocolErrors()
      };
    }
    isNetworkEnabled() {
      return s(this, b);
    }
  }, a = new WeakMap(), c = new WeakSet(), Vs = function() {
    return n.get.call(this);
  }, qm = function(y) {
    return n.set.call(this, y);
  }, d = new WeakMap(), h = new WeakMap(), w = new WeakMap(), x = new WeakMap(), S = new WeakMap(), P = new WeakMap(), C = new WeakMap(), b = new WeakMap(), Hm = function() {
    var y;
    for (const k of s(this, w).userContexts)
      g(this, c, Hl).call(this, k);
    s(this, w).once("disconnected", () => {
      s(this, c, Vs).emit("disconnected", void 0), s(this, c, Vs).removeAllListeners();
    }), (y = s(this, d)) == null || y.once("close", () => {
      s(this, w).dispose("Browser process exited.", !0), this.connection.dispose();
    });
  }, zm = function() {
    return s(this, w).session.capabilities.browserName;
  }, Km = function() {
    return s(this, w).session.capabilities.browserVersion;
  }, Hl = function(y) {
    const k = kC.from(this, y, {
      defaultViewport: s(this, x)
    });
    return s(this, S).set(y, k), k.trustedEmitter.on("targetcreated", (T) => {
      s(this, c, Vs).emit("targetcreated", T);
    }), k.trustedEmitter.on("targetchanged", (T) => {
      s(this, c, Vs).emit("targetchanged", T);
    }), k.trustedEmitter.on("targetdestroyed", (T) => {
      s(this, c, Vs).emit("targetdestroyed", T);
    }), k;
  }, (() => {
    const y = typeof Symbol == "function" && Symbol.metadata ? Object.create(i[Symbol.metadata] ?? null) : void 0;
    e = [bu()], AC(o, n = { get: up(function() {
      return s(this, a);
    }, "#trustedEmitter", "get"), set: up(function(k) {
      m(this, a, k);
    }, "#trustedEmitter", "set") }, e, { kind: "accessor", name: "#trustedEmitter", static: !1, private: !0, access: { has: (k) => rc(c, k), get: (k) => s(k, c, Vs), set: (k, T) => {
      m(k, c, T, qm);
    } }, metadata: y }, t, r), y && Object.defineProperty(o, Symbol.metadata, { enumerable: !0, configurable: !0, writable: !0, value: y });
  })(), N(o, "subscribeModules", [
    "browsingContext",
    "network",
    "log",
    "script",
    "input"
  ]), N(o, "subscribeCdpEvents", [
    // Coverage
    "goog:cdp.Debugger.scriptParsed",
    "goog:cdp.CSS.styleSheetAdded",
    "goog:cdp.Runtime.executionContextsCleared",
    // Tracing
    "goog:cdp.Tracing.tracingComplete",
    // TODO: subscribe to all CDP events in the future.
    "goog:cdp.Network.requestWillBeSent",
    "goog:cdp.Debugger.scriptParsed",
    "goog:cdp.Page.screencastFrame"
  ]), o;
})();
export {
  qC as BidiBrowser,
  kC as BidiBrowserContext,
  _b as BidiConnection,
  oo as BidiElementHandle,
  iC as BidiFrame,
  Hr as BidiFrameRealm,
  Em as BidiHTTPRequest,
  Zb as BidiHTTPResponse,
  zr as BidiJSHandle,
  uC as BidiKeyboard,
  dC as BidiMouse,
  Hc as BidiPage,
  Tm as BidiRealm,
  hC as BidiTouchscreen,
  Ml as BidiWorkerRealm,
  Rm as bidiToPuppeteerCookie,
  Am as cdpSpecificCookiePropertiesFromPuppeteerToBidi,
  LC as connectBidiOverCdp,
  Bm as convertCookiesExpiryCdpToBiDi,
  bC as convertCookiesPartitionKeyFromPuppeteerToBiDi,
  Mm as convertCookiesSameSiteCdpToBiDi,
  xm as requests
};
