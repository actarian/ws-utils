/*global angular*/

/**
   * @ngdoc directive
   * @name onTap
   * @kind function
   * @requires $timeout
   *
   * @description
   * When called, it add a class named 'tapped' on element and removes it after a timeout of 500 ms
   *
   * @example
   <example module="examples">
      <file name="index.html">
         <button type="button" on-tap>Tap me!</button>
      </file>
      <file name="script.js">
         angular.module('examples', ['wsUtils']);
      </file>
      <file name="style.css">
         .tapped {
            background: red;
         }
      </file>
   </example>
*/
app.directive('onTap', ['$timeout', function($timeout) {
   return {
      restrict: 'A',
      link: function(scope, element, attributes, model) {
         function onTap(e) {
            element.addClass('tapped');
            $timeout(function() {
               element.removeClass('tapped');
            }, 500)
         };
         function addListeners() {
            element.on('touchstart mousedown', onTap);
         };
         function removeListeners() {
            element.off('touchstart mousedown', onTap);
         };
         scope.$on('$destroy', function() {
            removeListeners();
         });
         addListeners();
      }
   }
}]);

/**
   * @ngdoc directive
   * @name animate
   * @kind function
   * @requires $timeout
   *
   * @description
   * When called, it add a class named 'animated' on element
   *
   * @param {string} [animate=fadeIn] a comma separated animate.css class names
   * @param {string} [delay=1] a comma separated durations list in milliseconds
   *
   * @example
   <example module="examples">
      <file name="index.html">
         <div type="button" animate="fadeInUp" delay="1000">
            I'm an animated div.
         </div>
      </file>
      <file name="script.js">
         angular.module('examples', ['wsUtils']);
      </file>
   </example>
*/
app.directive('animate', ['$timeout', function($timeout) {
   return {
      restrict: 'A',
      link: function(scope, element, attributes, model) {
         element.addClass('animated');
         var animate = ['fadeIn'], delays = ['1'];
         if (attributes.animate !== undefined) {
            animate = attributes.animate.split(',');
         }
         if (attributes.delay !== undefined) {
            delays = attributes.delay.split(',');
         }
         angular.forEach(delays, function(d, i) {
            delays[i] = parseInt(d);
         });
         while (delays.length < animate.length) {
            delays.push(delays[delays.length - 1] + 50);
         }
         var removeClasses = animate.join(' ');
         if (animate[0].indexOf('In') !== -1) {
            element.addClass('invisible');
            removeClasses += ' invisible';
         }
         while (animate.length) {
            var d = delays.shift();
            var a = animate.shift();
            $timeout(function() {
               element.removeClass(removeClasses);
               element.addClass(a);
               if (animate.length === 0 && a.indexOf('Out') !== -1) {
                  $timeout(function() {
                     element.addClass('invisible');
                  }, 1000);
               }
            }, d);
         }
      }
   }
}]);

