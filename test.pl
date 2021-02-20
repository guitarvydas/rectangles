% comment 1
  topmost(L1,L2,L) :-
% comment 2
      horizontal(L1),
      horizontal(L2),
      L1.x =< L2.x.
% comment 3

% comment 4
% comment 4a
  topmost(L3.x,L) :-
% comment 5
      horizontal(L3),
      horizontal(L4),
      L3.x =< L4.x.
% comment 6
