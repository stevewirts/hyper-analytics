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
