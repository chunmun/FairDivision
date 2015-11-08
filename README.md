Background
===
Fair division is the problem of dividing resource in a way such that each person gets a share that they deem is fair. There are many variants of the problem where the goods may be continuously divisible or discrete and the items to be divided are desirable or not.
The problem that we will be looking at is posed as such. There is a house where consists of n rooms, and there are n roommates. The total rent is a fixed cost where every single roommate has to pay a portion of to make up the sum. However,all rooms are different and each person may want a particular room more because some want a balcony while others want to have windows facing the west. 
The problem is to allocate each person to a different room and determine how much each person needs to pay so that they would not prefer the rent/room allocated to another person.

Multilateral Evaluation
---
A common feature of solutions to fair division is that fairness is evaluated according to each person’s own preferences and they do not need to know about the preferences of other people. This is different from the usual standards of fairness where there exists an objective measure that is shared by every person. In this case, the measure is subjective where each person’s preference may be completely different.

Envy-free
---
Secondly the solutions are also envy-free. Intuitively, this means that for each person who is allocated their share, they will not swap their share for another person’s share. Therefore, they each received a share they think has no strictly better alternative.

// Prove how at least one solution must exist (Sperner)

// What requirements are needed to find a solution

Rental Harmony Theorem. Suppose n housemates in an n-bedroom house seek to decide who gets which room and for what part of the total rent. Also, suppose that the following conditions hold:
(Good House) In any partition of the rent, each person finds some room acceptable.
(Miserly Tenants) Each person always prefers a free room (one that costs no rent) to a non-free room.
(Closed Preference Sets) A person who prefers a room for a convergent sequence of prices prefers that room at the limiting price.
Then there exists a partition of the rent so that each person prefers a different room.
In this project, our investigation and implementation will focus on the 3-person problem

Algorithm
===
Approach 1: Fine Mesh
---
We divide the large triangle into uniformly-sized smaller triangles. At each vertex, we perform a query for each person. After which we will try and find a solution by looking for a triangle that satisfy the Sperner labelling.
Clearly we have to ask a very large number of queries but this can be reduced by following the trap-door argument presented in the Rental Harmony paper. Hence we only need to query the points along the path of trap-doors.

Approach 2: Divide and Conquer
---
We triangulate the search space using barycentric subdivision and labelling i.e. we have 6 elementary triangles. This is similar to applying the “zooming in” solution in the cake-cutting variant of the problem to rental harmony where the original labelling is not Sperner. The fix involves transforming the triangles as described in the Rental Harmony paper by letting the opposite (n-1) simplex be the decision made at the corner.
At each vertex, we ask the person that is assigned to that vertex. This would satisfy Sperner’s labelling and consequently, there exist an elementary triangle that we can carry on the process in this triangle to produce a finer answer.
