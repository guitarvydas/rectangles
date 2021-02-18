% comment 1
  topmost(L1,L2,L) :-
% comment 2
      horizontal(L1),
      horizontal(L2),
      L1.x =< L2.x.
% comment 3
