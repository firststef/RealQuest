class WeatherLoader{
    constructor(){
        this.callbacks = [];
        this.callbackArguments = [];
    }
    addCallback(callback, callbackArgument){
        this.callbacks.push(callback);
        this.callbackArguments.push(callbackArgument);
    }
    loadCallbacks(){
        for (let i =0; i<this.callbacks.length; i++){
            this.callbacks[i](this.callbackArguments[i]);
        }
    }
}