/**
   * @ngdoc directive
   * @name scrollable
   * @kind function
   *
   * @description
   * Scrollable div 3d accellerated with touch functionality and callbacks for infinite scroll
   *
   * @param {promise} [on-top] optional callback function that execute when reaching top
   * @param {promise} [on-bottom] optional callback function that execute when reaching bottom
   *
   * @example
   <example module="examples">
      <file name="index.html">
         <div ng-controller="TestCtrl">
            <section class="scrollable content" scrollable on-top="$root.doRefresh()">
               <div class="inner">
                  <ul>
                     <li ng-repeat="item in [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]">item <span ng-bind="item"></span></li>
                  </ul>
               </div>
            </section>
         </div>
      </file>
      <file name="script.js">
         angular.module('examples', ['wsUtils']);
         angular.controller('TestCtrl', ['$scope', '$q', function($scope, $q) {
            $scope.doRefresh = function() {
               var deferred = $q.defer();
               if ($scope.busy) {
                  deferred.reject();
               } else {
                  $scope.busy = true;
                  $timeout(function() {
                     $scope.busy = false;
                     deferred.resolve();
                  }, 500);
               }
               return deferred.promise;
            };
         }]);
      </file>
      <file name="style.css">
         .scrollable.content {
            height: 200px!important;
         }
      </file>
   </example>
*/
app.directive('scrollable', ['$parse', '$compile', '$window', '$timeout', 'Utils', function($parse, $compile, $window, $timeout, Utils) {
   return {
      restrict: 'A',
      link: function(scope, element, attributes, model) {
         $window.ondragstart = function() { return false; };
         // CONSTS;
         var padding = 150;
         // FLAGS;
         var dragging, wheeling, busy;
         // MOUSE;
         var down, move, prev, up;
         // COORDS;
         var sy = 0, ey = 0, cy = 0, ltop = 0, lbottom = 0, speed = 0, ix = 45, iy = 0;
         // ANIMATION KEY;
         var aKey;
         var onTop, onBottom, showIndicatorFor;
         if (attributes.onTop !== undefined) {
            onTop = $parse(attributes.onTop, /* interceptorFn */ null, /* expensiveChecks */ true);
         }
         if (attributes.onBottom !== undefined) {
            onBottom = $parse(attributes.onBottom, /* interceptorFn */ null, /* expensiveChecks */ true);
         }
         if (attributes.showIndicatorFor !== undefined) {
            showIndicatorFor = scope.$eval(attributes.showIndicatorFor); // $parse(attributes.showIndicatorFor, /* interceptorFn */ null, /* expensiveChecks */ true);
         }
         // console.log('showIndicatorFor', showIndicatorFor);
         // ELEMENTS & STYLESHEETS;
         element.attr('unselectable', 'on').addClass('unselectable');
         var inner = element.find('div');
         var innerStyle = new Utils.Style();
         var indicator = null, indicatorStyle;
         if (showIndicatorFor) {
            indicator = angular.element('<div class="indicator"></div>');
            indicatorStyle = new Utils.Style();
            element.append(indicator);
            $compile(indicator.contents())(scope);
            indicatorStyle.transform('translate3d(' + ix.toFixed(2) + 'px,' + iy.toFixed(2) + 'px,0)');
            indicatorStyle.set(indicator[0]);
         }
         function doTop() {
            if (busy) {
               return;
            }
            if (!onTop) {
               return;
            }
            busy = true;
            scope.$apply(onTop).then().finally(function() {
               sy = ey = 0;
               setTimeout(function() {
                  undrag();
                  busy = false;
               }, 500);
            });
         }
         function doBottom() {
            if (busy) {
               return;
            }
            if (!onBottom) {
               return;
            }
            busy = true;
            scope.$apply(onBottom).then().finally(function() {
               var lbottom2 = element[0].offsetHeight - inner[0].offsetHeight;
               if (lbottom2 > lbottom) {
                  sy = ey = lbottom;
               } else {
                  sy = ey = lbottom + padding;
               }
               setTimeout(function() {
                  undrag();
                  busy = false;
               }, 500);
            });
         }
         function undrag() {
            // console.log('undrag');
            dragging = false;
            wheeling = false;
            move = null;
            down = null;
            removeDragListeners();
         }
         function bounce() {
            ltop += padding;
            lbottom -= padding;
            if (ey > ltop) {
               doTop();
            } else if (ey < lbottom) {
               doBottom();
            }
         }
         function redraw(time) {
            // if (!busy) {
            ltop = 0;
            lbottom = element[0].offsetHeight - inner[0].offsetHeight;
            if (dragging) {
               ey = sy + move.y - down.y;
               bounce();
            } else if (speed) {
               ey += speed;
               speed *= .75;
               if (wheeling) {
                  bounce();
               }
               if (Math.abs(speed) < 0.05) {
                  speed = 0;
                  ey = sy = cy;
                  wheeling = false;
                  pause();
               }
            }
            // }
            ey = Math.min(ltop, ey);
            ey = Math.max(lbottom, ey);
            cy += (ey - cy) / 4;
            innerStyle.transform('translate3d(0,' + cy.toFixed(2) + 'px,0)');
            innerStyle.set(inner[0]);
            if (showIndicatorFor) {
               if (dragging || wheeling || speed) {
                  var percent = cy / (element[0].offsetHeight - inner[0].offsetHeight);
                  percent = Math.max(0, Math.min(1, percent));
                  iy = (element[0].offsetHeight - indicator[0].offsetHeight) * (percent);
                  ix += (0 - ix) / 4;
                  // var count = Math.round(inner[0].offsetHeight / 315);
                  var i = Math.max(1, Math.round(percent * showIndicatorFor.rows.length));
                  indicator.html(i + '/' + showIndicatorFor.count);
                  // indicator.html((percent * 100).toFixed(2).toString());
               } else {
                  ix += (45 - ix) / 4;
               }
               indicatorStyle.transform('translate3d(' + ix.toFixed(2) + 'px,' + iy.toFixed(2) + 'px,0)');
               indicatorStyle.set(indicator[0]);
            }
         }
         function play() {
            function loop(time) {
               redraw(time);
               aKey = window.requestAnimationFrame(loop, element);
            }
            if (!aKey) {
               loop();
            }
         }
         function pause() {
            if (aKey) {
               window.cancelAnimationFrame(aKey);
               aKey = null;
               // console.log('Animation.paused');
            }
         }
         function onDown(e) {
            if (!busy) {
               sy = ey = cy;
               speed = 0;
               down = Utils.getTouch(e);
               wheeling = false;
               // console.log(down);
               addDragListeners();
               play();
            }
         }
         function onMove(e) {
            prev = move;
            move = Utils.getTouch(e);
            dragging = true;
            // console.log(move);
         }
         function onUp(e) {
            if (move && prev) {
               speed += (move.y - prev.y) * 4;
            }
            sy = ey = cy;
            dragging = false;
            move = null;
            down = null;
            prev = null;
            up = Utils.getTouch(e);
            // console.log(up);
            removeDragListeners();
         }
         function _onWheel(e) {
            if (!busy) {
               if (!e) e = event;
               var dir = (((e.deltaY < 0 || e.wheelDelta > 0) || e.deltaY < 0) ? 1 : -1)
               /*
               var evt = window.event || e;
               var delta = evt.detail ? evt.detail * -120 : evt.wheelDelta
               speed += delta;
               */
               speed += dir * 5;
               wheeling = true;
               play();
            }
         }
         var onWheel = Utils.throttle(_onWheel, 25);
         function addListeners() {
            element.on('touchstart mousedown', onDown);
            element.on('wheel', onWheel);
            // element.addEventListener('DOMMouseScroll',handleScroll,false); // for Firefox
            // element.addEventListener('mousewheel',    handleScroll,false); // for everyone else
         };
         function removeListeners() {
            element.off('touchstart mousedown', onDown);
            element.off('wheel', onWheel);
         };
         function addDragListeners() {
            angular.element($window).on('touchmove mousemove', onMove);
            angular.element($window).on('touchend mouseup', onUp);
         };
         function removeDragListeners() {
            angular.element($window).off('touchmove mousemove', onMove);
            angular.element($window).off('touchend mouseup', onUp);
         };
         scope.$on('$destroy', function() {
            removeListeners();
         });
         addListeners();
      },
   };
}]);

