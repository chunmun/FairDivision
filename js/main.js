'use strict';

var fairDivisionApp = angular.module('fairDivisionApp', []);

fairDivisionApp.controller('FineMeshController', ['$scope', function($scope) {
  $scope.PLAYERS = ['A', 'B', 'C'];
  $scope.currentPlayer = 1;

  $scope.meshLevel = 2;
  $scope.graph = null;
  $scope.canvas = d3.select('#canvas');
  initGraph($scope);

  $scope.changeMeshLevel = function(change) {
    $scope.meshLevel += change;
    $scope.meshLevel = Math.min(Math.max($scope.meshLevel, MIN_MESH_LEVEL), MAX_MESH_LEVEL);

    initGraph($scope);
  };

  function initGraph($scope) {
    $scope.graph = new Graph($scope.meshLevel, 3000);

    var triangles = $scope.graph.subTriangles();
    var nodes = $scope.graph.nodes();

    $scope.canvas.select('svg').remove();
    var svg = $scope.canvas.append('svg')
      .attr('width', 700)
      .attr('height', 600);
    var svgContainer = svg.append('g')
      .attr('transform', 'translate(20, 20)');

    // define background pattern for triangle
    addPatternDef(svg, [0, 1]);
    addPatternDef(svg, [1, 2]);
    addPatternDef(svg, [0, 2]);

    svgContainer
      .selectAll('path')
      .data(triangles)
      .enter()
      .append('path')
      .attr('d', function(d) {
        var displayingCoords = d.map(function(n) { return n.displayingCoord; });
        return 'M' + displayingCoords.join('L') + 'Z';
      })
      .style('opacity', 0.7)
      .style('fill', function(d) {
        var count = [0, 0, 0];
        for (var i = 0; i < NUM_OF_PEOPLE; ++i) {
          count[d[i].choice] += 1;
        }

        // All satisfy!
        if (count[0] == 0 && count[1] == 0 && count[2] == 0) {
          return 'white';
        }

        // All choose the same room
        if (count.indexOf(3) != -1) {
          return ROOM_COLOR[count.indexOf(3)];
        }

        // There is a mix
        var room1 = count.indexOf(2);
        var room2 = count.indexOf(1);
        if (room1 > room2) {
          var temp = room1;
          room1 = room2;
          room2 = temp;
        }

        return 'url(#diagonalHatch' + room1 + '-' + room2 + ')';
      })
      .style('stroke-width', 1)
      .style('stroke-opacity', 0.3)
      .style('stroke', 'black');

    svgContainer
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('cx', function(d) { return d.displayingCoord[0]; })
      .attr('cy', function(d) { return d.displayingCoord[1]; })
      .attr('r', 5)
      .style('stroke', 'rgb(102, 102, 102)')
      .style('stroke-width', 1)
      .style('fill', function(d) { return ROOM_COLOR[d.choice]; });

    svgContainer
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(function(d) { return PEOPLE[d.personLabel] })
      .attr('x', function(d) { return d.displayingCoord[0] + TEXT_OFFSET_X; })
      .attr('y', function(d) { return d.displayingCoord[1] + TEXT_OFFSET_Y; })
      .classed('vertex-label', true);

  }

  function addPatternDef(svg, rooms) {
    var pattern = svg.append('defs')
      .append('pattern')
      .attr('id', 'diagonalHatch' + rooms.join('-'))
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 5)
      .attr('height', 10);

    pattern.append('path')
      .attr('d', 'M-2,2 l3,-3 M-4,9 l10,-10 M0,10 l13,-13')
      .attr('stroke-width', 2)
      .attr('stroke', ROOM_COLOR[rooms[0]]);
    pattern.append('path')
        .attr('d', 'M-2,4 l5,-5 M-5,12 l21,-20 M0,13 l14,-14')
        .attr('stroke-width', 2)
        .attr('stroke', ROOM_COLOR[rooms[1]]);
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


function Graph(meshLevel, edgeLength) {
  this.meshLevel = meshLevel;
  this.edgeLength = edgeLength;

  // Initialize grid;
  this.grid = [];

  var meshSize = EDGE_SIZE / meshLevel;
  var verticalMeshSize = meshSize / 2 * Math.sqrt(3);
  var displayingCoord = [EDGE_SIZE / 2, 0];
  for (var i = 0; i <= this.meshLevel; ++i) {
    var row = [];

    for (var j = 0; j <= i; ++j) {
      var personLabel = (i + j) % NUM_OF_PEOPLE;
      var priceRoom3 = (meshLevel - i) / meshLevel * edgeLength;
      var priceRoom2 = j / meshLevel * edgeLength;
      var priceRoom1 = edgeLength - priceRoom2 - priceRoom3;
      var prices = [priceRoom1, priceRoom2, priceRoom3];
      row.push(new Node(this, [i, j], displayingCoord.slice(), personLabel, prices));
      displayingCoord[0] += meshSize;
    }

    displayingCoord[0] = (EDGE_SIZE - (i + 1) * meshSize) / 2;
    displayingCoord[1] += verticalMeshSize;

    this.grid.push(row);
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
        triangle = [];
        triangle.push(this.grid[i + DIRECTIONS['n'][1]][j + DIRECTIONS['n'][0]]);
        triangle.push(this.grid[i][j]);
        triangle.push(this.grid[i + DIRECTIONS['e'][1]][j + DIRECTIONS['e'][0]]);
        triangles.push(triangle);

        if (i != this.meshLevel) {
          triangle = [];
          triangle.push(this.grid[i][j]);
          triangle.push(this.grid[i + DIRECTIONS['se'][1]][j + DIRECTIONS['se'][0]]);
          triangle.push(this.grid[i + DIRECTIONS['e'][1]][j + DIRECTIONS['e'][0]]);
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
function Node(graph, gridCoord, displayingCoord, personLabel, prices) {
  this.graph = graph;
  this.gridCoord = gridCoord;   // Using vertical-horizontal order
  this.displayingCoord = displayingCoord;  // Using horizontal-vertical order
  this.personLabel = personLabel;
  this.prices = prices;
  this.choice = cheapskateStrategy(prices);
}

Node.prototype = {
  toString: function() {
    return PEOPLE[this.personLabel] + ': (' + this.gridCoord.toString() + ')';
  }
};



function trianglesToString(triangles) {
  return triangles.map(function(t) {
    return '[ ' +
      t.map(function(n) {
        return n.toString();
      }).join(', ')
      +  ' ]';
  }).join('; ');
}

function cheapskateStrategy(prices) {
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
}
