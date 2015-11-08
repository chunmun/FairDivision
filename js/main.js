'use strict';

var fairDivisionApp = angular.module('fairDivisionApp', []);

fairDivisionApp.controller('FineMeshController', ['$scope', function($scope) {
  $scope.PEOPLE = PEOPLE;
  $scope.meshLevel = 4;
  $scope.canvas = d3.select('#canvas');
  initGraph($scope);
  $scope.currentNode = $scope.graph.grid[0][0];

  $scope.$watch(function(scope) {
    return scope.meshLevel;
  }, function(newValue, oldValue) {
    if (!newValue || newValue < 2) {
      console.log(newValue);
      return;
    }

    $scope.meshLevel = Math.min(Math.max(newValue, MIN_MESH_LEVEL), MAX_MESH_LEVEL);
    initGraph($scope);
  });

  $scope.changeMeshLevel = function(change) {
    $scope.meshLevel += change;
    $scope.meshLevel = Math.min(Math.max($scope.meshLevel, MIN_MESH_LEVEL), MAX_MESH_LEVEL);
  };

  function initGraph($scope) {
    $scope.graph = new Graph($scope.meshLevel, 3000);

    $scope.canvas.select('svg').remove();
    var svg = $scope.canvas.append('svg')
      .attr('width', 700)
      .attr('height', 600);
    svg.append('g')
      .attr('transform', 'translate(20, 20)');
    $scope.svg = svg;

    // define background pattern for triangle
    addPatternDef(svg, [0, 1]);
    addPatternDef(svg, [1, 2]);
    addPatternDef(svg, [0, 2]);

    updateGraph($scope);
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

  function updateGraph($scope) {
    var triangles = $scope.graph.subTriangles();
    var nodes = $scope.graph.nodes();
    var svgContainer = $scope.svg.select('g');

    // Triangles
    var trianglesSvg = svgContainer
      .selectAll('path')
      .data(triangles);
    trianglesSvg
      .enter()
      .append('path');

    trianglesSvg.attr('d', function(d) {
        var displayingCoords = d.nodes.map(function(n) { return n.displayingCoord; });
        return 'M' + displayingCoords.join('L') + 'Z';
      })
      .style('opacity', 0.7)
      .style('fill', function(d) {
        // All satisfy!
        if (d.roomCount[0] == 1 && d.roomCount[1] == 1 && d.roomCount[2] == 1) {
          return 'white';
        }

        // All choose the same room
        if (d.roomCount.indexOf(3) != -1) {
          return ROOM_COLOR[d.roomCount.indexOf(3)];
        }

        // There is a mix
        var room1 = d.roomCount.indexOf(2);
        var room2 = d.roomCount.indexOf(1);
        if (room1 > room2) {
          var temp = room1;
          room1 = room2;
          room2 = temp;
        }

        return 'url(#diagonalHatch' + room1 + '-' + room2 + ')';
      })
      .style('stroke-width', function(d) {
        // All choose differently!
        if (d.roomCount[0] == 1 && d.roomCount[1] == 1 && d.roomCount[2] == 1) {
          return 2;
        }

        return 1;
      })
      .style('stroke-opacity', function(d) {
        // All choose the same room
        if (d.roomCount.indexOf(3) != -1) {
          return 0.3;
        }

        // Room with 2 trap doors
        if (d.roomCount.indexOf(2) != -1) {
          return 0.7;
        }

        return 1;
      })
      .style('stroke', 'black')
      .classed('sub-triangle', true);

    // Current vertex
    svgContainer
      .selectAll('circle.current-vertex')
      .data([1])
      .enter()
      .append('circle')
      .attr('cx', EDGE_SIZE / 2)
      .attr('cy', 0)
      .attr('r', 5)
      .style('fill', 'transparent')
      .style('stroke', 'rgb(153, 153, 153)')
      .style('stroke-width', 6)
      .classed('current-vertex', true);

    // All vertices
    var verticesSvg = svgContainer
      .selectAll('circle.vertex-circle')
      .data(nodes);
    verticesSvg
      .enter()
      .append('circle');

    verticesSvg
      .attr('cx', function(d) { return d.displayingCoord[0]; })
      .attr('cy', function(d) { return d.displayingCoord[1]; })
      .attr('r', 5)
      .style('stroke-width', 1)
      .style('stroke', 'rgb(102, 102, 102)')
      .style('fill', function(d) { return ROOM_COLOR[d.choice]; })
      .classed('vertex-circle', true)
      .on('click', handleVertexClick)
      .on('mouseover', handleVertexMouseOver);

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

  function handleVertexClick(d, i) {
    var currentVertexGridCoord = d.gridCoord;
    d.choice = (d.choice + 1) % NUM_OF_PEOPLE;
    $scope.graph.grid[currentVertexGridCoord[0]][currentVertexGridCoord[1]] = d;

    updateGraph($scope);
    return false;
  }

  function handleVertexMouseOver(d, i) {
    updateCurrentVertex(d);
    $scope.currentNode = d;
    $scope.$apply();
  }

  function updateCurrentVertex(d) {
    d3.select('circle.current-vertex')
      .attr('cx', d.displayingCoord[0])
      .attr('cy', d.displayingCoord[1])
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
  for (var i = 0; i <= meshLevel; ++i) {
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