/**
   * @ngdoc directive
   * @name ngImg
   * @kind function
   *
   * @description
   * Whenever the image has loaded, a loaded class will be added to the image element
   *
   * @param {string} ng-img path to the image to load
   *
   * @example
   <example module="examples">
      <file name="index.html">
         <img src="" ng-img="'/img/nature-01.jpg'"/>
      </file>
      <file name="script.js">
         angular.module('examples', ['wsUtils']);
      </file>
      <file name="style.css">
         [ng-img] {
            max-width: 100%;
            opacity: 0;
            transition: opacity ease-in-out 250ms;
         }
         [ng-img].loaded {
            opacity: 1;
         }
      </file>
   </example>
*/
app.directive('ngImg', ['$parse', '$timeout', function($parse, $timeout) {
   return {
      restrict: 'A',
      link: function(scope, element, attributes, model) {
         var src = $parse(attributes.ngImg, /* interceptorFn */ null, /* expensiveChecks */ true);
         var image = new Image();
         image.onload = function() {
            attributes.$set('src', this.src);
            setTimeout(function() {
               element.addClass('loaded');
            }, 10);
         }
         image.load = function(src) {
            element.removeClass('loaded');
            this.src = src;
         }
         scope.$watch(src, function(newValue) {
            if (!newValue) {
               attributes.$set('src', null);
            } else {
               image.load(newValue);
            }
         });
      }
   };
}]);

