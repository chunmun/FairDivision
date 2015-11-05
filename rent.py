# Housemates
housemates = ['A', 'B', 'C']

# Rooms
rooms = [1, 2, 3]

# This is a dumb strategy where the player always chooses the
# cheapest room. If tie, choose the smaller numbered room

# room_costs = {'1': 500, '2': 500, '3': 0}
def strategy(room_costs):
    min_cost = min(room_costs.values())
    return sorted([x for x in room_costs.keys() \
            if room_costs[x] == min_cost])[0]

def isGoodCoordinate(coord):
    return min(coord) >= 0

total_rent = 1000

# Mesh size
# This is the number of divisions on each side of the triangle
mesh_divisions = 2
size = total_rent / mesh_divisions

all_points = {} # (r1, r2, r3) : {'A': 1, 'B': 2, 'C': 1}
possible_points = []
triangles = []

directions = { 'nw' : lambda r1, r2, r3: (r1-1, r2+1, r3),
               'n'  : lambda r1, r2, r3: (r1, r2+1, r3-1),
               'e'  : lambda r1, r2, r3: (r1+1, r2, r3-1) }

# Create the points and find out the preferences of all of them
for room1 in range(0, mesh_divisions+1):
    for room2 in range(0, mesh_divisions+1):
        room3 = mesh_divisions - room1 - room2
        if room3 < 0:
            continue
        possible_points.append((room1, room2, room3))
        room_costs = { 1: room1 * size, 2: room2 * size, 3: room3 * size }
        sol = dict([(h, strategy(room_costs)) for h in housemates])
        all_points[(room1, room2, room3)] = sol


# Construct the triangles list
for pt in possible_points:
    nw = directions['nw'](*pt)
    n = directions['n'](*pt)
    e = directions['e'](*pt)

    if isGoodCoordinate(n):
        if isGoodCoordinate(nw):
            triangles.append((pt, nw, n))
        if isGoodCoordinate(e):
            triangles.append((pt, n, e))

def hasGoodAssignment(triangle):
    prefs = [all_points[p] for p in triangle]
    print(prefs)
    return False


for triangle in triangles:
    if hasGoodAssignment(triangle):
        print(triangle, 'is GOOD')
