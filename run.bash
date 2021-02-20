#!/bin/bash
rm -f _0.pl _1.tokens _2.tokens _3.pl _4.pl
node ./insert-inserter <test.pl >_0.pl
node ../tokens/tokenizer <_0.pl >_1.tokens
node ./dot-expander <_1.tokens >_2.tokens
cat _2.tokens
../untoken/untoken.bash <_2.tokens >_3.pl
./pragma-remover.bash <_3.pl >_4.pl
cat _4.pl
# node ./insert-inserter <test.pl |\
#     node ../tokens/tokenizer |\
#     node ./dot-expander |\
#     ../untoken/untoken.bash |\
#     ./pragma-remover.bash 


# node ./insert-inserter <test.pl |\
#     node ../tokens/tokenizer |\
#     node ./dot-expander 
# #    ../untoken/untoken.bash |\
# #    ./pragma-remover.bash

# node ./insert-inserter <test.pl |\
#     node ../tokens/tokenizer |\
#     node ./dot-expander |\
#     ../untoken/untoken.bash |\
#     ./pragma-remover.bash

## currently, dot-expander outputs code ("ref") to stdout and outputs preamble to stderr
# ../untoken/untoken.bash <_preamble.tokens

# TODO: fold preamble into code after "%% pragma preamble insert %%"
#   NB for PROLOG, this can't be done "globally" but must be done on a per-rule basis,
#      since the preambles are valid only in the scope of each rule
