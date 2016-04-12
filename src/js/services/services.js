/*global angular*/

app.factory('Utils', ['Vector', function (Vector) {
    (function () {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
                                       || window[vendors[x] + 'CancelRequestAnimationFrame'];
        }
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function () { callback(currTime + timeToCall); }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
        }
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
        }
    }());

    var transformProperty = function detectTransformProperty() {
        var transformProperty = 'transform',
            safariPropertyHack = 'webkitTransform';
		var div = document.createElement("DIV");
        if (typeof div.style[transformProperty] !== 'undefined') {
            ['webkit', 'moz', 'o', 'ms'].every(function(prefix) {
                var e = '-' + prefix + '-transform';
                if (typeof div.style[e] !== 'undefined') {
                    transformProperty = e;
                    return false;
                }
                return true;
            });
        } else if (typeof div.style[safariPropertyHack] !== 'undefined') {
            transformProperty = '-webkit-transform';
        } else {
            transformProperty = undefined;
        }
        return transformProperty;
    } ();

    var _isTouch;
    function isTouch() {
        if (!_isTouch) {
            _isTouch = {
                value: ('ontouchstart' in window || 'onmsgesturechange' in window)
            }
        }
        // console.log(_isTouch);
        return _isTouch.value;
    }

    function getTouch(e, previous) {
        var t = new Vector();
        if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
            var touch = null;
            var event = e.originalEvent ? e.originalEvent : e;
            var touches = event.touches.length ? event.touches : event.changedTouches;
            if (touches && touches.length) {
                touch = touches[0];
            }
            if (touch) {
                t.x = touch.pageX;
                t.y = touch.pageY;
            }
        } else if (e.type == 'click' || e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover' || e.type == 'mouseout' || e.type == 'mouseenter' || e.type == 'mouseleave') {
            t.x = e.pageX;
            t.y = e.pageY;
        }
        if (previous) {
            t.s = Vector.difference(previous, t);
        }
        t.type = e.type;
        return t;
    }

    function getRelativeTouch(element, point) {
        var rect = element[0].getBoundingClientRect();
        var e = new Vector(rect.left,  rect.top);
        return Vector.difference(e, point);
    }

    function getClosest(el, selector) {
        var matchesFn, parent;
        ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'].some(function (fn) {
            if (typeof document.body[fn] == 'function') {
                matchesFn = fn;
                return true;
            }
            return false;
        });
        while (el !== null) {
            parent = el.parentElement;
            if (parent !== null && parent[matchesFn](selector)) {
                return parent;
            }
            el = parent;
        }
        return null;
    }


    var getNow = Date.now || function() {
        return new Date().getTime();
    };

    function throttle(func, wait, options) {
        // Returns a function, that, when invoked, will only be triggered at most once
        // during a given window of time. Normally, the throttled function will run
        // as much as it can, without ever going more than once per `wait` duration;
        // but if you'd like to disable the execution on the leading edge, pass
        // `{leading: false}`. To disable execution on the trailing edge, ditto.
        var context, args, result;
        var timeout = null;
        var previous = 0;
        if (!options) options = {};
        var later = function () {
            previous = options.leading === false ? 0 : getNow();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };
        return function () {
            var now = getNow();
            if (!previous && options.leading === false) previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
    }

    var Style = function() {
        function Style() {
            this.props = {
                scale: 1,
                hoverScale: 1,
                currentScale: 1,
            }
        }
        Style.prototype = {
            set: function (element) {
                var styles = [];
                angular.forEach(this, function (value, key) {
                    if (key !== 'props')
                        styles.push(key + ':' + value);
                });
                element.style.cssText = styles.join(';') + ';';
            },
            transform: function (transform) {
                this[Utils.transformProperty] = transform;
            },
            transformOrigin: function (x, y) {
                this[Utils.transformProperty + '-origin-x'] = (Math.round(x * 1000) / 1000) + '%';
                this[Utils.transformProperty + '-origin-y'] = (Math.round(y * 1000) / 1000) + '%';
            },
        };
        return Style;
    }();

    function Utils() {
    }

	Utils.transformProperty = transformProperty;
    Utils.getTouch = getTouch;
    Utils.getRelativeTouch = getRelativeTouch;
    Utils.getClosest = getClosest;
    Utils.throttle = throttle;
    Utils.Style = Style;

    return Utils;
}]);

