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

        _updateEventSource: function() {

            var panel = this;

            if(null != this._eventSource) {
                this._eventSource.close();
                this._eventSource = null;
            }

            if(typeof this._user != undefined && !!window.EventSource) {

                var shareRootPath = (this.store.vospace.isShare)?"/.*":"";

                var parser = document.createElement('a');
                parser.href = this.store.vospace.url;

                dojo.xhrGet(scidrive.OAuth.sign("GET", {
                    url: encodeURI(panel.store.vospace.url+"/updates?path="+panel.query.path),
                    handleAs: "text",
                    load: function(data){
                        panel._eventSource = new EventSource(panel.store.vospace.url+'/updates/'+data);
                        panel._eventSource.onmessage = function(e) {
                            panel.plugin('selector').clear();
                            panel._refresh(true);
                        };
                        panel._eventSource.onerror = function(e) {
                            console.debug(e);
                            panel._eventSource.close();
                            panel._eventSource = null;
                        };
                    },
                    error: function(data, ioargs) {
                        console.error(data);
                    }
                }, panel.store.vospace.credentials));
            }
        }

    });

    return DataGrid;
});