/**
   * @ngdoc directive
   * @name ngImgWorker
   * @kind function
   *
   * @description
   * As ngImg but using webworker. Whenever the image has loaded, a loaded class will be added to the image element
   *
   * @param {string} ng-img path to the image to load
   *
   * @example
	<example module="examples">
      <file name="index.html">
         <img src="" ng-img-worker="'/img/nature-02.jpg'"/>
      </file>
      <file name="script.js">
         angular.module('examples', ['wsUtils']);
      </file>
      <file name="style.css">
         [ng-img] {
            max-width: 100%;
            opacity: 0;
            transition: opacity ease-in-out 250ms;
         }
         [ng-img].loaded {
            opacity: 1;
         }
      </file>
	</example>
*/
app.directive('ngImgWorker', ['$parse', 'WebWorker', function($parse, WebWorker) {
   var worker = new WebWorker('/js/ws-utils/workers/loader.js');
   return {
      restrict: 'A',
      link: function(scope, element, attributes, model) {
         function doWork(src) {
            element.removeClass('loaded');
            function onImageLoaded(src) {
               attributes.$set('src', src);
               setTimeout(function() {
                  element.addClass('loaded');
               }, 100);
            }
            worker.post({ url: src }).then(function(data) {
               onImageLoaded(data.url);
            }, function(error) {
               onImageLoaded(null);
            });
         }
         var src = scope.$eval(attributes.ngImgWorker);
         if (!src) {
            attributes.$set('src', null);
         } else {
            doWork(src);
         }
      }
   };
}]);

