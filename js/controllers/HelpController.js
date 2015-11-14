'use strict';

fairDivisionApp.controller('HelpController', ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
  $scope.ok = function() {
    $uibModalInstance.close();
  };
}]);
