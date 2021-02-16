// npm install ohm-js
const grammar = `
dot_expander {
  program = (dottedIdent | anyToken)+
  dottedIdent = ident dot ident
​
  dot =      "[" "character"     ws* "."  ws* position "]" ws*
  ident =    "[" "symbol"  ws* text ws* position "]" ws*
  anyToken = "[" tokenType ws* text ws* position "]" ws*
  
  
  position = ws* int ws+ int
​
  text = encodedChar+
  encodedChar = ~ws ("A" .. "Z" | "a" .. "z" | "0" .. "9" | "-" | "_" | "." | "!" | "~" | "*" | "'" | "(" | ")" | "%")
  int = digitChar+
  digitChar = "0" .. "9" 
  tokenType = encodedChar+
  ws = " " | "\n" | "\t"
}`;


