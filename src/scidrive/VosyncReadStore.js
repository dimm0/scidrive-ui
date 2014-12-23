define(["dojox/data/QueryReadStore", "dojo/_base/declare", "dojo/json", "dojo/request/xhr", "scidrive/XMLWriter"], function(QueryReadStore, declare, JSON, xhr, XMLWriter) {
    return declare([QueryReadStore], {
	
    	_lastPath : null,
    	vospace:null,
    	
    	constructor: function(/* Object */ params){
			dojo.mixin(this,params);
		},

		getNodeVoId: function(path) {
			return "vos://"+this.vospace.id+"!vospace"+path;
		},
		
		parentPanel: null,

		_fetchItems: function(request, fetchHandler, errorHandler){

			var cur = this;

			var serverQuery = request.serverQuery || request.query || {};
			//Need to add start and count
			if(!this.doClientPaging){
				serverQuery.start = request.start || 0;
				// Count might not be sent if not given.
				if(request.count){
					serverQuery.count = request.count;
				}
			}
			if(!this.doClientSorting && request.sort){
				var sortInfo = [];
				dojo.forEach(request.sort, function(sort){
					if(sort && sort.attribute){
						sortInfo.push((sort.descending ? "-" : "") + sort.attribute);
					}
				});
				serverQuery.sort = sortInfo.join(',');
			}
			// Compare the last query and the current query by simply json-encoding them,
			// so we dont have to do any deep object compare ... is there some dojo.areObjectsEqual()???
			if(this.doClientPaging && this._lastServerQuery !== null &&
				JSON.stringify(serverQuery) == JSON.stringify(this._lastServerQuery) &&
				this._lastPath == request.path
				){
				this._numRows = (this._numRows === -1) ? this._items.length : this._numRows;
				fetchHandler(this._items, request, this._numRows);
			}else{
				var fullUrl = this.vospace.url+"/1/metadata/sandbox"+((request.query.path+"" != "")?request.query.path:"");
				var xhrHandler = this.vospace.request(fullUrl, this.requestMethod.toUpperCase(), 
					{
						handleAs:"json", 
						content:serverQuery,
						failOk: true
                	});

				request.abort = function(){
					xhrHandler.cancel();
				};
				xhrHandler.then(function(data){
					cur._xhrFetchHandler(data, request, fetchHandler, errorHandler);
				}, function(error){
					errorHandler(error, request);
				});
				// Generate the hash using the time in milliseconds and a randon number.
				// Since Math.randon() returns something like: 0.23453463, we just remove the "0."
				// probably just for esthetic reasons :-).
				this.lastRequestHash = new Date().getTime()+"-"+String(Math.random()).substring(2);
				this._lastServerQuery = dojo.mixin({}, serverQuery);
			}
		},
		
		// copied from QueryREadStore, uses data.contents instead of data.items
		_xhrFetchHandler: function(data, request, fetchHandler, errorHandler){
			data = this._filterResponse(data);
			if(data.label){
				this._labelAttr = data.label;
			}
			var numRows = data.items || -1;

			this._items = [];
			// Store a ref to "this" in each item, so we can simply check if an item
			// really origins form here (idea is from ItemFileReadStore, I just don't know
			// how efficient the real storage use, garbage collection effort, etc. is).
			dojo.forEach(data.contents,function(e){
				this._items.push({i:e, r:this});
			},this);
			
			var identifier = 'path';
			this._itemsByIdentity = {};
			if(identifier){
				this._identifier = identifier;
				var i;
				for(i = 0; i < this._items.length; ++i){
					var item = this._items[i].i;
					var identity = item[identifier];
					if(!this._itemsByIdentity[identity]){
						this._itemsByIdentity[identity] = item;
					}else{
						throw new Error(this._className+":  The json data as specified by: [" + this.vospace.url + "] is malformed.  Items within the list have identifier: [" + identifier + "].  Value collided: [" + identity + "]");
					}
				}
			}else{
				this._identifier = Number;
				for(i = 0; i < this._items.length; ++i){
					this._items[i].n = i;
				}
			}
			
			// TODO actually we should do the same as dojo.data.ItemFileReadStore._getItemsFromLoadedData() to sanitize
			// (does it really sanititze them) and store the data optimal. should we? for security reasons???
			numRows = this._numRows = (numRows === -1) ? this._items.length : numRows;
			fetchHandler(this._items, request, numRows);
			this._numRows = numRows;
		},

		pullFromVoJob: function(vospace, id, handler/*function*/, args/*handler args*/) {
            var writer = new XMLWriter();
            var reqData = writer.createPullFromVoJob(id);

            var writer = new XMLWriter();
            vospace.request(
                vospace.url+"/transfers",
                "POST", {
	                headers: { "Content-Type": "application/xml"},
	                data: reqData,
                    handleAs: "xml"
                }
            ).then(
				function(data){
                    if(undefined != data) {
                        var endpoint = writer.selectSingleNode(data.documentElement, "//vos:protocolEndpoint/text()", {vos: "http://www.ivoa.net/xml/VOSpace/v2.0"}).nodeValue;
                        console.debug("Got endpoint for pullFrom job: "+endpoint);
                        if(null != handler) {
                            if(null == args)
                                args = [];
                            args.push(endpoint);
                            handler.apply(this, args);
                        }
                    } else {
                        console.error("Error creating new pullFrom task");
                    }
                }, function(err) {
                    console.debug(err);
                }
            );
        },

        pullToVoJob: function(vospace, id, endpoint) {
            console.debug("Pulling "+endpoint+" to "+id);
            var writer = new XMLWriter();
            var reqData = writer.createPullToVoJob(id, endpoint);
            vospace.request(
                vospace.url+"/transfers",
                "POST", {
	                headers: { "Content-Type": "application/xml"},
	                data: reqData,
                    handleAs: "xml"
                }
            ).then(
                function(data){
                    console.debug("Created pullToJob");
                }
            );
        },

        moveJob: function(vospace, from, to) {
            console.debug("Moving from"+from+" to "+to);
            var writer = new XMLWriter();
            var reqData = writer.createMoveJob(from, to);
            vospace.request(
                vospace.url+"/transfers",
                "POST", {
	                headers: { "Content-Type": "application/xml"},
	                data: reqData,
                    handleAs: "xml"
                }
            ).then(
                function(data){
                    console.debug("Created move Job");
                }
            );
        }


		
	});
});