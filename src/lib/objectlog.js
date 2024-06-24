const colorCodes = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
}



// Configuration
let configuration = {
  // Count the number of chars that can fit horizontally in your buffer. Set to -1 for one line logging only. 
  bufferWidth : 83,
  // bufferWidth : 83
  // bufferWidth : 76
  
  indentToken : "  ",
  
  // Change to true in order to find all logs hidden in your code.
  findLogs : false, 
  
  // Set to true in web browser that already has a good way to display objects with expandable trees.
  useConsoleDefault : false
};  

// State
let globalIndentLevel = 0;

function stacktrace() { 
  function st2(f) {
    return !f ? [] : 
      st2(f.caller).concat([f.toString().split('(')[0].substring(9) + '(' + f.arguments.join(',') + ')']);
  }
  return st2(arguments.callee.caller);
}
  
function indentString(level) {
  let string = "";
  while (level-- > 0) {
    string = string + configuration.indentToken;
  }
  return string;
}

function createBasicContext() {
  const context = {
    terminated : false,
    rootLevel : true,
    horizontal : false,
    indentLevel : globalIndentLevel,
    unfinishedLine : false
  };

  context.resetColor = () => {
    context.setColor("Reset");
  }

  return context;
}

function createToStringContext() {
  let context = createBasicContext();
  context.result = "";
  context.log = function(string) {
    if (this.unfinishedLine) {
      this.result += string;
      this.unfinishedLine = true;
    } else {
      this.result += indentString(this.indentLevel) + string;
      this.unfinishedLine = true;
    }
  };
  context.finishOpenLine = function() {
    if (this.unfinishedLine && !this.horizontal) {
      this.result += "\n";
      this.unfinishedLine = false;
    }
  };
  context.setColor = function() {}
  context.jsonCompatible = true; 
  return context;
}

function createStdoutContext() {
  let context = createBasicContext();
  context.lineMemory = "";
  context.log = function(string) {
    if (this.unfinishedLine) {
      if (typeof(process) !== "undefined") {
        process.stdout.write(string);             
      } else {
        context.lineMemory += string;
      }

      this.unfinishedLine = true;
    } else {
      let indent = indentString(this.indentLevel);
      if (typeof(process) !== "undefined") {
        process.stdout.write(indent + string);
      } else {
        context.lineMemory += indent + string;
      }
      this.unfinishedLine = true;
    }
  };
  context.finishOpenLine = function() {
    if (this.unfinishedLine && !this.horizontal) {
      if (context.lineMemory !== "") {
        console.log(context.lineMemory);
        context.lineMemory = "";
      } else {
        console.log();
      }
      this.unfinishedLine = false;
    }
  };
  context.setColor = function(colorCode) {
    if (!colorCodes[colorCode]) colorCode = "Reset";
    context.log(colorCodes[colorCode]);
  }
  context.jsonCompatible = false; 
  return context;
}

function createHorizontalMeasureContext(limit, parent) {
  let context = createBasicContext();
  context.horizontal = true;
  context.count = 0;
  context.limit = limit;
  
  context.log = function(string) {
    if (this.unfinishedLine) {
      this.count += string.length;
      this.terminated = this.count > this.limit;
      this.unfinishedLine = true;
    } else {
      let indent = indentString(this.indentLevel);
      this.count += (indent + string).length;
      this.terminated = this.count > this.limit;
      this.unfinishedLine = true;
    }
  };
  context.finishOpenLine = function() {};
  context.setColor = function() {};
  context.jsonCompatible = parent.jsonCompatible;
  return context;
}

function horizontalLogFitsWithinWidthLimit(entity, pattern, limit, parentContext) {    
  let context = createHorizontalMeasureContext(limit, parentContext);
  logPattern(entity, pattern, context);
  return !context.terminated;
}

