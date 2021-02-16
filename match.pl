rectangle(L) :-
    % match
    line(L),
    line(L_prime), joined(L,L_prime),
    line(L_prime_prime), joined(L_prime,L_prime_prime),
    line(L_prime_prime_prime), joined(L_prime_prime,L_prime_prime_prime),

    % calculate
    topmost(TopLine,L,L_prime,L_prime_prime,L_prime_prime_prime),
    leftmost(LeftLine,L,L_prime,L_prime_prime,L_prime_prime_prime),
    x1(TopLine,TopLine_x1),
    x2(TopLine,TopLine_x2),
    y1(LeftLine,LeftLine_y1),
    y2(LeftLine,LeftLine_y2),
    abs(Width,TopLine_x2 - TopLine_x1),
    abs(Height,LeftLine_y1 - LeftLine),
    min(X,TopLine_x1,TopLine_x2),
    min(Y,TopLine_y1,TopLine_y2),

    % emit
    % write outputs
    gensym(R),
    json_write(user_output,rect(R,dont_care)),
    json_write(user_output,x(R,X)),
    json_write(user_output,y(R,Y)),
    json_write(user_output,width(R,Width)),
    json_write(user_output,height(R,Height)).

% main
main :-
    rectangle(_).

% external functions
joined(L1,L2) :-
    joinedEndToBegin(L1,L2).
joined(L1,L2) :-
    joinedEndToEnd(L1,L2).
joined(L1,L2) :-
    joinedBeginToBegin(L1,L2).

topmost(L1,L2,L3,L4,L) :-
    topmost(L1,L2,L'),
    topmost(L',L3,L''),
    topmost(L'',L4,L).

leftmost(L1,L2,L3,L4,L) :-   
    leftmost(L1,L2,L'),
    leftmost(L',L3,L''),
    leftmost(L'',L4,L).

joinedEndToBegin(L,L2) :-
joinedEndToEnd(L,L2) :-
joinedBeginToBegin(L,L2) :-
normalize(L
    x1(L,X1),
    y1(L,Y1),
    x1(L,X2),
    y1(L,Y2),
    x1(L_prime,X1_prime),
    y1(L_prime,Y1_prime),
    x1(L_prime,X2_prime),
    y1(L_prime,Y2_prime),
    (joinedEndToBegin,L,L_Prime),

topmost(L,L2) :-
   is_horizontal(L),
   is_horizontal(L2),
   L.x1 >= L2.x1.