/**
   * @ngdoc directive
   * @name control
   * @kind function
   *
   * @description
   * Dinamic form control generator through templates with extended validation
   *
   * @param {string} model the target model of control
   * @param {string} [control=text] the type of control, available types (text, password, email, number, checkbox, textarea, datetime-local, select, autocomplete)
   * @param {string} [form=Form] the name of the form
   * @param {string} [title=Untitled] the title of the control
   * @param {string} [placeholder=title] the placeholder of the control
   * @param {string} [source=null] datasource of select as array
   * @param {string} [key=id] optional key for select option
   * @param {string} [label=name] optional label for select option
   * @param {string} [required=false] if the control is required
   *
   * @example
   <example module="examples">
      <file name="index.html">
         <div class="container-fluid">
            <div class="row">
               <form name="myForm">
                  <div class="form-group col-xs-12" form="myForm" control="select" title="category" placeholder="select a category" model="model.category" source="[{name:'Main',id:1}, {name:'Second',id:2}]" required="true"></div>
                  <div class="form-group col-xs-12" form="myForm" control="number" title="dish price" placeholder="type the price of the dish" model="model.dish.price" required="true"></div>
                  <div class="form-group col-xs-12" form="myForm" control="checkbox" title="is vegan friendly" placeholder="please check if the dish is vegan friendly" model="model.dish.isVeganFriendly"></div>
               </form>
            </div>
         </div>
      </file>
      <file name="script.js">
         angular.module('examples', ['wsUtils']);
      </file>
   </example>
*/
app.directive('control', [function() {
   return {
      restrict: 'A',
      replace: true,
      template: function(element, attributes) {
         var form = attributes.form || 'Form';
         var title = attributes.title || 'Untitled';
         var placeholder = attributes.placeholder || title;
         var name = title.replace(/[^0-9a-zA-Z]/g, "").split(' ').join('');
         var formKey = form + '.' + name;
         var formFocus = ' ng-focus="' + formKey + '.hasFocus=true" ng-blur="' + formKey + '.hasFocus=false"';
         var required = '';
         var label = (attributes.label ? attributes.label : 'name');
         var key = (attributes.key ? attributes.key : 'id');
         var model = attributes.model;
         if (attributes.required) {
            required = '<span ng-messages="' + (attributes.readonly ? '' : '(' + form + '.$submitted || ' + formKey + '.$touched) && ') + form + '.' + name + '.$error" role="alert"><span ng-message="required" class="label-error animated flash"> &larr; required</span>';
            switch (attributes.control) {
               case 'password':
                  required = required + '<span ng-message="minlength" class="label-error animated flash"> &larr; at least 6 chars</span>';
                  break;
               case 'email':
                  required = required + '<span ng-message="email" class="label-error animated flash"> &larr; incorrect</span>';
                  break;
               case 'number':
                  required = required + '<span ng-message="number" class="label-error animated flash"> &larr; enter a valid number</span>';
                  break;
            }
            if (attributes.match !== undefined) {
               required = required + '<span ng-message="match" class="label-error animated flash"> &larr; not matching</span>';
            }
            required = required + '</span>';
         } else {
            required = ' (optional)';
         }
         var template = '<div ' + (attributes.readonly ? ' class="readonly" ' : '') + ' ng-class="{ focus: ' + formKey + '.hasFocus, success: ' + formKey + '.$valid, error: ' + formKey + '.$invalid && (form.$submitted || ' + formKey + '.$touched), empty: !' + formKey + '.$viewValue }"><label for="' + name + '" class="control-label">' + title + required + '</label>';
         switch (attributes.control) {
            case 'checkbox':
               template = '<div class="checkbox">';
               template += '<span class="checkbox-label">' + title + required + '</span>';
               template += '<span class="switch"><input id="' + name + '" name="' + name + '" type="checkbox" ng-model="' + model + '" ' + (attributes.required ? 'required="true"' : '') + ' class="toggle toggle-round-flat"><label for="' + name + '"></label></span>';
               template += '</div>';
               break;
            case 'select':
               var options = attributes.number
                  ? 'item.' + key + ' as item.' + label + ' for item in ' + attributes.source
                  : 'item.' + label + ' for item in ' + attributes.source + ' track by item.' + key;
               template += '<select name="' + name + '" class="form-control" ng-model="' + model + '" ng-options="' + options + '" ' + (attributes.number ? 'convert-to-number' : '') + ' ' + (attributes.required ? 'required="true"' : '') + '><option value="" disabled selected hidden>' + placeholder + '</option></select>';
               break;
            case 'autocomplete':
               var canCreate = (attributes.canCreate ? attributes.canCreate : false);
               var flatten = (attributes.flatten ? attributes.flatten : false);
               var queryable = (attributes.queryable ? attributes.queryable : false);
               var onSelected = (attributes.onSelected ? ' on-selected="' + attributes.onSelected + '"' : '');
               template += '<input name="' + name + '" ng-model="' + model + '" type="hidden" ' + (attributes.required ? 'required' : '') + '>';
               template += '<div control-autocomplete="' + attributes.source + '" model="' + model + '" label="' + label + '"  key="' + key + '" can-create="' + canCreate + '" flatten="' + flatten + '" queryable="' + queryable + '" placeholder="' + placeholder + '" on-focus="' + formKey + '.hasFocus=true" on-blur="' + formKey + '.hasFocus=false"' + onSelected + '></div>';
               break;
            case 'textarea':
               template += '<textarea name="' + name + '" class="form-control" ng-model="' + model + '"' + (attributes.options ? ' ng-model-options="' + attributes.options + '" ' : '') + ' placeholder="' + placeholder + '" ' + (attributes.required ? 'required' : '') + ' rows="' + (attributes.rows ? attributes.rows : '1') + '"' + formFocus + '></textarea>';
               break;
            case 'datetime-local':
               placeholder == title ? placeholder = 'yyyy-MM-ddTHH:mm:ss' : null;
               template += '<input name="' + name + '" class="form-control" ng-model="' + model + '"' + (attributes.options ? ' ng-model-options="' + attributes.options + '" ' : '') + ' placeholder="' + placeholder + '" type="datetime-local"' + (attributes.required ? ' required' : '') + (attributes.readonly ? ' readonly' : '') + formFocus + '>';
               break;
            case 'password':
               template += '<input name="' + name + '" class="form-control" ng-model="' + model + '"' + (attributes.options ? ' ng-model-options="' + attributes.options + '" ' : '') + ' placeholder="' + placeholder + '" type="password" ng-minlength="6" ' + (attributes.required ? 'required' : '') + formFocus + '>';
               break;
            case 'email':
               template += '<input name="' + name + '" class="form-control" ng-model="' + model + '"' + (attributes.options ? ' ng-model-options="' + attributes.options + '" ' : '') + ' placeholder="' + placeholder + '" type="email" ' + (attributes.required ? 'required' : '') + formFocus + '>';
               break;
            case 'number':
               template += '<input name="' + name + '" class="form-control" ng-model="' + model + '"' + (attributes.options ? ' ng-model-options="' + attributes.options + '" ' : '') + ' placeholder="' + placeholder + '" type="text"' + (attributes.required ? ' required' : '') + (attributes.readonly ? ' readonly' : '') + formFocus + ' validate-type="number">'; // ' validator="{ number: isNumber }">';
               break;
            case 'text':
            default:
               template += '<input name="' + name + '" class="form-control" ng-model="' + model + '"' + (attributes.options ? ' ng-model-options="' + attributes.options + '" ' : '') + ' placeholder="' + placeholder + '" type="text"' + (attributes.required ? ' required' : '') + (attributes.readonly ? ' readonly' : '') + formFocus + '>';
               break;
         }
         return template + '</div>';
      },
      link: function(scope, element, attributes, model) {
      },
   };
}]);

