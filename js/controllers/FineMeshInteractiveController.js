'use strict';

fairDivisionApp.controller('FineMeshInteractiveController', ['$scope', function($scope) {
  $scope.PEOPLE = PEOPLE;
  $scope.hoveringNode = null;
  $scope.meshLevel = 4;
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
    updateGraph();
  };

  $scope.selectStartingCorner = function(cornerIndex) {
    $scope.startingCorner = cornerIndex;

    if (cornerIndex === 0) {
      $scope.currentNode = $scope.graph.grid[0][0];
    } else if (cornerIndex === 1) {
      $scope.currentNode = $scope.graph.grid[$scope.meshLevel][0];
    } else {
      $scope.currentNode = $scope.graph.grid[$scope.meshLevel][$scope.meshLevel];
    }

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
      initCornerVerticesAndTrapDoor();
    } else {
      checkSatisfactionOrFindNewTrapDoor();
    }

    moveToNextNode();
    updateGraph();
  };

  // Private functions
  function initResettableValues() {
    $scope.hasStarted = false;
    $scope.firstChoice = true;
    $scope.totalRent = 3000;
    $scope.startingCorner = 0;
    $scope.currentTrapDoorEdge = undefined;
    $scope.history = [];
    $scope.solutionFound = 0;  // 0: running, 1: success, 2: failed
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
          return 3;
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
      .data([$scope.currentNode]);
    currentVertexVsg
      .enter()
      .append('circle');

    currentVertexVsg
      .attr('cx', function(d) { return d.displayingCoord[0]; })
      .attr('cy', function(d) { return d.displayingCoord[1]; })
      .attr('r', 5)
      .style('fill', 'transparent')
      .style('stroke', 'rgb(153, 153, 153)')
      .style('stroke-width', 6)
      .classed('current-vertex', true);

    // Highlight trap door edge.
    var trapDoorEdgeSvg = svgContainer
      .selectAll('line');

    if ($scope.currentTrapDoorEdge) {
      // Add trap door edge before the vertices so it appears underneath.
      trapDoorEdgeSvg = trapDoorEdgeSvg.data([$scope.currentTrapDoorEdge]);
    } else {
      trapDoorEdgeSvg = trapDoorEdgeSvg.data([]);
    }

    trapDoorEdgeSvg
      .exit()
      .remove();

    trapDoorEdgeSvg
      .enter()
      .insert('line', 'circle');

    trapDoorEdgeSvg
      .attr('x1', function(d) { return d[0].displayingCoord[0]; })
      .attr('y1', function(d) { return d[0].displayingCoord[1]; })
      .attr('x2', function(d) { return d[1].displayingCoord[0]; })
      .attr('y2', function(d) { return d[1].displayingCoord[1]; })
      .style('stroke-width', 3)
      .style('stroke', 'black');

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

  function initCornerVerticesAndTrapDoor() {
    // Starting node is at the top.
    if ($scope.currentNode == $scope.graph.grid[0][0]) {
      // Adjacent nodes
      $scope.graph.grid[1][0].choice = 1;
      $scope.graph.grid[1][1].choice = 0;

      // Trap door
      $scope.currentTrapDoorEdge = [
        $scope.graph.grid[1][0],
        $scope.graph.grid[1][1],
        0,
        0
      ];
    }

    // Starting node is at the bottom left.
    if ($scope.currentNode == $scope.graph.grid[$scope.meshLevel][0]) {
      // Adjacent nodes
      $scope.graph.grid[$scope.meshLevel - 1][0].choice = 1;
      $scope.graph.grid[$scope.meshLevel][1].choice = 2;

      // Trap door
      $scope.currentTrapDoorEdge = [
        $scope.graph.grid[$scope.meshLevel - 1][0],
        $scope.graph.grid[$scope.meshLevel][1],
        2,
        1
      ];
    }

    // Starting node is at the bottom right.
    if ($scope.currentNode == $scope.graph.grid[$scope.meshLevel][$scope.meshLevel]) {
      // Adjacent nodes
      $scope.graph.grid[$scope.meshLevel - 1][$scope.meshLevel - 1].choice = 0;
      $scope.graph.grid[$scope.meshLevel][$scope.meshLevel - 1].choice = 2;

      $scope.currentTrapDoorEdge = [
        $scope.graph.grid[$scope.meshLevel - 1][$scope.meshLevel - 1],
        $scope.graph.grid[$scope.meshLevel][$scope.meshLevel - 1],
        1,
        0
      ];
    }
  }

  // The trap door edge is a edge of the grid and is of the following type. There are 2 nodes that we could move to and
  // only 1 should be available at the time.
  //
  // 0. Horizontal edge
  //          (i - 1, j)
  //              *
  //              |   0
  //              |
  //      (i, j)  *====*  (i, j + 1)
  //                   |
  //               1   |
  //                   *
  //                (i + 1, j + 1)
  //
  // 1. Vertical edge
  //      (i, j - 1)  *----*  (i, j)
  //                       #
  //                   1   #   0
  //                       #
  //           (i + 1, j)  *----*  (i + 1, j + 1)
  //
  //
  // 2. Slanted edge
  //
  //      (i, j) *----* (i, j + 1)
  //               \
  //                \  0
  //              1  \
  //                  \
  //  (i + 1, j) *----* (i + 1, j + 1)
  //
  //  A trap door edge is stored as an array of 4 element
  //  - start node (i, j)
  //  - end node
  //  - type: 0, 1 or 2
  //  - direction coming from: 0 or 1 (based on the above diagram
  function moveToNextNode() {
    var type = $scope.currentTrapDoorEdge[2];
    var direction = $scope.currentTrapDoorEdge[3];
    var startNodeGridCoord = $scope.currentTrapDoorEdge[0].gridCoord;

    // Check that we're not going out of the grid through the trap door.
    if ((type === 0 && direction === 0 && startNodeGridCoord[0] === $scope.meshLevel)
      || (type === 1 && direction === 0 && startNodeGridCoord[1] === 0)
      || (type === 2 && direction === 1 && startNodeGridCoord[0] === startNodeGridCoord[1])) {
      $scope.solutionFound = 2;
      return;
    }

    if (type === 0) {
      if (direction === 0) {
        $scope.currentNode = $scope.graph.grid[startNodeGridCoord[0] + 1][startNodeGridCoord[1] + 1];
      } else {
        $scope.currentNode = $scope.graph.grid[startNodeGridCoord[0] - 1][startNodeGridCoord[1]];
      }
    } else if (type === 1) {
      if (direction === 0) {
        $scope.currentNode = $scope.graph.grid[startNodeGridCoord[0]][startNodeGridCoord[1] - 1];
      } else {
        $scope.currentNode = $scope.graph.grid[startNodeGridCoord[0] + 1][startNodeGridCoord[1] + 1];
      }
    } else {
      if (direction === 0) {
        $scope.currentNode = $scope.graph.grid[startNodeGridCoord[0] + 1][startNodeGridCoord[1]];
      } else {
        $scope.currentNode = $scope.graph.grid[startNodeGridCoord[0]][startNodeGridCoord[1] + 1];
      }
    }
  }

  function checkSatisfactionOrFindNewTrapDoor() {
    var type = $scope.currentTrapDoorEdge[2];
    var direction = $scope.currentTrapDoorEdge[3];
    var edgeStartNode = $scope.currentTrapDoorEdge[0];
    var edgeEndNode = $scope.currentTrapDoorEdge[1];
    var currentNode = $scope.currentNode;

    if (currentNode.choice !== edgeStartNode.choice && currentNode.choice !== edgeEndNode.choice) {
      $scope.solutionFound = 1;
    } else if (currentNode.choice !== edgeStartNode.choice) {
      if (type === 0) {
        if (direction === 0) {
          $scope.currentTrapDoorEdge = [edgeStartNode, currentNode, 2, 0];
        } else {
          $scope.currentTrapDoorEdge = [currentNode, edgeStartNode, 1, 0];
        }
      } else if (type === 1) {
        if (direction === 0) {
          $scope.currentTrapDoorEdge = [currentNode, edgeStartNode, 0, 1];
        } else {
          $scope.currentTrapDoorEdge = [edgeStartNode, currentNode, 2, 1];
        }
      } else {
        if (direction === 0) {
          $scope.currentTrapDoorEdge = [edgeStartNode, currentNode, 1, 0];
        } else {
          $scope.currentTrapDoorEdge = [edgeStartNode, currentNode, 0, 1];
        }
      }
    } else if (currentNode.choice !== edgeEndNode.choice) {
      if (type === 0) {
        if (direction === 0) {
          $scope.currentTrapDoorEdge = [edgeEndNode, currentNode, 1, 1];
        } else {
          $scope.currentTrapDoorEdge = [currentNode, edgeEndNode, 2, 1];
        }
      } else if (type === 1) {
        if (direction === 0) {
          $scope.currentTrapDoorEdge = [currentNode, edgeEndNode, 2, 0];
        } else {
          $scope.currentTrapDoorEdge = [edgeEndNode, currentNode, 0, 0];
        }
      } else {
        if (direction === 0) {
          $scope.currentTrapDoorEdge = [currentNode, edgeEndNode, 0, 0];
        } else {
          $scope.currentTrapDoorEdge = [currentNode, edgeEndNode, 1, 1];
        }
      }
    }
  }
}]);
