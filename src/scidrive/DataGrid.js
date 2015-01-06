define(["gridx/Grid", "dojo/_base/declare", "dojo/_base/array", "dojo/_base/lang", "dojo/_base/html"],
function(GridX, declare, array, lang, html) {
    var DataGrid =  declare("scidrive.DataGrid", [GridX], {

        _currentPath : '/',
        _eventSource: null,

        setCurrentPath: function(path) {
            this.query.path = path;
            this._currentPath = path;
            this.model.clearCache();
            this.body.refresh();
            this._updateEventSource();
        },

        setUser: function(user) {
            if(this._user != user) {
                this._user = user;
                this._updateEventSource();
            }
        },

        _throttle: function(func, wait, options) {
            var context, args, result;
            var timeout = null;
            var previous = 0;
            if (!options) options = {};
            var later = function() {
              previous = options.leading === false ? 0 : new Date().getTime();
              timeout = null;
              result = func.apply(context, args);
              if (!timeout) context = args = null;
            };
            return function() {
              var now = new Date().getTime();
              if (!previous && options.leading === false) previous = now;
              var remaining = wait - (now - previous);
              context = this;
              args = arguments;
              if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                  clearTimeout(timeout);
                  timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
              } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
              }
              return result;
            };
          },

        _updateEventSource: function() {

            var that = this;

            if(null != this._eventSource) {
                this._eventSource.close();
                this._eventSource = null;
            }

            if(typeof this._user != undefined && !!window.EventSource) {

                var shareRootPath = (this.store.vospace.isShare)?"/.*":"";

                var parser = document.createElement('a');
                parser.href = this.store.vospace.url;

                var refresh = this._throttle(function(e) {
                        that.model.clearCache();
                        that.body.refresh();
                    }, 3000)

                dojo.xhrGet(scidrive.OAuth.sign("GET", {
                    url: encodeURI(that.store.vospace.url+"/updates?path="+that.query.path),
                    handleAs: "text",
                    load: function(data){
                        that._eventSource = new EventSource(that.store.vospace.url+'/updates/'+data);
                        that._eventSource.onmessage = refresh;
                        that._eventSource.onerror = function(e) {
                            console.debug(e);
                            that._eventSource.close();
                            that._eventSource = null;
                        };
                    },
                    error: function(data, ioargs) {
                        console.error(data);
                    }
                }, that.store.vospace.credentials));
            }
        }

    });

    return DataGrid;
});
