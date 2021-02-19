#!/bin/bash
node ./insert-inserter <test.pl |\
    node ../tokens/tokenizer |\
    node ./dot-expander|\
    ../untoken/untoken.bash |\
    ./pragma-remover.bash

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
