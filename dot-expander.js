const grammar = `
DOT_expander {
  Program = Rule+
  Rule =  Head ColonDash Body Dot WS*
  Head = HeadItem+
  HeadItem = ~ColonDash AnyToken
  Body = BodyItem+
  BodyItem = DottedIdent | (~Dot ~DotIdent AnyToken)
  ColonDash = Colon Dash
  DotIdent = Dot Ident
  DottedIdent = Ident Dot Ident
  Colon =    "[" "character" FS     "%3A" FS Position "]" 
  Dash =     "[" "character" FS     "-"   FS Position "]" 
  Dot =      "[" "character" FS     "."   FS Position "]" 
  Ident =    "[" "symbol" FS        Text  FS Position "]" 
  Whitespace = "[" "whitespace" FS  Text  FS Position "]" 
  Newline =  "[" "character" FS     "%0A" FS Position "]" 
  Comma =    "[" "character" FS     "%2C" FS Position "]" 
  Comment =  "[" "comment"   FS     Text  FS Position "]" 
  Pragma =   "[" "pragma"    FS     Text  FS Position "]" 
  GenericToken = "[" TokenType   FS     Text  FS Position "]" 

  AnyToken = Pragma | GenericToken
  WS = Pragma | Comment | Whitespace | Newline | Comma

  Position = Int FS Int
  Text = EncodedChar+
  EncodedChar = ("A" .. "Z" | "a" .. "z" | "0" .. "9" | "-" | "_" | "." | "!" | "~" | "*" | "'" | "(" | ")" | "%")
  Int = DigitChar+
  DigitChar = "0" .. "9" 
  TokenType = EncodedChar+
  FS = ","+
}
`;

function expand (text) {
    var ohm = require ('ohm-js');
    var parser = ohm.grammar (grammar);
    var result = parser.match (text);
    if (result.succeeded ()) {
        return { parser: parser, cst: result };
    } else {
        console.log (parser.trace (text).toString ());
        throw "Ohm matching failed";
    }
}

// token = { type:..., text:..., position:...} (all fields are strings)

function Token (ty, text, line, offset) {
    this.ty = ty;
    this.text = text;
    this.line = line;
    this.offset = offset;
    this.toString = function () {
	return `[${this.ty},${this.text},${this.line},${this.offset}]`;
    }
}

function Position (line, offset) {
    this.line = line;
    this.offset = offset;
}

// preamble object
function Preamble () {
    process.stderr.write ("CREATING preamble");
    process.stderr.write ("\n");
    this.symbolHash = [];
    this.value = [];
    this.ondeck = [];
    this.glue = function () {
	// a is array - append it to the preamble array
	this.value = this.value.concat (this.ondeck);
    };
    this.add = function (token) { this.ondeck.push (token); },
    this.addSeen = function (name) {
	if (this.seen (name)) {
	    throw "can't happen";
	};
	this.symbolHash [name] = true;
    };
    this.seen = function (name) {
	return this.symbolHash [name];
    };
}

var pre;

