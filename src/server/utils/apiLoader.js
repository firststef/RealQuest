class ApiLoader {
    constructor(callbackObject, onCallbackEnd, context) {
        this.callbackObject = callbackObject;
        this.completedCallbacks = [];
        this.onCallbackEnd = onCallbackEnd;
        this.context = context;
        this.context.apiLoader = this;
    }

    load() {
        Object.values(this.callbackObject).forEach((s) => s.callback(this.context, s.onFail));
    }

    notifyCompleted(callbackKey) {
        this.completedCallbacks.push(callbackKey);
        this.handleCompleted();
    }

    notifyFailed(callback, param){
        if (this.failed !== true){
            callback(param);
        }
        this.failed = true;
    }

    isFinished() {
        return Object.keys(this.callbackObject).every((key) => this.completedCallbacks.includes(key));
    }

    handleCompleted() {
        if (this.isFinished()) {
            this.onCallbackEnd(this.context);
        }
    }
}

module.exports = ApiLoader;