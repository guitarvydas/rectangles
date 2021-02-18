const grammar = `
dot_expander {
  program = rule+
  rule = head colonDash body dot
  head = dottedIdent | (~dot anyToken)
  body = dottedIdent | (~dot anyToken)
  colonDash = colon dash
  dottedIdent = ident dot ident
  colon =    "[" "character"     ws* ":"  ws* position "]" ws*
  dash =     "[" "character"     ws* "-"  ws* position "]" ws*
  dot =      "[" "character"     ws* "."  ws* position "]" ws*
  ident =    "[" "symbol"  ws* text ws* position "]" ws*
  anyToken = "[" tokenType ws* text ws* position "]" ws*
  position = ws* int ws+ int
  text = encodedChar+
  encodedChar = ~ws ("A" .. "Z" | "a" .. "z" | "0" .. "9" | "-" | "_" | "." | "!" | "~" | "*" | "'" | "(" | ")" | "%")
  int = digitChar+
  digitChar = "0" .. "9" 
  tokenType = encodedChar+
  ws = " " | "\\n" | "\\t"
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
	    program  : function (_1s) {  //(dottedIdent | anyToken)+
		preambles = [];
		var result = _1s.dot();
		return result; },  // result is an Array of {preamble:..., tokens:...}
	    colonDash : function (_1, _2) {
		process.stderr.write("@@@@@@@ colonDash @@@@@@@@\n");
		var colonToken = _1.dot ().ref [0];
		var dashToken = _2.dot ().ref [0];
		return { preamble: [], ref: [ colonToken, dashToken ] };
	    },
	    dottedIdent  : function (_1, _2, _3) { //ident dot ident 
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
	    colon  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //     "[" "character"     ws* ":"  ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token ("character", ".", pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    dash  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //     "[" "character"     ws* "-"  ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token ("character", "-", pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    dot  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //     "[" "character"     ws* "."  ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token ("character", ".", pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    ident  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //   "[" "symbol"  ws* text ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token ("symbol", _4.dot (), pos.line, pos.offset);
		return {preamble: [], ref: [t]}},
	    anyToken  : function (_1, _2, _3, _4, _5, _6, _7, _8) { //"[" tokenType ws* text ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return {preamble: [], ref: [t]}},

	    position  : function (_1s, _2, _3s, _4) { return new Position (_2.dot (), _4.dot ()); }, //ws* int ws+ int
	    text  : function (_1s) { return _1s.dot ().join(''); }, //encodedChar+
	    encodedChar  : function (_1) { return _1.dot (); }, //~ws ("A" .. "Z" | "a" .. "z" | "0" .. "9" | "-" | "_" | "." | "!" | "~" | "*" | "'" | "(" | ")" | "%")
	    int  : function (_1s) { return _1s.dot ().join (''); }, //digitChar+
	    digitChar  : function (_1) { return _1.dot (); }, //"0" .. "9" 
	    tokenType  : function (_1s) { return _1s.dot ().join (''); }, //encodedChar+
	    ws  : function (_1) { return _1.dot (); }, //" " | "\\n" | "\\t"
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
var preambleTokenArray = resultArray.map (x => { return x.preamble }).flat ();
var refTokenArray = resultArray.map (x => { return x.ref }).flat ();
process.stderr.write (tokenArrayToStringArray (preambleTokenArray));
process.stdout.write (tokenArrayToStringArray (refTokenArray));
