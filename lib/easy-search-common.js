EasySearch = (function () {
  'use strict';

  var Searchers,
    indexes = {/** @see defaultOptions */},
    defaultOptions = {
      'format' : 'mongo',
      'limit' : 10,
      'use' : 'minimongo',
      'sort' : function () {
        return Searchers[this.use].defaultSort(this);
      },
      'permission' : function () {
        return true;
      },
      /**
       * When using elastic-search it's the query object,
       * while using with mongo-db it's the selector object.
       *
       * @param {String} searchString
       * @return {Object}
       */
      'query' : function (searchString) {
        return Searchers[this.use].defaultQuery(this, searchString);
      }
    };

  /**
   * Searchers which contain all engines which can be used to search content, until now:
   *
   * minimongo (client): Client side collection for reactive search
   * elastic-search (server): Elastic search server to search with (fast)
   * mongo-db (server): MongoDB on the server to search (more convenient)
   *
   */
  Searchers = {};

  return {
    /**
     * Placeholder config method.
     *
     * @param {object} newConfig
     */
    'config' : function (newConfig) {
      return {};
    },
    /**
     * Create a search index.
     *
     * @param {String} name
     * @param {Object} options
     */
    'createSearchIndex' : function (name, options) {
      check(name, String);
      check(options, Object);

      options.field = _.isArray(options.field) ? options.field : [options.field];
      indexes[name] = _.extend(_.clone(defaultOptions), options);

      Searchers[options.use] &&  Searchers[options.use].createSearchIndex(name, options);
    },
    /**
     * Perform a search.
     *
     * @param {String} name             the search index
     * @param {String} searchString     the string to be searched
     * @param {Object} options          defined with createSearchIndex
     * @param {Function} callback       optional callback to be used
     */
    'search' : function (name, searchString, options, callback) {
      var searcherType = indexes[name].use;

      check(name, String);
      check(searchString, String);
      check(options, Object);
      check(callback, Match.Optional(Function));

      if ("undefined" === typeof Searchers[searcherType]) {
        throw new Meteor.Error(500, "Couldnt search with the type: '" + searcherType + "'");
      }

      // If custom permission check fails
      if (!indexes[name].permission(searchString)) {
        return { 'results' : [], 'total' : 0 };
      } else {
        return Searchers[searcherType].search(name, searchString, _.extend(indexes[name], options), callback);
      }
    },
    /**
     * Retrieve a specific index configuration.
     *
     * @param {String} name
     * @return {Object}
     * @api public
     */
    'getIndex' : function (name) {
      return indexes[name];
    },
    /**
     * Retrieve all index configurations
     */
    'getIndexes' : function () {
      return indexes;
    },
    /**
     * Retrieve a specific Seacher.
     *
     * @param {String} name
     * @return {Object}
     * @api public
     */
    'getSearcher' : function (name) {
      return Searchers[name];
    },
    /**
     * Retrieve all Searchers
     */
    'getSearchers' : function () {
      return Searchers;
    },
    /**
     * Makes it possible to override or extend the different
     * types of search to use with EasySearch (the "use" property)
     * when using EasySearch.createSearchIndex()
     *
     * @param {String} key      Type, e.g. mongo-db, elastic-search
     * @param {Object} methods  Methods to be used, only 2 are required:
     *                          - createSearchIndex (name, options)
     *                          - search (name, searchString, [options, callback])
     *                          - defaultQuery (options, searchString)
     *                          - defaultSort (options)
     */
    'createSearcher' : function (key, methods) {
      check(key, String);
      check(methods.search, Function);
      check(methods.createSearchIndex, Function);
      check(methods.defaultQuery, Function);
      check(methods.defaultSort, Function);

      Searchers[key] = methods;
    }
  };
})();