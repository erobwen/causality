function K(r) {
  return Array.prototype.slice.call(r);
}
function Z(r, n) {
  if (n instanceof Array) {
    it(r.causality.target, n.causality.target).forEach(function(b) {
      let y = [];
      y.push(b.index, b.removed.length), y.push.apply(y, b.added), r.splice.apply(r, y);
    });
    for (let b in n)
      isNaN(b) && (r[b] = n[b]);
  } else
    for (let s in n)
      r[s] = n[s];
  return r;
}
function it(r, n) {
  let s = !1, b = [], y = 0, O = 0, I = 0;
  function g(d) {
    let h = {
      type: "splice",
      index: y + I,
      removed: [],
      added: d
    };
    I += d.length, b.push(h);
  }
  function l(d) {
    let h = {
      type: "splice",
      index: y + I,
      removed: d,
      added: []
    };
    I -= d.length, b.push(h);
  }
  function c(d, h) {
    let m = {
      type: "splice",
      index: y + I,
      removed: d,
      added: h
    };
    I -= d.length, I += h.length, b.push(m);
  }
  for (; !s; ) {
    for (; y < r.length && O < n.length && r[y] === n[O]; )
      y++, O++;
    if (y === r.length && O === n.length)
      s = !0;
    else if (O === n.length) {
      const d = [];
      let h = y;
      for (; h < r.length; )
        d.push(r[h++]);
      l(d), s = !0;
    } else if (y === r.length) {
      const d = [];
      for (; O < n.length; )
        d.push(n[O++]);
      g(d), s = !0;
    } else {
      let d = y, h = O, m = !1;
      for (; d < r.length && !m; ) {
        for (h = O; h < n.length && !m; )
          r[d] === n[h] && (m = !0), m || h++;
        m || d++;
      }
      c(
        r.slice(y, d),
        n.slice(O, h)
      ), y = d, O = h;
    }
  }
  return b;
}
function rt(r) {
  return r.name ? r.name : (r = ge(r), JSON.stringify(r));
}
function ge(r) {
  if (typeof r == "object") {
    if (r === null) return "null";
    let n = Object.keys(r);
    n.sort(function(b, y) {
      return b < y ? -1 : b > y ? 1 : 0;
    });
    let s = {};
    return n.forEach(function(b) {
      let y = r[b];
      typeof y == "object" && (y = ge(y)), s[b] = y;
    }), s;
  } else
    return "[" + typeof r + "]";
}
const pe = {
  Reset: "\x1B[0m",
  Bright: "\x1B[1m",
  Dim: "\x1B[2m",
  Underscore: "\x1B[4m",
  Blink: "\x1B[5m",
  Reverse: "\x1B[7m",
  Hidden: "\x1B[8m",
  FgBlack: "\x1B[30m",
  FgRed: "\x1B[31m",
  FgGreen: "\x1B[32m",
  FgYellow: "\x1B[33m",
  FgBlue: "\x1B[34m",
  FgMagenta: "\x1B[35m",
  FgCyan: "\x1B[36m",
  FgWhite: "\x1B[37m",
  BgBlack: "\x1B[40m",
  BgRed: "\x1B[41m",
  BgGreen: "\x1B[42m",
  BgYellow: "\x1B[43m",
  BgBlue: "\x1B[44m",
  BgMagenta: "\x1B[45m",
  BgCyan: "\x1B[46m",
  BgWhite: "\x1B[47m"
};
let L = {
  // Count the number of chars that can fit horizontally in your buffer. Set to -1 for one line logging only. 
  bufferWidth: 83,
  // bufferWidth : 83
  // bufferWidth : 76
  indentToken: "  ",
  // Change to true in order to find all logs hidden in your code.
  findLogs: !1,
  // Set to true in web browser that already has a good way to display objects with expandable trees.
  useConsoleDefault: !1
}, H = 0;
function ot() {
  function r(n) {
    return n ? r(n.caller).concat([n.toString().split("(")[0].substring(9) + "(" + n.arguments.join(",") + ")"]) : [];
  }
  return r(arguments.callee.caller);
}
function k(r) {
  let n = "";
  for (; r-- > 0; )
    n = n + L.indentToken;
  return n;
}
function ee() {
  const r = {
    terminated: !1,
    rootLevel: !0,
    horizontal: !1,
    indentLevel: H,
    unfinishedLine: !1
  };
  return r.resetColor = () => {
    r.setColor("Reset");
  }, r;
}
function st() {
  let r = ee();
  return r.result = "", r.log = function(n) {
    this.unfinishedLine ? (this.result += n, this.unfinishedLine = !0) : (this.result += k(this.indentLevel) + n, this.unfinishedLine = !0);
  }, r.finishOpenLine = function() {
    this.unfinishedLine && !this.horizontal && (this.result += `
`, this.unfinishedLine = !1);
  }, r.setColor = function() {
  }, r.jsonCompatible = !0, r;
}
function U() {
  let r = ee();
  return r.lineMemory = "", r.log = function(n) {
    if (this.unfinishedLine)
      typeof process < "u" ? process.stdout.write(n) : r.lineMemory += n, this.unfinishedLine = !0;
    else {
      let s = k(this.indentLevel);
      typeof process < "u" ? process.stdout.write(s + n) : r.lineMemory += s + n, this.unfinishedLine = !0;
    }
  }, r.finishOpenLine = function() {
    this.unfinishedLine && !this.horizontal && (r.lineMemory !== "" ? (console.log(r.lineMemory), r.lineMemory = "") : console.log(), this.unfinishedLine = !1);
  }, r.setColor = function(n) {
    pe[n] || (n = "Reset"), r.log(pe[n]);
  }, r.jsonCompatible = !1, r;
}
function lt(r, n) {
  let s = ee();
  return s.horizontal = !0, s.count = 0, s.limit = r, s.log = function(b) {
    if (this.unfinishedLine)
      this.count += b.length, this.terminated = this.count > this.limit, this.unfinishedLine = !0;
    else {
      let y = k(this.indentLevel);
      this.count += (y + b).length, this.terminated = this.count > this.limit, this.unfinishedLine = !0;
    }
  }, s.finishOpenLine = function() {
  }, s.setColor = function() {
  }, s.jsonCompatible = n.jsonCompatible, s;
}
function ye(r, n, s, b) {
  let y = lt(s, b);
  return M(r, n, y), !y.terminated;
}
function M(r, n, s) {
  const b = s.rootLevel, y = s.jsonCompatible;
  if (s.rootLevel = !1, typeof n > "u" && (n = 1), typeof n == "function" && (r = n(r), n = -1), !s.terminated) {
    if (typeof r != "object")
      if (typeof r == "function")
        s.setColor("FgBlue"), s.log("function( ... ) { ... }"), s.resetColor();
      else if (typeof r == "string")
        if (b)
          s.log(r);
        else {
          s.setColor("FgGreen");
          const O = y ? '"' : "'";
          s.log(O + r + O), s.resetColor();
        }
      else
        s.setColor("FgYellow"), s.log(r + ""), s.resetColor();
    else if (r === null)
      s.log("null");
    else if (n === 0)
      r instanceof Array ? (s.log("["), s.setColor("FgCyan"), s.log("..."), s.resetColor(), s.log("]")) : (s.log("{"), s.setColor("FgCyan"), s.log("..."), s.resetColor(), s.log("}"));
    else {
      let O = r instanceof Array;
      const I = Object.keys(r).length;
      let g = !1;
      if (!s.horizontal) {
        let c = L.bufferWidth - s.indentLevel * L.indentToken.length;
        s.horizontal = L.bufferWidth === -1 ? !0 : ye(r, n, c, s), g = s.horizontal;
      }
      O && s.finishOpenLine(), s.log(O ? "[" : "{"), s.horizontal && I && s.log(" "), s.finishOpenLine(), s.indentLevel++;
      let l = !0;
      for (let c in r) {
        l || (s.log(", "), s.finishOpenLine()), (!O || isNaN(c)) && (y && s.log('"'), s.log(c), y && s.log('"'), s.log(": "));
        let d = null;
        typeof n == "object" ? d = n[c] : d = n === -1 ? -1 : n - 1, O || s.indentLevel++, M(r[c], d, s), O || s.indentLevel--, l = !1;
      }
      s.indentLevel--, s.finishOpenLine(), s.horizontal && I && s.log(" "), s.log(O ? "]" : "}"), g && (s.horizontal = !1);
    }
    b && s.finishOpenLine();
  }
}
const W = {
  // Configuration
  configuration: L,
  stacktrace: ot,
  log(r, n) {
    if (W.findLogs) throw new Error("No logs allowed!");
    L.useConsoleDefault ? console.log(r) : M(r, n, U());
  },
  // If you need the output as a string.
  logToString(r, n) {
    let s = st();
    return M(r, n, s), s.result;
  },
  loge(r) {
    this.log("<<<" + r + ">>>");
  },
  logs() {
    this.log("---------------------------------------");
  },
  logss() {
    this.log("=======================================");
  },
  logsss() {
    this.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
  },
  logVar(r, n, s) {
    if (W.findLogs) throw new Error("No logs allowed!");
    if (L.useConsoleDefault)
      console.log(r + ":"), console.group(), console.log(n), console.groupEnd();
    else {
      context = U(), typeof s > "u" && (s = 1), context.log(r + ": ");
      let b = L.bufferWidth - context.indentLevel * L.indentToken.length - (r + ": ").length;
      context.horizontal = L.bufferWidth === -1 ? !0 : ye(n, s, b), context.horizontal ? M(n, s, context) : (context.indentLevel++, M(n, s, context), context.indentLevel--);
    }
  },
  group(r, n) {
    if (W.findLogs) throw new Error("No logs allowed!");
    L.useConsoleDefault ? console.group(r) : (typeof r < "u" && M(r, n, U()), H++);
  },
  groupEnd(r, n) {
    if (W.findLogs) throw new Error("No logs allowed!");
    L.useConsoleDefault ? console.groupEnd() : (H--, H < 0 && (H = 0), typeof r < "u" && M(r, n, U()));
  }
};
function at(r) {
  function n(c, d) {
    if (typeof c != typeof d)
      return !1;
    if (c.length === d.length) {
      for (let h = 0; h < c.length; h++)
        if (c[h] !== d[h])
          return !1;
      return !0;
    } else
      return !1;
  }
  function s(c, d) {
    if (c.length === 0)
      return !1;
    for (let h = 0; h < c.length; h++)
      if (n(
        c[h].argumentList,
        d
      ))
        return !0;
    return !1;
  }
  function b(c, { signature: d, unique: h, argumentList: m }) {
    return h ? typeof c[d] < "u" : typeof c[d] > "u" ? !1 : s(c[d], m);
  }
  function y(c, { signature: d, unique: h, argumentList: m }) {
    if (h)
      return c[d];
    {
      let R = c[d];
      for (let C = 0; C < R.length; C++)
        if (n(R[C].argumentList, m))
          return R[C].value;
    }
  }
  function O(c, { signature: d, unique: h, argumentList: m }) {
    if (h) {
      delete c[d];
      return;
    } else {
      let R = c[d];
      for (let C = 0; C < R.length; C++)
        if (n(R[C].argumentList, functionArguments)) {
          R.splice(C, 1);
          return;
        }
    }
  }
  function I(c, { signature: d, unique: h, argumentList: m }, R) {
    if (h)
      c[d] = R;
    else {
      let C = c[d];
      C || (C = r([]), c[d] = C), C.push({ argumentList: m, value: R });
    }
  }
  function g(c) {
    let d = !0, h = "";
    return c.forEach(function(m, R) {
      R > 0 && (h += ","), typeof m.causality < "u" ? h += "{id=" + m.causality.id + "}" : typeof m == "number" || typeof m == "string" ? h += m : (d = !1, h += "{}");
    }), { signature: "(" + h + ")", unique: d, argumentList: c };
  }
  function l(c) {
    const d = r({});
    return () => {
      argumentsToArray(arguments);
      let h = g(argumentList);
      return b(d, h) || invalidateOnChange(
        () => {
          const m = c.apply(null, argumentList);
          I(d, h, m);
        },
        () => {
          O(d, h);
        }
      ), y(d, h);
    };
  }
  return l;
}
let he = 500;
function ft(r) {
  const n = r.state, s = r.invalidateObserver;
  function b(g, l, c) {
    return typeof l != "string" && (c = l, l = null), {
      description: g,
      key: l,
      handler: c,
      isRoot: !0,
      contents: {},
      contentsCounter: 0,
      first: null,
      last: null
    };
  }
  function y(g, l, c) {
    let d = g.id;
    if (typeof l.contents[d] < "u" || l.contentsCounter === he && l.last !== null && (l = l.last, typeof l.contents[d] < "u"))
      return;
    if (l.contentsCounter === he) {
      let m = {
        isRoot: !1,
        contents: {},
        contentsCounter: 0,
        next: null,
        previous: null,
        parent: null
      };
      l.isRoot ? (m.parent = l, l.first = m, l.last = m) : (l.next = m, m.previous = l, m.parent = l.parent, l.parent.last = m), l = m;
    }
    let h = l.contents;
    typeof h[d] > "u" && (l.contentsCounter = l.contentsCounter + 1, h[d] = g, g.sources.push(l));
  }
  function O(g, l, c) {
    if (n.postponeInvalidation++, n.blockInvalidation > 0)
      return;
    let d = g.contents;
    for (let h in d)
      s(d[h], l, c);
    if (typeof g.first < "u") {
      let h = g.first;
      for (; h !== null; ) {
        let m = h.contents;
        for (let R in m)
          s(m[R], l, c);
        h = h.next;
      }
    }
    n.postponeInvalidation--, r.proceedWithPostponedInvalidations();
  }
  function I(g, l) {
    let c = l.contents;
    delete c[g];
    let d = !1;
    l.contentsCounter--, l.contentsCounter == 0 && (l.isRoot ? l.first === null && l.last === null && (d = !0) : (l.parent.first === l && (l.parent.first, l.next), l.parent.last === l && (l.parent.last, l.previous), l.next !== null && (l.next.previous = l.previous), l.previous !== null && (l.previous.next = l.next), l.previous = null, l.next = null, l.parent.first === null && l.parent.last === null && (d = !0)), d && typeof l.handler.proxy.onRemovedLastObserver == "function" && l.handler.proxy.onRemovedLastObserver(l.description, l.key));
  }
  return {
    recordDependencyOnArray: (g, l) => {
      l._arrayObservers === null && (l._arrayObservers = b("arrayDependees", l)), y(g, l._arrayObservers);
    },
    recordDependencyOnEnumeration: (g, l) => {
      typeof l._enumerateObservers > "u" && (l._enumerateObservers = b("enumerationDependees", l)), y(g, l._enumerateObservers);
    },
    recordDependencyOnProperty: (g, l, c) => {
      c !== "toString" && (typeof l._propertyObservers > "u" && (l._propertyObservers = {}), typeof l._propertyObservers[c] > "u" && (l._propertyObservers[c] = b("propertyDependees", c, l)), y(g, l._propertyObservers[c]));
    },
    invalidateArrayObservers: (g, l) => {
      g._arrayObservers !== null && O(g._arrayObservers, g.proxy, l);
    },
    invalidatePropertyObservers: (g, l) => {
      typeof g._propertyObservers < "u" && typeof g._propertyObservers[l] < "u" && O(g._propertyObservers[l], g.proxy, l);
    },
    invalidateEnumerateObservers: (g, l) => {
      typeof g._enumerateObservers < "u" && O(g._enumerateObservers, g.proxy, l);
    },
    removeAllSources: (g) => {
      const l = g.id;
      g.sources.forEach(function(c) {
        I(l, c);
      }), g.sources.length = 0;
    }
  };
}
const ut = W, dt = {
  requireRepeaterName: !1,
  requireInvalidatorName: !1,
  warnOnNestedRepeater: !0,
  alwaysDependOnParentRepeater: !1,
  priorityLevels: 4,
  objectMetaProperty: "causality",
  useNonObservablesAsValues: !1,
  valueComparisonDepthLimit: 5,
  sendEventsToObjects: !0,
  // Reserved properties that you can override on observables IF sendEventsToObjects is set to true. 
  // onChange
  // onBuildCreate
  // onBuildRemove
  onEventGlobal: null,
  emitReBuildEvents: !1,
  // allowNonObservableReferences: true, // Allow observables to refer to non referables. TODO?
  onWriteGlobal: null,
  onReadGlobal: null,
  cannotReadPropertyValue: null,
  customObjectlog: null,
  customDependencyInterfaceCreator: null,
  //{recordDependencyOnArray, recordDependencyOnEnumeration, recordDependencyOnProperty, recordDependency}
  customCreateInvalidator: null,
  customCreateRepeater: null
};
function ct(r) {
  const n = {
    recordingPaused: 0,
    blockInvalidation: 0,
    postponeInvalidation: 0,
    postponeRefreshRepeaters: 0,
    // Object creation
    nextObjectId: 1,
    nextTempObjectId: 1,
    // Stack
    context: null,
    // Observers
    observerId: 0,
    inActiveRecording: !1,
    nextObserverToInvalidate: null,
    lastObserverToInvalidate: null,
    // Repeaters
    inRepeater: null,
    dirtyRepeaters: [...Array(r.priorityLevels).keys()].map(() => ({ first: null, last: null })),
    refreshingAllDirtyRepeaters: !1,
    workOnPriorityLevel: [...Array(r.priorityLevels).keys()].map(() => 0),
    revalidationLevelLock: -1
  }, s = {
    name: r.name,
    sameAsPreviousDeep: $,
    // Main API
    observable: z,
    deeplyObservable: re,
    isObservable: D,
    create: z,
    // observable alias
    invalidateOnChange: Ge,
    repeat: Je,
    finalize: Ye,
    // Modifiers
    withoutRecording: we,
    withoutReactions: Ce,
    // Transaction
    doWhileInvalidationsPostponed: ne,
    transaction: ne,
    postponeInvalidations: Re,
    continueInvalidations: Ie,
    // Debugging and testing
    clearRepeaterLists: Ze,
    // Logging (these log commands do automatic withoutRecording to avoid your logs destroying your test-setup) 
    log: ke,
    loge: (e) => {
      R.loge(e);
    },
    // "event"
    logs: () => {
      R.logs();
    },
    // "separator"
    logss: () => {
      R.logss();
    },
    logsss: () => {
      R.logss();
    },
    logGroup: et,
    logUngroup: tt,
    logToString: nt,
    // Advanced (only if you know what you are doing, typically used by plugins to causality)
    state: n,
    enterContext: F,
    leaveContext: _,
    invalidateObserver: ze,
    proceedWithPostponedInvalidations: J,
    nextObserverId: () => n.observerId++,
    // Libraries
    caching: at(z),
    // Priority levels 
    enterPriorityLevel: S,
    exitPriorityLevel: X,
    workOnPriorityLevel: Ae
  }, b = r.customCreateRepeater ? r.customCreateRepeater : Ke, y = r.customCreateInvalidator ? r.customCreateInvalidator : qe, O = r.customDependencyInterfaceCreator ? r.customDependencyInterfaceCreator(s) : ft(s), I = O.recordDependencyOnArray, g = O.recordDependencyOnEnumeration, l = O.recordDependencyOnProperty, c = O.invalidateArrayObservers, d = O.invalidateEnumerateObservers, h = O.invalidatePropertyObservers, m = O.removeAllSources, R = r.customObjectlog ? r.customObjectlog : ut, C = Te(), {
    requireRepeaterName: me,
    requireInvalidatorName: be,
    warnOnNestedRepeater: Oe,
    objectMetaProperty: f,
    sendEventsToObjects: te,
    onEventGlobal: Y,
    emitReBuildEvents: ve,
    onWriteGlobal: x,
    onReadGlobal: A,
    cannotReadPropertyValue: E
  } = r, T = !!Y || te;
  function we(e) {
    n.recordingPaused++, j(), e(), n.recordingPaused--, j();
  }
  function ne(e) {
    n.postponeInvalidation++, e(), n.postponeInvalidation--, J();
  }
  function Re() {
    n.postponeInvalidation++;
  }
  function Ie() {
    n.postponeInvalidation--, J();
  }
  function Ce(e) {
    n.blockInvalidation++, e(), n.blockInvalidation--;
  }
  function S(e) {
    if (typeof e != "number") {
      const t = e;
      e = typeof t.priority == "function" ? t.priority() : 0;
    }
    n.workOnPriorityLevel[e]++;
  }
  function X(e) {
    if (typeof e != "number") {
      const i = e;
      e = typeof i.priority == "function" ? i.priority() : 0;
    }
    n.workOnPriorityLevel[e]--;
    let t = !0;
    for (; e < n.workOnPriorityLevel.length && n.workOnPriorityLevel[e] === 0; )
      typeof r.onFinishedPriorityLevel == "function" && r.onFinishedPriorityLevel(e, t), n.revalidationLevelLock = e, e++, t = !1;
  }
  function Ae(e, t) {
    S(e), t(), X(e);
  }
  function j() {
    n.inActiveRecording = n.context !== null && n.context.isRecording && n.recordingPaused === 0, n.inRepeater = n.context && n.context.type === "repeater" ? n.context : null;
  }
  function F(e) {
    return e.parent = n.context, n.context = e, j(), S(e), e;
  }
  function _(e) {
    if (n.context && e === n.context)
      n.context = n.context.parent;
    else
      throw new Error("Context missmatch");
    j(), X(e);
  }
  function Te() {
    const e = {
      pop: function() {
        let t = this.target.length - 1, i = this.target.pop();
        return c(this, "pop"), T && P(this, t, [i], null), i;
      },
      push: function() {
        let t = this.target.length, i = K(arguments);
        return this.target.push.apply(this.target, i), c(this, "push"), T && P(this, t, null, i), this.target.length;
      },
      shift: function() {
        let t = this.target.shift();
        return c(this, "shift"), T && P(this, 0, [t], null), t;
      },
      unshift: function() {
        let t = K(arguments);
        return this.target.unshift.apply(this.target, t), c(this, "unshift"), T && P(this, 0, null, t), this.target.length;
      },
      splice: function() {
        let t = K(arguments), i = t[0], o = t[1];
        typeof t[1] > "u" && (o = this.target.length - i);
        let u = t.slice(2), a = this.target.slice(i, i + o), p = this.target.splice.apply(this.target, t);
        return c(this, "splice"), T && P(this, i, a, u), p;
      },
      copyWithin: function(t, i, o) {
        if (i || (i = 0), o || (o = this.target.length), t < 0 && (i = this.target.length - t), i < 0 && (i = this.target.length - i), o < 0 && (i = this.target.length - o), o = Math.min(o, this.target.length), i = Math.min(i, this.target.length), i >= o)
          return;
        let u = this.target.slice(t, t + o - i), a = this.target.slice(i, o), p = this.target.copyWithin(t, i, o);
        return c(this, "copyWithin"), T && P(this, t, a, u), p;
      }
    };
    return ["reverse", "sort", "fill"].forEach(function(t) {
      e[t] = function() {
        let i = K(arguments), o = this.target.slice(0), u = this.target[t].apply(this.target, i);
        return c(this, t), T && P(this, 0, o, this.target.slice(0)), u;
      };
    }), e;
  }
  function ie(e, t) {
    return r.useNonObservablesAsValues ? $(e, t, r.valueComparisonDepthLimit) : e === t || Number.isNaN(e) && Number.isNaN(t);
  }
  function $(e, t, i) {
    if (typeof i > "u" && (i = 8), e === null && t === null || e === t || Number.isNaN(e) && Number.isNaN(t)) return !0;
    if (i === 0 || typeof e != typeof t || typeof e != "object" || e === null || t === null || D(e) || D(t) || Object.keys(e).length !== Object.keys(t).length) return !1;
    for (let o in e)
      if (!$(e[o], t[o], i - 1))
        return !1;
    return !0;
  }
  function xe(e, t) {
    if (t === f)
      return this.meta;
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.get.apply(i, [i.target, t]);
    }
    return A && !A(this, e, t) ? E : C[t] ? C[t].bind(this) : (n.inActiveRecording && I(n.context, this), e[t]);
  }
  function Le(e, t, i) {
    if (t === f) throw new Error("Cannot set the dedicated meta property '" + f + "'");
    if (this.meta.forwardTo !== null) {
      let u = this.meta.forwardTo[f].handler;
      return u.set.apply(u, [u.target, t, i]);
    }
    if (x && !x(this, e, t))
      return;
    let o = e[t];
    return t in e && ie(o, i) ? !0 : (isNaN(t) ? (e[t] = i, (e[t] === i || Number.isNaN(e[t]) && Number.isNaN(i)) && (c(this, t), oe(this, t, i, o))) : (typeof t == "string" && (t = parseInt(t)), e[t] = i, (e[t] === i || Number.isNaN(e[t]) && Number.isNaN(i)) && (c(this, t), _e(this, t, i, o))), !(e[t] !== i && !(Number.isNaN(e[t]) && Number.isNaN(i))));
  }
  function je(e, t) {
    if (this.meta.forwardTo !== null) {
      let o = this.meta.forwardTo[f].handler;
      return o.deleteProperty.apply(
        o,
        [o.target, t]
      );
    }
    if (x && !x(this, e, t))
      return;
    if (!(t in e))
      return !0;
    let i = e[t];
    return delete e[t], t in e || (c(this, "delete"), se(this, t, i)), !(t in e);
  }
  function De(e) {
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.ownKeys.apply(
        i,
        [i.target]
      );
    }
    if (A && !A(this, e))
      return E;
    n.inActiveRecording && I(n.context, this);
    let t = Object.keys(e);
    return t.push("length"), t;
  }
  function Ne(e, t) {
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.has.apply(i, [e, t]);
    }
    return A && !A(this, e, t) ? E : (n.inActiveRecording && I(n.context, this), t in e);
  }
  function Ee(e, t, i) {
    if (this.meta.forwardTo !== null) {
      let o = this.meta.forwardTo[f].handler;
      return o.defineProperty.apply(
        o,
        [o.target, t, i]
      );
    }
    if (!(x && !x(this, e, t)))
      return c(this, t), e;
  }
  function Me(e, t) {
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.getOwnPropertyDescriptor.apply(
        i,
        [i.target, t]
      );
    }
    return A && !A(this, e, t) ? E : (n.inActiveRecording && I(n.context, this), Object.getOwnPropertyDescriptor(e, t));
  }
  function Pe(e, t) {
    if (t = t.toString(), t === f)
      return this.meta;
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.get.apply(i, [i.target, t]);
    }
    if (A && !A(this, e, t))
      return E;
    if (typeof t < "u") {
      n.inActiveRecording && l(n.context, this, t);
      let i = e;
      for (; i !== null && typeof i < "u"; ) {
        let o = Object.getOwnPropertyDescriptor(i, t);
        if (typeof o < "u" && typeof o.get < "u")
          return o.get.bind(this.meta.proxy)();
        i = Object.getPrototypeOf(i);
      }
      return e[t];
    }
  }
  function Be(e, t, i) {
    if (t === f) throw new Error("Cannot set the dedicated meta property '" + f + "'");
    if (this.meta.forwardTo !== null) {
      let p = this.meta.forwardTo[f].handler;
      return p.set.apply(p, [p.target, t, i]);
    }
    if (x && !x(this, e, t))
      return;
    let o = e[t];
    if (t in e && ie(o, i))
      return !0;
    let u = !(t in e);
    e[t] = i;
    let a = e[t];
    return (a === i || Number.isNaN(a) && Number.isNaN(i)) && (h(this, t), u && d(this, t)), oe(this, t, i, o), !(a !== i && !(Number.isNaN(a) && Number.isNaN(i)));
  }
  function Se(e, t) {
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.deleteProperty.apply(
        i,
        [i.target, t]
      ), !0;
    }
    if (!(x && !x(this, e, t)))
      if (t in e) {
        let i = e[t];
        return delete e[t], t in e || (h(this, t), d(this, t), se(this, t, i)), !(t in e);
      } else
        return !0;
  }
  function Xe(e, t) {
    if (this.meta.forwardTo !== null) {
      let o = this.meta.forwardTo[f].handler;
      return o.ownKeys.apply(
        o,
        [o.target, t]
      );
    }
    return A && !A(this, e, t) ? E : (n.inActiveRecording && g(n.context, this), Object.keys(e));
  }
  function He(e, t) {
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.has.apply(
        i,
        [i.target, t]
      );
    }
    return A && !A(this, e, t) ? E : (n.inActiveRecording && g(n.context, this), t in e);
  }
  function We(e, t, i) {
    if (this.meta.forwardTo !== null) {
      let o = this.meta.forwardTo[f].handler;
      return o.defineProperty.apply(
        o,
        [o.target, t]
      );
    }
    if (!(x && !x(this, e, t)))
      return d(this, "define property"), Reflect.defineProperty(e, t, i);
  }
  function Fe(e, t) {
    if (this.meta.forwardTo !== null) {
      let i = this.meta.forwardTo[f].handler;
      return i.getOwnPropertyDescriptor.apply(i, [i.target, t]);
    }
    return A && !A(this, e, t) ? E : (n.inActiveRecording && g(n.context, this), Object.getOwnPropertyDescriptor(e, t));
  }
  function D(e) {
    return e !== null && typeof e == "object" && typeof e[f] == "object" && e[f].world === s;
  }
  function z(e, t) {
    if (typeof e > "u" && (e = {}), typeof t > "u" && (t = null), D(e))
      throw new Error("Cannot observe an already observed object!");
    let i;
    e instanceof Array ? i = {
      _arrayObservers: null,
      // getPrototypeOf: function () {},
      // setPrototypeOf: function () {},
      // isExtensible: function () {},
      // preventExtensions: function () {},
      // apply: function () {},
      // construct: function () {},
      get: xe,
      set: Le,
      deleteProperty: je,
      ownKeys: De,
      has: Ne,
      defineProperty: Ee,
      getOwnPropertyDescriptor: Me
    } : i = {
      // getPrototypeOf: function () {},
      // setPrototypeOf: function () {},
      // isExtensible: function () {},
      // preventExtensions: function () {},
      // apply: function () {},
      // construct: function () {},
      get: Pe,
      set: Be,
      deleteProperty: Se,
      ownKeys: Xe,
      has: He,
      defineProperty: We,
      getOwnPropertyDescriptor: Fe
    };
    let o = new Proxy(e, i);
    if (i.target = e, i.proxy = o, i.meta = {
      world: s,
      id: "not yet",
      // Wait for rebuild analysis
      buildId: t,
      forwardTo: null,
      target: e,
      handler: i,
      proxy: o,
      // Here to avoid prevent events being sent to objects being rebuilt. 
      isBeingRebuilt: !1
    }, n.inRepeater !== null) {
      const u = n.inRepeater;
      if (t !== null) {
        if (u.newBuildIdObjectMap || (u.newBuildIdObjectMap = {}), u.buildIdObjectMap && typeof u.buildIdObjectMap[t] < "u") {
          i.meta.isBeingRebuilt = !0;
          let a = u.buildIdObjectMap[t];
          a[f].forwardTo = o, u.options.rebuildShapeAnalysis && (i.meta.copyTo = a), i.meta.id = "temp-" + n.nextTempObjectId++, u.newBuildIdObjectMap[t] = a, o = a, i = o[f].handler, le(a[f].handler);
        } else
          i.meta.id = n.nextObjectId++, i.meta.pendingOnEstablishCall = !0, u.newBuildIdObjectMap[t] = o, q(i);
        u.options.rebuildShapeAnalysis && (u.newIdObjectShapeMap || (u.newIdObjectShapeMap = {}), u.newIdObjectShapeMap[i.meta.id] = o);
      } else u.options.rebuildShapeAnalysis ? (i.meta.id = n.nextObjectId++, i.meta.pendingCreationEvent = !0, i.meta.pendingOnEstablishCall = !0, u.newIdObjectShapeMap || (u.newIdObjectShapeMap = {}), u.newIdObjectShapeMap[i.meta.id] = o) : (i.meta.id = n.nextObjectId++, q(i));
    } else
      i.meta.id = n.nextObjectId++, q(i);
    return o;
  }
  function re(e, t) {
    if (D(e) || typeof e != "object") return e;
    let i;
    if (t) {
      const o = e instanceof Array ? [] : {};
      for (let u in e)
        o[u] = re(e[u], t);
      i = o;
    } else
      i = e;
    return z(i);
  }
  function P(e, t, i, o) {
    T && B(e, { type: "splice", index: t, removed: i, added: o });
  }
  function _e(e, t, i, o) {
    T && B(e, {
      type: "splice",
      index: t,
      removed: [o],
      added: [i]
    });
  }
  function oe(e, t, i, o) {
    T && B(e, {
      type: "set",
      property: t,
      newValue: i,
      oldValue: o
    });
  }
  function se(e, t, i) {
    T && B(e, {
      type: "delete",
      property: t,
      deletedValue: i
    });
  }
  function le(e) {
    T && B(e, { type: "reCreate" });
  }
  function q(e) {
    T && B(e, { type: "create" });
  }
  function ae(e) {
    T && B(e, { type: "dispose" });
  }
  function B(e, t) {
    t.object = e.meta.proxy, t.objectId = e.meta.id, !(!ve && e.meta.isBeingRebuilt) && (Y && Y(t), te && typeof e.target.onChange == "function" && e.target.onChange(t));
  }
  function J() {
    if (n.postponeInvalidation == 0) {
      for (n.postponeRefreshRepeaters++; n.nextObserverToInvalidate !== null; ) {
        let e = n.nextObserverToInvalidate;
        n.nextObserverToInvalidate = null;
        const t = e.nextToNotify;
        t ? (e.nextToNotify = null, n.nextObserverToInvalidate = t) : n.lastObserverToInvalidate = null, e.invalidateAction(), X(e);
      }
      n.postponeRefreshRepeaters--, ce();
    }
  }
  function ze(e, t, i) {
    let o = !1, u = n.context;
    for (; u; ) {
      if (u === e) {
        o = !0;
        break;
      }
      u = u.parent;
    }
    o || (e.invalidatedInContext = n.context, e.invalidatedByKey = i, e.invalidatedByObject = t, e.dispose(), n.postponeInvalidation > 0 ? (S(e), n.lastObserverToInvalidate !== null ? n.lastObserverToInvalidate.nextToNotify = e : n.nextObserverToInvalidate = e, n.lastObserverToInvalidate = e) : e.invalidateAction(i));
  }
  function qe(e, t) {
    return {
      createdCount: 0,
      createdTemporaryCount: 0,
      removedCount: 0,
      isRecording: !0,
      type: "invalidator",
      id: n.observerId++,
      description: e,
      sources: [],
      nextToNotify: null,
      invalidateAction: t,
      dispose: function() {
        m(this);
      },
      record: function(i) {
        if (n.context == this || this.isRemoved) return i();
        const o = F(this), u = i();
        return _(o), u;
      },
      returnValue: null,
      causalityString() {
        return "<invalidator>" + this.invalidateAction;
      }
    };
  }
  function Ge() {
    let e, t, i = null;
    if (arguments.length > 2)
      i = arguments[0], e = arguments[1], t = arguments[2];
    else {
      if (be) throw new Error("Missing description for 'invalidateOnChange'");
      e = arguments[0], t = arguments[1];
    }
    const o = y(i, t);
    return F(o), o.returnValue = e(o), _(o), o;
  }
  function Ke(e, t, i, o, u) {
    return {
      createdCount: 0,
      createdTemporaryCount: 0,
      removedCount: 0,
      isRecording: !0,
      type: "repeater",
      id: n.observerId++,
      firstTime: !0,
      description: e,
      sources: [],
      nextToNotify: null,
      repeaterAction: $e(t, o),
      nonRecordedAction: i,
      options: o || {},
      finishRebuilding() {
        u(this);
      },
      priority() {
        return typeof this.options.priority < "u" ? this.options.priority : 0;
      },
      causalityString() {
        const a = this.invalidatedInContext, p = this.invalidatedByObject;
        if (!p) return "Repeater started: " + this.description;
        const v = this.invalidatedByKey, w = a ? a.description : "outside repeater/invalidator", N = "  " + p.toString() + "." + v, G = "" + this.description;
        return "(" + w + ")" + N + " --> " + G;
      },
      creationString() {
        let a = "{";
        return a += "created: " + this.createdCount + ", ", a += "createdTemporary:" + this.createdTemporaryCount + ", ", a += "removed:" + this.removedCount + "}", a;
      },
      sourcesString() {
        let a = "";
        for (let p of this.sources) {
          for (; p.parent; ) p = p.parent;
          a += p.handler.proxy.toString() + "." + p.key + `
`;
        }
        return a;
      },
      restart() {
        this.invalidateAction();
      },
      invalidateAction() {
        m(this), Qe(this), this.disposeChildren();
      },
      // disposeAllCreatedWithBuildId() {
      //   // Dispose all created objects? 
      //   if(this.buildIdObjectMap) {
      //     for (let key in this.buildIdObjectMap) {
      //       const object = this.buildIdObjectMap[key]; 
      //       if (typeof(object.onDispose) === "function") object.onDispose();
      //     }
      //   }
      // },
      dispose() {
        ue(this), m(this), this.disposeChildren();
      },
      notifyDisposeToCreatedObjects() {
        if (this.idObjectShapeMap)
          for (let a in this.idObjectShapeMap) {
            let p = this.idObjectShapeMap[a];
            typeof p[f].target.onDispose == "function" && p.onDispose();
          }
        else if (this.buildIdObjectMap)
          for (let a in this.buildIdObjectMap) {
            const p = this.buildIdObjectMap[a];
            typeof p.onDispose == "function" && p.onDispose();
          }
      },
      disposeChildren() {
        this.children && (this.children.forEach((a) => a.dispose()), this.children = null);
      },
      addChild(a) {
        this.children || (this.children = []), this.children.push(a);
      },
      nextDirty: null,
      previousDirty: null,
      lastRepeatTime: 0,
      waitOnNonRecordedAction: 0,
      children: null,
      refresh() {
        const a = this, p = a.options;
        p.onRefresh && p.onRefresh(a), a.finishedRebuilding = !1, a.createdCount = 0, a.createdTemporaryCount = 0, a.removedCount = 0, a.isRecording = !0;
        const v = F(a);
        a.returnValue = a.repeaterAction(a), a.isRecording = !1, j();
        const { debounce: w = 0, fireImmediately: N = !0 } = p;
        if (a.nonRecordedAction !== null)
          w === 0 || this.firstTime ? (N || !this.firstTime) && a.nonRecordedAction(a.returnValue) : (a.waitOnNonRecordedAction && clearTimeout(a.waitOnNonRecordedAction), a.waitOnNonRecordedAction = setTimeout(() => {
            a.nonRecordedAction(a.returnValue), a.waitOnNonRecordedAction = null;
          }, w));
        else if (w > 0)
          throw new Error("Debounce has to be used together with a non-recorded action.");
        return u(this), this.firstTime = !1, _(v), a;
      }
    };
  }
  function fe(e) {
    const t = e.options.rebuildShapeAnalysis;
    function i(a, p) {
      a[f].forwardTo = p, p[f].copyTo = a, p[f].pendingCreationEvent && (delete p[f].pendingCreationEvent, a[f].pendingReCreationEvent = !0), delete p[f].pendingOnEstablishCall, delete e.newIdObjectShapeMap[p[f].id], e.newIdObjectShapeMap[a[f].id] = a;
    }
    function o(a, p) {
      if (a !== p) {
        const v = D(p), w = D(a);
        if (v !== w) return;
        if (v && w) {
          if (!e.newIdObjectShapeMap[p[f].id] || a[f].forwardTo === p || p[f].buildId || a[f].buildId) return;
          t.allowMatch && t.allowMatch(a, p) && (i(a, p), u(a[f].target, p[f].target));
        } else
          u(a, p);
      }
    }
    function u(a, p) {
      for (let [v, w] of t.slotsIterator(a, p, (N) => D(N) && N[f].buildId))
        o(v, w);
    }
    return { setAsMatch: i, matchChildrenInEquivalentSlot: u, matchInEquivalentSlot: o };
  }
  function Ue(e) {
    if (e.finishedRebuilding) return;
    const t = e.options;
    t.onStartBuildUpdate && t.onStartBuildUpdate();
    function i(o) {
      return o instanceof Array ? o.map((u) => i(u)) : D(o) && o[f].copyTo ? o[f].copyTo : o;
    }
    if (e.options.rebuildShapeAnalysis) {
      const { matchChildrenInEquivalentSlot: o, matchInEquivalentSlot: u } = fe(e), a = e.options.rebuildShapeAnalysis;
      if (e.establishedRoot instanceof Array || a.shapeRoot() instanceof Array) {
        let p = e.establishedRoot, v = a.shapeRoot();
        p instanceof Array || (p = [p]), v instanceof Array || (v = [v]), o(p, v);
      } else
        u(e.establishedShapeRoot, a.shapeRoot());
      for (let p in e.newIdObjectShapeMap) {
        const v = e.newIdObjectShapeMap[p], w = v[f].forwardTo;
        w && o(v[f].target, w[f].target);
      }
      for (let p in e.newIdObjectShapeMap) {
        let v = e.newIdObjectShapeMap[p], w;
        const N = v[f].forwardTo;
        if (N ? w = N[f].target : w = v[f].target, e.options.rebuildShapeAnalysis.translateReferences)
          e.options.rebuildShapeAnalysis.translateReferences(w, i);
        else
          for (let G in w)
            w[G] = i(w[G]);
      }
      e.establishedShapeRoot = i(e.options.rebuildShapeAnalysis.shapeRoot());
      for (let p in e.newIdObjectShapeMap) {
        let v = e.newIdObjectShapeMap[p];
        const w = v[f].forwardTo;
        w ? (w[f].copyTo = null, v[f].forwardTo = null, Z(v, w[f].target), v[f].pendingCreationEvent && (delete v[f].pendingCreationEvent, le(v[f].handler))) : (v[f].pendingCreationEvent && (delete v[f].pendingCreationEvent, q(v[f].handler)), Q(v));
      }
      if (e.idObjectShapeMap) {
        for (let p in e.idObjectShapeMap)
          if (typeof e.newIdObjectShapeMap[p] > "u") {
            const v = e.idObjectShapeMap[p], w = v[f].target;
            ae(v[f].handler), typeof w.onDispose == "function" && v.onDispose();
          }
      }
    } else {
      for (let o in e.newBuildIdObjectMap) {
        let u = e.newBuildIdObjectMap[o];
        const a = u[f].forwardTo;
        a !== null ? (u[f].forwardTo = null, a[f].isBeingRebuilt = !1, Z(u, a[f].target)) : Q(u);
      }
      if (e.buildIdObjectMap) {
        for (let o in e.buildIdObjectMap)
          if (typeof e.newBuildIdObjectMap[o] > "u") {
            const u = e.buildIdObjectMap[o], a = u[f].target;
            ae(u[f].handler), typeof a.onDispose == "function" && a.onDispose();
          }
      }
    }
    e.buildIdObjectMap = e.newBuildIdObjectMap, e.newBuildIdObjectMap = {}, e.idObjectShapeMap = e.newIdObjectShapeMap, e.newIdObjectShapeMap = {}, e.finishedRebuilding = !0, t.onEndBuildUpdate && t.onEndBuildUpdate();
  }
  function Q(e) {
    const t = e[f];
    (t.pendingOnEstablishCall || !t.established) && (delete t.pendingOnEstablishCall, t.established = !0, typeof t.target.onEstablish == "function" && e.onEstablish());
  }
  function Ye(e) {
    const t = e[f].forwardTo;
    if (t !== null) {
      if (n.inRepeater) {
        const i = n.context;
        if (i.options.rebuildShapeAnalysis) {
          const { matchChildrenInEquivalentSlot: o } = fe(i);
          o(e[f].target, t[f].target);
        }
      }
      e[f].forwardTo = null, t[f].isBeingRebuilt = !1, Z(e, t[f].target);
    } else
      Q(e);
    return e;
  }
  function $e(e, { throttle: t = 0 }) {
    return t > 0 ? function(i) {
      let o = Date.now();
      const u = o - i.lastRepeatTime;
      if (t > u) {
        const a = t - u;
        setTimeout(() => {
          i.restart();
        }, a);
      } else
        return i.lastRepeatTime = o, e();
    } : e;
  }
  function Je() {
    let e = "", t, i = null, o;
    const u = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
    if (typeof u[0] == "string")
      e = u.shift();
    else if (me)
      throw new Error("Every repeater has to be given a name as first argument. Note: This requirement can be removed in the configuration.");
    if (typeof u[0] == "function" && (t = u.shift()), (typeof u[0] == "function" || u[0] === null) && (i = u.shift()), typeof u[0] == "object" && (o = u.shift()), o || (o = {}), Oe && n.inActiveRecording) {
      let p = n.context.description;
      !p && n.context.parent && (p = n.context.parent.description), p || (p = "unnamed"), r.traceWarnings && console.warn(Error(`repeater ${e || "unnamed"} inside active recording ${p}`));
    }
    const a = b(e, t, i, o, Ue);
    return n.context && n.context.type === "repeater" && (o.dependentOnParent || r.alwaysDependOnParentRepeater) && n.context.addChild(a), a.refresh();
  }
  function Qe(e) {
    e.dispose();
    const t = e.priority();
    S(t);
    const o = n.dirtyRepeaters[t];
    o.last === null ? (o.last = e, o.first = e) : (o.last.nextDirty = e, e.previousDirty = o.last, o.last = e), ce();
  }
  function Ze() {
    n.observerId = 0, n.dirtyRepeaters.map((e) => {
      e.first = null, e.last = null;
    });
  }
  function ue(e) {
    const t = e.priority(), i = n.dirtyRepeaters[t];
    i.last === e && (i.last = e.previousDirty), i.first === e && (i.first = e.nextDirty), e.nextDirty && (e.nextDirty.previousDirty = e.previousDirty), e.previousDirty && (e.previousDirty.nextDirty = e.nextDirty), e.nextDirty = null, e.previousDirty = null;
  }
  function de(e = 0) {
    const t = n.dirtyRepeaters;
    let i = e;
    for (; i < t.length; ) {
      if (t[i].first !== null)
        return !0;
      i++;
    }
    return !1;
  }
  function Ve() {
    const e = n.dirtyRepeaters;
    let t = n.revalidationLevelLock + 1;
    for (; t < e.length; ) {
      if (e[t].first)
        return e[t].first;
      t++;
    }
    for (n.revalidationLevelLock = -1, t = n.revalidationLevelLock + 1; t < e.length; ) {
      if (e[t].first)
        return e[t].first;
      t++;
    }
    return null;
  }
  function ce() {
    if (n.postponeRefreshRepeaters === 0 && !n.refreshingAllDirtyRepeaters && de()) {
      for (n.refreshingAllDirtyRepeaters = !0; de(); ) {
        let e = Ve();
        e.refresh(), ue(e), X(e.priority());
      }
      n.refreshingAllDirtyRepeaters = !1;
    }
  }
  function ke(e, t) {
    n.recordingPaused++, j(), R.log(e, t), n.recordingPaused--, j();
  }
  function et(e, t) {
    n.recordingPaused++, j(), R.group(e, t), n.recordingPaused--, j();
  }
  function tt() {
    R.groupEnd();
  }
  function nt(e, t) {
    n.recordingPaused++, j();
    let i = R.logToString(e, t);
    return n.recordingPaused--, j(), i;
  }
  return s;
}
let V = {};
function pt(r) {
  r || (r = {}), r = { ...dt, ...r };
  const n = rt(r);
  return typeof V[n] > "u" && (V[n] = ct(r)), V[n];
}
export {
  pt as default,
  pt as getWorld
};
