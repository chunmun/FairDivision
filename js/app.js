'use strict';

var fairDivisionApp = angular.module('fairDivisionApp', []);

fairDivisionApp.controller('AppController', ['$scope', function($scope) {
  $scope.currentTab = 0;
  $scope.tabs = [
    {
      'name': 'Fine Mesh',
      'template_url': 'partials/fine-mesh.html'
    },
    {
      'name': 'Fine Mesh Interactive',
      'template_url': 'partials/fine-mesh-interactive.html'
    }
  ];

  $scope.selectTab = function(tab) {
    $scope.currentTab = tab;
  };

  $scope.isTabSelected = function(tab) {
    return tab === $scope.currentTab;
  }
}]);




//  A graph stores a grid of nodes in the following unit coordinates
//
//    *         (0, 0)
//    |\
//    | \
//    *--*      (1, 0), (1, 1)
//    |\ |\
//    | \| \
//    *--*--*   (2, 0), (2, 1), (2, 2)
//
//  A graph needs the following properties:
//  - meshLevel     the refinement level of triangulation. Values range from 2 to 10.
//                  (meshLevel + 1) is the size of the grid.
//  - edgeLength    represents the total cost of the problem  e.g. 3000 for 3000$ room sharing
//  - drawingSize   the size that the graph should be scaled and displayed on e.g. [640, 480]
//
//  Based on this graph, from a node, one can travel up to 6 directions:
//  - w   west
//  - nw  north-west
//  - n   north
//  - e   east
//  - se  south-east
//  - s   south


var MIN_MESH_LEVEL = 2;
var MAX_MESH_LEVEL = 16;
var NUM_OF_PEOPLE = 3;
var PEOPLE = ['A', 'B', 'C'];
var DIRECTIONS = {
  // (horizontal diff, vertical diff)
  'w': [-1, 0],
  'nw': [-1, -1],
  'n': [0, -1],
  'e': [1, 0],
  'se': [1, 1],
  's': [0, 1]
};

// Constants for displaying. Unit is pixel.
var EDGE_SIZE = 600;
var TEXT_OFFSET_X = 8;
var TEXT_OFFSET_Y = -3;
var ROOM_COLOR = {
  0: 'rgb(210, 121, 103)',  // #D27967
  1: 'rgb(253, 177, 66)',  // #FDB142
  2: 'rgb(119, 151, 175)'  // #7797AF
};


function Graph(meshLevel, edgeLength, personStrategies) {
  this.meshLevel = meshLevel;
  this.edgeLength = edgeLength;

  // Initialize grid;
  this.grid = [];

  var meshSize = EDGE_SIZE / meshLevel;
  var verticalMeshSize = meshSize / 2 * Math.sqrt(3);
  var displayingCoord = [EDGE_SIZE / 2, 0];
  for (var i = 0; i <= meshLevel; ++i) {
    var row = [];

    for (var j = 0; j <= i; ++j) {
      var personLabel = (i + j) % NUM_OF_PEOPLE;
      var prices = calculatePrices(i, j, meshLevel, edgeLength);
      var node = new Node(
        this,
        [i, j],
        displayingCoord.slice(),
        personLabel,
        prices,
        personStrategies ? personStrategies[personLabel] : null
      );
      row.push(node);
      displayingCoord[0] += meshSize;
    }

    displayingCoord[0] = (EDGE_SIZE - (i + 1) * meshSize) / 2;
    displayingCoord[1] += verticalMeshSize;

    this.grid.push(row);
  }

  function calculatePrices(i, j, meshLevel, edgeLength) {
    var priceRoom3 = (meshLevel - i) / meshLevel * edgeLength;
    var priceRoom2 = j / meshLevel * edgeLength;
    var priceRoom1 = edgeLength - priceRoom2 - priceRoom3;

    // Some rounding magic to make sure the total does not exceed the total rent and
    // approximately close prices are rounded to the same integer.
    priceRoom1 = Math.round(priceRoom1);
    priceRoom2 = Math.round(priceRoom2);
    priceRoom3 = Math.round(priceRoom3);

    if (priceRoom1 == priceRoom2) {
      priceRoom3 = edgeLength - priceRoom1 - priceRoom2;
    } else if (priceRoom2 == priceRoom3) {
      priceRoom1 = edgeLength - priceRoom2 - priceRoom3;
    } else if (priceRoom1 == priceRoom3) {
      priceRoom2 = edgeLength - priceRoom1 - priceRoom3;
    }

    return [priceRoom1, priceRoom2, priceRoom3];
  }
}

