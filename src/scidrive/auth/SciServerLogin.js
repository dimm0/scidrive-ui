define([
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
    "dijit/Dialog"
], function(declare, lang, fx, connect, coreFx, aspect, domConstruct, xhr, JSON, ioQuery, has, sniff, Dialog) {
    return declare("scidrive.SciServerLogin", null, {

        loginPortalUrl: 'http://scitest02.pha.jhu.edu/login-portal/',

        constructor: function( /*Object*/ kwArgs) {
            lang.mixin(this, kwArgs);
            var token = ioQuery.queryToObject(dojo.doc.location.search.substr((dojo.doc.location.search[0] === "?" ? 1 : 0))).token;
            if("undefined" !== typeof token) {
                this.credentials = {token: token};
            }
        },

        loginFunc: function(identity, share) {
            var that = this;
            if (undefined == this.credentials && !this.isShare) {
                this.login(this);
            } else {
                require(["scidrive/ScidrivePanel"], function(ScidrivePanel) {
                    if (undefined == dijit.byId("scidriveWidget")) {
                        var pan = new ScidrivePanel({
                            id: "scidriveWidget",
                            style: "width: 100%; height: 100%; opacity: 0;",
                            app: that
                        });
                        pan.placeAt(document.body);
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

                        aspect.after(anim, "onEnd", function() {
                            domConstruct.destroy("loader");
                        }, true);
                    } else {
                        dijit.byId("scidriveWidget").loginToVO(that, null); // with updated credentials
                    }
                });

            }
        },

        login: function(component) {
            var curUrl = location.protocol + '//' + location.host + location.pathname;
            if(this.isShare) {
                console.debug("Shouldn't be here");
                //curUrl += encodeURIComponent((curUrl.indexOf('?')>0)?'&':'?'+
                //    'share='+this.id);
                //if(document.location.href != curUrl)
                //    document.location.href = curUrl;
                return;
            }
            document.location.href = this.loginPortalUrl+'?callbackUrl='+curUrl;
        },

        logout: function(vospace, component, message) {
            // This is some magic I wouldn't like to touch
            // Yeah, better not to touch this
            var identity = JSON.parse(localStorage.getItem('vospace_oauth_s'));
            delete identity.regions[this.id];
            localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));

            delete this.credentials;

            if(this.isShare) {
                this.vospaces = this.vospaces.filter(function(curvospace, index, array) {
                    return curvospace.id != vospace.id;
                });
                dijit.byId("scidriveWidget").loginSelect.removeOption(vospace.id);
            }

            dijit.byId("scidriveWidget")._refreshRegions();

            document.location.href = this.loginPortalUrl+"?logout=true"+((typeof message !== 'undefined')?"&message="+message:"");
        },

        request: function(url, method, args) {
            var that = this;
            var params = this.signRequest(url, method, args);
            var xhrPromise = xhr(url, params);
            xhrPromise.then(
                null,
                function(error) {
                    if(error.response.status == 401) {
                        if(that.isShare) {
                            if (typeof that.credentials === 'undefined') { // need to authenticate for the share
                                that.login();
                            } else { // already authenticated, but token is either invalid or belongs to other group
                                alert("Error: the user does not belong to share group. Logging out.");
                                // need the proper vospace object here V
                                that.logout(undefined, undefined, that, "User does not belong to the group requested by the share.");
                            }
                        } else {
                            that.login();
                        }
                    }
                });
            return xhrPromise;
        },

        signRequest: function(url, method, args) {
            var param = {};

            if("undefined" !== typeof args)
                param = args;

            if("undefined" === typeof param.headers)
                param.headers = {};

            if("undefined" !== typeof this.credentials && "undefined" !== typeof this.credentials.token)
                param.headers["X-Auth-Token"] = this.credentials.token;

            if(this.isShare) {
                param.headers["X-Share"] = this.id;
                console.debug(param);                
            }
            param.method = method;

            if(args)
                param.query = ioQuery.objectToQuery(args.content);

            return param;
        }


    });
});
