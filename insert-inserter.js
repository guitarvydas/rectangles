const grammar = `
PROLOG {
  Rule = Head ":-" body endRule
  Head = ident ParameterList*
  body = bodyItem+
  bodyItem =   (~"." any) -- common
             | ("." &alnum) -- dotInSymbol
  ident = letter alnum*
  ParameterList = "(" (~")" any)+ ")"
  endRule = "." space | "." end
}
`;

// Rule = %% pragma preamble clear\n${_1}${_2}%% pragma preamble insert\n${_3}${_4}` %% Head ":-" body endRule
// Head = _0 %% ident ParameterList*
// body = _0 %% bodyItem+
// bodyItem_common = _0 %%  (~"." any) -- common
// bodyItem_dotInSymbol = _1 %% | ("." &alnum) -- dotInSymbol
// ident = _0 %%letter alnum*
// ParameterList = _0 %% "(" (~")" any)+ ")"
// endRule = _0 %% "." space | "." end

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
	    Rule: function (_1, _2, _3, _4) { //Head ":-" body endRule
		return `
%% pragma preamble clear
${_1.insert ()}${_2.insert ()}
%% pragma preamble insert
${_3.insert ()}${_4.insert ()}`;
	    },
	    Head: function (_1, _2) {return `${_1.insert ()}${_2.insert ()}`; }, //ident ParameterList*
	    body: function (_1s) {return `${_1s.insert ().join ('')}`;}, //bodyItem+
	    bodyItem_common: function (_1) {return `${_1.insert ()}`;}, //  (~"." any) -- common
            bodyItem_dotInSymbol: function (_1,_2) {return `${_1.insert ()}`;}, // | ("." &alnum) -- dotInSymbol
	    ident: function (_1, _2s) {return `${_1.insert ()}${_2s.insert ().join ('')}`;}, //letter alnum*
	    ParameterList: function (_1, _2s, _3) {return `${_1.insert ()}${_2s.insert ().join ('')}${_3.insert ()}`;}, //"(" (~")" any)+ ")"
	    endRule: function (_1, _2) {return `${_1.insert ()}${_2.insert ()}`;}, //"." space | "." end
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


var { cst, semantics } = main ("test.pl");
var resultString = semantics (cst).insert ();
console.log (resultString);
