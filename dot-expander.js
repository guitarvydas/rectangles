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

function noChange (a,b,c,d,e,f,g,h) {
    return `${a.dot ()}${b.dot ()}${c.dot ()}${d.dot ()}${e.dot ()}${f.dot ()}${g.dot ()}${h.dot ()}`;
}

function formatToken (kind,text,line,offset) {
    return `[${kind} ${encodeURIComponent(text)} ${line} ${offset}]\n`;
}

function addSem (sem) {
    sem.addOperation (
	"dot",
	{
	    program  : function (_1) {  //(dottedIdent | anyToken)+
		var textArray = _1.dot ();
		return textArray.join (''); },
	    dottedIdent  : function (_1, _2, _3) {
		//ident dot ident 
		// x.y --> y(x,V) --> (prolog) insert = y(x,V_x_y), usage = V_x_y
		var x = _1.dot ();
		var y = _3.dot ();
		console.log(x);
		console.log(y);
		var insertedCode = formatToken ("generated", `${y}(${x},V_${x}_${y}),`, x.pos);
		console.log (insertedCode);
		var text = `V_${x}_${y}`;
		console.log (text);
		return `${insertedCode}${text}`;
	    },

	    // tokens return {insert, text}
	    dot  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //     "[" "character"     ws* "."  ws* position "]" ws*
		return noChange (_1, _2, _3, _4, _5, _6, _7, _8) },
	    ident  : function (_1, _2, _3, _4, _5, _6, _7, _8) {  //   "[" "symbol"  ws* text ws* position "]" ws*
		return noChange (_1, _2, _3, _4, _5, _6, _7, _8) },
	    anyToken  : function (_1, _2, _3, _4, _5, _6, _7, _8) { //"[" tokenType ws* text ws* position "]" ws*
		return noChange (_1, _2, _3, _4, _5, _6, _7, _8) },

	    position  : function (_1s, _2, _3s, _4) { return `${_2.dot ()} ${_4.dot ()}`; }, //ws* int ws+ int
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


