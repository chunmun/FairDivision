import math, random

EPS = 0.01
ROUNDING = 3

# ============================= Strategies =============================

def cheapskateStrategy(point):
    min_cost = min(point.coords)
    min_index = point.coords.index(min_cost)
    return rooms[min_index]

def makeRoomNStrategy(n):
    if n not in rooms:
        raise Exception('No such room {} in all rooms {}'
                .format(n, rooms))
    def wantRoomNStrategy(point):
        if 0 in point.coords:
            return cheapskateStrategy(point)
        else:
            return n
    return wantRoomNStrategy

def randomStrategy(point):
    return random.randint(0, len(rooms))

# ============================= Initialization =============================

# Housemates
housemates = ['A', 'B', 'C']

# Rooms
rooms = [1, 2, 3]

# This is a dumb strategy where the player always chooses the
# cheapest room. If tie, choose the smaller numbered room

strategies = { 'A' : randomStrategy,
               'B' : randomStrategy,
               'C' : randomStrategy }

strategies = { 'A' : makeRoomNStrategy(3),
               'B' : cheapskateStrategy,
               'C' : cheapskateStrategy }

strategies = { 'A' : cheapskateStrategy,
               'B' : cheapskateStrategy,
               'C' : cheapskateStrategy }

total_rent = 1000
mesh_division = 100
size = total_rent / mesh_division

# ============================= Initialization =============================

class Point():
    def __init__(self, *coords):
        if len(coords) != len(rooms):
            raise Exception('Wtf man, why mismatched dimensions? {} != {}'
                    .format(coords, rooms))
        if sum(coords) != mesh_division:
            raise Exception(
                    'Total coordinates does not add up to total rent! {} != {}'
                    .format(coords, mesh_division))
        if min(coords) < 0:
            raise Exception('Eh got negative values in the coordinates leh {}'
                    .format(coords))
        coords = tuple([0 if i < EPS else round(i,ROUNDING) for i in coords])
        self.coords = coords
        self.label = housemates[(coords[0] + coords[2]) % len(housemates)]

        self.decisions = {}
        for h in housemates:
            self.decisions[h] = self.query(h)

    def distance(self, other):
        return math.sqrt(sum([(self.coords[i] - other.coords[i]) ** 2
            for i in range(len(self.coords))]))

    def findPoint(self, pt2, t=0.5): # t = 0, return pt1, t = 1, return pt2
        return Point(*[(1-t)* self[i] + t * pt2[i] for i in range(len(self))])

    # Returns the chosen room for a particular housemate
    def query(self, housemate):
        return strategies[housemate](self)

    def __eq__(self, other):
        return all([abs(self[i] - other[i]) < EPS for i in range(len(self))])

    def __len__(self):
        return len(self.coords)

    def __getitem__(self, key):
        return self.coords[key]

    def __str__(self):
        return str(self.coords)

    def __repr__(self):
        return str(self)

directions = { 'nw' : lambda pt: (pt[0]-1, pt[1]+1, pt[2]),
               'n'  : lambda pt: (pt[0], pt[1]+1, pt[2]-1),
               'e'  : lambda pt: (pt[0]+1, pt[1], pt[2]-1) }

def isGoodCoordinate(coord):
    return min(coord) >= 0

triangles = []

for room1 in range(mesh_division+1):
    for room2 in range(mesh_division+1):
        room3 = mesh_division - room1 - room2
        if room3 < 0:
            continue

        p = Point(room1, room2, room3)

        nw = directions['nw'](p)
        n = directions['n'](p)
        e = directions['e'](p)

        if isGoodCoordinate(n):
            n = Point(*n)
            if isGoodCoordinate(nw):
                nw = Point(*nw)
                triangles.append((p, nw, n))
            if isGoodCoordinate(e):
                e = Point(*e)
                triangles.append((p, n, e))

for t in triangles:
    choices = [p.decisions[p.label] for p in t]
    if len(set(choices)) == len(rooms):
        print([[c * size for c in p.coords] for p in t])
        
