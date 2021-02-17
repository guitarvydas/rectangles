const grammar = `
dot_expander {
  program = (dottedIdent | anyToken)+
  dottedIdent = ident dot ident
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

var setup;

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
		var result = _1s.dot();
		return result; },  // result is an Array of {preamble:..., tokens:...}
	    dottedIdent  : function (_1, _2, _3) { //ident dot ident 
		// x.y --> y(x,V) --> (prolog) insert = y(x,V_x_y), usage = V_x_y
		var x = (_1.dot ()).tokens;
		var y = (_3.dot ()).tokens;
		var preambleTokenArray = [
		    // y(x,V_x_y)
		    new Token ("generated", y.text, x.line, x.offset),
		    new Token ("generated", "(", x.line, x.offset),
		    new Token ("generated", x.text, x.line, x.offset),
		    new Token ("generated", ",", x.line, x.offset),
		    new Token ("generated", "V_", x.line, x.offset),
		    new Token ("generated", x.text, x.line, x.offset),
		    new Token ("generated", "_", x.line, x.offset),
		    new Token ("generated", y.text, x.line, x.offset),
		    new Token ("generated", ")", x.line, x.offset)
		];
		var tokenArray = [
		    // V_x_y
		    new Token ("generated", "V_", x.line, x.offset),
		    new Token ("generated", x.text, x.line, x.offset),
		    new Token ("generated", "_", x.line, x.offset),
		    new Token ("generated", y.text, x.line, x.offset)
		];
		return { preamble: preambleTokenArray, tokens: tokenArray };
	    },

	    // tokens return {insert, text}
	    dot  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //     "[" "character"     ws* "."  ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token ("character", ".", pos.line, pos.offset);
		return {preamble: [], tokens: [t]}},
	    ident  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //   "[" "symbol"  ws* text ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token ("symbol", _4.dot (), pos.line, pos.offset);
		return {preamble: [], tokens: [t]}},
	    anyToken  : function (_1, _2, _3, _4, _5, _6, _7, _8) { //"[" tokenType ws* text ws* position "]" ws*
		var pos = _6.dot ();
		var t = new Token (_2.dot (), _4.dot (), pos.line, pos.offset);
		return {preamble: [], tokens: [t]}},

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

function tokenArrayToString (a) {
    var sArray = a.map (x => { return a.toString (); });
    var s = sArray.join ('');
    return s;
}

function stringArrayToString (sa) {
    var s = sa.join ('\n');
    return s;
}

var { cst, semantics } = main ("-");
var resultArray /*[{ preamble[], tokens[] }]*/ = semantics (cst).dot ();
console.log ("OK");
//console.log (resultArray);
var preamble = stringArrayToString (resultArray.map (x => { return tokenArrayToString (x.preamble); }));
var tokens =   stringArrayToString (resultArray.map (x => { return tokenArrayToString (x.tokens);   }));
console.log ("*** preamble ***");
console.log (preamble);
console.log ("*** tokens ***");
console.log (tokens);

//var str = (tokenArray.map ((t) => {return t.toString ();})).join ('\n');
//console.log (str);




