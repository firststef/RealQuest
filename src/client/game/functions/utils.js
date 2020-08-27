function createFile(text, filename){
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function downloadGPX(){
    let text = GPXString;
    let filename = "track.gpx";
    createFile(text,filename);
}

function getUniqueId(){
    if( typeof getUniqueId.counter == 'undefined' ) {
        getUniqueId.counter = 0;
    }
    return getUniqueId.counter++;
}

function hash(obj){
    let stringified = JSON.stringify(obj);
    let hash = 0, i, chr;
    if (stringified.length === 0) return hash;
    for (i = 0; i < stringified.length; i++) {
        chr   = stringified.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

function isLocalStorageSupported() {
    try {
        const key = "__some_random_key__";
        localStorage.setItem(key, key);
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
}