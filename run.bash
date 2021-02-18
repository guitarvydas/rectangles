#!/bin/bash
node insert-inserter <test.pl |\
    node ../tokens/tokenizer |\
    node ./dot-expander |\
    ../untoken/untoken.bash |\
    ./pragma-remover.bash
