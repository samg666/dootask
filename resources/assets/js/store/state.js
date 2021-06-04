const method = {
    setStorage(key, value) {
        return this.storage(key, value);
    },

    getStorage(key, def = null) {
        let value = this.storage(key);
        return value || def;
    },

    getStorageString(key, def = '') {
        let value = this.storage(key);
        return typeof value === "string" || typeof value === "number" ? value : def;
    },

    getStorageNumber(key, def = 0) {
        let value = this.storage(key);
        return typeof value === "number" ? value : def;
    },

    getStorageBoolean(key, def = false) {
        let value = this.storage(key);
        return typeof value === "boolean" ? value : def;
    },

    getStorageArray(key, def = {}) {
        let value = this.storage(key);
        return this.isArray(value) ? value : def;
    },

    getStorageJson(key, def = {}) {
        let value = this.storage(key);
        return this.isJson(value) ? value : def;
    },

    isArray(obj) {
        return typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == '[object array]' && typeof obj.length == "number";
    },

    isJson(obj) {
        return typeof (obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && typeof obj.length == "undefined";
    },

    inArray(key, array) {
        if (!this.isArray(array)) {
            return false;
        }
        return array.includes(key);
    },

    storage(key, value) {
        let keyName = 'state';
        if (typeof value === 'undefined') {
            return this.loadFromlLocal('__::', key, '', '__' + keyName + '__');
        } else {
            this.savaToLocal('__::', key, value, '__' + keyName + '__');
        }
    },

    savaToLocal(id, key, value, keyName) {
        try {
            if (typeof keyName === 'undefined') keyName = '__seller__';
            let seller = window.localStorage[keyName];
            if (!seller) {
                seller = {};
                seller[id] = {};
            } else {
                seller = JSON.parse(seller);
                if (!seller[id]) {
                    seller[id] = {};
                }
            }
            seller[id][key] = value;
            window.localStorage[keyName] = JSON.stringify(seller);
        } catch (e) {
        }
    },

    loadFromlLocal(id, key, def, keyName) {
        try {
            if (typeof keyName === 'undefined') keyName = '__seller__';
            let seller = window.localStorage[keyName];
            if (!seller) {
                return def;
            }
            seller = JSON.parse(seller)[id];
            if (!seller || typeof seller[key] === 'undefined') {
                return def;
            }
            return seller[key];
        } catch (e) {
            return def;
        }
    },

    runNum(str, fixed) {
        let _s = Number(str);
        if (_s + "" === "NaN") {
            _s = 0;
        }
        if (/^[0-9]*[1-9][0-9]*$/.test(fixed)) {
            _s = _s.toFixed(fixed);
            let rs = _s.indexOf('.');
            if (rs < 0) {
                _s += ".";
                for (let i = 0; i < fixed; i++) {
                    _s += "0";
                }
            }
        }
        return _s;
    },

    cloneJSON(myObj) {
        if (typeof (myObj) !== 'object') return myObj;
        if (myObj === null) return myObj;
        return this.jsonParse(this.jsonStringify(myObj))
    },

    jsonParse(str, defaultVal) {
        if (str === null) {
            return defaultVal ? defaultVal : {};
        }
        if (typeof str === "object") {
            return str;
        }
        try {
            return JSON.parse(str.replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
        } catch (e) {
            return defaultVal ? defaultVal : {};
        }
    },

    jsonStringify(json, defaultVal) {
        if (typeof json !== 'object') {
            return json;
        }
        try {
            return JSON.stringify(json);
        } catch (e) {
            return defaultVal ? defaultVal : "";
        }
    },
};

// 方法类
const state = {
    method
};

// Boolean变量
[
    'projectChatShow',      // 项目聊天显示
    'projectListPanel',     // 项目面板显示类型
    'taskMyShow',           // 项目面板显示我的任务
    'taskUndoneShow',       // 项目面板显示未完成任务
    'taskCompletedShow'     // 项目面板显示已完成任务
].forEach((key) => {
    state[key] = state.method.getStorageBoolean('boolean:' + key, true)
})

// 会员信息
state.userInfo = state.method.getStorageJson('userInfo');
state.userId = state.userInfo.userid = state.method.runNum(state.userInfo.userid);
state.userToken = state.userInfo.token;
state.userIsAdmin = state.method.inArray('admin', state.userInfo.identity);

// Websocket
state.ws = null;
state.wsMsg = {};
state.wsCall = {};
state.wsTimeout = null;
state.wsListener = {};

// 项目信息
state.projectLoad = 0;
state.projectList = [];
state.projectDetail = {
    id: 0,
    project_column: [],
    project_user: []
};
state.projectMsgUnread = 0;

// 会话消息
state.dialogId = 0;
state.dialogLoad = 0;
state.dialogList = [];

// 任务优先级
state.taskPriority = [];

// 其他
state.cacheProject = {};
state.cacheUserBasic = {};
state.cacheDialog = {};

export default state