class PageLoader{
    constructor(callbackObject, onCallbackEnd) {
        this.callbackObject = callbackObject;
        this.completedCallbacks = [];
        this.onCallbackEnd = onCallbackEnd;
        this.alreadyLoaded = false;
    }

    loadPage(){
        Object.values(this.callbackObject).forEach((callback) => callback());
    }

    notifyCompleted(callbackKey){
        this.completedCallbacks.push(callbackKey);
        this.handleCompleted();
    }

    isFinished(){
        return Object.keys(this.callbackObject).every((key) => this.completedCallbacks.includes(key));
    }

    isAlreadyLoaded(){
        return this.alreadyLoaded;
    }

    handleCompleted(){
        if (this.isFinished() && !this.alreadyLoaded){
            this.onCallbackEnd();
            this.alreadyLoaded = true;
        }
    }
}