app.factory('DataFilter', [function () {
    function DataFilter(data) {
        /*
        this.dateFrom = null;
        this.dateTo = null;
        this.search = null;
        this.status = null;
        */
        data ? angular.extend(this, data) : null;
    }
    DataFilter.prototype = {
        getSearchParams: function (search) {
            var a = [];
            if (search) {
                for (var p in search) {
                    a.push({ name: p, value: search[p] });
                }
            }
            return a;
        },
        getParams: function (source, infinite) {
            var post = {}, value;
            for (var p in this) {
                if (p === 'dateFrom' ||
                    p === 'dateTo' ||
                    p === 'status') {
                    value = this[p];
                    if (value !== undefined) {
                        post[p] = value;
                    }
                } else if (p === 'search') {
                    post[p] = JSON.stringify(this.getSearchParams(this[p]), null, '');
                }
            }
            post.page = source.page;
            post.size = source.size;
            post.infinite = infinite;
            return post;
        },
    };
    return DataFilter;
}]);

app.factory('DataSource', ['$q', '$http', '$httpAsync', '$timeout', '$rootScope', 'DataFilter', function ($q, $http, $httpAsync, $timeout, $rootScope, DataFilter) {

    var PAGES_MAX = Number.POSITIVE_INFINITY;

    function DataSource(data) {
        this.busy = false;
        this.error = false;
        this.size = 10;
        this.maxPages = 10;
        this.rows = [];
        this.filters = {};
        this.service = {
            url: '/api/items/paging',
            resolve: function (items, rows) {
                angular.forEach(items, function (item) {
                    this.push(item);
                }, rows);
            },
        };
        data ? angular.extend(this, data) : null;
        this.filters = new DataFilter(this.filters);
        // FAKE SERVICE FOR TEST !!!
        if (this.service.uri.paging === false) {
            this.get = function (deferred, infinite) {
                this.busy = true;
                this.error = false;
                $timeout(function () {
                    infinite ? null : this.rows.length = 0;
                    this.service.resolve(this.rows);
                    this.page = 1;
                    this.pages = 2;
                    this.count = this.rows.length;
                    this.pagination = this.getPages();
                    this.busy = false;
                    $rootScope.$broadcast('onDataSourceUpdate', this);
                    deferred.resolve(this.rows);
                    // console.log('DataSource.get');
                }.bind(this), 1000);
            };
        }
        this.flush();
    }
    DataSource.prototype = {
        flush: function () {
            this.pages = PAGES_MAX;
            this.page = 1;
            this.count = 0;
            this.opened = null;
        },
        resolve: function (response) {
            var responseHeader = response.headers('X-Pagination');
            var responseView = responseHeader ? JSON.parse(responseHeader) : null;
            // console.log('response', response, 'responseHeader', responseHeader, 'responseView', responseView);
            if (responseView) {
                this.page = responseView.page;
                this.size = responseView.size;
                this.pages = responseView.pages;
                this.count = responseView.count;
            } else {
                this.page = 0;
                this.size = responseView.size;
                this.pages = 0;
                this.count = 0;
            }
            this.pagination = this.getPages();
        },
        get: function (deferred, infinite) {
            this.busy = true;
            this.error = false;
            $httpAsync.get(this.service.uri.paging, { params: this.filters.getParams(this) }).then(function success(response) {
                this.resolve(response);
                infinite ? null : this.rows.length = 0;
                this.service.resolve(response.data, this.rows);
                $rootScope.$broadcast('onDataSourceUpdate', this);
                deferred.resolve(this.rows);
            }.bind(this), function error(response) {
                console.log('error.response', response);
                this.error = true;
                deferred.reject(response);
            }.bind(this))
                .finally(function () {
                    // console.log('DataSource.get');
                    $timeout(function () {
                        this.busy = false;
                    }.bind(this), 1000);
                }.bind(this));
        },
        paging: function () {
            var deferred = $q.defer();
            if (this.busy || this.page > this.pages) {
                deferred.reject();
            } else {
                // console.log('DataSource.paging');
                this.opened = null;
                this.get(deferred);
            }
            return deferred.promise;
        },
        refresh: function () {
            var deferred = $q.defer();
            if (this.busy) {
                deferred.reject();
            } else {
                // console.log('DataSource.refresh');
                this.flush();
                this.get(deferred);
            }
            return deferred.promise;
        },
        more: function () {
            var deferred = $q.defer();
            if (this.busy || this.page + 1 > this.pages) {
                deferred.reject();
            } else {
                // console.log('DataSource.more');
                this.page++;
                this.get(deferred, true);
            }
            return deferred.promise;
        },
        filter: function () {
            this.page = 1;
            this.pages = PAGES_MAX;
            this.paging();
        },
        prevPage: function () {
            var page = this.page - 1;
            if (page > 0 && page <= this.pages) {
                this.page = page;
                this.paging();
            }
        },
        nextPage: function () {
            var page = this.page + 1;
            if (page > 0 && page <= this.pages) {
                this.page = page;
                this.paging();
            }
        },
        gotoPage: function (page) {
            if (page > 0 && page <= this.pages) {
                this.page = page;
                this.paging();
            }
        },
        firstPage: function () {
            if (this.page !== 1) {
                this.page = 1;
                this.paging();
            }
        },
        lastPage: function () {
            if (this.page !== this.pages) {
                this.page = this.pages;
                this.paging();
            }
        },
        hasMany: function () {
            return this.count > 0 && this.pages > this.maxPages;
        },
        hasMorePagesBehind: function () {
            var startingIndex = Math.max(0, this.page - this.maxPages);
            return startingIndex > 0;
        },
        hasMorePagesNext: function () {
            var endingIndex = Math.max(0, this.page - this.maxPages) + this.maxPages;
            return endingIndex < this.pages;
        },
        isPage: function (number) {
            return this.page === number;
        },
        hasPages: function () {
            return this.pages > 0 && this.pages < PAGES_MAX;
        },
        getPages: function () {
            var a = [], i;
            if (this.hasPages()) {
                var startingIndex = Math.max(0, this.page - this.maxPages);
                var endingIndex = Math.min(this.pages, startingIndex + this.maxPages);
                i = startingIndex;
                while (i < endingIndex) {
                    a.push({ number: (i + 1) });
                    i++;
                }
            }
            return a;
        },
        openClose: function (index) {
            if (this.opened === index) {
                this.opened = null;
            } else {
                this.opened = index;
            }
        }
    };
    return DataSource;
}]);