/**
   * @ngdoc directive
   * @name controlAutocomplete
   * @kind function
   * @requires ngModel
   *
   * @description
   * Custom control type with autocomplete functionality. (use the shortcut version with control directive)
   *
   * @param {service} controlAutocomplete the datasource service
   * @param {model} model the target model of control
   * @param {boolean} [canCreate=false] setted on true the control can add new entities
   * @param {boolean} [flatten=false] set to true to flat the value to the model
   * @param {boolean} [queryable=false] set to true if is a queryable service
   * @param {string} [key=id] optional key for select option
   * @param {string} [label=name] optional label for select option
   *
   * @example
   <example module="examples">
      <file name="index.html">
         <div class="container-fluid">
            <div class="row">
               <form name="myForm">
                  <div class="form-group col-xs-12 empty focus">
                     <label for="dishname" class="control-label">dish name<span ng-messages="(myForm.$submitted || myForm.dishname.$touched) &amp;&amp; myForm.dishname.$error" role="alert" class="ng-inactive"></span></label>
                     <input name="dishname" ng-model="model.name" type="hidden" required="">
                     <div control-autocomplete="dishesAutocomplete" model="model.name" label="name" key="name" can-create="true" flatten="true" queryable="false" placeholder="type the name of the dish" on-focus="myForm.dishname.hasFocus=true" on-blur="myForm.dishname.hasFocus=false" on-selected="onDishSelected($item)" class="ng-isolate-scope"></div>
               </form>
            </div>
         </div>
      </file>
      <file name="script.js">
         angular.module('examples', ['wsUtils']);
         angular.run(['$rootScope', '$q', function($rootScope, $q) {
            $rootScope.dishesAutocomplete = ;
            $rootScope.onDishSelected = function($item) {
               alert($item);
            };
         }]);
      </file>
   </example>
*/
app.directive('controlAutocomplete', ['$parse', '$window', '$timeout', function($parse, $window, $timeout) {
   var MAX_ITEMS = 5;
   return {
      restrict: 'A',
      scope: {
         service: '=controlAutocomplete',
         canCreate: '=',
         flatten: '=',
         queryable: '=',
         model: '=',
         label: '@',
         key: '@',
      },
      template: function(element, attributes) {
         var template = '<div>';
         template += '   <input class="form-control" ng-model="phrase" ng-model-options="{ debounce: 150 }" placeholder="' + attributes.placeholder + '" type="text" ng-focus="onFocus()">';
         template += '   <ul class="form-autocomplete" ng-show="items.length">';
         template += '       <li ng-repeat="item in items" ng-class="{ active: active == $index }" ng-click="onSelect(item)">';
         template += '           <span>{{item.NameA}}<span class="token">{{item.NameB}}</span>{{item.NameC}}</span>';
         template += '       </li>';
         template += '   </ul>';
         template += '</div>';
         return template;
      },
      link: function(scope, element, attributes, model) {
         var onSelected = $parse(attributes.onSelected);
         var input = element.find('input');
         var label = (scope.label ? scope.label : 'name');
         var key = (scope.key ? scope.key : 'id');
         function getPhrase() {
            if (scope.model) {
               return scope.flatten ? scope.model : scope.model[label];
            } else {
               return null;
            }
         }
         scope.phrase = getPhrase();
         scope.count = 0;
         scope.items = [];
         scope.active = -1;
         scope.maxItems = scope.maxItems || Number.POSITIVE_INFINITY;
         function Clear(phrase) {
            scope.items.length = 0;
            scope.count = 0;
            scope.phrase = phrase || null;
            input.val(scope.phrase);
         }
         function Current() {
            var current = null;
            if (scope.active != -1 && scope.items.length > scope.active) {
               current = scope.items[scope.active];
            }
            return current;
         }
         scope.onFocus = function() {
            if (attributes.onFocus !== undefined) {
               scope.$parent.$eval(attributes.onFocus);
            }
            if (input.val() === getPhrase()) {
               input.val(null);
            }
         };
         scope.onBlur = function() {
            if (attributes.onBlur !== undefined) {
               scope.$parent.$eval(attributes.onBlur);
            }
            Clear(getPhrase());
         };
         scope.onSelect = function(item) {
            if (scope.queryable) {
               scope.service.setItem(item).then(function(parsedItem) {
                  onSelected({ $item: parsedItem }, scope.$parent, { $event: {} });
                  $timeout(function() {
                     if (scope.flatten) {
                        scope.model = parsedItem[key];
                     } else {
                        scope.model = scope.model || {};
                        angular.extend(scope.model, parsedItem);
                     }
                     scope.onBlur();
                  }, 1);
               });
            } else {
               onSelected({ $item: item }, scope.$parent, { $event: {} });
               if (scope.flatten) {
                  scope.model = item[key];
               } else {
                  scope.model = scope.model || {};
                  angular.extend(scope.model, item);
               }
               scope.onBlur();
            }
         };
         function onTyping(phrase) {
            if (scope.canCreate) {
               if (scope.flatten) {
                  if (key === label) {
                     scope.model = phrase;
                  }
               } else {
                  scope.model = {};
                  scope.model[label] = phrase;
               }
            }
         };
         function Enter() {
            var item = Current();
            if (item) {
               scope.onSelect(item);
            }
            scope.$apply();
         }
         function Up() {
            scope.active--;
            if (scope.active < 0) {
               scope.active = scope.items.length - 1;
            }
            scope.$apply();
         }
         function Down() {
            scope.active++;
            if (scope.items.length == 0) {
               scope.active = -1;
            } else if (scope.active >= scope.items.length) {
               scope.active = 0;
            }
            scope.$apply();
         }
         function Parse(data) {
            scope.items = data.items;
            scope.count = data.count;
            angular.forEach(scope.items, function(value, index) {
               var name = value[label];
               var i = name.toLowerCase().indexOf(scope.phrase.toLowerCase());
               value.NameA = name.substr(0, i);
               value.NameB = name.substr(i, scope.phrase.length);
               value.NameC = name.substr(i + scope.phrase.length, name.length - (i + scope.phrase.length));
            });
         }
         function Filter(data) {
            var c = 0, i = [];
            if (scope.phrase.length > 1) {
               angular.forEach(data.items, function(value, index) {
                  var name = value[label];
                  if (name.toLowerCase().indexOf(scope.phrase.toLowerCase()) !== -1) {
                     if (i.length < MAX_ITEMS) {
                        i.push(value);
                     }
                     c++;
                  }
               });
            }
            Parse({
               count: c,
               items: i
            });
         }
         function Search() {
            scope.phrase = input.val();
            scope.active = -1;
            onTyping(scope.phrase);
            if (scope.queryable) {
               scope.service.setPhrase(scope.phrase).then(function(success) {
                  scope.items = success.items;
                  scope.count = success.count;
               }, function(error) {
                  console.log('Search.queryable.error', scope.phrase, error);
               }).finally(function() {

               });
            } else {
               Filter({
                  count: scope.service.length,
                  items: scope.service
               });
               scope.$apply();
            }
         }
         function onKeyDown(e) {
            switch (e.keyCode) {
               case 9: // Tab
               case 13: // Enter
                  Enter();
                  if (scope.items.length) {
                     e.preventDefault ? e.preventDefault() : null;
                     return false;
                  }
                  break;
               case 38: // Up
                  Up();
                  break;
               case 40: // Down
                  Down();
                  break;
            }
         }
         function onKeyUp(e) {
            switch (e.keyCode) {
               case 9: // Tab
               case 13: // Enter
                  break;
               case 39: // Right
                  break;
               case 37: // Left
                  break;
               case 38: // Up
                  break;
               case 40: // Down
                  break;
               default: // Text
                  Search.call(this);
                  break;
            }
         }
         function onUp(e) {
            if (Utils.getClosest(e.target, '[control-autocomplete]') === null) {
               scope.$apply(function() {
                  scope.onBlur();
               });
            }
            return true;
         }
         function addListeners() {
            input.on('keydown', onKeyDown);
            input.on('keyup', onKeyUp);
            angular.element($window).on('mouseup touchend', onUp);
         };
         function removeListeners() {
            input.off('keydown', onKeyDown);
            input.off('keyup', onKeyUp);
            angular.element($window).off('mouseup touchend', onUp);
         };
         scope.$on('$destroy', function() {
            removeListeners();
         });
         var init = false;
         function Init() {
            if (!init) {
               addListeners();
               init = true;
            }
         }
         scope.$watch('service', function(newValue) {
            if (newValue && (newValue.length || scope.queryable)) {
               Init();
            }
         });
         scope.$watchCollection('model', function(newValue) {
            if (newValue) {
               if (scope.flatten && label === key) {
                  scope.phrase = newValue;
                  input.val(scope.phrase);
               } else if (newValue[label]) {
                  scope.phrase = newValue[label];
                  input.val(scope.phrase);
               }
            }
         });
      },
   };
}]);

/**
   * @ngdoc directive
   * @name validateType
   * @kind function
   * @requires ngModel
   *
   * @description
   * Custom validation type for ngModel
   *
   * @param {string} [validateType=number] the type of custom validation
   *
   * @example
	<example module="examples">
		<file name="index.html">
			<form name="myForm">
				<input name="myValue" type="text" ng-model="model" validate-type="number" />
				<span ng-messages="(myForm.$submitted || myForm.$touched) && myForm.myValue.$error" role="alert">
					<span ng-message="number" class="label-error animated flash"> &larr; enter a valid number</span>
				</span>
			</form>
		</file>
		<file name="script.js">
			angular.module('examples', ['wsUtils']);
		</file>
	</example>
*/
app.directive('validateType', function() {
   return {
      require: 'ngModel',
      link: function(scope, element, attributes, model) {
         var type = attributes.validateType;
         switch (type) {
            case 'number':
               model.$parsers.unshift(function(value) {
                  model.$setValidity(type, String(value).indexOf(Number(value).toString()) !== -1);
                  return value;
               });
               break;
         }
      }
   };
});
