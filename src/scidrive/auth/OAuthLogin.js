define( [
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/fx",
    "dojo/_base/connect",
    "dojo/fx",
    "dojo/aspect",
    "dojo/dom-construct",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/io-query",
    "dojo/has",
    "dojo/sniff",
    "dijit/Dialog",
    "scidrive/auth/OAuth"
],

function(declare, lang, fx, connect, coreFx, aspect, domConstruct, xhr, JSON, ioQuery, has, sniff, Dialog, OAuth) {
  return declare( "scidrive.OAuthLogin", null, {

    constructor: function(/*Object*/ kwArgs){
      lang.mixin(this, kwArgs);
    },

    loginFunc: function(identity, share){
        var that = this;
        // if(share != undefined) {
        //     var share_vospace = lang.clone(vospace);
        //     delete share_vospace.credentials;
        //     share_vospace.id = share;
        //     share_vospace.isShare = true;
        //     share_vospace.display = "Share";
        //     if(undefined != identity.regions[share]) {
        //         share_vospace.credentials = identity.regions[share];
        //     }
        //     this.vospaces.push(share_vospace);
        //     vospace = share_vospace;
        // }

        if(undefined == this.credentials){
            console.debug("login to "+this.id);
            this.login(this, null);
        } else {
            if(this.credentials.stage == "request") { // contains request token
                this.login2(null);
            } else if(this.credentials.stage == "access") {
                require(["scidrive/ScidrivePanel", "scidrive/ScidriveChooserPanel"], function(SciDrivePanel, SciDriveChooserPanel){
                    if("undefined" === typeof (dijit.byId("scidriveWidget"))) {
                        var obj = (that.isChooser)?SciDriveChooserPanel:SciDrivePanel;
                        var pan = new obj({
                            id: "scidriveWidget",
                            style: "width: 100%; height: 100%; opacity: 0;",
                            app: that
                        });
                        pan.placeAt(document.body)
                        dijit.byId("scidriveWidget").loginToVO(that, null); // with updated credentials
                        dijit.byId("scidriveWidget").startup();
                        var anim = coreFx.combine([
                            fx.fadeIn({
                              node: "scidriveWidget",
                              duration: 1000
                            }),
                            fx.fadeOut({
                              node: "loader",
                              duration: 1000
                            })
                        ]).play();

                        aspect.after(anim, "onEnd", function(){
                            domConstruct.destroy("loader");
                        }, true);
                    } else {
                        dijit.byId("scidriveWidget").loginToVO(that, null); // with updated credentials
                    }
                });
            }
        }

    },

    login: function(component, openWindow) {
        var that = this;
        var config = { consumer: {key: "sclient", secret: "ssecret"}};
        function success_reload(data) {
            var respObject = ioQuery.queryToObject(data);
            var reqToken = respObject.oauth_token;
            var tokenSecret = respObject.oauth_token_secret;

            that.credentials = {
                stage:"request",
                sig_method: 'HMAC-SHA1',
                consumer: {
                    key: 'sclient',
                    secret: 'ssecret'
                },
                token: {
                    key: reqToken,
                    secret: tokenSecret
                }
            };

            var identity = JSON.parse(localStorage.getItem('vospace_oauth_s'));

            identity.regions[that.id] = that.credentials;

            localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));

            var authorizeUrl = that.url+"/authorize?provider=vao&action=initiate&oauth_token="+reqToken;
            authorizeUrl += "&oauth_callback="+document.location.href;
            if(that.isShare) {
                authorizeUrl += "&share="+that.id;
            }
            document.location.href = authorizeUrl;
        }

        function success_open_window(data) {
            var respObject = ioQuery.queryToObject(data);
            var reqToken = respObject.oauth_token;
            var tokenSecret = respObject.oauth_token_secret;

            if(dijit.byId('formDialog') != undefined){
                dijit.byId('formDialog').destroyRecursive();
            }

            var div = domConstruct.create("div", {
                    innerHTML: "Please authenticate at <a href='"+
                    that.url+"/authorize?provider=vao&action=initiate&oauth_token="+
                    reqToken+"' target='_blanc'>VAO</a> and click ",
                    align: "center"
                });

            var button = new dijit.form.Button({
                label: 'Done',
                onClick: function () {
                    that.credentials = {
                        stage: "request",
                        sig_method: 'HMAC-SHA1',
                        consumer: {
                            key: 'sclient',
                            secret: 'ssecret'
                        },
                        token: {
                            key: reqToken,
                            secret: tokenSecret
                        }
                    };
                    var identity = JSON.parse(localStorage.getItem('vospace_oauth_s'));
                    identity.regions[that.id] = that.credentials;
                    localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));

                    dijit.byId('formDialog').hide();
                    that.login2(component);
                }
            });
            div.appendChild(button.domNode);

            var loginDialog = new dijit.Dialog({
                id: 'formDialog',
                title: "Authentication",
                style: {width: "300px"},
                content: div
            });
            dijit.byId('formDialog').show();
        }


        function failure(data, ioargs) {
            if(ioargs.xhr.status == 400 || ioargs.xhr.status == 401 || ioargs.xhr.status == 503) { // OAuth errors
                var errorResponse = ioargs.xhr.responseText;
                if(errorResponse.split("&")[0] != undefined) {
                    var problem = errorResponse.split("&")[0].slice("oauth_problem=".length);
                    if(problem == "timestamp_refused"){
                        alert("Error logging in: request timestamp incorrect. Please check your computer system time.");
                    } else {
                        alert("Error logging in: "+ problem);
                    }

                } else {
                    alert("Error logging in: "+ errorResponse);
                }
            }
        }

        var xhrArgs = {
            url: this.url+'/request_token'+((this.isShare)?"?share="+this.id:""),
            handleAs: "text",
            preventCache: false,
            load: (openWindow?success_open_window:success_reload),
            error: failure
        };
        var args = OAuth.sign("POST", xhrArgs, config);
        dojo.xhrPost(args);

    },

    login2: function(component) {
        var that = this;
        require(["scidrive/ScidrivePanel", "scidrive/ScidriveChooserPanel"], function(SciDrivePanel, SciDriveChooserPanel){
            var obj = (this.isChooser)?SciDriveChooserPanel:SciDrivePanel;
            var url = that.url+"/access_token";

            dojo.xhrPost(OAuth.sign("POST", {
                url: url,
                handleAs: "text",
                sync: false,
                load: function(data) {
                    var respObject = ioQuery.queryToObject(data);
                    var token = respObject.oauth_token;
                    var tokenSecret = respObject.oauth_token_secret;

                    that.credentials.token = {
                        key: token,
                        secret: tokenSecret
                    };
                    that.credentials.stage = "access";

                    var identity = JSON.parse(localStorage.getItem('vospace_oauth_s'));
                    identity.regions[that.id] = that.credentials;
                    localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));

                    if(undefined == dijit.byId("scidriveWidget")) {
                        var obj = (that.isChooser)?SciDriveChooserPanel:SciDrivePanel;
                        var pan = new obj({
                            id: "scidriveWidget",
                            style: "width: 100%; height: 100%; opacity: 0;",
                            app: that
                        });
                        pan.placeAt(document.body)
                        dijit.byId("scidriveWidget").loginToVO(that, component); // with updated credentials
                        dijit.byId("scidriveWidget").startup();

                        var anim = coreFx.combine([
                            fx.fadeIn({
                              node: "scidriveWidget",
                              duration: 1000
                            }),
                            fx.fadeOut({
                              node: "loader",
                              duration: 1000
                            })
                        ]).play();

                        aspect.after(anim, "onEnd", function(){
                            domConstruct.destroy("loader");
                        }, true);
                    } else {
                        dijit.byId("scidriveWidget").loginToVO(that, component); // with updated credentials
                    }
                },
                error: function(data, ioargs) {
                    console.error(data);
                    that.credentials = null;


                    var identity = JSON.parse(localStorage.getItem('vospace_oauth_s'));
                    delete identity.regions[that.id];
                    localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));

                    if(ioargs.xhr.status == 401) {
                        that.login(null);
                    } else {
                        alert("Error logging in: "+ ioargs.xhr.responseText);
                    }

                }
            },that.credentials));
        });

    },

    logout: function(component) {
        var identity = JSON.parse(localStorage.getItem('vospace_oauth_s'));
        delete identity.regions[this.id];
        localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));

        delete this.credentials;

        if(this.isShare) {
            this.vospaces = this.vospaces.filter(function(curvospace, index, array) {
                return curvospace.id != this.id;
            });
            dijit.byId("scidriveWidget").loginSelect.removeOption(this.id);
        }

        dijit.byId("scidriveWidget")._refreshRegions();

        var authenticatedVospace, defaultVospace;

        for(var i in this.vospaces) {
            var vospace = this.vospaces[i];
            if(vospace.defaultRegion) {
                defaultVospace = vospace;
            }
            if("undefined" === typeof authenticatedVospace && "undefined" !== typeof identity.regions[vospace.id]){
                authenticatedVospace = vospace;
            }
        }

        // First try to login to default vospace if is authenticated or don't have any authenticated at all
        if(undefined == authenticatedVospace) {
            document.location.href = document.location.href.substr(0, document.location.href.lastIndexOf("/"));
        } else {
            dijit.byId("scidriveWidget").loginToVO(authenticatedVospace, component);
        }

        var scidrivePanel = dijit.byId("scidriveWidget");
        var otherComponent = (component == scidrivePanel.panel1)?scidrivePanel.panel2:scidrivePanel.panel1;
        if(otherComponent != undefined && otherComponent.store.vospace.id == this.id && authenticatedVospace != undefined) {
            scidrivePanel.loginToVO(authenticatedVospace, otherComponent);
        }

        //component._refreshRegions();

    },

    request: function(url, method, args) {
        var params = this.signRequest(url, method, args);
        console.debug(args);
        console.debug(params);
        return xhr(url, params);
    },

    signRequest: function(url, method, args) {
        var params = {
            headers: {
                'Authorization': OAuth.sign(
                    method,
                    {url: url,
                        content: (typeof args === "undefined")?undefined:args.content},
                    this.credentials)
                .headers["Authorization"]
            }
        };

        if("undefined" !== typeof args)
            this.mixinDeep(params, args);

        this.mixinDeep(params, {"method": method});
        if(args)
            params.query = ioQuery.objectToQuery(args.content);
        return params;
    },

    mixinDeep: function(dest, source) {
     //Recursively mix the properties of two objects
     var empty = {};
     for (var name in source) {
          if(!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))){
               try {
                    if ( source[name].constructor==Object ) {
                         dest[name] = this.mixinDeep(dest[name], source[name]);
                    } else {
                         dest[name] = source[name];
                    };
               } catch(e) {
                    // Property in destination object not set. Create it and set its value.
                    dest[name] = source[name];
               };
          };
     }
     return dest;
    }
  });
});