app.factory('LocalStorage', ['$http', '$q', '$window', function ($http, $q, $window) {
    function LocalStorage() {
    }

    function isLocalStorageSupported() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }
    LocalStorage.isSupported = isLocalStorageSupported();
    if (!LocalStorage.isSupported) {
        console.log('LocalStorage.unsupported');
    }

    /** STATIC CLASS METHODS **/
    LocalStorage.set = function (key, data) {
        if (!this.isSupported) {
            return;
        }
        try {
            var cache = [];
            var json = JSON.stringify(data, function (key, value) {
                if (key === 'pool') {
                    return;
                }
                if (typeof value === 'object' && value !== null) {
                    if (cache.indexOf(value) !== -1) {
                        // Circular reference found, discard key
                        return;
                    }
                    cache.push(value);
                }
                return value;
            });
            cache = null;
            $window.localStorage.setItem(key, json);;
        } catch (e) {
            console.log('LocalStorage.set.error serializing', key, data, e);
        }
    };

    LocalStorage.get = function (key) {
        if (!this.isSupported) {
            return;
        }
        var data = null;
        if ($window.localStorage[key] !== undefined) {
            try {
                data = JSON.parse($window.localStorage[key]);
            } catch (e) {
                console.log('LocalStorage.get.error parsing', key, e);
            }
        }
        return data;
    };

    // Register on storage event
    LocalStorage.onStorage = function () {
        console.log('LocalStorage.onStorage', arguments);
    };
    angular.element($window).on('storage', LocalStorage.onStorage);

    return LocalStorage;
}]);

