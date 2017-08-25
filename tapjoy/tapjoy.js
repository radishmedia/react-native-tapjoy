/**
 * Created by marius on 06/03/17.
 */

import Singleton from './singleton'
import Log from './log'
import promisify from './promisify'

import {NativeEventEmitter, AsyncStorage, NativeModules, Platform} from 'react-native';

const TapjoyModule = NativeModules.TapjoyModule;
const TapjoyModuleEvt = new NativeEventEmitter(TapjoyModule);

let log;
export class Tapjoy extends Singleton {

    constructor(options) {
        let instance = super(options);
        this.tapjoy = TapjoyModule;

        instance.options = options;
        instance._debug = options.debug;

        Log.enable(options.debug);
        log = instance._log = new Log('tapjoy');

        instance.eventHandlers = {};
    }

    initialise() {
        if (Platform.OS === 'android' && this.options.gcmSenderIdAndroid != null) {
            this.tapjoy.registerForPushNotifications(this.options.gcmSenderIdAndroid);
        }

        let sdkKey = Platform.OS === 'ios' ? this.options.sdkKeyIos : this.options.sdkKeyAndroid;
        return promisify('initialise', this.tapjoy)(sdkKey, this.options.debug);
    }

    spendCurrency(amount) {
        return this.tapjoy.spendCurrencyAction(amount).catch((error) => {
                console.log(error);
            });
    }

    requestContent(name) {
        return promisify('requestContent', this.tapjoy)(name);
    }

    addPlacement(name, callback) {
        const sub = this._on(name, callback, TapjoyModuleEvt);
        this.tapjoy.addPlacement(name, callback);
        return promisify(() => sub, this.tapjoy)(sub);
    }

    showPlacement(name) {
        return promisify('showPlacement', this.tapjoy)(name);
    }

    getCurrencyBalance() {
        return promisify('getCurrencyBalance', this.tapjoy)();
    }

    listenForEarnedCurrency(callback) {
        const sub = this._on('earnedCurrency', callback, TapjoyModuleEvt);
        this.tapjoy.listenForEarnedCurrency(callback);
        return promisify(() => sub, this.tapjoy)(sub);
    }

    _addConstantExports(constants) {
        Object.keys(constants).forEach(name => {
            TapjoyModule[name] = constants[name];
        });
    }

    _addToTapjoyInstance(...methods) {
        methods.forEach(name => {
            this.tapjoy[name] = this[name].bind(this);
        })
    }

    whenReady(fn) {
        return this.tapjoy.configurePromise.then(fn);
    }

    // Event handler
    // proxy to the tapjoy instance
    _on(name, cb) {
        return new Promise((resolve) => {
            const sub = TapjoyModuleEvt.addListener(name, cb);
            this.eventHandlers[name] = sub;
            resolve(sub);
        })
    }
}

export default Tapjoy
