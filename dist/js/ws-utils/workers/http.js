
/**
 * HTTP LOADER
 */
function parse(e) {
    return JSON.parse(e.data);
};
function stringify(wrap) {
    return JSON.stringify(wrap);
};
function post(wrap) {
    postMessage(stringify(wrap));
    if (wrap.canTerminate) {
        close();
    }
};
this.onmessage = function (e) {
    var wrap = parse(e); // { id: id, method: method, headers: headers, url: url, data: data, withCredentials: false, responseType: 'json' }     
    try {
        var xhr = new XMLHttpRequest();
        var complete = function (status, response, responseHeaders, statusText) {
            var data = {
                id: wrap.id,
                status: status,
                response: {
                    data: response,
                    headers: responseHeaders,
                    statusText: statusText,
                    status: status,
                }
            }
            post(data);
        };
        var onload = function () {
            var statusText = xhr.statusText || '';
            // responseText is the old-school way of retrieving response (supported by IE9)
            // response/responseType properties were introduced in XHR Level2 spec (supported by IE10)
            var response = ('response' in xhr) ? xhr.response : xhr.responseText;
            // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
            var status = xhr.status === 1223 ? 204 : xhr.status;
            // fix status code when it is 0 (0 status is undocumented).
            // Occurs when accessing file resources or on Android 4.1 stock browser
            // while retrieving files from application cache.
            if (status === 0) {
                status = response ? 200 : wrap.url.indexOf('file://') === 0 ? 404 : 0;
            }
            complete(status, response, xhr.getAllResponseHeaders(), statusText);
        };
        var onerror = function () {
            // The response is always empty
            // See https://xhr.spec.whatwg.org/#request-error-steps and https://fetch.spec.whatwg.org/#concept-network-error
            complete(-1, null, null, '');
        };
        xhr.onload = onload;
        xhr.onerror = onerror;
        xhr.onabort = onerror;
        var params = getParams(wrap.params) || '';
        xhr.open(wrap.method.toUpperCase(), wrap.url + params, true);
        for (var p in wrap.headers) {
            if (wrap.headers[p] !== undefined) {
                xhr.setRequestHeader(p, wrap.headers[p]);
            }
        }
        if (wrap.withCredentials) {
            xhr.withCredentials = true;
        }
        if (wrap.responseType) {
            try {
                xhr.responseType = wrap.responseType;
            } catch (e) {
                // WebKit added support for the json responseType value on 09/03/2013
                // https://bugs.webkit.org/show_bug.cgi?id=73648. Versions of Safari prior to 7 are
                // known to throw when setting the value "json" as the response type. Other older
                // browsers implementing the responseType
                //
                // The json response type can be ignored if not supported, because JSON payloads are
                // parsed on the client-side regardless.
                if (wrap.responseType !== 'json') {
                    throw e;
                }
            }
        }
        xhr.send(wrap.data !== undefined ? wrap.data : null);
    } catch (error) {
        onerror();
    }
};

/*** STUFF */
function encodeUriQuery(val, pctEncodeSpaces) {
    return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
}
function isObject(value) {
    // http://jsperf.com/isobject4
    return value !== null && typeof value === 'object';
}
function isString(value) { return typeof value === 'string'; }
function isNumber(value) { return typeof value === 'number'; }
function isDate(value) {
    return toString.call(value) === '[object Date]';
}
function isWindow(obj) {
    return obj && obj.window === obj;
}
function isScope(obj) {
    return obj && obj.$evalAsync && obj.$watch;
}
function isFile(obj) {
    return toString.call(obj) === '[object File]';
}
function isFormData(obj) {
    return toString.call(obj) === '[object FormData]';
}
function isBlob(obj) {
    return toString.call(obj) === '[object Blob]';
}
function isBoolean(value) {
    return typeof value === 'boolean';
}
function serializeValue(v) {
    if (isObject(v)) {
        return isDate(v) ? v.toISOString() : toJson(v);
    }
    return v;
}
function toJsonReplacer(key, value) {
    var val = value;
    if (typeof key === 'string' && key.charAt(0) === '$' && key.charAt(1) === '$') {
        val = undefined;
    } else if (isWindow(value)) {
        val = '$WINDOW';
    } else if (value && document === value) {
        val = '$DOCUMENT';
    } else if (isScope(value)) {
        val = '$SCOPE';
    }
    return val;
}
function toJson(obj, pretty) {
    if (typeof obj === 'undefined') return undefined;
    if (!isNumber(pretty)) {
        pretty = pretty ? 2 : null;
    }
    return JSON.stringify(obj, toJsonReplacer, pretty);
}
function fromJson(json) {
    return isString(json)
        ? JSON.parse(json)
        : json;
}
function getParams(params) {
    if (!params) return '';
    var parts = [];
    for (var p in params) {
        var value = params[p];
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                parts.push(encodeUriQuery(p) + '=' + encodeUriQuery(serializeValue(value[i])));
            };
        } else {
            parts.push(encodeUriQuery(p) + '=' + encodeUriQuery(serializeValue(value)));
        }
    };
    return '?' + parts.join('&');
}
