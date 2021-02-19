const grammar = `
DOT_expander {
  Head = HeadItem+
  Program = Rule+
  Rule =  Head
  HeadItem = ~ColonDash AnyToken
  Body = BodyItem+
  BodyItem = ~Dot AnyToken
  ColonDash = Colon Dash
  DottedIdent = Ident Dot Ident
  Colon =    "[" "character" fs     ":"   fs Position "]" 
  Dash =     "[" "character" fs     "-"   fs Position "]" 
  Dot =      "[" "character" fs     "."   fs Position "]" 
  Ident =    "[" "symbol" fs        Text  fs Position "]" 
  AnyToken = "[" TokenType  fs Text fs Position "]" 
  Position = Int fs Int
  Text = EncodedChar+
  EncodedChar = ("A" .. "Z" | "a" .. "z" | "0" .. "9" | "-" | "_" | "." | "!" | "~" | "*" | "'" | "(" | ")" | "%")
  Int = DigitChar+
  DigitChar = "0" .. "9" 
  TokenType = EncodedChar+
  fs = ","+
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
	return `[${this.ty} ${this.text} ${this.line} ${this.offset}]`;
    }
}

function Position (line, offset) {
    this.line = line;
    this.offset = offset;
}

function addSem (sem) {
    sem.addOperation (
	"dot",
	{
	    Program  : function (_1s) {
		preambles = [];
		var result = _1s.dot();
		return { preamble: [], ref: result }; },  // result is an Array of {preamble:..., tokens:...}

	    Rule: function (_1) { return _1.dot (); },
	    Head: function (_1s) {
		return { preamble: [], ref: _1s.dot () }; },
	    HeadItem: function (_1) { return _1.dot (); },
	    Body: function (_1s) { throw "NIY"; return _1s.dot ().join (''); },
	    BodyItem: function (_1) { throw "NIY"; return _1.dot (); },
	    
	    ColonDash : function (_1, _2) {
		var colonToken = _1.dot ().ref [0];
		var dashToken = _2.dot ().ref [0];
		return { preamble: [], ref: [ colonToken, dashToken ] };
	    },
	    DottedIdent  : function (_1, _2, _3) { //ident dot ident 
		// x.y --> y(x,V) --> (prolog) preamble = y(x,V_x_y), usage = V_x_y

		// _1 is [preamble: [], ref: [ [symbol x lll ooo] ]
		// _2 is [preamble: [], ref: [ [character . xxx xxx] ]
		// _3 is [preamble: [], ref: [ [symbol y xxx xxx] ]

		// newSymbol: Field_x_y
		// originalSymbol: x
		// originalField: y
		// preamble: y(x,Field_x_y) --> originalField "(" originalSymbol "," newSymbol ")" 
		// ref: [ Field_x_y ] --> [ [symbol Field_x_y lll ooo] ]

		var originalSymbol = _1.dot ().ref[0];
		var originalField = _3.dot ().ref[0];
		var sym = originalSymbol.text;
		var field = originalField.text;
		var line = originalField.line;
		var offset = originalSymbol.offset;
		var newSymName = `Field_${sym}_${field}`;
		var newSymbol = new Token ("symbol", newSymName, line, offset);
		var ref = [ newSymbol ];
		var preamble;
		if (preambles[newSymName]) {
		    preamble = [];
		} else {
		    preambles[newSymName] = true;
		    preamble = [
			originalField,
			new Token ("character", "(", line, offset),
			originalSymbol,
			new Token ("character", ",", line, offset),
			newSymbol,
			new Token ("character", ")", line, offset)
		    ];
		};
		return { preamble: preamble, ref: ref };
	    },

	    // tokens return {insert, text}
	    Colon  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("character", ".", pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    Dash  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("character", "-", pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    Dot  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("character", ".", pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    Ident  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token ("symbol", _4.dot (), pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    AnyToken  : function (_1, _2, _3, _4, _5, _6, _7) {
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return {preamble: [], ref: [t]}},

	    Position  : function (_1, _2, _3) { return new Position (_1.dot (), _3.dot ()); },
	    Text  : function (_1s) { return _1s.dot ().join(''); },
	    EncodedChar  : function (_1) { return _1.dot (); },
	    Int  : function (_1s) { return _1s.dot ().join (''); },
	    DigitChar  : function (_1) { return _1.dot (); },
	    TokenType  : function (_1s) { return _1s.dot ().join (''); },
	    fs: function (_1s) { return _1s.dot ().join (''); },
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
var resultArray /*[{ preamble[], tokens[] }]*/ = semantics (cst).dot ();
//console.log (resultArray);
console.log (resultArray.preamble);
console.log (resultArray.ref);

var preambleTokens = resultArray.preamble.map (obj => { return obj.ref });
var refTokens = resultArray.ref.map (obj => { return obj.ref });
console.log (preambleTokens);
console.log (refTokens);

var preambles = preambleTokens.map (token => {return token.toString ();}).join ('\n');
var refs = refTokens.map (token => { return token.toString (); }).join ('\n');
console.log (preambles);
console.log (refs);

//process.stderr.write (tokenArrayToStringArray (preambleTokenArray));
//process.stdout.write (tokenArrayToStringArray (refTokenArray));