app.factory('WebWorker', ['$q', '$http', function ($q, $http) {
    var isWebWorkerSupported = (typeof (Worker) !== "undefined");
    if (!isWebWorkerSupported) {
        window.Worker = function () {
            function Worker(src) {
                var self = this;
                $http.get(src, { transformResponse: function (d, h) { return d } }).then(function success(response) {
                    try {
                        eval('self.o = function(){ function postMessage(e) { self.onmessage({data:e}); }\n ' + response.data + ' };');
                        self.object = new self.o();
                        self.object.postMessage = function (e) {
                            self.onmessage({data:e});
                        }
                    } catch(e) {
                        console.log("Worker error ", e);
                    }
                }, function error(response) {
                    console.log("Worker not found");
                });
            }
            Worker.prototype = {
                onmessage: function (e) {
                    console.log('Worker not implemented');
                },
                postMessage: function (e) {
                    this.object.onmessage({ data: e });
                }
            }
            return Worker;
        } ();
    }
    function WebWorker(src) {
        var self = this;
        this.callbacks = {};
        this.id = 0;
        this.worker = new Worker(src);
        this.worker.onmessage = function (e) {
            self.onmessage(e);
        };
    }
    WebWorker.prototype = {
        parse: function (e) {
            return JSON.parse(e.data);
        },
        stringify: function (data) {
            return JSON.stringify(data);
        },
        onmessage: function (e) {
            var data = this.parse(e);
            var deferred = this.callbacks[data.id];
            if (data.status !== -1) {
                deferred.resolve(data);
            } else {
                deferred.reject(data);
            }
            delete this.callbacks[data.id];
        },
        post: function (data) {
            var deferred = $q.defer();
            data.id = this.id;
            this.callbacks[this.id.toString()] = deferred;
            this.id++;
            this.worker.postMessage(this.stringify(data));
            return deferred.promise;
        },
    };
    WebWorker.isSupported = isWebWorkerSupported;
    return WebWorker;
}]);