function addSem (sem) {
    sem.addOperation (
	"dot",
	// every rule returns an array of tokens and might add tokens to
	// the top of preambles stack
	// we emit the stack of preambles after we see ":-"
	{
	    Program  : function (_1s) { // return array of tokens
		var result = _1s.dot ();
		return result.flat ();
	    },
	    Rule: function (_1, _2, _3, _4, _5s) { // return array of tokens
		// these need to run before the access to pre.value
		var head = _1.dot ();
		var ce = _2.dot ();
		var body = _3.dot ()
		var dot = _4.dot ();
		var ws = _5s.dot ().flat ();
		return head.concat (ce).concat (body).concat (dot).concat (ws);
	    },
	    Head: function (_1s) { return _1s.dot (); },		
	    HeadItem: function (_1) { return _1.dot (); },
	    Body: function (_1s) { return _1s.dot (); },
	    BodyItem: function (_1) { return _1.dot (); },
	    
	    ColonDash : function (_1, _2) {
		var colonToken = (_1.dot ()) [0];
		var dashToken = (_2.dot ()) [0];
		return [ colonToken, dashToken ] ;
	    },
	    DottedIdent  : function (_1, _2, _3) { //ident dot ident
		// x.y --> y(x,V) --> (prolog) preamble = y(x,V_x_y), usage = V_x_y

		// _1 is [ [symbol x lll ooo] ]
		// _2 is [ [character . xxx xxx] ]
		// _3 is [ [symbol y xxx xxx] ]

		// newSymbol: Field_x_y
		// originalSymbol: x
		// originalField: y
		// preamble: y(x,Field_x_y) --> originalField "(" originalSymbol "," newSymbol ")" 
		// code: [ Field_x_y ] --> [ [symbol Field_x_y lll ooo] ]

		var originalSymbol = (_1.dot ())[0];
		var originalField = (_3.dot ())[0];
		var sym = originalSymbol.text;
		var field = originalField.text;
		var line = originalField.line;
		var offset = originalSymbol.offset;
		var newSymbolName = `Field_${sym}_${field}`;
		var newSymbolToken = new Token ("symbol", newSymbolName, line, offset);
		if (! pre.seen ( newSymbolName )) {
		    pre.addSeen (newSymbolName);
		    var comma = new Token ("character", "%2C", line, offset);
		    var newline = new Token ("character", "%0A", line, offset);
		    pre.add (newline);
		    pre.add (originalField);
		    pre.add (new Token ("character", "(", line, offset));
		    pre.add (originalSymbol);
                    pre.add (comma);
		    pre.add (newSymbolToken);
		    pre.add (new Token ("character", ")", line, offset));
		    pre.add (comma);
		};
		return [ newSymbolToken ];
	    },

	    // tokens return {insert, text}
	    Colon  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("character", ":", pos.line, pos.offset);
		return [t];},
	    Dash  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("character", "-", pos.line, pos.offset);
		return [t];},
	    Dot  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("character", ".", pos.line, pos.offset);
		return [t];},
	    Ident  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("symbol", _4.dot (), pos.line, pos.offset);
		return [t];},
	    GenericToken  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return [t];},
	    Whitespace  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return [t];},
	    Comment: function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return [t];},
	    Comma: function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return [t];},
	    Pragma: function (_1, _2, _3, _4, _5, _6, _7) {
		var command = decodeURIComponent (_4.dot ());
		var pos = _6.dot ();
		const re_clear = /preamble.clear/;
		const re_insert = /preamble.insert/;
		if (command.match(re_clear)) {
		    //process.stderr.write ("PRAGMA clear");
		    //process.stderr.write ("\n\n");
		    pre = new Preamble ();
		} else if (command.match(re_insert)) {
		    //process.stderr.write ("PRAGMA insert");
		    //process.stderr.write ("\n\n");
		    pre.glue ();
		};
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return [t];},
	    Newline  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return [t];},

	    AnyToken: function (_1) {
		return _1.dot ();
	    },
	    WS: function (_1) {
		return _1.dot ();
	    },

	    Position  : function (_1, _2, _3) { return new Position (_1.dot (), _3.dot ()); },
	    Text  : function (_1s) { return _1s.dot ().join(''); },
	    EncodedChar  : function (_1) { return _1.dot (); },
	    Int  : function (_1s) { return _1s.dot ().join (''); },
	    DigitChar  : function (_1) { return _1.dot (); },
	    TokenType  : function (_1s) { return _1s.dot ().join (''); },
	    FS: function (_1s) { return _1s.dot ().join (''); },
	    _terminal: function () { return this.primitiveValue; }
	}
    );
}

function main (fname) {
    var text = getJSON(fname);
    const { parser, cst } = expand (text);
    if (cst.succeeded) {
	var semantics = parser.createSemantics ();
	addSem (semantics);
	return { cst: cst, semantics: semantics };
    } else {
	throw "didn't parse";
    }
}



var fs = require ('fs');

function getNamedFile (fname) {
    if (fname === undefined || fname === null || fname === "-") {
        return fs.readFileSync (0, 'utf-8');
    } else {
        return fs.readFileSync (fname, 'utf-8');
    }   
}

function getJSON (fname) {
    var s = getNamedFile (fname);
    return s;
    return (JSON.parse (s));
}

function tokenArrayToStringArray (a) {
    var sArray = a.map (token => { return token.toString (); });
    return sArray.join ('\n');
}


var { cst, semantics } = main ("-");
var resultArray = semantics (cst).dot ();
var stringArray= resultArray.map (token => {return token.toString ();});
stringArray.forEach (s => console.log (s));
