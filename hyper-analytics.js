(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/** @namespace extend-me **/

/** @summary Extends an existing constructor into a new constructor.
 *
 * @returns {ChildConstructor} A new constructor, extended from the given context, possibly with some prototype additions.
 *
 * @desc Extends "objects" (constructors), with optional additional code, optional prototype additions, and optional prototype member aliases.
 *
 * > CAVEAT: Not to be confused with Underscore-style .extend() which is something else entirely. I've used the name "extend" here because other packages (like Backbone.js) use it this way. You are free to call it whatever you want when you "require" it, such as `var inherits = require('extend')`.
 *
 * Provide a constructor as the context and any prototype additions you require in the first argument.
 *
 * For example, if you wish to be able to extend `BaseConstructor` to a new constructor with prototype overrides and/or additions, basic usage is:
 *
 * ```javascript
 * var Base = require('extend-me').Base;
 * var BaseConstructor = Base.extend(basePrototype); // mixes in .extend
 * var ChildConstructor = BaseConstructor.extend(childPrototypeOverridesAndAdditions);
 * var GrandchildConstructor = ChildConstructor.extend(grandchildPrototypeOverridesAndAdditions);
 * ```
 *
 * This function (`extend()`) is added to the new extended object constructor as a property `.extend`, essentially making the object constructor itself easily "extendable." (Note: This is a property of each constructor and not a method of its prototype!)
 *
 * @param {string} [extendedClassName] - This is simply added to the prototype as $$CLASS_NAME. Useful for debugging because all derived constructors appear to have the same name ("Constructor") in the debugger. This property is ignored unless `extend.debug` is explicitly set to a truthy value.
 *
 * @param {extendedPrototypeAdditionsObject} [prototypeAdditions] - Object with members to copy to new constructor's prototype. Most members will be copied to the prototype. Some members, however, have special meanings as explained in the {@link extendedPrototypeAdditionsObject|type definition} (and may or may not be copied to the prototype).
 *
 * @property {boolean} [debug] - See parameter `extendedClassName` _(above)_.
 *
 * @property {object} Base - A convenient base class from which all other classes can be extended.
 *
 * @memberOf extend-me
 */
function extend(extendedClassName, prototypeAdditions) {
    switch (arguments.length) {
        case 0:
            prototypeAdditions = {};
            break;
        case 1:
            prototypeAdditions = extendedClassName;
            if (typeof prototypeAdditions !== 'object') {
                throw 'Single parameter overload must be object.';
            }
            extendedClassName = undefined;
            break;
        case 2:
            if (typeof extendedClassName !== 'string' || typeof prototypeAdditions !== 'object') {
                throw 'Two parameter overload must be string, object.';
            }
            break;
        default:
            throw 'Too many parameters';
    }

    function Constructor() {
        if (prototypeAdditions.preInitialize) {
            prototypeAdditions.preInitialize.apply(this, arguments);
        }

        initializePrototypeChain.apply(this, arguments);

        if (prototypeAdditions.postInitialize) {
            prototypeAdditions.postInitialize.apply(this, arguments);
        }
    }

    Constructor.extend = extend;

    var prototype = Constructor.prototype = Object.create(this.prototype);
    prototype.constructor = Constructor;

    if (extendedClassName && extend.debug) {
        prototype.$$CLASS_NAME = extendedClassName;
    }

    for (var key in prototypeAdditions) {
        if (prototypeAdditions.hasOwnProperty(key)) {
            var value = prototypeAdditions[key];
            switch (key) {
                case 'initializeOwn':
                    // already called above; not needed in prototype
                    break;
                case 'aliases':
                    for (var alias in value) {
                        if (value.hasOwnProperty(alias)) {
                            makeAlias(value[alias], alias);
                        }
                    }
                    break;
                default:
                    if (typeof value === 'string' && value[0] === '#') {
                        makeAlias(value, key.substr(1));
                    } else {
                        prototype[key] = value;
                    }
            }
        }
    }

    return Constructor;

    function makeAlias(value, key) { // eslint-disable-line no-shadow
        prototype[key] = prototypeAdditions[value];
    }
}

function Base() {}
Base.prototype = {
    constructor: Base.prototype.constructor,
    get super() {
        return Object.getPrototypeOf(Object.getPrototypeOf(this));
    }
};
Base.extend = extend;
extend.Base = Base;

/** @typedef {function} extendedConstructor
 * @property prototype.super - A reference to the prototype this constructor was extended from.
 * @property [extend] - If `prototypeAdditions.extendable` was truthy, this will be a reference to {@link extend.extend|extend}.
 */

/** @typedef {object} extendedPrototypeAdditionsObject
 * @property {function} [initialize] - Additional constructor code for new object. This method is added to the new constructor's prototype. Gets passed new object as context + same args as constructor itself. Called on instantiation after similar function in all ancestors called with same signature.
 * @property {function} [initializeOwn] - Additional constructor code for new object. This method is added to the new constructor's prototype. Gets passed new object as context + same args as constructor itself. Called on instantiation after (all) the `initialize` function(s).
 * @property {object} [aliases] - Hash of aliases for prototype members in form `{ key: 'member', ... }` where `key` is the name of an alieas and `'member'` is the name of an existing member in the prototype. Each such key is added to the prototype as a reference to the named member. (The `aliases` object itself is *not* added to prototype.) Alternatively:
 * @property {string} [keys] - Arbitrary property names defined here with string values starting with a `#` character will alias the actual properties named in the strings (following the `#`). This is an alternative to providing an `aliases` hash, perhaps simpler (though subtler). (Use arbitrary identifiers here; don't use the name `keys`!)
 * @property {*} [arbitraryProperties] - Any additional arbitrary properties defined here will be added to the new constructor's prototype. (Use arbitrary identifiers here; don't use the name `aribitraryProperties`!)
 */

/** @summary Call all `initialize` methods found in prototype chain.
 * @desc This recursive routine is called by the constructor.
 * 1. Walks back the prototype chain to `Object`'s prototype
 * 2. Walks forward to new object, calling any `initialize` methods it finds along the way with the same context and arguments with which the constructor was called.
 * @private
 * @memberOf extend-me
 */
function initializePrototypeChain() {
    var term = this,
        args = arguments;
    recur(term);

    function recur(obj) {
        var proto = Object.getPrototypeOf(obj);
        if (proto.constructor !== Object) {
            recur(proto);
            if (proto.hasOwnProperty('initialize')) {
                proto.initialize.apply(term, args);
            }
        }
    }
}

module.exports = extend;

},{}],2:[function(require,module,exports){
'use strict';

window.hyperAnalytics = {
    JSDataSource: require('./js/DataSource'),
    DataSourceSorter: require('./js/DataSourceSorter'),
    DataSourceSorterComposite: require('./js/DataSourceSorterComposite'),
    DataSourceGlobalFilter: require('./js/DataSourceGlobalFilter'),
    DataSourceAggregator: require('./js/DataSourceAggregator'),
    util: {
        aggregations: require('./js/util/aggregations'),
        Mappy: require('./js/util/Mappy'),
        stableSort: require('./js/util/stableSort'),
        headerify: require('./js/util/headerify')
    }
};

},{"./js/DataSource":7,"./js/DataSourceAggregator":8,"./js/DataSourceGlobalFilter":9,"./js/DataSourceSorter":11,"./js/DataSourceSorterComposite":12,"./js/util/Mappy":13,"./js/util/aggregations":14,"./js/util/headerify":15,"./js/util/stableSort":16}],3:[function(require,module,exports){
'use strict';

var Base = require('extend-me').Base;

/**
 * See {@link DataBaseNode#initialize|initialize()} method for parameters.
 * @constructor
 */
var DataNodeBase = Base.extend('DataNodeBase', {

    isNullObject: false,

    INDENT: '   ', // 3 spaces

    /**
     * @memberOf DataNodeBase.prototype
     * @param {string} key
     */
    initialize: function(key) {
        /**
         * @memberOf DataNodeBase.prototype
         * @type {string}
         */

        this.label = key;

        /**
         * @memberOf DataNodeBase.prototype
         * @type {string[]}
         * @default false
         */
        this.data = ['']; // TODO: Why is this first element needed?

        /**
         * @memberOf DataNodeBase.prototype
         * @type {number[]}
         * @default ['']
         */
        this.index = []; // TODO: formerly rowIndex

        /**
         * @memberOf DataNodeBase.prototype
         * @type {boolean}
         * @default false
         */
        this.hasChildren = false; // TODO: Where/how is this used?

        /**
         * @memberOf DataNodeBase.prototype
         * @type {number}
         * @default 0
         */
        this.depth = 0;

        /**
         * @memberOf DataNodeBase.prototype
         * @type {number}
         * @default 1
         */
        this.height = 1;

        /**
         * @memberOf DataNodeBase.prototype
         * @type {boolean}
         * @default false
         */
        this.expanded = false;
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @param x
     * @returns {*}
     */
    getValue: function(x) {
        return this.data[x];
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @param depth
     */
    toArray: function(depth) {
        this.depth = depth;
        this.data[0] = this.computeDepthString();
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @returns {string}
     */
    computeDepthString: function() {
        return Array(this.depth + 1).join(this.INDENT) + '  ' + this.label;
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @returns {number}
     */
    computeHeight: function() {
        return 1;
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @returns {Array}
     */
    getIndex: function() { // TODO: formerly getAllRowIndexes
        return this.index;
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @param aggregator
     */
    computeAggregates: function(aggregator) {
        var index = this.getIndex();

        if (index.length) {
            var groupsOffset = Number(aggregator.hasGroups());

            // redimension the data
            var data = this.data;
            data.length = groupsOffset + aggregator.aggregates.length;

            var sorter = aggregator.sorterInstance;
            sorter.index = index;

            aggregator.aggregates.forEach(function(aggregate, i) {
                data[groupsOffset + i] = aggregate(sorter);
            });
        }
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @param aggregator
     */
    buildView: function(aggregator) {
        aggregator.addView(this);
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     */
    toggleExpansionState: function() { /* aggregator */
        //do nothing by default
    }

});

//DataNodeBase.prototype.applyAggregates = DataNodeBase.prototype.computeAggregates;

module.exports = DataNodeBase;

},{"extend-me":1}],4:[function(require,module,exports){
'use strict';

var Map = require('./util/Mappy');
var DataNodeBase = require('./DataNodeBase');

var expandedMap = {
    true: '\u25bc', // BLACK DOWN-POINTING TRIANGLE aka '▼'
    false: '\u25b6' // BLACK RIGHT-POINTING TRIANGLE aka '▶'
};

/**
 * > See {@link DataNodeGroup#initialize|initialize()} method for constructor parameters.
 * @constructor
 * @extends DataNodeBase
 */
var DataNodeGroup = DataNodeBase.extend('DataNodeGroup', {

    extendable: true,

    /**
     * @memberOf DataNodeGroup.prototype
     * @param key
     */
    initialize: function(key) {
        this.children = new Map();
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @param depth
     */
    toArray: function(depth) {
        this.depth = depth;
        this.children = this.children.values;
        this.children.forEach(function(child) {
            child.toArray(depth + 1);
        });
        this.data[0] = this.computeDepthString();
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @returns {string}
     */
    computeDepthString: function() {
        return Array(this.depth + 1).join(this.INDENT) +
            expandedMap[this.expanded] + ' ' +
            this.label;
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @returns {*}
     */
    getIndex: function() {
        if (this.index.length === 0) {
            this.index = this.computeIndex();
        }
        return this.index;
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @returns {Array}
     */
    computeIndex: function() { // TODO: formerly computeAllRowIndexes
        var result = [];
        result.append = append;
        this.children.forEach(function(child) {
            result.append(child.getIndex());
        });
        return result;
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @param aggregator
     */
    toggleExpansionState: function(aggregator) { /* aggregator */
        this.expanded = !this.expanded;
        this.data[0] = this.computeDepthString();
        if (this.expanded) {
            this.computeAggregates(aggregator);
        }
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @param aggregator
     */
    computeAggregates: function(aggregator) {
        DataNodeBase.prototype.computeAggregates.call(this, aggregator); // call base class's version
        if (this.expanded) {
            this.children.forEach(function(child) {
                child.computeAggregates(aggregator);
            });
        }
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @param aggregator
     */
    buildView: function(aggregator) {
        aggregator.view.push(this);
        if (this.expanded) {
            this.children.forEach(function(child) {
                child.buildView(aggregator);
            });
        }
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @returns {number}
     */
    computeHeight: function() {
        var height = 1;

        if (this.expanded) {
            this.children.forEach(function(child) {
                height = height + child.computeHeight();
            });
        }

        return (this.height = height);
    }

});

/**
 * @private
 * @summary Array mixin to append another array to end of `this` one.
 * @desc Appends in place, unlike `this.concat()` which creates a new array.
 * Uses less memory than concat, important when `appendix` is huge.
 * > CAUTION: Mutates `this` array!
 * @param {Array} appendix
 * @returns {Array} Reference to `this` (for convenience)
 */
function append(appendix) {
    this.splice.bind(this, this.length, 0).apply(this, appendix);
    return this;
}

module.exports = DataNodeGroup;

},{"./DataNodeBase":3,"./util/Mappy":13}],5:[function(require,module,exports){
'use strict';

var DataNodeBase = require('./DataNodeBase');

/**
 * @constructor
 * @extends DataNodeBase
 */
var DataNodeLeaf = DataNodeBase.extend('DataNodeLeaf', {

    /**
     * @memberOf DataNodeLeaf.prototype
     * @param depth
     */
    toArray: function(depth) {
        this.depth = depth;
        this.data[0] = this.computeDepthString();
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @returns {numer[]}
     */
    getIndex: function() {
        return this.index;
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @param aggregator
     */
    buildView: function(aggregator) {
        aggregator.addView(this);
    },

    /**
     * @memberOf DataNodeLeaf.prototype
     * @returns {number}
     */
    computeHeight: function() {
        return 1;
    }

});

module.exports = DataNodeLeaf;

},{"./DataNodeBase":3}],6:[function(require,module,exports){
'use strict';

var DataNodeGroup = require('./DataNodeGroup');

/**
 * See {@link DataNodeGroup#initialize|initialize()} method for parameters.
 * @constructor
 * @extends DataNodeGroup
 */
var DataNodeTree = DataNodeGroup.extend('DataNodeTree', {

    /**
     * @memberOf DataNodeGroup.prototype
     * @param {string} key
     */
    initialize: function(key) {
        this.height = 0;
        this.expanded = true;
    },

    /**
     * @memberOf DataNodeGroup.prototype
     */
    toArray: function() {
        this.children = this.children.values;
        this.children.forEach(function(child) {
            child.toArray(0);
        });
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @param aggregator
     */
    buildView: function(aggregator) {
        this.children.forEach(function(child) {
            child.buildView(aggregator);
        });
    },

    /**
     * @memberOf DataNodeGroup.prototype
     * @returns {number}
     */
    computeHeight: function() {
        var height = 1;

        this.children.forEach(function(child) {
            height = height + child.computeHeight();
        });

        return (this.height = height);
    }

});

module.exports = DataNodeTree;

},{"./DataNodeGroup":4}],7:[function(require,module,exports){
'use strict';

var headerify = require('./util/headerify');

/**
 * @constructor
 * @param {object[]} data
 * @param {string[]} fields
 */
function DataSource(data, fields) {
    /**
     * @type {string[]}
     */
    this.fields = fields || computeFieldNames(data[0]);

    /**
     * @type {object[]}
     */
    this.data = data;
}

DataSource.prototype = {
    constructor: DataSource.prototype.constructor, // preserve constructor

    isNullObject: false,

    /**
     * @memberOf DataSource.prototype
     * @param y
     * @returns {object[]}
     */
    getRow: function(y) {
        return this.data[y];
    },

    /**
     * @memberOf DataSource.prototype
     * @param x
     * @param y
     * @returns {*}
     */
    getValue: function(x, y) {
        var row = this.getRow(y);
        if (!row) {
            return null;
        }
        return row[this.fields[x]];
    },

    /**
     * @memberOf DataSource.prototype
     * @param {number} x
     * @param {number} y
     * @param value
     */
    setValue: function(x, y, value) {
        this.getRow(y)[this.fields[x]] = value;
    },

    /**
     * @memberOf DataSource.prototype
     * @returns {number}
     */
    getRowCount: function() {
        return this.data.length;
    },

    /**
     * @memberOf DataSource.prototype
     * @returns {number}
     */
    getColumnCount: function() {
        return this.getFields().length;
    },

    /**
     * @memberOf DataSource.prototype
     * @returns {number[]}
     */
    getFields: function() {
        return this.fields;
    },

    /**
     * @memberOf DataSource.prototype
     * @returns {string[]}
     */
    getHeaders: function() {
        return (
            this.headers = this.headers || this.getDefaultHeaders().map(function(each) {
                return headerify(each);
            })
        );
    },

    /**
     * @memberOf DataSource.prototype
     * @returns {string[]}
     */
    getDefaultHeaders: function() {
        return this.getFields();
    },

    /**
     * @memberOf DataSource.prototype
     * @param {string[]} fields
     */
    setFields: function(fields) {
        this.fields = fields;
    },

    /**
     * @memberOf DataSource.prototype
     * @param {string[]} headers
     */
    setHeaders: function(headers) {
        if (!(headers instanceof Array)) {
            error('setHeaders', 'param #1 `headers` not array');
        }
        this.headers = headers;
    },

    /**
     * @memberOf DataSource.prototype
     */
    getGrandTotals: function() {
        //nothing here
    },

    /**
     * @memberOf DataSource.prototype
     * @param arrayOfUniformObjects
     */
    setData: function(arrayOfUniformObjects) {
        this.data = arrayOfUniformObjects;
    }
};

function error(methodName, message) {
    throw new Error('DataSource.' + methodName + ': ' + message);
}

/**
 * @private
 * @param {object} object
 * @returns {string[]}
 */
function computeFieldNames(object) {
    return Object.getOwnPropertyNames(object || []).filter(function(e) {
        return e.substr(0, 2) !== '__';
    });
}

module.exports = DataSource;

},{"./util/headerify":15}],8:[function(require,module,exports){
'use strict';

var DataSourceSorter = require('./DataSourceSorter');
var DataNodeTree = require('./DataNodeTree');
var DataNodeGroup = require('./DataNodeGroup');
var DataNodeLeaf = require('./DataNodeLeaf');
var headerify = require('./util/headerify');

/**
 * @constructor
 * @param {DataSource} dataSource
 */
function DataSourceAggregator(dataSource) {

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {DataSource}
     */
    this.dataSource = dataSource;

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {DataNodeTree}
     */
    this.tree = new DataNodeTree('Totals');

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {number[]}
     * @default []
     */
    this.index = [];

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {Array}
     * @default []
     */
    this.aggregates = [];

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {string[]}
     * @default []
     */
    this.headers = [];

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {Array}
     * @default []
     */
    this.groupBys = [];

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {Array}
     * @default []
     */
    this.view = [];

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {object}
     * @default {}
     */
    this.sorterInstance = {};

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {boolean}
     * @default true
     */
    this.presortGroups = true;

    /**
     * @memberOf DataSourceAggregator.prototype
     * @type {object}
     * @default {}
     */
    this.lastAggregate = {};

    this.setAggregates({});
}

DataSourceAggregator.prototype = {
    constructor: DataSourceAggregator.prototype.constructor, // preserve constructor

    isNullObject: false,

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param aggregations
     */
    setAggregates: function(aggregations) {
        this.lastAggregate = aggregations;
        this.clearAggregations();
        this.headers.length = 0;

        if (this.hasGroups()) {
            this.headers.push('Tree');
        }

        for (var key in aggregations) {
            this.addAggregate(key, aggregations[key]);
        }
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param label
     * @param func
     */
    addAggregate: function(label, func) {
        this.headers.push(headerify(label));
        this.aggregates.push(func);
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param columnIndexArray
     */
    setGroupBys: function(columnIndexArray) {
        var groupBys = this.groupBys;
        groupBys.length = 0;
        columnIndexArray.forEach(function(columnIndex) {
            groupBys.push(columnIndex);
        });
        this.setAggregates(this.lastAggregate);
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param index
     */
    addGroupBy: function(index) {
        this.groupBys.push(index);
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {boolean}
     */
    hasGroups: function() {
        return !!this.groupBys.length;
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {boolean}
     */
    hasAggregates: function() {
        return !!this.aggregates.length;
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     */
    apply: function() {
        this.buildGroupTree();
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     */
    clearGroups: function() {
        this.groupBys.length = 0;
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     */
    clearAggregations: function() {
        this.aggregates.length = 0;
        this.headers.length = 0;
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     */
    buildGroupTree: function() {
        var groupBys = this.groupBys,
            leafDepth = groupBys.length - 1,
            source = this.dataSource,
            rowCount = source.getRowCount(),
            tree = this.tree = new DataNodeTree('Totals');

        // first sort data
        if (this.presortGroups) {
            groupBys.reverse().forEach(function(groupBy) {
                source = new DataSourceSorter(source);
                source.sortOn(groupBy);
            });
        }

        for (var r = 0; r < rowCount; r++) {
            var path = tree;

            groupBys.forEach(function(g, c) { // eslint-disable-line no-loop-func
                var key = source.getValue(g, r),
                    factoryDataNode = (c === leafDepth) ? factoryDataNodeLeaf : factoryDataNodeGroup;
                path = path.children.getIfUndefined(key, factoryDataNode);
            });

            path.index.push(r);
        }

        this.sorterInstance = new DataSourceSorter(source);
        tree.toArray();
        tree.computeAggregates(this);
        this.buildView();
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param dataNode
     */
    addView: function(dataNode) {
        this.view.push(dataNode);
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     */
    buildView: function() {
        this.view.length = 0;
        this.tree.computeHeight();
        this.tree.buildView(this);
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {*|boolean}
     */
    viewMakesSense: function() {
        return this.hasAggregates();
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param x
     * @param y
     * @returns {*}
     */
    getValue: function(x, y) {
        if (!this.viewMakesSense()) {
            return this.dataSource.getValue(x, y);
        }

        var row = this.view[y];

        return row ? row.getValue(x) : null; // TODO: what kind of object is row... ? should it be unfiltred?
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param x
     * @param y
     * @param value
     * @returns {*}
     */
    setValue: function(x, y, value) {
        if (!this.viewMakesSense()) {
            return this.dataSource.setValue(x, y, value);
        }
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {*}
     */
    getColumnCount: function() {
        if (!this.viewMakesSense()) {
            return this.dataSource.getColumnCount();
        }
        return this.getHeaders().length;
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {*}
     */
    getRowCount: function() {
        if (!this.viewMakesSense()) {
            return this.dataSource.getRowCount();
        }
        return this.view.length; //header column
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param y
     */
    click: function(y) {
        var group = this.view[y];
        group.toggleExpansionState(this);
        this.buildView();
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {*}
     */
    getHeaders: function() {
        if (!this.viewMakesSense()) {
            return this.dataSource.getHeaders();
        }
        return this.headers; // TODO: Views override dataSource headers with their own headers?
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param headers
     */
    setHeaders: function(headers) {
        this.dataSource.setHeaders(headers);
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {*|number[]}
     */
    getFields: function() {
        return this.dataSource.getFields();
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param fields
     * @returns {*}
     */
    setFields: function(fields) {
        return this.dataSource.setFields(fields);
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @returns {object[]}
     */
    getGrandTotals: function() {
        var view = this.tree;
        return [view.data];
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param y
     * @returns {*}
     */
    getRow: function(y) {
        if (!this.viewMakesSense()) {
            return this.dataSource.getRow(y);
        }

        var rollups = this.view[y];

        return rollups ? rollups : this.tree;
    },

    /**
     * @memberOf DataSourceAggregator.prototype
     * @param arrayOfUniformObjects
     */
    setData: function(arrayOfUniformObjects) {
        this.dataSource.setData(arrayOfUniformObjects);
        this.apply();
    }
};

function factoryDataNodeLeaf(key) {
    return new DataNodeLeaf(key);
}

function factoryDataNodeGroup(key) {
    return new DataNodeGroup(key);
}

module.exports = DataSourceAggregator;

},{"./DataNodeGroup":4,"./DataNodeLeaf":5,"./DataNodeTree":6,"./DataSourceSorter":11,"./util/headerify":15}],9:[function(require,module,exports){
'use strict';

var DataSourceIndexed = require('./DataSourceIndexed');

/**
 * @typedef {function} filterFunction
 * @param cellValue
 * @param {object} rowObject - Reference to `this.dataSource.data[r]`.
 * @param {number} r - Row number (index within `this.dataSource.data`).
 */

/**
 * @constructor
 * @extends DataSourceIndexed
 */
var DataSourceGlobalFilter = DataSourceIndexed.extend('DataSourceGlobalFilter', {

    /**
     *
     * @memberOf DataSourceGlobalFilter.prototype
     * @param {object} [filter] - If undefined, deletes filter.
     */
    set: function(filter) {
        if (filter) {
            /**
             * @type {filterFunction}
             * @memberOf DataSourceGlobalFilter.prototype
             */
            this.filter = filter;
        } else {
            delete this.filter;
        }
    },

    get: function(filter) {
        return this.filter;
    },

    /**
     *
     * @memberOf DataSourceGlobalFilter.prototype
     */
    apply: function() {
        if (!this.filter) {
            this.clearIndex();
        } else {
            this.buildIndex(function applyFilter(r, rowObject) {
                return this.filter.test(rowObject);
            });
        }
    },

    /**
     *
     * @memberOf DataSourceGlobalFilter.prototype
     * @returns {number}
     */
    getRowCount: function() {
        return this.filter ? this.index.length : this.dataSource.getRowCount();
    }
});

module.exports = DataSourceGlobalFilter;

},{"./DataSourceIndexed":10}],10:[function(require,module,exports){
'use strict';

var Base = require('extend-me').Base;

/**
 * @constructor
 */
var DataSourceIndexed = Base.extend('DataSourceIndexed', {

    /**
     *
     */
    isNullObject: false,

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param dataSource
     */
    initialize: function(dataSource) {
        this.dataSource = dataSource;
        this.index = [];
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param y
     * @returns {*}
     */
    transposeY: function(y) {
        return this.index.length ? this.index[y] : y;
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param y
     * @returns {object}
     */
    getRow: function(y) {
        return this.dataSource.getRow(this.transposeY(y));
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param x
     * @param y
     * @returns {*|Mixed}
     */
    getValue: function(x, y) {
        return this.dataSource.getValue(x, this.transposeY(y));
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param {number} x
     * @param {number} y
     * @param {*} value
     */
    setValue: function(x, y, value) {
        this.dataSource.setValue(x, this.transposeY(y), value);
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @returns {Number|*}
     */
    getRowCount: function() {
        return this.index.length || this.dataSource.getRowCount();
    },

    /**
     *
     * @returns {*}
     */
    getColumnCount: function() {
        return this.dataSource.getColumnCount();
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @returns {*}
     */
    getFields: function() {
        return this.dataSource.getFields();
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param fields
     * @returns {*}
     */
    setFields: function(fields) {
        return this.dataSource.setFields(fields);
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param {string[]} headers
     * @returns {string[]}
     */
    setHeaders: function(headers) {
        return this.dataSource.setHeaders(headers);
    },

    /**
     *
     * @returns {string[]}
     */
    getHeaders: function() {
        return this.dataSource.getHeaders();
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @returns {*}
     */
    getGrandTotals: function() {
        return this.dataSource.getGrandTotals();
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param {object[]} arrayOfUniformObjects
     * @returns {object[]}
     */
    setData: function(arrayOfUniformObjects) {
        return this.dataSource.setData(arrayOfUniformObjects);
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     */
    clearIndex: function() {
        this.index.length = 0;
    },

    /**
     * @memberOf DataSourceIndexed.prototype
     * @param {filterPredicate} predicate
     * @returns {number[]}
     */
    buildIndex: function(predicate) {
        var rowCount = this.dataSource.getRowCount(),
            index = this.index;

        this.clearIndex();

        for (var r = 0; r < rowCount; r++) {
            if (!predicate || predicate.call(this, r, this.dataSource.getRow(r))) {
                index.push(r);
            }
        }

        return index;
    }

});

/** @typedef {function} filterPredicate
 * @summary Applies filter to given row.
 * @param {nubmer} r - Row index of row data within rows array `this.dataSource.data[]`.
 * @param {object} rowObject - Row data; element of `this.dataSource.data[]`.
 * @returns {boolean} Row qualifies (passes through filter).
 */

module.exports = DataSourceIndexed;

},{"extend-me":1}],11:[function(require,module,exports){
'use strict';

var DataSourceIndexed = require('./DataSourceIndexed');
var stableSort = require('./util/stableSort');

/**
 * @constructor
 * @extends DataSourceIndexed
 */
var DataSourceSorter = DataSourceIndexed.extend('DataSourceSorter', {

    /**
     * @memberOf DataSourceSorter.prototype
     */
    initialize: function() {
        /**
         * @memberOf DataSourceSorter.prototype
         * @type {boolean}
         */
        this.descendingSort = false; // TODO: this does not seem to be in use
    },

    /**
     * @memberOf DataSourceSorter.prototype
     * @param {number} colIdx
     * @param {number} [direction=1]
     */
    sortOn: function(colIdx, direction) {
        switch (direction) {
            case 0:
                this.clearIndex();
                break;

            case undefined:
            case 1:
            case -1:
                var self = this; // for use in getValue
                stableSort.sort(this.buildIndex(), getValue, direction);
                break;
        }

        function getValue(rowIdx) {
            return valOrFuncCall(self.dataSource.getValue(colIdx, rowIdx));
        }
    }
});

/**
 * @private
 * @param {*|function} valOrFunc
 * @returns {*}
 */
function valOrFuncCall(valOrFunc) {
    return typeof valOrFunc === 'function' ? valOrFunc() : valOrFunc;
}

module.exports = DataSourceSorter;

},{"./DataSourceIndexed":10,"./util/stableSort":16}],12:[function(require,module,exports){
'use strict';

var DataSourceIndexed = require('./DataSourceIndexed');
var DataSourceSorter = require('./DataSourceSorter');

/**
 * @constructor
 * @extends DataSourceIndexed
 */
var DataSourceSorterComposite = DataSourceIndexed.extend('DataSourceSorterComposite', {

    /**
     * @memberOf DataSourceSorterComposite.prototype
     */
    initialize: function() {
        /**
         * Caveats:
         *
         * 1. Columns should be uniquely represented (i.e., no repeats with same columnIndex)
         * 2. Columns should be added low- to high-order (i.e., most grouped columns come last)
         *
         * @type {number[]}
         * @memberOf DataSourceSorterComposite.prototype
         */
        this.sorts = [];

        /**
         * @type {DataSource}
         * @memberOf DataSourceSorterComposite.prototype
         */
        this.last = this.dataSource;
    },

    /**
     * @memberOf DataSourceSorterComposite.prototype
     * @param {number} y
     * @returns {Object}
     */
    getRow: function(y) {
        return this.last.getRow(y);
    },

    /**
     * @memberOf DataSourceSorterComposite.prototype
     * @param columnIndex
     * @param direction
     */
    sortOn: function(columnIndex, direction) {
        this.sorts.push([columnIndex, direction]);
    },

    /**
     * @memberOf DataSourceSorterComposite.prototype
     */
    applySorts: function() {
        var each = this.dataSource;

        this.sorts.forEach(function(sort) {
            each = new DataSourceSorter(each);
            each.sortOn.apply(each, sort);
        });

        this.last = each;
    },

    /**
     * @memberOf DataSourceSorterComposite.prototype
     */
    clearSorts: function() {
        this.sorts.length = 0;
        this.last = this.dataSource;
    },

    /**
     * @memberOf DataSourceSorterComposite.prototype
     * @param {number} x
     * @param {number} y
     * @returns {*}
     */
    getValue: function(x, y) {
        return this.last.getValue(x, y);
    },

    /**
     * @memberOf DataSourceSorterComposite.prototype
     * @param {number} x
     * @param {number} y
     * @param {*} value
     */
    setValue: function(x, y, value) {
        this.last.setValue(x, y, value);
    }
});

module.exports = DataSourceSorterComposite;

},{"./DataSourceIndexed":10,"./DataSourceSorter":11}],13:[function(require,module,exports){
'use strict';

/**
 * @constructor
 */
function Mappy() {
    this.keys = [];
    this.data = {};
    this.values = [];
}

Mappy.prototype = {

    constructor: Mappy.prototype.constructor, // preserve constructor

    /**
     * @memberOf Mappy.prototype
     * @param key
     * @param value
     */
    set: function(key, value) {
        var hashCode = hash(key);
        if (!(hashCode in this.data)) {
            this.keys.push(key);
            this.values.push(value);
        }
        this.data[hashCode] = value;
    },

    /**
     * @memberOf Mappy.prototype
     * @param key
     * @returns {*}
     */
    get: function(key) {
        var hashCode = hash(key);
        return this.data[hashCode];
    },

    /**
     *
     * @memberOf Mappy.prototype
     * @param key
     * @param {function} ifUndefinedFunc - Value getter when value is otherwise undefined.
     * @returns {*}
     */
    getIfUndefined: function(key, ifUndefinedFunc) {
        var value = this.get(key);
        if (value === undefined) {
            value = ifUndefinedFunc(key);
            this.set(key, value);
        }
        return value;
    },

    size: function() {
        return this.keys.length;
    },

    /**
     * @memberOf Mappy.prototype
     */
    clear: function() {
        this.keys.length = 0;
        this.values.length = 0;
        this.data = {};
    },

    /**
     * @memberOf Mappy.prototype
     * @param key
     */
    delete: function(key) {
        var hashCode = hash(key);
        if (this.data[hashCode] !== undefined) {
            var index = betterIndexOf(this.keys, key);
            this.keys.splice(index, 1);
            this.values.splice(index, 1);
            delete this.data[hashCode];
        }
    },

    /**
     * @memberOf Mappy.prototype
     * @param {function} iteratee
     */
    forEach: function(iteratee) {
        if (typeof iteratee === 'function') {
            var keys = this.keys,
                self = this;
            keys.forEach(function(key) {
                var value = self.get(key);
                iteratee(value, key, self);
            });
        }
    },

    /**
     * @memberOf Mappy.prototype
     * @param {function} iteratee
     * @returns {Mappy}
     */
    map: function(iteratee) {
        var keys = this.keys,
            newMap = new Mappy(),
            self = this;

        if (!(typeof iteratee === 'function')) {
            iteratee = reflection;
        }

        keys.forEach(function(key) {
            var value = self.get(key),
                transformed = iteratee(value, key, self);
            newMap.set(key, transformed);
        });
        return newMap;
    },

    /**
     * @memberOf Mappy.prototype
     * @returns {Mappy}
     */
    copy: function() {
        var keys = this.keys,
            newMap = new Mappy(),
            self = this;
        keys.forEach(function(key) {
            var value = self.get(key);
            newMap.set(key, value);
        });
        return newMap;
    }

};

var OID_PREFIX = '.~.#%_'; //this should be something we never will see at the beginning of a string
var counter = 0;

function hash(key) {
    var typeOf = typeof key;

    switch (typeOf) {
        case 'number':
        case 'string':
        case 'boolean':
        case 'symbol':
            return OID_PREFIX + typeOf + '_' + key;

        case 'undefined':
            return 'UNDEFINED';

        case 'object':
            if (key === null) {
                return 'NULL';
            }
            // fall through when not null:
        case 'function':
            return (key.___finhash = key.___finhash || OID_PREFIX + counter++); // eslint-disable-line no-underscore-dangle
    }
}

// Object.is polyfill, courtesy of @WebReflection
var is = Object.is || function(a, b) {
    return a === b ? a !== 0 || 1 / a == 1 / b : a != a && b != b; // eslint-disable-line eqeqeq
};

function reflection(val) {
    return val;
}

// More reliable indexOf, courtesy of @WebReflection
function betterIndexOf(arr, value) {
    if (value != value || value === 0) { // eslint-disable-line eqeqeq
        var i = arr.length;
        while (i-- && !is(arr[i], value)) {
            // eslint-disable-line no-empty
        }
    } else {
        i = [].indexOf.call(arr, value);
    }
    return i;
}

module.exports = Mappy;

},{}],14:[function(require,module,exports){
'use strict';

/**
 * @module aggregations
 */

/**
 * @typedef {function} aggregationFunction
 * @summary A bound function.
 * @desc An aggregation function bound to the `columnIndex` value supplied to one of the above factory functions.
 * @param {object} group
 * @returns {*} Aggregated value.
 */

module.exports = {
    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    count: function(columnIndex) {
        return count;
    },

    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    sum: function(columnIndex) {
        return sum.bind(this, columnIndex);
    },

    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    min: function(columnIndex) {
        return minmax.bind(this, columnIndex, Math.min, Infinity);
    },

    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    max: function(columnIndex) {
        return minmax.bind(this, columnIndex, Math.max, -Infinity);
    },

    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    avg: function(columnIndex) {
        return avg.bind(this, columnIndex);
    },

    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    first: function(columnIndex) {
        return first.bind(this, columnIndex);
    },

    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    last: function(columnIndex) {
        return last.bind(this, columnIndex);
    },

    /**
     * @instance
     * @param {number} columnIndex
     * @returns {aggregationFunction} Bound function.
     */
    stddev: function(columnIndex) {
        return stddev.bind(this, columnIndex);
    }
};

function count(group) {
    return group.getRowCount();
}

function sum(columnIndex, group) {
    var r = group.getRowCount(),
        n = 0;

    while (r--) {
        n += group.getValue(columnIndex, r);
    }

    return n;
}

function minmax(columnIndex, method, n, group) {
    var r = group.getRowCount();

    while (r--) {
        n = method(n, group.getValue(columnIndex, r));
    }

    return n;
}

function avg(columnIndex, group) {
    return sum(columnIndex, group) / group.getRowCount();
}

function first(columnIndex, group) {
    return group.getValue(columnIndex, 0);
}

function last(columnIndex, group) {
    return group.getValue(columnIndex, group.getRowCount() - 1);
}

function stddev(columnIndex, group) {
    var rows = group.getRowCount(),
        mean = avg(columnIndex, group);

    for (var dev, r = rows, variance = 0; r--; variance += dev * dev) {
        dev = group.getValue(columnIndex, r) - mean;
    }

    return Math.sqrt(variance / rows);
}

},{}],15:[function(require,module,exports){
'use strict';

function headerify(string) {
    return (/[a-z]/.test(string) ? string : string.toLowerCase())
        .replace(/[\s\-_]*([^\s\-_])([^\s\-_]+)/g, replacer)
        .replace(/[A-Z]/g, ' $&')
        .trim();
}

function replacer(a, b, c) {
    return b.toUpperCase() + c;
}

module.exports = headerify;
},{}],16:[function(require,module,exports){
'use strict';

/**
 * Note that {@link module:stableSort#sort|sort()} is the only exposed method.
 * @module stableSort
 */

/**
 * @private
 * @instance
 * @param {function} comparator
 * @param {boolean} descending
 * @param {Array} arr1
 * @param {Array} arr2
 * @returns {function}
 */
function stabilize(comparator, descending, arr1, arr2) { // eslint-disable-line no-shadow
    var x = arr1[0];
    var y = arr2[0];

    if (x === y) {
        x = descending ? arr2[1] : arr1[1];
        y = descending ? arr1[1] : arr2[1];
    } else {
        if (y === null) {
            return -1;
        }
        if (x === null) {
            return 1;
        }
    }

    return comparator(x, y);
}

/**
 * @private
 * @instance
 * @param x
 * @param y
 * @returns {number}
 */
function ascendingNumbers(x, y) {
    return x - y;
}

/**
 * @private
 * @instance
 * @param x
 * @param y
 * @returns {number}
 */
function descendingNumbers(x, y) {
    return y - x;
}

/**
 * @private
 * @instance
 * @param x
 * @param y
 * @returns {number}
 */
function ascendingAllOthers(x, y) {
    return x < y ? -1 : 1;
}

/**
 * @private
 * @instance
 * @param x
 * @param y
 * @returns {number}
 */
function descendingAllOthers(x, y) {
    return y < x ? -1 : 1;
}

/**
 * @private
 * @instance
 * @param typeOfData
 * @returns {function(this:ascending)}
 */
function ascending(typeOfData) {
    return stabilize.bind(this, typeOfData === 'number' ? ascendingNumbers : ascendingAllOthers, false);
}

/**
 * @private
 * @instance
 * @param typeOfData
 * @returns {function(this:descending)}
 */
function descending(typeOfData) {
    return stabilize.bind(this, typeOfData === 'number' ? descendingNumbers : descendingAllOthers, true);
}

/**
 * @instance
 * @param {number} index
 * @param {function} getValue
 * @param {number} [direction=1]
 */
function sort(index, getValue, direction) {

    var compare, i;

    // apply defaults
    if (direction === undefined) {
        direction = 1;
    }

    if (index.length) { // something to do
        switch (direction) {
            case 0:
                return; // bail: nothing to sort

            case undefined: // eslint-disable-line no-fallthrough
                direction = 1;
            case 1:
                compare = ascending(typeof getValue(0));
                break;

            case -1:
                compare = descending(typeof getValue(0));
                break;
        }

        // set up the sort.....
        var tmp = new Array(index.length);

        // add the index for "stability"
        for (i = 0; i < index.length; i++) {
            tmp[i] = [getValue(i), i];
        }

        // do the actual sort
        tmp.sort(compare);

        // copy the sorted values into our index vector
        for (i = 0; i < index.length; i++) {
            index[i] = tmp[i][1];
        }
    }

}

exports.sort = sort;

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9oeXBlci1hbmFseXRpY3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9oeXBlci1hbmFseXRpY3Mvbm9kZV9tb2R1bGVzL2V4dGVuZC1tZS9pbmRleC5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9oeXBlci1hbmFseXRpY3Mvc3JjL2Zha2VfMjM0ZTMxMzQuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvaHlwZXItYW5hbHl0aWNzL3NyYy9qcy9EYXRhTm9kZUJhc2UuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvaHlwZXItYW5hbHl0aWNzL3NyYy9qcy9EYXRhTm9kZUdyb3VwLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2h5cGVyLWFuYWx5dGljcy9zcmMvanMvRGF0YU5vZGVMZWFmLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2h5cGVyLWFuYWx5dGljcy9zcmMvanMvRGF0YU5vZGVUcmVlLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2h5cGVyLWFuYWx5dGljcy9zcmMvanMvRGF0YVNvdXJjZS5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9oeXBlci1hbmFseXRpY3Mvc3JjL2pzL0RhdGFTb3VyY2VBZ2dyZWdhdG9yLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2h5cGVyLWFuYWx5dGljcy9zcmMvanMvRGF0YVNvdXJjZUdsb2JhbEZpbHRlci5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9oeXBlci1hbmFseXRpY3Mvc3JjL2pzL0RhdGFTb3VyY2VJbmRleGVkLmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2h5cGVyLWFuYWx5dGljcy9zcmMvanMvRGF0YVNvdXJjZVNvcnRlci5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9oeXBlci1hbmFseXRpY3Mvc3JjL2pzL0RhdGFTb3VyY2VTb3J0ZXJDb21wb3NpdGUuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvaHlwZXItYW5hbHl0aWNzL3NyYy9qcy91dGlsL01hcHB5LmpzIiwiL1VzZXJzL2pvbmF0aGFuL3JlcG9zL2h5cGVyLWFuYWx5dGljcy9zcmMvanMvdXRpbC9hZ2dyZWdhdGlvbnMuanMiLCIvVXNlcnMvam9uYXRoYW4vcmVwb3MvaHlwZXItYW5hbHl0aWNzL3NyYy9qcy91dGlsL2hlYWRlcmlmeS5qcyIsIi9Vc2Vycy9qb25hdGhhbi9yZXBvcy9oeXBlci1hbmFseXRpY3Mvc3JjL2pzL3V0aWwvc3RhYmxlU29ydC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiogQG5hbWVzcGFjZSBleHRlbmQtbWUgKiovXG5cbi8qKiBAc3VtbWFyeSBFeHRlbmRzIGFuIGV4aXN0aW5nIGNvbnN0cnVjdG9yIGludG8gYSBuZXcgY29uc3RydWN0b3IuXG4gKlxuICogQHJldHVybnMge0NoaWxkQ29uc3RydWN0b3J9IEEgbmV3IGNvbnN0cnVjdG9yLCBleHRlbmRlZCBmcm9tIHRoZSBnaXZlbiBjb250ZXh0LCBwb3NzaWJseSB3aXRoIHNvbWUgcHJvdG90eXBlIGFkZGl0aW9ucy5cbiAqXG4gKiBAZGVzYyBFeHRlbmRzIFwib2JqZWN0c1wiIChjb25zdHJ1Y3RvcnMpLCB3aXRoIG9wdGlvbmFsIGFkZGl0aW9uYWwgY29kZSwgb3B0aW9uYWwgcHJvdG90eXBlIGFkZGl0aW9ucywgYW5kIG9wdGlvbmFsIHByb3RvdHlwZSBtZW1iZXIgYWxpYXNlcy5cbiAqXG4gKiA+IENBVkVBVDogTm90IHRvIGJlIGNvbmZ1c2VkIHdpdGggVW5kZXJzY29yZS1zdHlsZSAuZXh0ZW5kKCkgd2hpY2ggaXMgc29tZXRoaW5nIGVsc2UgZW50aXJlbHkuIEkndmUgdXNlZCB0aGUgbmFtZSBcImV4dGVuZFwiIGhlcmUgYmVjYXVzZSBvdGhlciBwYWNrYWdlcyAobGlrZSBCYWNrYm9uZS5qcykgdXNlIGl0IHRoaXMgd2F5LiBZb3UgYXJlIGZyZWUgdG8gY2FsbCBpdCB3aGF0ZXZlciB5b3Ugd2FudCB3aGVuIHlvdSBcInJlcXVpcmVcIiBpdCwgc3VjaCBhcyBgdmFyIGluaGVyaXRzID0gcmVxdWlyZSgnZXh0ZW5kJylgLlxuICpcbiAqIFByb3ZpZGUgYSBjb25zdHJ1Y3RvciBhcyB0aGUgY29udGV4dCBhbmQgYW55IHByb3RvdHlwZSBhZGRpdGlvbnMgeW91IHJlcXVpcmUgaW4gdGhlIGZpcnN0IGFyZ3VtZW50LlxuICpcbiAqIEZvciBleGFtcGxlLCBpZiB5b3Ugd2lzaCB0byBiZSBhYmxlIHRvIGV4dGVuZCBgQmFzZUNvbnN0cnVjdG9yYCB0byBhIG5ldyBjb25zdHJ1Y3RvciB3aXRoIHByb3RvdHlwZSBvdmVycmlkZXMgYW5kL29yIGFkZGl0aW9ucywgYmFzaWMgdXNhZ2UgaXM6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIEJhc2UgPSByZXF1aXJlKCdleHRlbmQtbWUnKS5CYXNlO1xuICogdmFyIEJhc2VDb25zdHJ1Y3RvciA9IEJhc2UuZXh0ZW5kKGJhc2VQcm90b3R5cGUpOyAvLyBtaXhlcyBpbiAuZXh0ZW5kXG4gKiB2YXIgQ2hpbGRDb25zdHJ1Y3RvciA9IEJhc2VDb25zdHJ1Y3Rvci5leHRlbmQoY2hpbGRQcm90b3R5cGVPdmVycmlkZXNBbmRBZGRpdGlvbnMpO1xuICogdmFyIEdyYW5kY2hpbGRDb25zdHJ1Y3RvciA9IENoaWxkQ29uc3RydWN0b3IuZXh0ZW5kKGdyYW5kY2hpbGRQcm90b3R5cGVPdmVycmlkZXNBbmRBZGRpdGlvbnMpO1xuICogYGBgXG4gKlxuICogVGhpcyBmdW5jdGlvbiAoYGV4dGVuZCgpYCkgaXMgYWRkZWQgdG8gdGhlIG5ldyBleHRlbmRlZCBvYmplY3QgY29uc3RydWN0b3IgYXMgYSBwcm9wZXJ0eSBgLmV4dGVuZGAsIGVzc2VudGlhbGx5IG1ha2luZyB0aGUgb2JqZWN0IGNvbnN0cnVjdG9yIGl0c2VsZiBlYXNpbHkgXCJleHRlbmRhYmxlLlwiIChOb3RlOiBUaGlzIGlzIGEgcHJvcGVydHkgb2YgZWFjaCBjb25zdHJ1Y3RvciBhbmQgbm90IGEgbWV0aG9kIG9mIGl0cyBwcm90b3R5cGUhKVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZXh0ZW5kZWRDbGFzc05hbWVdIC0gVGhpcyBpcyBzaW1wbHkgYWRkZWQgdG8gdGhlIHByb3RvdHlwZSBhcyAkJENMQVNTX05BTUUuIFVzZWZ1bCBmb3IgZGVidWdnaW5nIGJlY2F1c2UgYWxsIGRlcml2ZWQgY29uc3RydWN0b3JzIGFwcGVhciB0byBoYXZlIHRoZSBzYW1lIG5hbWUgKFwiQ29uc3RydWN0b3JcIikgaW4gdGhlIGRlYnVnZ2VyLiBUaGlzIHByb3BlcnR5IGlzIGlnbm9yZWQgdW5sZXNzIGBleHRlbmQuZGVidWdgIGlzIGV4cGxpY2l0bHkgc2V0IHRvIGEgdHJ1dGh5IHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7ZXh0ZW5kZWRQcm90b3R5cGVBZGRpdGlvbnNPYmplY3R9IFtwcm90b3R5cGVBZGRpdGlvbnNdIC0gT2JqZWN0IHdpdGggbWVtYmVycyB0byBjb3B5IHRvIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gTW9zdCBtZW1iZXJzIHdpbGwgYmUgY29waWVkIHRvIHRoZSBwcm90b3R5cGUuIFNvbWUgbWVtYmVycywgaG93ZXZlciwgaGF2ZSBzcGVjaWFsIG1lYW5pbmdzIGFzIGV4cGxhaW5lZCBpbiB0aGUge0BsaW5rIGV4dGVuZGVkUHJvdG90eXBlQWRkaXRpb25zT2JqZWN0fHR5cGUgZGVmaW5pdGlvbn0gKGFuZCBtYXkgb3IgbWF5IG5vdCBiZSBjb3BpZWQgdG8gdGhlIHByb3RvdHlwZSkuXG4gKlxuICogQHByb3BlcnR5IHtib29sZWFufSBbZGVidWddIC0gU2VlIHBhcmFtZXRlciBgZXh0ZW5kZWRDbGFzc05hbWVgIF8oYWJvdmUpXy5cbiAqXG4gKiBAcHJvcGVydHkge29iamVjdH0gQmFzZSAtIEEgY29udmVuaWVudCBiYXNlIGNsYXNzIGZyb20gd2hpY2ggYWxsIG90aGVyIGNsYXNzZXMgY2FuIGJlIGV4dGVuZGVkLlxuICpcbiAqIEBtZW1iZXJPZiBleHRlbmQtbWVcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKGV4dGVuZGVkQ2xhc3NOYW1lLCBwcm90b3R5cGVBZGRpdGlvbnMpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zID0ge307XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zID0gZXh0ZW5kZWRDbGFzc05hbWU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHByb3RvdHlwZUFkZGl0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnU2luZ2xlIHBhcmFtZXRlciBvdmVybG9hZCBtdXN0IGJlIG9iamVjdC4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXh0ZW5kZWRDbGFzc05hbWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRlbmRlZENsYXNzTmFtZSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHByb3RvdHlwZUFkZGl0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnVHdvIHBhcmFtZXRlciBvdmVybG9hZCBtdXN0IGJlIHN0cmluZywgb2JqZWN0Lic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93ICdUb28gbWFueSBwYXJhbWV0ZXJzJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBDb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgaWYgKHByb3RvdHlwZUFkZGl0aW9ucy5wcmVJbml0aWFsaXplKSB7XG4gICAgICAgICAgICBwcm90b3R5cGVBZGRpdGlvbnMucHJlSW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5pdGlhbGl6ZVByb3RvdHlwZUNoYWluLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgaWYgKHByb3RvdHlwZUFkZGl0aW9ucy5wb3N0SW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgcHJvdG90eXBlQWRkaXRpb25zLnBvc3RJbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBDb25zdHJ1Y3Rvci5leHRlbmQgPSBleHRlbmQ7XG5cbiAgICB2YXIgcHJvdG90eXBlID0gQ29uc3RydWN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnByb3RvdHlwZSk7XG4gICAgcHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG5cbiAgICBpZiAoZXh0ZW5kZWRDbGFzc05hbWUgJiYgZXh0ZW5kLmRlYnVnKSB7XG4gICAgICAgIHByb3RvdHlwZS4kJENMQVNTX05BTUUgPSBleHRlbmRlZENsYXNzTmFtZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gcHJvdG90eXBlQWRkaXRpb25zKSB7XG4gICAgICAgIGlmIChwcm90b3R5cGVBZGRpdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvdG90eXBlQWRkaXRpb25zW2tleV07XG4gICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2luaXRpYWxpemVPd24nOlxuICAgICAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IGNhbGxlZCBhYm92ZTsgbm90IG5lZWRlZCBpbiBwcm90b3R5cGVcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYWxpYXNlcyc6XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGFsaWFzIGluIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoYWxpYXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFrZUFsaWFzKHZhbHVlW2FsaWFzXSwgYWxpYXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHZhbHVlWzBdID09PSAnIycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ha2VBbGlhcyh2YWx1ZSwga2V5LnN1YnN0cigxKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b3R5cGVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gQ29uc3RydWN0b3I7XG5cbiAgICBmdW5jdGlvbiBtYWtlQWxpYXModmFsdWUsIGtleSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICBwcm90b3R5cGVba2V5XSA9IHByb3RvdHlwZUFkZGl0aW9uc1t2YWx1ZV07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBCYXNlKCkge31cbkJhc2UucHJvdG90eXBlID0ge1xuICAgIGNvbnN0cnVjdG9yOiBCYXNlLnByb3RvdHlwZS5jb25zdHJ1Y3RvcixcbiAgICBnZXQgc3VwZXIoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpKTtcbiAgICB9XG59O1xuQmFzZS5leHRlbmQgPSBleHRlbmQ7XG5leHRlbmQuQmFzZSA9IEJhc2U7XG5cbi8qKiBAdHlwZWRlZiB7ZnVuY3Rpb259IGV4dGVuZGVkQ29uc3RydWN0b3JcbiAqIEBwcm9wZXJ0eSBwcm90b3R5cGUuc3VwZXIgLSBBIHJlZmVyZW5jZSB0byB0aGUgcHJvdG90eXBlIHRoaXMgY29uc3RydWN0b3Igd2FzIGV4dGVuZGVkIGZyb20uXG4gKiBAcHJvcGVydHkgW2V4dGVuZF0gLSBJZiBgcHJvdG90eXBlQWRkaXRpb25zLmV4dGVuZGFibGVgIHdhcyB0cnV0aHksIHRoaXMgd2lsbCBiZSBhIHJlZmVyZW5jZSB0byB7QGxpbmsgZXh0ZW5kLmV4dGVuZHxleHRlbmR9LlxuICovXG5cbi8qKiBAdHlwZWRlZiB7b2JqZWN0fSBleHRlbmRlZFByb3RvdHlwZUFkZGl0aW9uc09iamVjdFxuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gW2luaXRpYWxpemVdIC0gQWRkaXRpb25hbCBjb25zdHJ1Y3RvciBjb2RlIGZvciBuZXcgb2JqZWN0LiBUaGlzIG1ldGhvZCBpcyBhZGRlZCB0byB0aGUgbmV3IGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLiBHZXRzIHBhc3NlZCBuZXcgb2JqZWN0IGFzIGNvbnRleHQgKyBzYW1lIGFyZ3MgYXMgY29uc3RydWN0b3IgaXRzZWxmLiBDYWxsZWQgb24gaW5zdGFudGlhdGlvbiBhZnRlciBzaW1pbGFyIGZ1bmN0aW9uIGluIGFsbCBhbmNlc3RvcnMgY2FsbGVkIHdpdGggc2FtZSBzaWduYXR1cmUuXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBbaW5pdGlhbGl6ZU93bl0gLSBBZGRpdGlvbmFsIGNvbnN0cnVjdG9yIGNvZGUgZm9yIG5ldyBvYmplY3QuIFRoaXMgbWV0aG9kIGlzIGFkZGVkIHRvIHRoZSBuZXcgY29uc3RydWN0b3IncyBwcm90b3R5cGUuIEdldHMgcGFzc2VkIG5ldyBvYmplY3QgYXMgY29udGV4dCArIHNhbWUgYXJncyBhcyBjb25zdHJ1Y3RvciBpdHNlbGYuIENhbGxlZCBvbiBpbnN0YW50aWF0aW9uIGFmdGVyIChhbGwpIHRoZSBgaW5pdGlhbGl6ZWAgZnVuY3Rpb24ocykuXG4gKiBAcHJvcGVydHkge29iamVjdH0gW2FsaWFzZXNdIC0gSGFzaCBvZiBhbGlhc2VzIGZvciBwcm90b3R5cGUgbWVtYmVycyBpbiBmb3JtIGB7IGtleTogJ21lbWJlcicsIC4uLiB9YCB3aGVyZSBga2V5YCBpcyB0aGUgbmFtZSBvZiBhbiBhbGllYXMgYW5kIGAnbWVtYmVyJ2AgaXMgdGhlIG5hbWUgb2YgYW4gZXhpc3RpbmcgbWVtYmVyIGluIHRoZSBwcm90b3R5cGUuIEVhY2ggc3VjaCBrZXkgaXMgYWRkZWQgdG8gdGhlIHByb3RvdHlwZSBhcyBhIHJlZmVyZW5jZSB0byB0aGUgbmFtZWQgbWVtYmVyLiAoVGhlIGBhbGlhc2VzYCBvYmplY3QgaXRzZWxmIGlzICpub3QqIGFkZGVkIHRvIHByb3RvdHlwZS4pIEFsdGVybmF0aXZlbHk6XG4gKiBAcHJvcGVydHkge3N0cmluZ30gW2tleXNdIC0gQXJiaXRyYXJ5IHByb3BlcnR5IG5hbWVzIGRlZmluZWQgaGVyZSB3aXRoIHN0cmluZyB2YWx1ZXMgc3RhcnRpbmcgd2l0aCBhIGAjYCBjaGFyYWN0ZXIgd2lsbCBhbGlhcyB0aGUgYWN0dWFsIHByb3BlcnRpZXMgbmFtZWQgaW4gdGhlIHN0cmluZ3MgKGZvbGxvd2luZyB0aGUgYCNgKS4gVGhpcyBpcyBhbiBhbHRlcm5hdGl2ZSB0byBwcm92aWRpbmcgYW4gYGFsaWFzZXNgIGhhc2gsIHBlcmhhcHMgc2ltcGxlciAodGhvdWdoIHN1YnRsZXIpLiAoVXNlIGFyYml0cmFyeSBpZGVudGlmaWVycyBoZXJlOyBkb24ndCB1c2UgdGhlIG5hbWUgYGtleXNgISlcbiAqIEBwcm9wZXJ0eSB7Kn0gW2FyYml0cmFyeVByb3BlcnRpZXNdIC0gQW55IGFkZGl0aW9uYWwgYXJiaXRyYXJ5IHByb3BlcnRpZXMgZGVmaW5lZCBoZXJlIHdpbGwgYmUgYWRkZWQgdG8gdGhlIG5ldyBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS4gKFVzZSBhcmJpdHJhcnkgaWRlbnRpZmllcnMgaGVyZTsgZG9uJ3QgdXNlIHRoZSBuYW1lIGBhcmliaXRyYXJ5UHJvcGVydGllc2AhKVxuICovXG5cbi8qKiBAc3VtbWFyeSBDYWxsIGFsbCBgaW5pdGlhbGl6ZWAgbWV0aG9kcyBmb3VuZCBpbiBwcm90b3R5cGUgY2hhaW4uXG4gKiBAZGVzYyBUaGlzIHJlY3Vyc2l2ZSByb3V0aW5lIGlzIGNhbGxlZCBieSB0aGUgY29uc3RydWN0b3IuXG4gKiAxLiBXYWxrcyBiYWNrIHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gYE9iamVjdGAncyBwcm90b3R5cGVcbiAqIDIuIFdhbGtzIGZvcndhcmQgdG8gbmV3IG9iamVjdCwgY2FsbGluZyBhbnkgYGluaXRpYWxpemVgIG1ldGhvZHMgaXQgZmluZHMgYWxvbmcgdGhlIHdheSB3aXRoIHRoZSBzYW1lIGNvbnRleHQgYW5kIGFyZ3VtZW50cyB3aXRoIHdoaWNoIHRoZSBjb25zdHJ1Y3RvciB3YXMgY2FsbGVkLlxuICogQHByaXZhdGVcbiAqIEBtZW1iZXJPZiBleHRlbmQtbWVcbiAqL1xuZnVuY3Rpb24gaW5pdGlhbGl6ZVByb3RvdHlwZUNoYWluKCkge1xuICAgIHZhciB0ZXJtID0gdGhpcyxcbiAgICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICByZWN1cih0ZXJtKTtcblxuICAgIGZ1bmN0aW9uIHJlY3VyKG9iaikge1xuICAgICAgICB2YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKTtcbiAgICAgICAgaWYgKHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgICAgICAgIHJlY3VyKHByb3RvKTtcbiAgICAgICAgICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnaW5pdGlhbGl6ZScpKSB7XG4gICAgICAgICAgICAgICAgcHJvdG8uaW5pdGlhbGl6ZS5hcHBseSh0ZXJtLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbndpbmRvdy5oeXBlckFuYWx5dGljcyA9IHtcbiAgICBKU0RhdGFTb3VyY2U6IHJlcXVpcmUoJy4vanMvRGF0YVNvdXJjZScpLFxuICAgIERhdGFTb3VyY2VTb3J0ZXI6IHJlcXVpcmUoJy4vanMvRGF0YVNvdXJjZVNvcnRlcicpLFxuICAgIERhdGFTb3VyY2VTb3J0ZXJDb21wb3NpdGU6IHJlcXVpcmUoJy4vanMvRGF0YVNvdXJjZVNvcnRlckNvbXBvc2l0ZScpLFxuICAgIERhdGFTb3VyY2VHbG9iYWxGaWx0ZXI6IHJlcXVpcmUoJy4vanMvRGF0YVNvdXJjZUdsb2JhbEZpbHRlcicpLFxuICAgIERhdGFTb3VyY2VBZ2dyZWdhdG9yOiByZXF1aXJlKCcuL2pzL0RhdGFTb3VyY2VBZ2dyZWdhdG9yJyksXG4gICAgdXRpbDoge1xuICAgICAgICBhZ2dyZWdhdGlvbnM6IHJlcXVpcmUoJy4vanMvdXRpbC9hZ2dyZWdhdGlvbnMnKSxcbiAgICAgICAgTWFwcHk6IHJlcXVpcmUoJy4vanMvdXRpbC9NYXBweScpLFxuICAgICAgICBzdGFibGVTb3J0OiByZXF1aXJlKCcuL2pzL3V0aWwvc3RhYmxlU29ydCcpLFxuICAgICAgICBoZWFkZXJpZnk6IHJlcXVpcmUoJy4vanMvdXRpbC9oZWFkZXJpZnknKVxuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCYXNlID0gcmVxdWlyZSgnZXh0ZW5kLW1lJykuQmFzZTtcblxuLyoqXG4gKiBTZWUge0BsaW5rIERhdGFCYXNlTm9kZSNpbml0aWFsaXplfGluaXRpYWxpemUoKX0gbWV0aG9kIGZvciBwYXJhbWV0ZXJzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBEYXRhTm9kZUJhc2UgPSBCYXNlLmV4dGVuZCgnRGF0YU5vZGVCYXNlJywge1xuXG4gICAgaXNOdWxsT2JqZWN0OiBmYWxzZSxcblxuICAgIElOREVOVDogJyAgICcsIC8vIDMgc3BhY2VzXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVCYXNlLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUJhc2UucHJvdG90eXBlXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuXG4gICAgICAgIHRoaXMubGFiZWwgPSBrZXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUJhc2UucHJvdG90eXBlXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGF0YSA9IFsnJ107IC8vIFRPRE86IFdoeSBpcyB0aGlzIGZpcnN0IGVsZW1lbnQgbmVlZGVkP1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVCYXNlLnByb3RvdHlwZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICAgICAqIEBkZWZhdWx0IFsnJ11cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaW5kZXggPSBbXTsgLy8gVE9ETzogZm9ybWVybHkgcm93SW5kZXhcblxuICAgICAgICAvKipcbiAgICAgICAgICogQG1lbWJlck9mIERhdGFOb2RlQmFzZS5wcm90b3R5cGVcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhhc0NoaWxkcmVuID0gZmFsc2U7IC8vIFRPRE86IFdoZXJlL2hvdyBpcyB0aGlzIHVzZWQ/XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUJhc2UucHJvdG90eXBlXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqIEBkZWZhdWx0IDBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVwdGggPSAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVCYXNlLnByb3RvdHlwZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKiBAZGVmYXVsdCAxXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IDE7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUJhc2UucHJvdG90eXBlXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5leHBhbmRlZCA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVMZWFmLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSB4XG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZ2V0VmFsdWU6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVt4XTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFOb2RlTGVhZi5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0gZGVwdGhcbiAgICAgKi9cbiAgICB0b0FycmF5OiBmdW5jdGlvbihkZXB0aCkge1xuICAgICAgICB0aGlzLmRlcHRoID0gZGVwdGg7XG4gICAgICAgIHRoaXMuZGF0YVswXSA9IHRoaXMuY29tcHV0ZURlcHRoU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUxlYWYucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBjb21wdXRlRGVwdGhTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQXJyYXkodGhpcy5kZXB0aCArIDEpLmpvaW4odGhpcy5JTkRFTlQpICsgJyAgJyArIHRoaXMubGFiZWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUxlYWYucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjb21wdXRlSGVpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUxlYWYucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGdldEluZGV4OiBmdW5jdGlvbigpIHsgLy8gVE9ETzogZm9ybWVybHkgZ2V0QWxsUm93SW5kZXhlc1xuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFOb2RlTGVhZi5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0gYWdncmVnYXRvclxuICAgICAqL1xuICAgIGNvbXB1dGVBZ2dyZWdhdGVzOiBmdW5jdGlvbihhZ2dyZWdhdG9yKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuZ2V0SW5kZXgoKTtcblxuICAgICAgICBpZiAoaW5kZXgubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgZ3JvdXBzT2Zmc2V0ID0gTnVtYmVyKGFnZ3JlZ2F0b3IuaGFzR3JvdXBzKCkpO1xuXG4gICAgICAgICAgICAvLyByZWRpbWVuc2lvbiB0aGUgZGF0YVxuICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICAgICAgICBkYXRhLmxlbmd0aCA9IGdyb3Vwc09mZnNldCArIGFnZ3JlZ2F0b3IuYWdncmVnYXRlcy5sZW5ndGg7XG5cbiAgICAgICAgICAgIHZhciBzb3J0ZXIgPSBhZ2dyZWdhdG9yLnNvcnRlckluc3RhbmNlO1xuICAgICAgICAgICAgc29ydGVyLmluZGV4ID0gaW5kZXg7XG5cbiAgICAgICAgICAgIGFnZ3JlZ2F0b3IuYWdncmVnYXRlcy5mb3JFYWNoKGZ1bmN0aW9uKGFnZ3JlZ2F0ZSwgaSkge1xuICAgICAgICAgICAgICAgIGRhdGFbZ3JvdXBzT2Zmc2V0ICsgaV0gPSBhZ2dyZWdhdGUoc29ydGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUxlYWYucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGFnZ3JlZ2F0b3JcbiAgICAgKi9cbiAgICBidWlsZFZpZXc6IGZ1bmN0aW9uKGFnZ3JlZ2F0b3IpIHtcbiAgICAgICAgYWdncmVnYXRvci5hZGRWaWV3KHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVMZWFmLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHRvZ2dsZUV4cGFuc2lvblN0YXRlOiBmdW5jdGlvbigpIHsgLyogYWdncmVnYXRvciAqL1xuICAgICAgICAvL2RvIG5vdGhpbmcgYnkgZGVmYXVsdFxuICAgIH1cblxufSk7XG5cbi8vRGF0YU5vZGVCYXNlLnByb3RvdHlwZS5hcHBseUFnZ3JlZ2F0ZXMgPSBEYXRhTm9kZUJhc2UucHJvdG90eXBlLmNvbXB1dGVBZ2dyZWdhdGVzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGFOb2RlQmFzZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1hcCA9IHJlcXVpcmUoJy4vdXRpbC9NYXBweScpO1xudmFyIERhdGFOb2RlQmFzZSA9IHJlcXVpcmUoJy4vRGF0YU5vZGVCYXNlJyk7XG5cbnZhciBleHBhbmRlZE1hcCA9IHtcbiAgICB0cnVlOiAnXFx1MjViYycsIC8vIEJMQUNLIERPV04tUE9JTlRJTkcgVFJJQU5HTEUgYWthICfilrwnXG4gICAgZmFsc2U6ICdcXHUyNWI2JyAvLyBCTEFDSyBSSUdIVC1QT0lOVElORyBUUklBTkdMRSBha2EgJ+KWtidcbn07XG5cbi8qKlxuICogPiBTZWUge0BsaW5rIERhdGFOb2RlR3JvdXAjaW5pdGlhbGl6ZXxpbml0aWFsaXplKCl9IG1ldGhvZCBmb3IgY29uc3RydWN0b3IgcGFyYW1ldGVycy5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMgRGF0YU5vZGVCYXNlXG4gKi9cbnZhciBEYXRhTm9kZUdyb3VwID0gRGF0YU5vZGVCYXNlLmV4dGVuZCgnRGF0YU5vZGVHcm91cCcsIHtcblxuICAgIGV4dGVuZGFibGU6IHRydWUsXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVHcm91cC5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4gPSBuZXcgTWFwKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUdyb3VwLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBkZXB0aFxuICAgICAqL1xuICAgIHRvQXJyYXk6IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgICAgIHRoaXMuZGVwdGggPSBkZXB0aDtcbiAgICAgICAgdGhpcy5jaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW4udmFsdWVzO1xuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGNoaWxkLnRvQXJyYXkoZGVwdGggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZGF0YVswXSA9IHRoaXMuY29tcHV0ZURlcHRoU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUdyb3VwLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgY29tcHV0ZURlcHRoU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5KHRoaXMuZGVwdGggKyAxKS5qb2luKHRoaXMuSU5ERU5UKSArXG4gICAgICAgICAgICBleHBhbmRlZE1hcFt0aGlzLmV4cGFuZGVkXSArICcgJyArXG4gICAgICAgICAgICB0aGlzLmxhYmVsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVHcm91cC5wcm90b3R5cGVcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBnZXRJbmRleDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmluZGV4Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IHRoaXMuY29tcHV0ZUluZGV4KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUdyb3VwLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBjb21wdXRlSW5kZXg6IGZ1bmN0aW9uKCkgeyAvLyBUT0RPOiBmb3JtZXJseSBjb21wdXRlQWxsUm93SW5kZXhlc1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIHJlc3VsdC5hcHBlbmQgPSBhcHBlbmQ7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgcmVzdWx0LmFwcGVuZChjaGlsZC5nZXRJbmRleCgpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUdyb3VwLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBhZ2dyZWdhdG9yXG4gICAgICovXG4gICAgdG9nZ2xlRXhwYW5zaW9uU3RhdGU6IGZ1bmN0aW9uKGFnZ3JlZ2F0b3IpIHsgLyogYWdncmVnYXRvciAqL1xuICAgICAgICB0aGlzLmV4cGFuZGVkID0gIXRoaXMuZXhwYW5kZWQ7XG4gICAgICAgIHRoaXMuZGF0YVswXSA9IHRoaXMuY29tcHV0ZURlcHRoU3RyaW5nKCk7XG4gICAgICAgIGlmICh0aGlzLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXB1dGVBZ2dyZWdhdGVzKGFnZ3JlZ2F0b3IpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUdyb3VwLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBhZ2dyZWdhdG9yXG4gICAgICovXG4gICAgY29tcHV0ZUFnZ3JlZ2F0ZXM6IGZ1bmN0aW9uKGFnZ3JlZ2F0b3IpIHtcbiAgICAgICAgRGF0YU5vZGVCYXNlLnByb3RvdHlwZS5jb21wdXRlQWdncmVnYXRlcy5jYWxsKHRoaXMsIGFnZ3JlZ2F0b3IpOyAvLyBjYWxsIGJhc2UgY2xhc3MncyB2ZXJzaW9uXG4gICAgICAgIGlmICh0aGlzLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICBjaGlsZC5jb21wdXRlQWdncmVnYXRlcyhhZ2dyZWdhdG9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUdyb3VwLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBhZ2dyZWdhdG9yXG4gICAgICovXG4gICAgYnVpbGRWaWV3OiBmdW5jdGlvbihhZ2dyZWdhdG9yKSB7XG4gICAgICAgIGFnZ3JlZ2F0b3Iudmlldy5wdXNoKHRoaXMpO1xuICAgICAgICBpZiAodGhpcy5leHBhbmRlZCkge1xuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQuYnVpbGRWaWV3KGFnZ3JlZ2F0b3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFOb2RlR3JvdXAucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjb21wdXRlSGVpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGhlaWdodCA9IDE7XG5cbiAgICAgICAgaWYgKHRoaXMuZXhwYW5kZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgICAgIGhlaWdodCA9IGhlaWdodCArIGNoaWxkLmNvbXB1dGVIZWlnaHQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICh0aGlzLmhlaWdodCA9IGhlaWdodCk7XG4gICAgfVxuXG59KTtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHN1bW1hcnkgQXJyYXkgbWl4aW4gdG8gYXBwZW5kIGFub3RoZXIgYXJyYXkgdG8gZW5kIG9mIGB0aGlzYCBvbmUuXG4gKiBAZGVzYyBBcHBlbmRzIGluIHBsYWNlLCB1bmxpa2UgYHRoaXMuY29uY2F0KClgIHdoaWNoIGNyZWF0ZXMgYSBuZXcgYXJyYXkuXG4gKiBVc2VzIGxlc3MgbWVtb3J5IHRoYW4gY29uY2F0LCBpbXBvcnRhbnQgd2hlbiBgYXBwZW5kaXhgIGlzIGh1Z2UuXG4gKiA+IENBVVRJT046IE11dGF0ZXMgYHRoaXNgIGFycmF5IVxuICogQHBhcmFtIHtBcnJheX0gYXBwZW5kaXhcbiAqIEByZXR1cm5zIHtBcnJheX0gUmVmZXJlbmNlIHRvIGB0aGlzYCAoZm9yIGNvbnZlbmllbmNlKVxuICovXG5mdW5jdGlvbiBhcHBlbmQoYXBwZW5kaXgpIHtcbiAgICB0aGlzLnNwbGljZS5iaW5kKHRoaXMsIHRoaXMubGVuZ3RoLCAwKS5hcHBseSh0aGlzLCBhcHBlbmRpeCk7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YU5vZGVHcm91cDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIERhdGFOb2RlQmFzZSA9IHJlcXVpcmUoJy4vRGF0YU5vZGVCYXNlJyk7XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBEYXRhTm9kZUJhc2VcbiAqL1xudmFyIERhdGFOb2RlTGVhZiA9IERhdGFOb2RlQmFzZS5leHRlbmQoJ0RhdGFOb2RlTGVhZicsIHtcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUxlYWYucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGRlcHRoXG4gICAgICovXG4gICAgdG9BcnJheTogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICAgICAgdGhpcy5kZXB0aCA9IGRlcHRoO1xuICAgICAgICB0aGlzLmRhdGFbMF0gPSB0aGlzLmNvbXB1dGVEZXB0aFN0cmluZygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVMZWFmLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtudW1lcltdfVxuICAgICAqL1xuICAgIGdldEluZGV4OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUxlYWYucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGFnZ3JlZ2F0b3JcbiAgICAgKi9cbiAgICBidWlsZFZpZXc6IGZ1bmN0aW9uKGFnZ3JlZ2F0b3IpIHtcbiAgICAgICAgYWdncmVnYXRvci5hZGRWaWV3KHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVMZWFmLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY29tcHV0ZUhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YU5vZGVMZWFmO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRGF0YU5vZGVHcm91cCA9IHJlcXVpcmUoJy4vRGF0YU5vZGVHcm91cCcpO1xuXG4vKipcbiAqIFNlZSB7QGxpbmsgRGF0YU5vZGVHcm91cCNpbml0aWFsaXplfGluaXRpYWxpemUoKX0gbWV0aG9kIGZvciBwYXJhbWV0ZXJzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBEYXRhTm9kZUdyb3VwXG4gKi9cbnZhciBEYXRhTm9kZVRyZWUgPSBEYXRhTm9kZUdyb3VwLmV4dGVuZCgnRGF0YU5vZGVUcmVlJywge1xuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFOb2RlR3JvdXAucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICAgICAqL1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB0aGlzLmhlaWdodCA9IDA7XG4gICAgICAgIHRoaXMuZXhwYW5kZWQgPSB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVHcm91cC5wcm90b3R5cGVcbiAgICAgKi9cbiAgICB0b0FycmF5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW4udmFsdWVzO1xuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGNoaWxkLnRvQXJyYXkoMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YU5vZGVHcm91cC5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0gYWdncmVnYXRvclxuICAgICAqL1xuICAgIGJ1aWxkVmlldzogZnVuY3Rpb24oYWdncmVnYXRvcikge1xuICAgICAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGNoaWxkLmJ1aWxkVmlldyhhZ2dyZWdhdG9yKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhTm9kZUdyb3VwLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY29tcHV0ZUhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBoZWlnaHQgPSAxO1xuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgaGVpZ2h0ID0gaGVpZ2h0ICsgY2hpbGQuY29tcHV0ZUhlaWdodCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gKHRoaXMuaGVpZ2h0ID0gaGVpZ2h0KTtcbiAgICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGFOb2RlVHJlZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhlYWRlcmlmeSA9IHJlcXVpcmUoJy4vdXRpbC9oZWFkZXJpZnknKTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7b2JqZWN0W119IGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpZWxkc1xuICovXG5mdW5jdGlvbiBEYXRhU291cmNlKGRhdGEsIGZpZWxkcykge1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICB0aGlzLmZpZWxkcyA9IGZpZWxkcyB8fCBjb21wdXRlRmllbGROYW1lcyhkYXRhWzBdKTtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtvYmplY3RbXX1cbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xufVxuXG5EYXRhU291cmNlLnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHJ1Y3RvcjogRGF0YVNvdXJjZS5wcm90b3R5cGUuY29uc3RydWN0b3IsIC8vIHByZXNlcnZlIGNvbnN0cnVjdG9yXG5cbiAgICBpc051bGxPYmplY3Q6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2UucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHlcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0W119XG4gICAgICovXG4gICAgZ2V0Um93OiBmdW5jdGlvbih5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbeV07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSB4XG4gICAgICogQHBhcmFtIHlcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBnZXRWYWx1ZTogZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICB2YXIgcm93ID0gdGhpcy5nZXRSb3coeSk7XG4gICAgICAgIGlmICghcm93KSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcm93W3RoaXMuZmllbGRzW3hdXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2UucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geVxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqL1xuICAgIHNldFZhbHVlOiBmdW5jdGlvbih4LCB5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLmdldFJvdyh5KVt0aGlzLmZpZWxkc1t4XV0gPSB2YWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2UucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRSb3dDb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGEubGVuZ3RoO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZS5wcm90b3R5cGVcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldENvbHVtbkNvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RmllbGRzKCkubGVuZ3RoO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZS5wcm90b3R5cGVcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyW119XG4gICAgICovXG4gICAgZ2V0RmllbGRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZS5wcm90b3R5cGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nW119XG4gICAgICovXG4gICAgZ2V0SGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICB0aGlzLmhlYWRlcnMgPSB0aGlzLmhlYWRlcnMgfHwgdGhpcy5nZXREZWZhdWx0SGVhZGVycygpLm1hcChmdW5jdGlvbihlYWNoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhlYWRlcmlmeShlYWNoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICBnZXREZWZhdWx0SGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldEZpZWxkcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZS5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBmaWVsZHNcbiAgICAgKi9cbiAgICBzZXRGaWVsZHM6IGZ1bmN0aW9uKGZpZWxkcykge1xuICAgICAgICB0aGlzLmZpZWxkcyA9IGZpZWxkcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2UucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gaGVhZGVyc1xuICAgICAqL1xuICAgIHNldEhlYWRlcnM6IGZ1bmN0aW9uKGhlYWRlcnMpIHtcbiAgICAgICAgaWYgKCEoaGVhZGVycyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgICAgZXJyb3IoJ3NldEhlYWRlcnMnLCAncGFyYW0gIzEgYGhlYWRlcnNgIG5vdCBhcnJheScpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGdldEdyYW5kVG90YWxzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy9ub3RoaW5nIGhlcmVcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2UucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGFycmF5T2ZVbmlmb3JtT2JqZWN0c1xuICAgICAqL1xuICAgIHNldERhdGE6IGZ1bmN0aW9uKGFycmF5T2ZVbmlmb3JtT2JqZWN0cykge1xuICAgICAgICB0aGlzLmRhdGEgPSBhcnJheU9mVW5pZm9ybU9iamVjdHM7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gZXJyb3IobWV0aG9kTmFtZSwgbWVzc2FnZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRGF0YVNvdXJjZS4nICsgbWV0aG9kTmFtZSArICc6ICcgKyBtZXNzYWdlKTtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdFxuICogQHJldHVybnMge3N0cmluZ1tdfVxuICovXG5mdW5jdGlvbiBjb21wdXRlRmllbGROYW1lcyhvYmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0IHx8IFtdKS5maWx0ZXIoZnVuY3Rpb24oZSkge1xuICAgICAgICByZXR1cm4gZS5zdWJzdHIoMCwgMikgIT09ICdfXyc7XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YVNvdXJjZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIERhdGFTb3VyY2VTb3J0ZXIgPSByZXF1aXJlKCcuL0RhdGFTb3VyY2VTb3J0ZXInKTtcbnZhciBEYXRhTm9kZVRyZWUgPSByZXF1aXJlKCcuL0RhdGFOb2RlVHJlZScpO1xudmFyIERhdGFOb2RlR3JvdXAgPSByZXF1aXJlKCcuL0RhdGFOb2RlR3JvdXAnKTtcbnZhciBEYXRhTm9kZUxlYWYgPSByZXF1aXJlKCcuL0RhdGFOb2RlTGVhZicpO1xudmFyIGhlYWRlcmlmeSA9IHJlcXVpcmUoJy4vdXRpbC9oZWFkZXJpZnknKTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7RGF0YVNvdXJjZX0gZGF0YVNvdXJjZVxuICovXG5mdW5jdGlvbiBEYXRhU291cmNlQWdncmVnYXRvcihkYXRhU291cmNlKSB7XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHR5cGUge0RhdGFTb3VyY2V9XG4gICAgICovXG4gICAgdGhpcy5kYXRhU291cmNlID0gZGF0YVNvdXJjZTtcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAdHlwZSB7RGF0YU5vZGVUcmVlfVxuICAgICAqL1xuICAgIHRoaXMudHJlZSA9IG5ldyBEYXRhTm9kZVRyZWUoJ1RvdGFscycpO1xuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqIEB0eXBlIHtudW1iZXJbXX1cbiAgICAgKiBAZGVmYXVsdCBbXVxuICAgICAqL1xuICAgIHRoaXMuaW5kZXggPSBbXTtcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICogQGRlZmF1bHQgW11cbiAgICAgKi9cbiAgICB0aGlzLmFnZ3JlZ2F0ZXMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XG4gICAgICogQGRlZmF1bHQgW11cbiAgICAgKi9cbiAgICB0aGlzLmhlYWRlcnMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICogQGRlZmF1bHQgW11cbiAgICAgKi9cbiAgICB0aGlzLmdyb3VwQnlzID0gW107XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqIEBkZWZhdWx0IFtdXG4gICAgICovXG4gICAgdGhpcy52aWV3ID0gW107XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAZGVmYXVsdCB7fVxuICAgICAqL1xuICAgIHRoaXMuc29ydGVySW5zdGFuY2UgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKiBAZGVmYXVsdCB0cnVlXG4gICAgICovXG4gICAgdGhpcy5wcmVzb3J0R3JvdXBzID0gdHJ1ZTtcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBkZWZhdWx0IHt9XG4gICAgICovXG4gICAgdGhpcy5sYXN0QWdncmVnYXRlID0ge307XG5cbiAgICB0aGlzLnNldEFnZ3JlZ2F0ZXMoe30pO1xufVxuXG5EYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciwgLy8gcHJlc2VydmUgY29uc3RydWN0b3JcblxuICAgIGlzTnVsbE9iamVjdDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGFnZ3JlZ2F0aW9uc1xuICAgICAqL1xuICAgIHNldEFnZ3JlZ2F0ZXM6IGZ1bmN0aW9uKGFnZ3JlZ2F0aW9ucykge1xuICAgICAgICB0aGlzLmxhc3RBZ2dyZWdhdGUgPSBhZ2dyZWdhdGlvbnM7XG4gICAgICAgIHRoaXMuY2xlYXJBZ2dyZWdhdGlvbnMoKTtcbiAgICAgICAgdGhpcy5oZWFkZXJzLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgaWYgKHRoaXMuaGFzR3JvdXBzKCkpIHtcbiAgICAgICAgICAgIHRoaXMuaGVhZGVycy5wdXNoKCdUcmVlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYWdncmVnYXRpb25zKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEFnZ3JlZ2F0ZShrZXksIGFnZ3JlZ2F0aW9uc1trZXldKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGxhYmVsXG4gICAgICogQHBhcmFtIGZ1bmNcbiAgICAgKi9cbiAgICBhZGRBZ2dyZWdhdGU6IGZ1bmN0aW9uKGxhYmVsLCBmdW5jKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycy5wdXNoKGhlYWRlcmlmeShsYWJlbCkpO1xuICAgICAgICB0aGlzLmFnZ3JlZ2F0ZXMucHVzaChmdW5jKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBjb2x1bW5JbmRleEFycmF5XG4gICAgICovXG4gICAgc2V0R3JvdXBCeXM6IGZ1bmN0aW9uKGNvbHVtbkluZGV4QXJyYXkpIHtcbiAgICAgICAgdmFyIGdyb3VwQnlzID0gdGhpcy5ncm91cEJ5cztcbiAgICAgICAgZ3JvdXBCeXMubGVuZ3RoID0gMDtcbiAgICAgICAgY29sdW1uSW5kZXhBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbkluZGV4KSB7XG4gICAgICAgICAgICBncm91cEJ5cy5wdXNoKGNvbHVtbkluZGV4KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc2V0QWdncmVnYXRlcyh0aGlzLmxhc3RBZ2dyZWdhdGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICovXG4gICAgYWRkR3JvdXBCeTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgdGhpcy5ncm91cEJ5cy5wdXNoKGluZGV4KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGhhc0dyb3VwczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuZ3JvdXBCeXMubGVuZ3RoO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaGFzQWdncmVnYXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuYWdncmVnYXRlcy5sZW5ndGg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBhcHBseTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuYnVpbGRHcm91cFRyZWUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGNsZWFyR3JvdXBzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5ncm91cEJ5cy5sZW5ndGggPSAwO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICovXG4gICAgY2xlYXJBZ2dyZWdhdGlvbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmFnZ3JlZ2F0ZXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5oZWFkZXJzLmxlbmd0aCA9IDA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBidWlsZEdyb3VwVHJlZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBncm91cEJ5cyA9IHRoaXMuZ3JvdXBCeXMsXG4gICAgICAgICAgICBsZWFmRGVwdGggPSBncm91cEJ5cy5sZW5ndGggLSAxLFxuICAgICAgICAgICAgc291cmNlID0gdGhpcy5kYXRhU291cmNlLFxuICAgICAgICAgICAgcm93Q291bnQgPSBzb3VyY2UuZ2V0Um93Q291bnQoKSxcbiAgICAgICAgICAgIHRyZWUgPSB0aGlzLnRyZWUgPSBuZXcgRGF0YU5vZGVUcmVlKCdUb3RhbHMnKTtcblxuICAgICAgICAvLyBmaXJzdCBzb3J0IGRhdGFcbiAgICAgICAgaWYgKHRoaXMucHJlc29ydEdyb3Vwcykge1xuICAgICAgICAgICAgZ3JvdXBCeXMucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24oZ3JvdXBCeSkge1xuICAgICAgICAgICAgICAgIHNvdXJjZSA9IG5ldyBEYXRhU291cmNlU29ydGVyKHNvdXJjZSk7XG4gICAgICAgICAgICAgICAgc291cmNlLnNvcnRPbihncm91cEJ5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgciA9IDA7IHIgPCByb3dDb3VudDsgcisrKSB7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IHRyZWU7XG5cbiAgICAgICAgICAgIGdyb3VwQnlzLmZvckVhY2goZnVuY3Rpb24oZywgYykgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBzb3VyY2UuZ2V0VmFsdWUoZywgciksXG4gICAgICAgICAgICAgICAgICAgIGZhY3RvcnlEYXRhTm9kZSA9IChjID09PSBsZWFmRGVwdGgpID8gZmFjdG9yeURhdGFOb2RlTGVhZiA6IGZhY3RvcnlEYXRhTm9kZUdyb3VwO1xuICAgICAgICAgICAgICAgIHBhdGggPSBwYXRoLmNoaWxkcmVuLmdldElmVW5kZWZpbmVkKGtleSwgZmFjdG9yeURhdGFOb2RlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBwYXRoLmluZGV4LnB1c2gocik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNvcnRlckluc3RhbmNlID0gbmV3IERhdGFTb3VyY2VTb3J0ZXIoc291cmNlKTtcbiAgICAgICAgdHJlZS50b0FycmF5KCk7XG4gICAgICAgIHRyZWUuY29tcHV0ZUFnZ3JlZ2F0ZXModGhpcyk7XG4gICAgICAgIHRoaXMuYnVpbGRWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0gZGF0YU5vZGVcbiAgICAgKi9cbiAgICBhZGRWaWV3OiBmdW5jdGlvbihkYXRhTm9kZSkge1xuICAgICAgICB0aGlzLnZpZXcucHVzaChkYXRhTm9kZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBidWlsZFZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnZpZXcubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy50cmVlLmNvbXB1dGVIZWlnaHQoKTtcbiAgICAgICAgdGhpcy50cmVlLmJ1aWxkVmlldyh0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHsqfGJvb2xlYW59XG4gICAgICovXG4gICAgdmlld01ha2VzU2Vuc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNBZ2dyZWdhdGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0geFxuICAgICAqIEBwYXJhbSB5XG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZ2V0VmFsdWU6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgaWYgKCF0aGlzLnZpZXdNYWtlc1NlbnNlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFTb3VyY2UuZ2V0VmFsdWUoeCwgeSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcm93ID0gdGhpcy52aWV3W3ldO1xuXG4gICAgICAgIHJldHVybiByb3cgPyByb3cuZ2V0VmFsdWUoeCkgOiBudWxsOyAvLyBUT0RPOiB3aGF0IGtpbmQgb2Ygb2JqZWN0IGlzIHJvdy4uLiA/IHNob3VsZCBpdCBiZSB1bmZpbHRyZWQ/XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0geFxuICAgICAqIEBwYXJhbSB5XG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgc2V0VmFsdWU6IGZ1bmN0aW9uKHgsIHksIHZhbHVlKSB7XG4gICAgICAgIGlmICghdGhpcy52aWV3TWFrZXNTZW5zZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhU291cmNlLnNldFZhbHVlKHgsIHksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZ2V0Q29sdW1uQ291bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIXRoaXMudmlld01ha2VzU2Vuc2UoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVNvdXJjZS5nZXRDb2x1bW5Db3VudCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdldEhlYWRlcnMoKS5sZW5ndGg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBnZXRSb3dDb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy52aWV3TWFrZXNTZW5zZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhU291cmNlLmdldFJvd0NvdW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5sZW5ndGg7IC8vaGVhZGVyIGNvbHVtblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHlcbiAgICAgKi9cbiAgICBjbGljazogZnVuY3Rpb24oeSkge1xuICAgICAgICB2YXIgZ3JvdXAgPSB0aGlzLnZpZXdbeV07XG4gICAgICAgIGdyb3VwLnRvZ2dsZUV4cGFuc2lvblN0YXRlKHRoaXMpO1xuICAgICAgICB0aGlzLmJ1aWxkVmlldygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUFnZ3JlZ2F0b3IucHJvdG90eXBlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZ2V0SGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy52aWV3TWFrZXNTZW5zZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhU291cmNlLmdldEhlYWRlcnMoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5oZWFkZXJzOyAvLyBUT0RPOiBWaWV3cyBvdmVycmlkZSBkYXRhU291cmNlIGhlYWRlcnMgd2l0aCB0aGVpciBvd24gaGVhZGVycz9cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBoZWFkZXJzXG4gICAgICovXG4gICAgc2V0SGVhZGVyczogZnVuY3Rpb24oaGVhZGVycykge1xuICAgICAgICB0aGlzLmRhdGFTb3VyY2Uuc2V0SGVhZGVycyhoZWFkZXJzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHsqfG51bWJlcltdfVxuICAgICAqL1xuICAgIGdldEZpZWxkczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFTb3VyY2UuZ2V0RmllbGRzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0gZmllbGRzXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgc2V0RmllbGRzOiBmdW5jdGlvbihmaWVsZHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVNvdXJjZS5zZXRGaWVsZHMoZmllbGRzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VBZ2dyZWdhdG9yLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3RbXX1cbiAgICAgKi9cbiAgICBnZXRHcmFuZFRvdGFsczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2aWV3ID0gdGhpcy50cmVlO1xuICAgICAgICByZXR1cm4gW3ZpZXcuZGF0YV07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0geVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGdldFJvdzogZnVuY3Rpb24oeSkge1xuICAgICAgICBpZiAoIXRoaXMudmlld01ha2VzU2Vuc2UoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVNvdXJjZS5nZXRSb3coeSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcm9sbHVwcyA9IHRoaXMudmlld1t5XTtcblxuICAgICAgICByZXR1cm4gcm9sbHVwcyA/IHJvbGx1cHMgOiB0aGlzLnRyZWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlQWdncmVnYXRvci5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0gYXJyYXlPZlVuaWZvcm1PYmplY3RzXG4gICAgICovXG4gICAgc2V0RGF0YTogZnVuY3Rpb24oYXJyYXlPZlVuaWZvcm1PYmplY3RzKSB7XG4gICAgICAgIHRoaXMuZGF0YVNvdXJjZS5zZXREYXRhKGFycmF5T2ZVbmlmb3JtT2JqZWN0cyk7XG4gICAgICAgIHRoaXMuYXBwbHkoKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBmYWN0b3J5RGF0YU5vZGVMZWFmKGtleSkge1xuICAgIHJldHVybiBuZXcgRGF0YU5vZGVMZWFmKGtleSk7XG59XG5cbmZ1bmN0aW9uIGZhY3RvcnlEYXRhTm9kZUdyb3VwKGtleSkge1xuICAgIHJldHVybiBuZXcgRGF0YU5vZGVHcm91cChrZXkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGFTb3VyY2VBZ2dyZWdhdG9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRGF0YVNvdXJjZUluZGV4ZWQgPSByZXF1aXJlKCcuL0RhdGFTb3VyY2VJbmRleGVkJyk7XG5cbi8qKlxuICogQHR5cGVkZWYge2Z1bmN0aW9ufSBmaWx0ZXJGdW5jdGlvblxuICogQHBhcmFtIGNlbGxWYWx1ZVxuICogQHBhcmFtIHtvYmplY3R9IHJvd09iamVjdCAtIFJlZmVyZW5jZSB0byBgdGhpcy5kYXRhU291cmNlLmRhdGFbcl1gLlxuICogQHBhcmFtIHtudW1iZXJ9IHIgLSBSb3cgbnVtYmVyIChpbmRleCB3aXRoaW4gYHRoaXMuZGF0YVNvdXJjZS5kYXRhYCkuXG4gKi9cblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIERhdGFTb3VyY2VJbmRleGVkXG4gKi9cbnZhciBEYXRhU291cmNlR2xvYmFsRmlsdGVyID0gRGF0YVNvdXJjZUluZGV4ZWQuZXh0ZW5kKCdEYXRhU291cmNlR2xvYmFsRmlsdGVyJywge1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUdsb2JhbEZpbHRlci5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW2ZpbHRlcl0gLSBJZiB1bmRlZmluZWQsIGRlbGV0ZXMgZmlsdGVyLlxuICAgICAqL1xuICAgIHNldDogZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQHR5cGUge2ZpbHRlckZ1bmN0aW9ufVxuICAgICAgICAgICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VHbG9iYWxGaWx0ZXIucHJvdG90eXBlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuZmlsdGVyID0gZmlsdGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZmlsdGVyO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGdldDogZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZpbHRlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUdsb2JhbEZpbHRlci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBhcHBseTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5maWx0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJJbmRleCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5idWlsZEluZGV4KGZ1bmN0aW9uIGFwcGx5RmlsdGVyKHIsIHJvd09iamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlci50ZXN0KHJvd09iamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlR2xvYmFsRmlsdGVyLnByb3RvdHlwZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0Um93Q291bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIgPyB0aGlzLmluZGV4Lmxlbmd0aCA6IHRoaXMuZGF0YVNvdXJjZS5nZXRSb3dDb3VudCgpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGFTb3VyY2VHbG9iYWxGaWx0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCYXNlID0gcmVxdWlyZSgnZXh0ZW5kLW1lJykuQmFzZTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIERhdGFTb3VyY2VJbmRleGVkID0gQmFzZS5leHRlbmQoJ0RhdGFTb3VyY2VJbmRleGVkJywge1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKi9cbiAgICBpc051bGxPYmplY3Q6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VJbmRleGVkLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBkYXRhU291cmNlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZGF0YVNvdXJjZSkge1xuICAgICAgICB0aGlzLmRhdGFTb3VyY2UgPSBkYXRhU291cmNlO1xuICAgICAgICB0aGlzLmluZGV4ID0gW107XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlSW5kZXhlZC5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0geVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIHRyYW5zcG9zZVk6IGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXgubGVuZ3RoID8gdGhpcy5pbmRleFt5XSA6IHk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlSW5kZXhlZC5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0geVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0Um93OiBmdW5jdGlvbih5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFTb3VyY2UuZ2V0Um93KHRoaXMudHJhbnNwb3NlWSh5KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlSW5kZXhlZC5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0geFxuICAgICAqIEBwYXJhbSB5XG4gICAgICogQHJldHVybnMgeyp8TWl4ZWR9XG4gICAgICovXG4gICAgZ2V0VmFsdWU6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVNvdXJjZS5nZXRWYWx1ZSh4LCB0aGlzLnRyYW5zcG9zZVkoeSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUluZGV4ZWQucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geVxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICAgKi9cbiAgICBzZXRWYWx1ZTogZnVuY3Rpb24oeCwgeSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5kYXRhU291cmNlLnNldFZhbHVlKHgsIHRoaXMudHJhbnNwb3NlWSh5KSwgdmFsdWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUluZGV4ZWQucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge051bWJlcnwqfVxuICAgICAqL1xuICAgIGdldFJvd0NvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXgubGVuZ3RoIHx8IHRoaXMuZGF0YVNvdXJjZS5nZXRSb3dDb3VudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGdldENvbHVtbkNvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVNvdXJjZS5nZXRDb2x1bW5Db3VudCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUluZGV4ZWQucHJvdG90eXBlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZ2V0RmllbGRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YVNvdXJjZS5nZXRGaWVsZHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VJbmRleGVkLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBmaWVsZHNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBzZXRGaWVsZHM6IGZ1bmN0aW9uKGZpZWxkcykge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhU291cmNlLnNldEZpZWxkcyhmaWVsZHMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUluZGV4ZWQucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gaGVhZGVyc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICBzZXRIZWFkZXJzOiBmdW5jdGlvbihoZWFkZXJzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFTb3VyY2Uuc2V0SGVhZGVycyhoZWFkZXJzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nW119XG4gICAgICovXG4gICAgZ2V0SGVhZGVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFTb3VyY2UuZ2V0SGVhZGVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUluZGV4ZWQucHJvdG90eXBlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZ2V0R3JhbmRUb3RhbHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhU291cmNlLmdldEdyYW5kVG90YWxzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlSW5kZXhlZC5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0ge29iamVjdFtdfSBhcnJheU9mVW5pZm9ybU9iamVjdHNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0W119XG4gICAgICovXG4gICAgc2V0RGF0YTogZnVuY3Rpb24oYXJyYXlPZlVuaWZvcm1PYmplY3RzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFTb3VyY2Uuc2V0RGF0YShhcnJheU9mVW5pZm9ybU9iamVjdHMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZUluZGV4ZWQucHJvdG90eXBlXG4gICAgICovXG4gICAgY2xlYXJJbmRleDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuaW5kZXgubGVuZ3RoID0gMDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VJbmRleGVkLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSB7ZmlsdGVyUHJlZGljYXRlfSBwcmVkaWNhdGVcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyW119XG4gICAgICovXG4gICAgYnVpbGRJbmRleDogZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgICAgIHZhciByb3dDb3VudCA9IHRoaXMuZGF0YVNvdXJjZS5nZXRSb3dDb3VudCgpLFxuICAgICAgICAgICAgaW5kZXggPSB0aGlzLmluZGV4O1xuXG4gICAgICAgIHRoaXMuY2xlYXJJbmRleCgpO1xuXG4gICAgICAgIGZvciAodmFyIHIgPSAwOyByIDwgcm93Q291bnQ7IHIrKykge1xuICAgICAgICAgICAgaWYgKCFwcmVkaWNhdGUgfHwgcHJlZGljYXRlLmNhbGwodGhpcywgciwgdGhpcy5kYXRhU291cmNlLmdldFJvdyhyKSkpIHtcbiAgICAgICAgICAgICAgICBpbmRleC5wdXNoKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH1cblxufSk7XG5cbi8qKiBAdHlwZWRlZiB7ZnVuY3Rpb259IGZpbHRlclByZWRpY2F0ZVxuICogQHN1bW1hcnkgQXBwbGllcyBmaWx0ZXIgdG8gZ2l2ZW4gcm93LlxuICogQHBhcmFtIHtudWJtZXJ9IHIgLSBSb3cgaW5kZXggb2Ygcm93IGRhdGEgd2l0aGluIHJvd3MgYXJyYXkgYHRoaXMuZGF0YVNvdXJjZS5kYXRhW11gLlxuICogQHBhcmFtIHtvYmplY3R9IHJvd09iamVjdCAtIFJvdyBkYXRhOyBlbGVtZW50IG9mIGB0aGlzLmRhdGFTb3VyY2UuZGF0YVtdYC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSb3cgcXVhbGlmaWVzIChwYXNzZXMgdGhyb3VnaCBmaWx0ZXIpLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YVNvdXJjZUluZGV4ZWQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBEYXRhU291cmNlSW5kZXhlZCA9IHJlcXVpcmUoJy4vRGF0YVNvdXJjZUluZGV4ZWQnKTtcbnZhciBzdGFibGVTb3J0ID0gcmVxdWlyZSgnLi91dGlsL3N0YWJsZVNvcnQnKTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIERhdGFTb3VyY2VJbmRleGVkXG4gKi9cbnZhciBEYXRhU291cmNlU29ydGVyID0gRGF0YVNvdXJjZUluZGV4ZWQuZXh0ZW5kKCdEYXRhU291cmNlU29ydGVyJywge1xuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VTb3J0ZXIucHJvdG90eXBlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbWVtYmVyT2YgRGF0YVNvdXJjZVNvcnRlci5wcm90b3R5cGVcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmRlc2NlbmRpbmdTb3J0ID0gZmFsc2U7IC8vIFRPRE86IHRoaXMgZG9lcyBub3Qgc2VlbSB0byBiZSBpbiB1c2VcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VTb3J0ZXIucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbElkeFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbZGlyZWN0aW9uPTFdXG4gICAgICovXG4gICAgc29ydE9uOiBmdW5jdGlvbihjb2xJZHgsIGRpcmVjdGlvbikge1xuICAgICAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJJbmRleCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIGNhc2UgLTE6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzOyAvLyBmb3IgdXNlIGluIGdldFZhbHVlXG4gICAgICAgICAgICAgICAgc3RhYmxlU29ydC5zb3J0KHRoaXMuYnVpbGRJbmRleCgpLCBnZXRWYWx1ZSwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZhbHVlKHJvd0lkeCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbE9yRnVuY0NhbGwoc2VsZi5kYXRhU291cmNlLmdldFZhbHVlKGNvbElkeCwgcm93SWR4KSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfGZ1bmN0aW9ufSB2YWxPckZ1bmNcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiB2YWxPckZ1bmNDYWxsKHZhbE9yRnVuYykge1xuICAgIHJldHVybiB0eXBlb2YgdmFsT3JGdW5jID09PSAnZnVuY3Rpb24nID8gdmFsT3JGdW5jKCkgOiB2YWxPckZ1bmM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YVNvdXJjZVNvcnRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIERhdGFTb3VyY2VJbmRleGVkID0gcmVxdWlyZSgnLi9EYXRhU291cmNlSW5kZXhlZCcpO1xudmFyIERhdGFTb3VyY2VTb3J0ZXIgPSByZXF1aXJlKCcuL0RhdGFTb3VyY2VTb3J0ZXInKTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBleHRlbmRzIERhdGFTb3VyY2VJbmRleGVkXG4gKi9cbnZhciBEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlID0gRGF0YVNvdXJjZUluZGV4ZWQuZXh0ZW5kKCdEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlJywge1xuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VTb3J0ZXJDb21wb3NpdGUucHJvdG90eXBlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYXZlYXRzOlxuICAgICAgICAgKlxuICAgICAgICAgKiAxLiBDb2x1bW5zIHNob3VsZCBiZSB1bmlxdWVseSByZXByZXNlbnRlZCAoaS5lLiwgbm8gcmVwZWF0cyB3aXRoIHNhbWUgY29sdW1uSW5kZXgpXG4gICAgICAgICAqIDIuIENvbHVtbnMgc2hvdWxkIGJlIGFkZGVkIGxvdy0gdG8gaGlnaC1vcmRlciAoaS5lLiwgbW9zdCBncm91cGVkIGNvbHVtbnMgY29tZSBsYXN0KVxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zb3J0cyA9IFtdO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7RGF0YVNvdXJjZX1cbiAgICAgICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VTb3J0ZXJDb21wb3NpdGUucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmxhc3QgPSB0aGlzLmRhdGFTb3VyY2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICBnZXRSb3c6IGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGFzdC5nZXRSb3coeSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBjb2x1bW5JbmRleFxuICAgICAqIEBwYXJhbSBkaXJlY3Rpb25cbiAgICAgKi9cbiAgICBzb3J0T246IGZ1bmN0aW9uKGNvbHVtbkluZGV4LCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdGhpcy5zb3J0cy5wdXNoKFtjb2x1bW5JbmRleCwgZGlyZWN0aW9uXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGFwcGx5U29ydHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZWFjaCA9IHRoaXMuZGF0YVNvdXJjZTtcblxuICAgICAgICB0aGlzLnNvcnRzLmZvckVhY2goZnVuY3Rpb24oc29ydCkge1xuICAgICAgICAgICAgZWFjaCA9IG5ldyBEYXRhU291cmNlU29ydGVyKGVhY2gpO1xuICAgICAgICAgICAgZWFjaC5zb3J0T24uYXBwbHkoZWFjaCwgc29ydCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubGFzdCA9IGVhY2g7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGNsZWFyU29ydHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNvcnRzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMubGFzdCA9IHRoaXMuZGF0YVNvdXJjZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIERhdGFTb3VyY2VTb3J0ZXJDb21wb3NpdGUucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGdldFZhbHVlOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxhc3QuZ2V0VmFsdWUoeCwgeSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBEYXRhU291cmNlU29ydGVyQ29tcG9zaXRlLnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHlcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlXG4gICAgICovXG4gICAgc2V0VmFsdWU6IGZ1bmN0aW9uKHgsIHksIHZhbHVlKSB7XG4gICAgICAgIHRoaXMubGFzdC5zZXRWYWx1ZSh4LCB5LCB2YWx1ZSk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YVNvdXJjZVNvcnRlckNvbXBvc2l0ZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gTWFwcHkoKSB7XG4gICAgdGhpcy5rZXlzID0gW107XG4gICAgdGhpcy5kYXRhID0ge307XG4gICAgdGhpcy52YWx1ZXMgPSBbXTtcbn1cblxuTWFwcHkucHJvdG90eXBlID0ge1xuXG4gICAgY29uc3RydWN0b3I6IE1hcHB5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciwgLy8gcHJlc2VydmUgY29uc3RydWN0b3JcblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJPZiBNYXBweS5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICovXG4gICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciBoYXNoQ29kZSA9IGhhc2goa2V5KTtcbiAgICAgICAgaWYgKCEoaGFzaENvZGUgaW4gdGhpcy5kYXRhKSkge1xuICAgICAgICAgICAgdGhpcy5rZXlzLnB1c2goa2V5KTtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzLnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGF0YVtoYXNoQ29kZV0gPSB2YWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIE1hcHB5LnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgaGFzaENvZGUgPSBoYXNoKGtleSk7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbaGFzaENvZGVdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBNYXBweS5wcm90b3R5cGVcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gaWZVbmRlZmluZWRGdW5jIC0gVmFsdWUgZ2V0dGVyIHdoZW4gdmFsdWUgaXMgb3RoZXJ3aXNlIHVuZGVmaW5lZC5cbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBnZXRJZlVuZGVmaW5lZDogZnVuY3Rpb24oa2V5LCBpZlVuZGVmaW5lZEZ1bmMpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5nZXQoa2V5KTtcbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhbHVlID0gaWZVbmRlZmluZWRGdW5jKGtleSk7XG4gICAgICAgICAgICB0aGlzLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcblxuICAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5rZXlzLmxlbmd0aDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIE1hcHB5LnByb3RvdHlwZVxuICAgICAqL1xuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5rZXlzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMudmFsdWVzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuZGF0YSA9IHt9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgTWFwcHkucHJvdG90eXBlXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqL1xuICAgIGRlbGV0ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBoYXNoQ29kZSA9IGhhc2goa2V5KTtcbiAgICAgICAgaWYgKHRoaXMuZGF0YVtoYXNoQ29kZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gYmV0dGVySW5kZXhPZih0aGlzLmtleXMsIGtleSk7XG4gICAgICAgICAgICB0aGlzLmtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5kYXRhW2hhc2hDb2RlXTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgTWFwcHkucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gaXRlcmF0ZWVcbiAgICAgKi9cbiAgICBmb3JFYWNoOiBmdW5jdGlvbihpdGVyYXRlZSkge1xuICAgICAgICBpZiAodHlwZW9mIGl0ZXJhdGVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IHRoaXMua2V5cyxcbiAgICAgICAgICAgICAgICBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBzZWxmLmdldChrZXkpO1xuICAgICAgICAgICAgICAgIGl0ZXJhdGVlKHZhbHVlLCBrZXksIHNlbGYpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlck9mIE1hcHB5LnByb3RvdHlwZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGl0ZXJhdGVlXG4gICAgICogQHJldHVybnMge01hcHB5fVxuICAgICAqL1xuICAgIG1hcDogZnVuY3Rpb24oaXRlcmF0ZWUpIHtcbiAgICAgICAgdmFyIGtleXMgPSB0aGlzLmtleXMsXG4gICAgICAgICAgICBuZXdNYXAgPSBuZXcgTWFwcHkoKSxcbiAgICAgICAgICAgIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIGlmICghKHR5cGVvZiBpdGVyYXRlZSA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgIGl0ZXJhdGVlID0gcmVmbGVjdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHNlbGYuZ2V0KGtleSksXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtZWQgPSBpdGVyYXRlZSh2YWx1ZSwga2V5LCBzZWxmKTtcbiAgICAgICAgICAgIG5ld01hcC5zZXQoa2V5LCB0cmFuc2Zvcm1lZCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbmV3TWFwO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyT2YgTWFwcHkucHJvdG90eXBlXG4gICAgICogQHJldHVybnMge01hcHB5fVxuICAgICAqL1xuICAgIGNvcHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIga2V5cyA9IHRoaXMua2V5cyxcbiAgICAgICAgICAgIG5ld01hcCA9IG5ldyBNYXBweSgpLFxuICAgICAgICAgICAgc2VsZiA9IHRoaXM7XG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHNlbGYuZ2V0KGtleSk7XG4gICAgICAgICAgICBuZXdNYXAuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5ld01hcDtcbiAgICB9XG5cbn07XG5cbnZhciBPSURfUFJFRklYID0gJy5+LiMlXyc7IC8vdGhpcyBzaG91bGQgYmUgc29tZXRoaW5nIHdlIG5ldmVyIHdpbGwgc2VlIGF0IHRoZSBiZWdpbm5pbmcgb2YgYSBzdHJpbmdcbnZhciBjb3VudGVyID0gMDtcblxuZnVuY3Rpb24gaGFzaChrZXkpIHtcbiAgICB2YXIgdHlwZU9mID0gdHlwZW9mIGtleTtcblxuICAgIHN3aXRjaCAodHlwZU9mKSB7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICBjYXNlICdzeW1ib2wnOlxuICAgICAgICAgICAgcmV0dXJuIE9JRF9QUkVGSVggKyB0eXBlT2YgKyAnXycgKyBrZXk7XG5cbiAgICAgICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgIHJldHVybiAnVU5ERUZJTkVEJztcblxuICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgaWYgKGtleSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnTlVMTCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBmYWxsIHRocm91Z2ggd2hlbiBub3QgbnVsbDpcbiAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgcmV0dXJuIChrZXkuX19fZmluaGFzaCA9IGtleS5fX19maW5oYXNoIHx8IE9JRF9QUkVGSVggKyBjb3VudGVyKyspOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVyc2NvcmUtZGFuZ2xlXG4gICAgfVxufVxuXG4vLyBPYmplY3QuaXMgcG9seWZpbGwsIGNvdXJ0ZXN5IG9mIEBXZWJSZWZsZWN0aW9uXG52YXIgaXMgPSBPYmplY3QuaXMgfHwgZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhID09PSBiID8gYSAhPT0gMCB8fCAxIC8gYSA9PSAxIC8gYiA6IGEgIT0gYSAmJiBiICE9IGI7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG59O1xuXG5mdW5jdGlvbiByZWZsZWN0aW9uKHZhbCkge1xuICAgIHJldHVybiB2YWw7XG59XG5cbi8vIE1vcmUgcmVsaWFibGUgaW5kZXhPZiwgY291cnRlc3kgb2YgQFdlYlJlZmxlY3Rpb25cbmZ1bmN0aW9uIGJldHRlckluZGV4T2YoYXJyLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSAhPSB2YWx1ZSB8fCB2YWx1ZSA9PT0gMCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgICAgICB2YXIgaSA9IGFyci5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0gJiYgIWlzKGFycltpXSwgdmFsdWUpKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpID0gW10uaW5kZXhPZi5jYWxsKGFyciwgdmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gaTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNYXBweTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbW9kdWxlIGFnZ3JlZ2F0aW9uc1xuICovXG5cbi8qKlxuICogQHR5cGVkZWYge2Z1bmN0aW9ufSBhZ2dyZWdhdGlvbkZ1bmN0aW9uXG4gKiBAc3VtbWFyeSBBIGJvdW5kIGZ1bmN0aW9uLlxuICogQGRlc2MgQW4gYWdncmVnYXRpb24gZnVuY3Rpb24gYm91bmQgdG8gdGhlIGBjb2x1bW5JbmRleGAgdmFsdWUgc3VwcGxpZWQgdG8gb25lIG9mIHRoZSBhYm92ZSBmYWN0b3J5IGZ1bmN0aW9ucy5cbiAqIEBwYXJhbSB7b2JqZWN0fSBncm91cFxuICogQHJldHVybnMgeyp9IEFnZ3JlZ2F0ZWQgdmFsdWUuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLyoqXG4gICAgICogQGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbkluZGV4XG4gICAgICogQHJldHVybnMge2FnZ3JlZ2F0aW9uRnVuY3Rpb259IEJvdW5kIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNvdW50OiBmdW5jdGlvbihjb2x1bW5JbmRleCkge1xuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5JbmRleFxuICAgICAqIEByZXR1cm5zIHthZ2dyZWdhdGlvbkZ1bmN0aW9ufSBCb3VuZCBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBzdW06IGZ1bmN0aW9uKGNvbHVtbkluZGV4KSB7XG4gICAgICAgIHJldHVybiBzdW0uYmluZCh0aGlzLCBjb2x1bW5JbmRleCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5JbmRleFxuICAgICAqIEByZXR1cm5zIHthZ2dyZWdhdGlvbkZ1bmN0aW9ufSBCb3VuZCBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBtaW46IGZ1bmN0aW9uKGNvbHVtbkluZGV4KSB7XG4gICAgICAgIHJldHVybiBtaW5tYXguYmluZCh0aGlzLCBjb2x1bW5JbmRleCwgTWF0aC5taW4sIEluZmluaXR5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbkluZGV4XG4gICAgICogQHJldHVybnMge2FnZ3JlZ2F0aW9uRnVuY3Rpb259IEJvdW5kIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIG1heDogZnVuY3Rpb24oY29sdW1uSW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG1pbm1heC5iaW5kKHRoaXMsIGNvbHVtbkluZGV4LCBNYXRoLm1heCwgLUluZmluaXR5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbkluZGV4XG4gICAgICogQHJldHVybnMge2FnZ3JlZ2F0aW9uRnVuY3Rpb259IEJvdW5kIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGF2ZzogZnVuY3Rpb24oY29sdW1uSW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGF2Zy5iaW5kKHRoaXMsIGNvbHVtbkluZGV4KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbkluZGV4XG4gICAgICogQHJldHVybnMge2FnZ3JlZ2F0aW9uRnVuY3Rpb259IEJvdW5kIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGZpcnN0OiBmdW5jdGlvbihjb2x1bW5JbmRleCkge1xuICAgICAgICByZXR1cm4gZmlyc3QuYmluZCh0aGlzLCBjb2x1bW5JbmRleCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5JbmRleFxuICAgICAqIEByZXR1cm5zIHthZ2dyZWdhdGlvbkZ1bmN0aW9ufSBCb3VuZCBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBsYXN0OiBmdW5jdGlvbihjb2x1bW5JbmRleCkge1xuICAgICAgICByZXR1cm4gbGFzdC5iaW5kKHRoaXMsIGNvbHVtbkluZGV4KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbkluZGV4XG4gICAgICogQHJldHVybnMge2FnZ3JlZ2F0aW9uRnVuY3Rpb259IEJvdW5kIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIHN0ZGRldjogZnVuY3Rpb24oY29sdW1uSW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIHN0ZGRldi5iaW5kKHRoaXMsIGNvbHVtbkluZGV4KTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBjb3VudChncm91cCkge1xuICAgIHJldHVybiBncm91cC5nZXRSb3dDb3VudCgpO1xufVxuXG5mdW5jdGlvbiBzdW0oY29sdW1uSW5kZXgsIGdyb3VwKSB7XG4gICAgdmFyIHIgPSBncm91cC5nZXRSb3dDb3VudCgpLFxuICAgICAgICBuID0gMDtcblxuICAgIHdoaWxlIChyLS0pIHtcbiAgICAgICAgbiArPSBncm91cC5nZXRWYWx1ZShjb2x1bW5JbmRleCwgcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG47XG59XG5cbmZ1bmN0aW9uIG1pbm1heChjb2x1bW5JbmRleCwgbWV0aG9kLCBuLCBncm91cCkge1xuICAgIHZhciByID0gZ3JvdXAuZ2V0Um93Q291bnQoKTtcblxuICAgIHdoaWxlIChyLS0pIHtcbiAgICAgICAgbiA9IG1ldGhvZChuLCBncm91cC5nZXRWYWx1ZShjb2x1bW5JbmRleCwgcikpO1xuICAgIH1cblxuICAgIHJldHVybiBuO1xufVxuXG5mdW5jdGlvbiBhdmcoY29sdW1uSW5kZXgsIGdyb3VwKSB7XG4gICAgcmV0dXJuIHN1bShjb2x1bW5JbmRleCwgZ3JvdXApIC8gZ3JvdXAuZ2V0Um93Q291bnQoKTtcbn1cblxuZnVuY3Rpb24gZmlyc3QoY29sdW1uSW5kZXgsIGdyb3VwKSB7XG4gICAgcmV0dXJuIGdyb3VwLmdldFZhbHVlKGNvbHVtbkluZGV4LCAwKTtcbn1cblxuZnVuY3Rpb24gbGFzdChjb2x1bW5JbmRleCwgZ3JvdXApIHtcbiAgICByZXR1cm4gZ3JvdXAuZ2V0VmFsdWUoY29sdW1uSW5kZXgsIGdyb3VwLmdldFJvd0NvdW50KCkgLSAxKTtcbn1cblxuZnVuY3Rpb24gc3RkZGV2KGNvbHVtbkluZGV4LCBncm91cCkge1xuICAgIHZhciByb3dzID0gZ3JvdXAuZ2V0Um93Q291bnQoKSxcbiAgICAgICAgbWVhbiA9IGF2Zyhjb2x1bW5JbmRleCwgZ3JvdXApO1xuXG4gICAgZm9yICh2YXIgZGV2LCByID0gcm93cywgdmFyaWFuY2UgPSAwOyByLS07IHZhcmlhbmNlICs9IGRldiAqIGRldikge1xuICAgICAgICBkZXYgPSBncm91cC5nZXRWYWx1ZShjb2x1bW5JbmRleCwgcikgLSBtZWFuO1xuICAgIH1cblxuICAgIHJldHVybiBNYXRoLnNxcnQodmFyaWFuY2UgLyByb3dzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gaGVhZGVyaWZ5KHN0cmluZykge1xuICAgIHJldHVybiAoL1thLXpdLy50ZXN0KHN0cmluZykgPyBzdHJpbmcgOiBzdHJpbmcudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgLnJlcGxhY2UoL1tcXHNcXC1fXSooW15cXHNcXC1fXSkoW15cXHNcXC1fXSspL2csIHJlcGxhY2VyKVxuICAgICAgICAucmVwbGFjZSgvW0EtWl0vZywgJyAkJicpXG4gICAgICAgIC50cmltKCk7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VyKGEsIGIsIGMpIHtcbiAgICByZXR1cm4gYi50b1VwcGVyQ2FzZSgpICsgYztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBoZWFkZXJpZnk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIE5vdGUgdGhhdCB7QGxpbmsgbW9kdWxlOnN0YWJsZVNvcnQjc29ydHxzb3J0KCl9IGlzIHRoZSBvbmx5IGV4cG9zZWQgbWV0aG9kLlxuICogQG1vZHVsZSBzdGFibGVTb3J0XG4gKi9cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjb21wYXJhdG9yXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGRlc2NlbmRpbmdcbiAqIEBwYXJhbSB7QXJyYXl9IGFycjFcbiAqIEBwYXJhbSB7QXJyYXl9IGFycjJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn1cbiAqL1xuZnVuY3Rpb24gc3RhYmlsaXplKGNvbXBhcmF0b3IsIGRlc2NlbmRpbmcsIGFycjEsIGFycjIpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICB2YXIgeCA9IGFycjFbMF07XG4gICAgdmFyIHkgPSBhcnIyWzBdO1xuXG4gICAgaWYgKHggPT09IHkpIHtcbiAgICAgICAgeCA9IGRlc2NlbmRpbmcgPyBhcnIyWzFdIDogYXJyMVsxXTtcbiAgICAgICAgeSA9IGRlc2NlbmRpbmcgPyBhcnIxWzFdIDogYXJyMlsxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoeSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmICh4ID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb21wYXJhdG9yKHgsIHkpO1xufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAaW5zdGFuY2VcbiAqIEBwYXJhbSB4XG4gKiBAcGFyYW0geVxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gYXNjZW5kaW5nTnVtYmVycyh4LCB5KSB7XG4gICAgcmV0dXJuIHggLSB5O1xufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAaW5zdGFuY2VcbiAqIEBwYXJhbSB4XG4gKiBAcGFyYW0geVxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gZGVzY2VuZGluZ051bWJlcnMoeCwgeSkge1xuICAgIHJldHVybiB5IC0geDtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0geFxuICogQHBhcmFtIHlcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGFzY2VuZGluZ0FsbE90aGVycyh4LCB5KSB7XG4gICAgcmV0dXJuIHggPCB5ID8gLTEgOiAxO1xufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAaW5zdGFuY2VcbiAqIEBwYXJhbSB4XG4gKiBAcGFyYW0geVxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gZGVzY2VuZGluZ0FsbE90aGVycyh4LCB5KSB7XG4gICAgcmV0dXJuIHkgPCB4ID8gLTEgOiAxO1xufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKiBAaW5zdGFuY2VcbiAqIEBwYXJhbSB0eXBlT2ZEYXRhXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb24odGhpczphc2NlbmRpbmcpfVxuICovXG5mdW5jdGlvbiBhc2NlbmRpbmcodHlwZU9mRGF0YSkge1xuICAgIHJldHVybiBzdGFiaWxpemUuYmluZCh0aGlzLCB0eXBlT2ZEYXRhID09PSAnbnVtYmVyJyA/IGFzY2VuZGluZ051bWJlcnMgOiBhc2NlbmRpbmdBbGxPdGhlcnMsIGZhbHNlKTtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0gdHlwZU9mRGF0YVxuICogQHJldHVybnMge2Z1bmN0aW9uKHRoaXM6ZGVzY2VuZGluZyl9XG4gKi9cbmZ1bmN0aW9uIGRlc2NlbmRpbmcodHlwZU9mRGF0YSkge1xuICAgIHJldHVybiBzdGFiaWxpemUuYmluZCh0aGlzLCB0eXBlT2ZEYXRhID09PSAnbnVtYmVyJyA/IGRlc2NlbmRpbmdOdW1iZXJzIDogZGVzY2VuZGluZ0FsbE90aGVycywgdHJ1ZSk7XG59XG5cbi8qKlxuICogQGluc3RhbmNlXG4gKiBAcGFyYW0ge251bWJlcn0gaW5kZXhcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGdldFZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0gW2RpcmVjdGlvbj0xXVxuICovXG5mdW5jdGlvbiBzb3J0KGluZGV4LCBnZXRWYWx1ZSwgZGlyZWN0aW9uKSB7XG5cbiAgICB2YXIgY29tcGFyZSwgaTtcblxuICAgIC8vIGFwcGx5IGRlZmF1bHRzXG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRpcmVjdGlvbiA9IDE7XG4gICAgfVxuXG4gICAgaWYgKGluZGV4Lmxlbmd0aCkgeyAvLyBzb21ldGhpbmcgdG8gZG9cbiAgICAgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIGJhaWw6IG5vdGhpbmcgdG8gc29ydFxuXG4gICAgICAgICAgICBjYXNlIHVuZGVmaW5lZDogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1mYWxsdGhyb3VnaFxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IDE7XG4gICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgY29tcGFyZSA9IGFzY2VuZGluZyh0eXBlb2YgZ2V0VmFsdWUoMCkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIC0xOlxuICAgICAgICAgICAgICAgIGNvbXBhcmUgPSBkZXNjZW5kaW5nKHR5cGVvZiBnZXRWYWx1ZSgwKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzZXQgdXAgdGhlIHNvcnQuLi4uLlxuICAgICAgICB2YXIgdG1wID0gbmV3IEFycmF5KGluZGV4Lmxlbmd0aCk7XG5cbiAgICAgICAgLy8gYWRkIHRoZSBpbmRleCBmb3IgXCJzdGFiaWxpdHlcIlxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW5kZXgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRtcFtpXSA9IFtnZXRWYWx1ZShpKSwgaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkbyB0aGUgYWN0dWFsIHNvcnRcbiAgICAgICAgdG1wLnNvcnQoY29tcGFyZSk7XG5cbiAgICAgICAgLy8gY29weSB0aGUgc29ydGVkIHZhbHVlcyBpbnRvIG91ciBpbmRleCB2ZWN0b3JcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGluZGV4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpbmRleFtpXSA9IHRtcFtpXVsxXTtcbiAgICAgICAgfVxuICAgIH1cblxufVxuXG5leHBvcnRzLnNvcnQgPSBzb3J0O1xuIl19