app.factory('$httpAsync', ['$q', '$http', function ($q, $http) {
    var isWebWorkerSupported = (typeof (Worker) !== "undefined");
    if (!isWebWorkerSupported) {
        return $http;
    }
    var worker = new Worker('/js/workers/http.js');
    var callbacks = {};
    var id = 0;
    var lowercase = function (string) { return isString(string) ? string.toLowerCase() : string; };
    var trim = function (value) {
        return isString(value) ? value.trim() : value;
    };
    function $httpAsync(options) {
        var deferred = $q.defer();
        var wrap = getDefaults(options);
        wrap.id = id.toString();
        console.log('wrap', wrap);
        /*
        var xsrfValue = urlIsSameOrigin(config.url)
            ? $$cookieReader()[config.xsrfCookieName || defaults.xsrfCookieName]
            : undefined;
        if (xsrfValue) {
          reqHeaders[(config.xsrfHeaderName || defaults.xsrfHeaderName)] = xsrfValue;
        }
        $httpBackend(config.method, url, reqData, done, reqHeaders, config.timeout,
            config.withCredentials, config.responseType);
        */
        callbacks[wrap.id] = deferred;
        id++;
        worker.postMessage($httpAsync.stringify(wrap));
        return deferred.promise;
    }
    $httpAsync.get = function (url, config) {
        return $httpAsync(angular.extend({}, config || {}, {
            method: 'GET',
            url: url
        }));
    };
    $httpAsync.delete = function (url, config) {
        return $httpAsync(angular.extend({}, config || {}, {
            method: 'DELETE',
            url: url
        }));
    };
    $httpAsync.head = function (url, config) {
        return $httpAsync(angular.extend({}, config || {}, {
            method: 'HEAD',
            url: url
        }));
    };
    $httpAsync.post = function (url, data, config) {
        return $httpAsync(angular.extend({}, config || {}, {
            method: 'POST',
            data: data,
            url: url
        }));
    };
    $httpAsync.put = function (url, data, config) {
        return $httpAsync(angular.extend({}, config || {}, {
            method: 'PUT',
            data: data,
            url: url
        }));
    };
    $httpAsync.patch = function (url, data, config) {
        return $httpAsync(angular.extend({}, config || {}, {
            method: 'PATCH',
            data: data,
            url: url
        }));
    };
    $httpAsync.parse = function (e) {
        return JSON.parse(e.data);
    };
    $httpAsync.stringify = function (data) {
        return JSON.stringify(data);
    };
    $httpAsync.isSupported = isWebWorkerSupported;
    worker.onmessage = function (e) {
        var wrap = $httpAsync.parse(e);
        console.log('onmessage', wrap);
        var deferred = callbacks[wrap.id];
        var status = wrap.status >= -1 ? wrap.status : 0;
        var getter = headersGetter(wrap.response.headers);
        (isSuccess(status) ? deferred.resolve : deferred.reject)({
            data: wrap.response.data, // !!!! JSON.parse(wrap.response.data),
            headers: getter,
            status: wrap.response.status,
            statusText: wrap.response.statusText,
            config: wrap.config,
        });
        delete callbacks[wrap.id];
    }
    return $httpAsync;
    function isSuccess(status) {
        return 200 <= status && status < 300;
    }
    function createMap() {
        return Object.create(null);
    }
    function isString(value) { return typeof value === 'string'; }
    function parseHeaders(headers) {
        var parsed = createMap(), i;
        function fillInParsed(key, val) {
            if (key) {
                parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
            }
        }
        if (isString(headers)) {
            var a = headers.split('\n');
            for (var j = 0; j < a.length; j++) {
                var line = a[j];
                i = line.indexOf(':');
                fillInParsed(lowercase(trim(line.substr(0, i))), trim(line.substr(i + 1)));
            }
        } else if (isObject(headers)) {
            for (var p in headers) {
                fillInParsed(lowercase(p), trim(headers[p]));
            }
        }
        return parsed;
    }
    function headersGetter(headers) {
        var headersObj;
        return function (name) {
            if (!headersObj) headersObj = parseHeaders(headers);
            if (name) {
                var value = headersObj[lowercase(name)];
                if (value === void 0) {
                    value = null;
                }
                return value;
            }
            return headersObj;
        };
    }
    function getDefaults(options) {
        var defaults = {
            method: 'GET',
            withCredentials: false,
            responseType: 'json',
            headers: {},
            config: {}
        }
        defaults.withCredentials = $http.defaults.withCredentials;
        angular.extend(defaults.headers, $http.defaults.headers.common);
        var method = (options.method || defaults.method).toLowerCase();
        if ($http.defaults.headers[method]) {
            angular.extend(defaults.headers, $http.defaults.headers[method]);
        }
        console.log('defaults', $http.defaults);
        // defaults = angular.extend(defaults, $http.defaults);
        /*
    method{string}:                     HTTP method (e.g. 'GET', 'POST', etc)
    url:{string}:                       Absolute or relative URL of the resource that is being requested.
    params:{Object.<string|Object>}:    Map of strings or objects which will be serialized with the paramSerializer and appended as GET parameters.

    data:{string|Object}:               Data to be sent as the request message data.
    headers:{Object}:                   Map of strings or functions which return strings representing HTTP headers to send to the server. If the return value of a function is null, the header will not be sent. Functions accept a config object as an argument.

    xsrfHeaderName:{string}:            Name of HTTP header to populate with the XSRF token.
    xsrfCookieName:{string}:            Name of cookie containing the XSRF token.
    transformRequest:{function(data, headersGetter)|Array.<function(data, headersGetter)>}:         transform function or an array of such functions. The transform function takes the http request body and headers and returns its transformed (typically serialized) version. See Overriding the Default Transformations

    transformResponse:{function(data, headersGetter, status)|Array.<function(data, headersGetter, status)>}:    transform function or an array of such functions. The transform function takes the http response body, headers and status and returns its transformed (typically deserialized) version. See Overriding the Default TransformationjqLiks

    paramSerializer:{string|function(Object<string,string>):string}:        A function used to prepare the string representation of request parameters (specified as an object). If specified as string, it is interpreted as function registered with the $injector, which means you can create your own serializer by registering it as a service. The default serializer is the $httpParamSerializer; alternatively, you can use the $httpParamSerializerJQLike

    cache:{boolean|Cache}:              If true, a default $http cache will be used to cache the GET request, otherwise if a cache instance built with $cacheFactory, this cache will be used for caching.

    timeout:{number|Promise}:           timeout in milliseconds, or promise that should abort the request when resolved.
    withCredentials:{boolean}:          whether to set the withCredentials flag on the XHR object. See requests with credentials for more information.

    responseType:{string}:              see XMLHttpRequest.responseType.
        */
        options ? options = angular.extend(defaults, options) : defaults;
        return options;
    }
}]);
