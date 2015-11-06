# Housemates
housemates = ['A', 'B', 'C']

# Rooms
rooms = [1, 2, 3]

EPS = 0.01

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

def findPoint(pt1, pt2, t=0.5): # t = 0, return pt1, t = 1, return pt2
    p1, p2 = [(pt1[i] + pt2[i])*t for i in range(len(pt1)-1)]
    p3 = total_rent - p1 -p2
    return Point(p1, p2, p3)

# corners = [(1000, 0, 0), (0, 1000, 0), (0, 0, 1000)]

import math
class Point():
    def __init__(self, *coords):
        coords = [0 if i < EPS else i for i in coords]
        if abs(sum(coords) - total_rent) > 1:
            raise Exception(
                    'Total coordinates does not add up to total rent! {} != {}'
                    .format(coords, total_rent))
        self.coords = coords

    def distance(self, other):
        return math.sqrt(sum([(self.coords[i] - other.coords[i]) ** 2
            for i in range(len(self.coords))]))

    def __len__(self):
        return len(self.coords)

    def __getitem__(self, key):
        return self.coords[key]

    def __str__(self):
        return str(self.coords)

    def __repr__(self):
        return str(self)

class Triangle():
    def __init__(self, pt1, pt2, pt3):
        self.corners = [pt1, pt2, pt3]
        self.all_points = self.getPointsFromCorners(self.corners)

    def getPointsFromCorners(self, corners):
        midpts = []
        for i in range(len(corners)):
            midpts.append(findPoint(corners[i], corners[(i+1)%len(corners)]))
        barycentre_pt = findPoint(corners[0], midpts[1], 2/3)
        all_points = midpts + corners + [barycentre_pt]
        return all_points

initialTriangle = Triangle(Point(total_rent, 0, 0), Point(0, total_rent, 0), Point(0, 0, total_rent))

