/*global angular*/

app.controller('TestCtrl', ['$scope', '$location', '$timeout', 'DataSource', 'DishesTest', function ($scope, $location, $timeout, DataSource, DishesTest) {

    $scope.filters = {
        search: {
        }
    };

    $scope.source = new DataSource({
        service: DishesTest,
        filters: $scope.filters
    });

    $timeout(function() {
        $scope.source.paging();
    }, 1000);

}]);
