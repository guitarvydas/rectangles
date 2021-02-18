#!/bin/bash
node ./insert-inserter <test.pl |\
    node ../tokens/tokenizer |\
    ../untoken/untoken.bash |\
    ./pragma-remover.bash
