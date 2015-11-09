'use strict';

fairDivisionApp.controller('FineMeshController', ['$scope', function($scope) {
  $scope.PEOPLE = PEOPLE;
  $scope.meshLevel = 4;
  $scope.canvas = d3.select('.fine-mesh-controller .canvas');
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
    $scope.$apply();
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
