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
        return result;
    } else {
        console.log (parser.trace (text).toString ());
        throw "Ohm matching failed";
    }
}

function main () {
    var text = getJSON("test.txt");
    var parsed = expand (text);
    return parsed;
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


var result = main ();
console.log("OK");
//console.log(result);

