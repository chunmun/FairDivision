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

strategies = { 'A' : cheapskateStrategy,
               'B' : cheapskateStrategy,
               'C' : cheapskateStrategy }

strategies = { 'A' : makeRoomNStrategy(3),
               'B' : cheapskateStrategy,
               'C' : cheapskateStrategy }

total_rent = 1000

# ============================= Initialization =============================

class Point():
    def __init__(self, *coords):
        if len(coords) != len(rooms):
            raise Exception('Wtf man, why mismatched dimensions? {} != {}'
                    .format(coords, rooms))
        if abs(sum(coords) - total_rent) > 1:
            raise Exception(
                    'Total coordinates does not add up to total rent! {} != {}'
                    .format(coords, total_rent))
        if min(coords) < 0:
            raise Exception('Eh got negative values in the coordinates leh {}'
                    .format(coords))
        coords = tuple([0 if i < EPS else round(i,ROUNDING) for i in coords])
        self.coords = coords

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

class Triangle():
    def __init__(self, pt1, pt2, pt3, initInner=False, name=""):
        self.corners = [pt1, pt2, pt3]
        self.all_points = []
        self.mid_points = []
        self.inner_triangles = []
        self.corner_label = 'AAA'
        self.good = False
        self.name = name

        self.initPointsFromCorners()
        self.labels = ['ABC', 'BAC', 'CAB', 'CBA', 'BCA', 'ACB']

        if initInner:
            self.initInnerTriangles()

    """
    Arrangement of points
          c0
         /  \
        /    \
       m0  b  m2
      /        \
     /          \
    c1 -- m1 -- c2
    
    """
    def initPointsFromCorners(self):
        c = self.corners
        self.mid_points = []
        for i in range(len(c)):
            self.mid_points.append(c[i].findPoint(c[(i+1)%len(c)]))
        self.barycentre_pt = c[0].findPoint(self.mid_points[1], 2/3)
        self.all_points = self.mid_points + c + [self.barycentre_pt]

    """
    Arrangement of inner triangles

                  c0
                  /\
                 /| \
                / |  \
               /  |   \
              /   |    \
             /    |     \
           m0   0 |  5  m2
           /  .   |   .    \
          /       b         \
         /  1  .  |  .  4    \
        /   .  2  |  3  .     \
       / .        |         .  \
      c1----------m1-----------c2

    Labelling of who to ask with Corner label AAA
                   A
                  /\
                 /| \
                / |  \
               /  |   \
              /   |    \
             /    |     \
            B   0 |  5   B
           /  .   |   .    \
          /       C         \
         /  1  .  |  .  4    \
        /   .  2  |  3  .     \
       / .        |         .  \
      A ----------B ----------- A


      After pulling

      m0----------c0-----------m2
       \ .        |         .  /
        \   .  0  |  5  .     /
         \  1  .  |  .  4    /
          \       b         /
           \  .   |   .    /
           c1   2 |  3  c2
             \    |     /
              \   |    /
               \  |   /
                \ |  /
                 \| /
                  \/
                  m1
    """
    def initChoicesFromCornerLabel(self):
        self.choices = ""
        for i in range(len(self.corner_label)):
            l = self.corner_label[i]
            self.choices += str(self.corners[i].decisions[l])
        self.good = all([str(room) in self.choices for room in rooms])

    def initInnerTriangles(self):
        c = self.corners
        m = self.mid_points
        b = self.barycentre_pt
        t0 = Triangle(c[0], m[0], b, False, self.name + '0')
        t1 = Triangle(m[0], c[1], b, False, self.name + '1')
        t2 = Triangle(b, c[1], m[1], False, self.name + '2')
        t3 = Triangle(b, m[1], c[2], False, self.name + '3')
        t4 = Triangle(m[2], b, c[2], False, self.name + '4')
        t5 = Triangle(c[0], b, m[2], False, self.name + '5')

        self.inner_triangles = [t0, t1, t2, t3, t4, t5]

        # Set the inner labels and goodness
        for i in range(len(self.inner_triangles)):
            t = self.inner_triangles[i]
            l = self.labels[i]
            t.corner_label = l
            t.initChoicesFromCornerLabel()
            if t.good:
                t.generateLabelsFromCornerLabel()


    """
    Labelling of who to ask from Corner Labels l0 l1 l2
                  l0 
                  /\
                 /| \
                / |  \
               /  |   \
              /   |    \
             /    |     \
           l3   0 |  5   l4
           /  .   |   .    \
          /      l5         \
         /  1  .  |  .  4    \
        /   .  2  |  3  .     \
       / .        |         .  \
     l1 ---------l6 ----------- l2
    """
    def generateLabelsFromCornerLabel(self):
        if any([x not in self.corner_label for x in housemates]):
            raise Exception('Cannot generate labels if non-distinct corner labels {}'
                    .format(self.corner_label))

        l0 = self.corner_label[0]
        l1 = self.corner_label[1]
        l2 = self.corner_label[2]
        l3 = l2
        l4 = l1
        l6 = l0
        # l5 is a function that gives that last label give 2 labels
        l5 = lambda x, y: [z for z in housemates if z not in [x, y]][0]

        self.labels = [l0+l3+l5(l0, l3),
                       l3+l1+l5(l3, l1),
                       l5(l1, l6)+l1+l6,
                       l5(l6, l2)+l6+l2,
                       l4+l5(l4, l2)+l2,
                       l0+l5(l0, l4)+l4]


    def getGoodInnerTriangleIndex(self):
        t = self.inner_triangles
        idx = [i for i in range(len(t)) if t[i].good][0]
        return idx, t[idx]

    def getGoodInnerTriangle(self):
        return [i for i in self.inner_triangles if i.good][0]

    def __str__(self):
        return ", ".join(list(map(str, self.corners)))
        #return "Triangle\n========\n" + "\n".join(list(map(str, self.corners))) + "\n======="

    def __repr__(self):
        return str(self)


initial_triangle = Triangle(Point(0, 0, total_rent), Point(0, total_rent, 0), Point(total_rent, 0, 0), True)
i = 1
last_bary = initial_triangle.barycentre_pt

print("Good Triangle at index {} with corners {}".format(*initial_triangle.getGoodInnerTriangleIndex()))

def debug():
    for i,t in enumerate(initial_triangle.inner_triangles):
        print('inner triangle', i, t.corners, t.corner_label, t.choices)

while True:
    try:
        initial_triangle = initial_triangle.getGoodInnerTriangle()
        initial_triangle.initInnerTriangles()
        new_bary = initial_triangle.barycentre_pt

        debug()
        print("Try {} into {} with choice {} => {}"
                .format(i, initial_triangle.barycentre_pt,
                    initial_triangle.corner_label, initial_triangle.choices))

        print(initial_triangle)
        print("Good Triangle", initial_triangle.getGoodInnerTriangleIndex())
        i+=1
        if new_bary == last_bary:
            break
        last_bary = new_bary
    except Exception as e:
        print(e.message)
        break