Graph.prototype = {

  nodes: function() {
    return [].concat.apply([], this.grid);
  },
  //
  //    *           (0, 0)
  //    |\
  //    | \
  //    |1 \
  //    *---*       (1, 0), (1, 1)
  //    |\ 2|\
  //    | \ | \
  //    |  \|  \
  //    *---*---*   (2, 0), (2, 1), (2, 2)
  //
  //  To cover all the triangles, each 'inner' node (not on the right longer edge) could cover 2 triangles:
  //  right one and right-bottom one. For example, node (1, 0) covers triangle 1 and 2.

  subTriangles: function() {
    var triangles = [];
    var triangle;

    for (var i = 1; i <= this.meshLevel; ++i) {
      for (var j = 0; j < i; ++j) {
        triangle = new Triangle(
          this.grid[i + DIRECTIONS['n'][1]][j + DIRECTIONS['n'][0]],
          this.grid[i][j],
          this.grid[i + DIRECTIONS['e'][1]][j + DIRECTIONS['e'][0]]
        );
        triangles.push(triangle);

        if (i != this.meshLevel) {
          triangle = new Triangle(
            this.grid[i][j],
            this.grid[i + DIRECTIONS['se'][1]][j + DIRECTIONS['se'][0]],
            this.grid[i + DIRECTIONS['e'][1]][j + DIRECTIONS['e'][0]]
          );
          triangles.push(triangle);
        }
      }
    }

    return triangles;
  },

  gridToString: function() {
    return this.grid.map(function(row) {
      var rowString = row.map(function(node) {
        return node.toString();
      }).join(', ');

      return '[ ' + rowString + ' ]';
    }).join(';  ');
  }
};


//  A node is a vertex of the grid representing the graph
function Node(graph, gridCoord, displayingCoord, personLabel, prices, strategy) {
  this.graph = graph;
  this.gridCoord = gridCoord;   // Using vertical-horizontal order
  this.displayingCoord = displayingCoord;  // Using horizontal-vertical order
  this.personLabel = personLabel;
  this.prices = prices;
  this.choice = strategy ? strategy(prices) : STRATEGIES.cheapskateStrategy(prices);
}

Node.prototype = {
  toString: function() {
    return PEOPLE[this.personLabel] + ': (' + this.gridCoord.toString() + ')';
  }
};


// A triangle consists of 3 nodes
function Triangle(node1, node2, node3) {
  this.nodes = [node1, node2, node3];

  // roomCount[i] = number of people refer room i
  this.roomCount = [0, 0, 0];
  for (var i = 0; i < NUM_OF_PEOPLE; ++i) {
    this.roomCount[this.nodes[i].choice] += 1;
  }
}

Triangle.prototype = {
  toString: function() {
    return '[ ' +
      this.nodes.map(function(n) {
        return n.toString();
      }).join(', ')
      +  ' ]';
  }
};


var STRATEGIES = (function() {
  var strategies = {};

  // Always choose the cheapest room. Use the following rules when there is a ties
  //
  // Two rooms cost 0
  // - 0 and 1: choose 0
  // - 1 and 2: choose 1
  // - 0 and 2: choose 2
  //
  // Two rooms have the same cheapest price
  // - 0 and 1: choose 1
  // - 1 and 2: choose 2
  // - 0 and 2: choose 0
  //
  // Three rooms have the same price. Choose room 1 (or any room).
  strategies.cheapskateStrategy = function(prices) {
    if (prices[0] == 0 && prices[1] == 0) {
      return 0;
    }

    if (prices[1] == 0 && prices[2] == 0) {
      return 1;
    }

    if (prices[0] == 0 && prices[2] == 0) {
      return 2;
    }

    if (prices[0] == prices[1] && prices[1] == prices[2]) {
      // This can be any room
      return 1;
    }

    if (prices[0] == prices[1] && prices[1] < prices [2]) {
      return 1;
    }

    if (prices[1] == prices[2] && prices[2] < prices [0]) {
      return 2;
    }

    if (prices[0] == prices[2] && prices[0] < prices [1]) {
      return 0;
    }

    return prices.indexOf(prices.slice().sort(function(a, b) { return a - b; })[0])
  };

  // Always choose room 1 as long as the prices of other rooms are none 0.
  strategies.room1Strategy = function(prices) {
    if (prices[1] == 0) {
      return 1;
    }

    if (prices[2] == 0) {
      return 2;
    }

    return 0;
  };

  // Always choose room 2 as long as the prices of other rooms are none 0.
  strategies.room2Strategy = function(prices) {
    if (prices[0] == 0) {
      return 0;
    }

    if (prices[2] == 0) {
      return 2;
    }

    return 1;
  };

  // Always choose room 1 as long as the prices of other rooms are none 0.
  strategies.room3Strategy = function(prices) {
    if (prices[0] == 0) {
      return 0;
    }

    if (prices[1] == 0) {
      return 1;
    }

    return 2;
  };

  // Randomly choose a room
  strategies.randomStrategy = function(prices) {
    return Math.floor(Math.random() * 3);
  };

  return strategies;
})();
