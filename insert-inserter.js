const grammar = `
PROLOG {
  program = rule+
  rule =   ws head ":-" body endRule
  head = ident parameterList*
  body = bodyItem+
  bodyItem =   (~"." any) -- common
             | ("." &alnum) -- dotInSymbol
  ident = letter alnum* ws
  parameterList = "(" ws (~")" any)+ ")" ws
  endRule = "." ws
  comment = "%" (~"\\n" any)* "\\n"
  whitespace = comment | space
  ws = whitespace*
}`;

function insert (text) {
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

function addSem (sem) {
    sem.addOperation (
	"insert",
	{
	    program: function (_1s) { return _1s.insert ().join (''); },
	    rule: function (_01, _1, _2, _3, _4) { //Head ":-" body endRule
		return `
${_01.insert ()}%% pragma preamble clear %%${_1.insert ()}${_2.insert ()}%% pragma preamble insert %%${_3.insert ()}${_4.insert ()}`;
	    },
	    head: function (_1, _2) {return `${_1.insert ()}${_2.insert ()}`; }, //ident ParameterList*
	    body: function (_1s) {return `${_1s.insert ().join ('')}`;}, //bodyItem+
	    bodyItem_common: function (_1) {return `${_1.insert ()}`;}, //  (~"." any) -- common
            bodyItem_dotInSymbol: function (_1,_2) {return `${_1.insert ()}`;}, // | ("." &alnum) -- dotInSymbol
	    ident: function (_1, _2s, _3) {return `${_1.insert ()}${_2s.insert ().join ('')}${_3.insert ()}`;}, //letter alnum*
	    parameterList: function (_1, _2, _3s, _4, _5) {return `${_1.insert ()}${_2.insert ()}${_3s.insert ().join ('')}${_4.insert ()}${_5.insert ()}`;}, //"(" (~")" any)+ ")"
	    endRule: function (_1, _2,) {return `${_1.insert ()}${_2.insert ()}`;},
	    comment: function (_1, _2s, _3) { return `${_1.insert ()}${_2s.insert ().join ('')}${_3.insert ()}`; },
	    whitespace: function (_1) { return _1.insert (); },
	    ws: function (_1s) { return _1s.insert ().join (''); },
	    _terminal: function () { return this.primitiveValue; }
	}
    )
}

function main (fname) {
    var text = getJSON(fname);
    const { parser, cst } = insert (text);
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
var resultString = semantics (cst).insert ();
console.log (resultString);
