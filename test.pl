  topmost(L1,L2,L) :-
      horizontal(L1),
      horizontal(L2),
      L1.x =< L2.x.
