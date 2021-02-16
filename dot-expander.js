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
    this.type = ty;
    this.text = text;
    this.line = line;
    this.offset = offset;
    toString = function () {
	return `[${this.type} ${this.text} ${this.line} ${this.offset}]`;
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
	    program  : function (_1) {  //(dottedIdent | anyToken)+
		var tokenArray = _1.dot ();
		return tokenArray; },
	    dottedIdent  : function (_1, _2, _3) {
		//ident dot ident 
		// x.y --> y(x,V) --> (prolog) insert = y(x,V_x_y), usage = V_x_y
		var x = _1.dot ();
		var y = _3.dot ();
		console.log(x.toString ());
		console.log(y.toString ());
		var newTokenArray = [
		    // y(x,V_x_y)
		    new Token ("generated", y.text, x.line, x.offset),
		    new Token ("generated", "(", x.line, x.offset),
		    new Token ("generated", x.text, x.line, x.offset),
		    new Token ("generated", ",", x.line, x.offset),
		    new Token ("generated", x.text, x.line, x.offset),
		    new Token ("generated", ",", x.line, x.offset),
		    new Token ("generated", "V_", x.line, x.offset),
		    new Token ("generated", x.text, x.line, x.offset),
		    new Token ("generated", "_", x.line, x.offset),
		    new Token ("generated", y.text, x.line, x.offset),
		    new Token ("generated", ")", x.line, x.offset)
		    ,
		    // V_x_y
		    new Token ("generated", "V_", x.line, x.offset),
		    new Token ("generated", x.text, x.line, x.offset),
		    new Token ("generated", "_", x.line, x.offset),
		    new Token ("generated", y.text, x.line, x.offset)
		];
		return newTokenArray;
	    },

	    // tokens return {insert, text}
	    dot  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //     "[" "character"     ws* "."  ws* position "]" ws*
		var pos = _6.dot ();
		return [new Token ("character", ".", pos.line, pos.offset)];},
	    ident  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //   "[" "symbol"  ws* text ws* position "]" ws*
		var pos = _6.dot ();
		return [new Token ("character", ".", pos.line, pos.offset)];},
	    anyToken  : function (_1, _2, _3, _4, _5, _6, _7, _8) { //"[" tokenType ws* text ws* position "]" ws*
		var pos = _6.dot ();
		return [new Token ("character", ".", pos.line, pos.offset)];},

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

function main () {
    var text = getJSON("test.txt");
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


var { cst, semantics } = main ();
var result = semantics (cst).dot ();
console.log("OK");
console.log(result);
//console.log(result);