function logPattern(entity, pattern, context) {
  const rootLevel = context.rootLevel;
  const json = context.jsonCompatible;
  context.rootLevel = false; 

  if (typeof(pattern) === "undefined") {
    pattern = 1;
  } 
  
  // Apply transformation
  // let originalEntity = entity;
  if (typeof(pattern) === 'function') {
    // console.log(pattern);
    // console.log(entity);
    entity = pattern(entity);
    pattern = -1;
  }
  
  // Bail out if terminated
  if (context.terminated) return;

  // Recursive rendering
  if (typeof(entity) !== 'object') {
    if (typeof(entity) === 'function') {
      context.setColor("FgBlue");
      context.log("function( ... ) { ... }");
      context.resetColor();       
    } else if (typeof(entity) === 'string') {
      if (rootLevel) {
        context.log(entity);
      } else {
        context.setColor("FgGreen");
        const quote = json ? '"' : "'";
        context.log(quote + entity + quote);                
        context.resetColor();
      }
    } else {
      context.setColor("FgYellow");
      context.log(entity + "");
      context.resetColor();   
    }
  } else if (entity === null) {
    context.log("null");
  } else {
    if (pattern === 0) {
      if (entity instanceof Array) {
        context.log("[");
        context.setColor("FgCyan"); 
        context.log("..."); 
        context.resetColor();
        context.log("]"); 
      } else {
        context.log("{");         
        context.setColor("FgCyan"); 
        context.log("...");         
        context.resetColor();
        context.log("}");         
      }
    } else {
      let isArray = (entity instanceof Array);
      const keyCount = Object.keys(entity).length;
      let startedHorizontal = false;
      if (!context.horizontal) {
        let spaceLeft = configuration.bufferWidth - (context.indentLevel * configuration.indentToken.length);
        context.horizontal = configuration.bufferWidth === -1 ? true : horizontalLogFitsWithinWidthLimit(entity, pattern, spaceLeft, context); 
        startedHorizontal = context.horizontal;
      }
      if (isArray) context.finishOpenLine(); // Should not be when enforced single row.
      context.log(isArray ? "[" : "{");
      if (context.horizontal && keyCount) context.log(" ");
      // context.log(context.horizontal ? "-" : "|");
      context.finishOpenLine();
      context.indentLevel++;
      let first = true;
      for (let p in entity) {
        if (!first) {
          context.log(", ");
          context.finishOpenLine();
        }
        if (!isArray || isNaN(p)) {
          // context.setColor("FgCyan");
          if (json) context.log('"');
          context.log(p);
          if (json) context.log('"');
          context.log(': ');
          // context.resetColor();
        }

        let nextPattern = null;
        if (typeof(pattern) === 'object') {
          nextPattern = pattern[p];
        } else {
          nextPattern = pattern === -1 ? -1 : pattern - 1;
        }
        
        if(!isArray) context.indentLevel++;
        logPattern(entity[p], nextPattern, context);
        if(!isArray) context.indentLevel--;
        first = false;
      }
      context.indentLevel--;
      context.finishOpenLine();
      if (context.horizontal && keyCount) context.log(" ");
      context.log(isArray ? "]" : "}");
      if (startedHorizontal) {
        context.horizontal = false;
      }
    }
  }
  if (rootLevel) context.finishOpenLine();
}

export const objectlog = {
  // Configuration
  configuration,
  stacktrace, 
  
  log(entity, pattern) {
    if (objectlog.findLogs) throw new Error("No logs allowed!");
    if (configuration.useConsoleDefault) {
      console.log(entity);
    } else {
      logPattern(entity, pattern, createStdoutContext());
    }
  },

  // If you need the output as a string.
  logToString(entity, pattern) {
    let context = createToStringContext();
    logPattern(entity, pattern, context);
    return context.result;
  },

  loge(string) { // "event"
    this.log("<<<" + string + ">>>");
  },

  logs() { // "separator"
    this.log("---------------------------------------")
  },

  logss() {
    this.log("=======================================")
  },

  logsss() {
    this.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
  },
  
  logVar(name, entity, pattern) {
    if (objectlog.findLogs) throw new Error("No logs allowed!");
    if (configuration.useConsoleDefault) {
      console.log(name + ":");
      console.group();
      console.log(entity);
      console.groupEnd();
    } else {
      context = createStdoutContext();
      if (typeof(pattern) === 'undefined') pattern = 1;
      context.log(name + ": ");
      
      let spaceLeft = configuration.bufferWidth - (context.indentLevel * configuration.indentToken.length) - (name + ": ").length; 
      context.horizontal = configuration.bufferWidth === -1 ? true : horizontalLogFitsWithinWidthLimit(entity, pattern, spaceLeft); 
      
      if (context.horizontal) {         
        logPattern(entity, pattern, context);
      } else {
        context.indentLevel++;          
        logPattern(entity, pattern, context);
        context.indentLevel--;
      }
    }
  },
  
  group(entity, pattern) {
    if (objectlog.findLogs) throw new Error("No logs allowed!");
    if (configuration.useConsoleDefault) {
      console.group(entity);
    } else {
      if (typeof(entity) !== 'undefined') {
        logPattern(entity, pattern, createStdoutContext());
      }
      globalIndentLevel++;
    }
  },
  
  groupEnd(entity, pattern) {
    if (objectlog.findLogs) throw new Error("No logs allowed!");
    if (configuration.useConsoleDefault) {
      console.groupEnd();
    } else {
      globalIndentLevel--;
      if (globalIndentLevel < 0) globalIndentLevel = 0;
      if (typeof(entity) !== 'undefined') {
        logPattern(entity, pattern, createStdoutContext());
      }
    }
  }     
}

