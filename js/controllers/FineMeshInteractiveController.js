'use strict';

fairDivisionApp.controller('FineMeshInteractiveController', ['$scope', function($scope) {
  $scope.PEOPLE = PEOPLE;
  $scope.hoveringNode = null;
  $scope.meshLevel = 8;
  $scope.canvas = d3.select('.fine-mesh-interactive-controller .canvas');
  initResettableValues();


  // Variable watches
  $scope.$watch(function(scope) {
    return scope.meshLevel;
  }, function(newValue, oldValue) {
    if (!newValue || newValue < 2) {
      return;
    }

    $scope.meshLevel = Math.min(Math.max(newValue, MIN_MESH_LEVEL), MAX_MESH_LEVEL);
    initGraph($scope);
  });

  // Event callbacks
  $scope.start = function() {
    $scope.hasStarted= true;
    initCurrentNodeAndTrapDoorEdge();
    updateGraph();
  };

  $scope.selectStartingPerson = function(personIndex) {
    $scope.startingPerson = personIndex;
    initCurrentNodeAndTrapDoorEdge();
    updateGraph();
  };

  $scope.restart = function() {
    initResettableValues();
    initGraph();
  };

  $scope.changeMeshLevel = function(change) {
    $scope.meshLevel += change;
    $scope.meshLevel = Math.min(Math.max($scope.meshLevel, MIN_MESH_LEVEL), MAX_MESH_LEVEL);
  };

  $scope.selectRow = function(rowIndex) {
    // Ignore click that chooses the total rent because it violates Sperner's labelling.
    if ($scope.currentNode.prices[rowIndex] == $scope.totalRent) {
      return;
    }

    $scope.currentNode.choice = rowIndex;
    $scope.history.push({
      'person': $scope.currentNode.personLabel,
      'choice': $scope.currentNode.choice,
      'prices': $scope.currentNode.prices
    });

    if ($scope.firstChoice) {
      $scope.firstChoice = false;
      initEdgeChoices();
    }

    moveToNextNode();
    updateGraph();
  };

  // Private functions
  function initResettableValues() {
    $scope.hasStarted = false;
    $scope.firstChoice = true;
    $scope.totalRent = 3000;
    $scope.startingPerson = 0;
    $scope.history = [];
  }

  function initGraph() {
    $scope.graph = new Graph($scope.meshLevel, $scope.totalRent);
    $scope.currentNode = $scope.graph.grid[0][0];

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

    updateGraph();
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

  function updateGraph() {
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
    var currentVertexVsg = svgContainer
      .selectAll('circle.current-vertex')
      .data([1]);
    currentVertexVsg
      .enter()
      .append('circle');

    currentVertexVsg
      .attr('cx', $scope.currentNode.displayingCoord[0])
      .attr('cy', $scope.currentNode.displayingCoord[1])
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
      .style('fill', function(d) {
        return d.choice !== null ? ROOM_COLOR[d.choice] : 'white';
      })
      .classed('vertex-circle', true)
      .on('mouseover', function(d, i) {
        $scope.hoveringNode = d;
        console.log(d);
        $scope.$apply();
      })
      .on('mouseout', function(d, i) {
        $scope.hoveringNode = null;
        $scope.$apply();
      });

    var vertexLabelsSvg = svgContainer
      .selectAll('text')
      .data(nodes);
    vertexLabelsSvg
      .enter()
      .append('text');

    vertexLabelsSvg
      .text(function(d) {
        // Only show the label if the node is already explored or at the current position
        return d.choice !== null || d == $scope.currentNode ? PEOPLE[d.personLabel] : '';
      })
      .attr('x', function(d) { return d.displayingCoord[0] + TEXT_OFFSET_X; })
      .attr('y', function(d) { return d.displayingCoord[1] + TEXT_OFFSET_Y; })
      .classed('vertex-label', true);
  }

  function initCurrentNodeAndTrapDoorEdge() {
    if ($scope.startingPerson === 0) {
      $scope.currentNode = $scope.graph.grid[0][0];
      $scope.currentTrapDoorEdge = [
        $scope.graph.grid[1][0],
        $scope.graph.grid[1][1],
        0
      ];
    } else if ($scope.startingPerson === 1) {
      $scope.currentNode = $scope.graph.grid[$scope.meshLevel][0];
      $scope.currentTrapDoorEdge = [
        $scope.graph.grid[$scope.meshLevel - 1][0],
        $scope.graph.grid[$scope.meshLevel][1],
        2
      ];
    } else {
      $scope.currentNode = $scope.graph.grid[$scope.meshLevel][$scope.meshLevel];
      $scope.currentTrapDoorEdge = [
        $scope.graph.grid[$scope.meshLevel - 1][$scope.meshLevel - 1],
        $scope.graph.grid[$scope.meshLevel][$scope.meshLevel - 1],
        1
      ];
    }
  }

  function initEdgeChoices() {
    for (var i = 1; i < $scope.meshLevel; ++i) {
      // Left edge. Always choose room 2
      $scope.graph.grid[i][0].choice = 1;

      // Right edge. Always choose room 1.
      $scope.graph.grid[i][i].choice = 0;

      // Bottom edge. Always choose room 3.
      $scope.graph.grid[$scope.meshLevel][i].choice = 2;
    }

    // From the starting node, alternate the choice for the opposite corner to guarantee
    // the Sperner's labelling. Also label the adjacent nodes.
    // Starting node is at the top.
    if ($scope.currentNode == $scope.graph.grid[0][0]) {
      $scope.graph.grid[$scope.meshLevel][0].choice = ($scope.currentNode.choice + 1) % NUM_OF_PEOPLE;
      $scope.graph.grid[$scope.meshLevel][$scope.meshLevel].choice = ($scope.currentNode.choice + 2) % NUM_OF_PEOPLE;
    }

    // Starting node is at the bottom left.
    if ($scope.currentNode == $scope.graph.grid[$scope.meshLevel][0]) {
      $scope.graph.grid[$scope.meshLevel][$scope.meshLevel].choice = ($scope.currentNode.choice + 1) % NUM_OF_PEOPLE;
      $scope.graph.grid[0][0].choice = ($scope.currentNode.choice + 2) % NUM_OF_PEOPLE;
    }

    // Starting node is at the bottom right.
    if ($scope.currentNode == $scope.graph.grid[$scope.meshLevel][$scope.meshLevel]) {
      $scope.graph.grid[0][0].choice = ($scope.currentNode.choice + 1) % NUM_OF_PEOPLE;
      $scope.graph.grid[$scope.meshLevel][0].choice = ($scope.currentNode.choice + 2) % NUM_OF_PEOPLE;
    }
  }

  // The trap door edge is a edge of the grid and is of the following type. There are 2 nodes that we could move to and
  // only 1 should be available at the time.
  //
  // 0. Horizontal edge
  //          (i - 1, j)
  //              *
  //              |
  //              |
  //      (i, j)  *====*  (i, j + 1)
  //                   |
  //                   |
  //                   *
  //                (i + 1, j)
  //
  // 1. Vertical edge
  //      (i, j - 1)  *----*  (i, j)
  //                       #
  //                       #
  //                       #
  //           (i + 1, j)  *----*  (i + 1, j + 1)
  //
  //
  // 2. Slanted edge
  //
  //      (i, j) *----* (i, j + 1)
  //               \
  //                \
  //                 \
  //                  \
  //  (i + 1, j) *----* (i + 1, j + 1)
  //
  function moveToNextNode() {

  }
}]);
