
/**
 * FILE BLOB LOADER
 */

function parse(e) {
    return JSON.parse(e.data);  
};
function stringify(data) {
    return JSON.stringify(data);  
};
function post(data) {
    postMessage(stringify(data));
    if (data.canTerminate) {
        close();   
    } 
};
this.onmessage = function (e) {
    var data = parse(e);
    try {
        var xhr = new XMLHttpRequest();
        var onload = function () {
            /*       
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
                status = response ? 200 : data.url.indexOf('file://') === 0 ? 404 : 0;
            }     
            */
            data.status = 200; // status;
            post(data);           
        };
        var onerror = function () {
            data.status = -1;
            data.url = null;
            post(data);                            
        }; 
        xhr.onload = onload; 
        xhr.onerror = onerror;
        // xhr.onabort = onerror;
        xhr.open('GET', data.url, true);
        xhr.responseType = 'blob';
        xhr.send();
    } catch(error) {
        onerror();
    }
};

/*
// on message
var frag = document.createDocumentFragment(),
    count = imgs.length,
    onload = function () {
        delete this.onload;
        frag.appendChild(this);
        if (--count === 0) {
            console.log('done')
            document.getElementById('output').appendChild(frag);
        }
    };

// These will come immediately from cache.
// Ensure cache is not disabled by dev tools.
imgs.forEach(function (img) {
    var el = document.createElement('img');
    // Avoid early reflows as images load without sizes. Wait for onload.
    el.onload = onload;
    el.src = img;
});
*/

/**
 * HTTP REQUEST
 */
/*
this.onmessage = function (url) {
    getDataFromURL(url.data);
}
var HttpClient = function () {
this.get = function (Url, Callback) {
        var HttpRequest = new XMLHttpRequest();
        HttpRequest.onreadystatechange = function () {
        if (HttpRequest.readyState == 4 && HttpRequest.status == 200) {
                console.log(HttpRequest.responseText.length);
                Callback(HttpRequest.responseText);
            }              
        }        
        HttpRequest.open("GET", Url, true);
        HttpRequest.send(null);
    }
}
function getDataFromURL(url) { 
    var Client = new HttpClient();
    Client.get(url, function (answer) {
        postMessage(answer);
    });  
}
*/
