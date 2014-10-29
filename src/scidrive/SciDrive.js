
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
  "scidrive/auth/OAuthLogin",
  "scidrive/auth/SciServerLogin",
  "dojo/text!scidrive/resources/regions.json"
],

function(declare, lang, fx, connect, coreFx, aspect, domConstruct, xhr, JSON, ioQuery, has, sniff, Dialog, OAuthLogin, SciServerLogin, regions) {
    return declare( null, {

        identity_ver: "1.4",

        constructor: function(args) {
            declare.safeMixin(this, args);

            if(has("ie")<= 8){
                require(["scidrive/killie"], function(killie) {
                    var kie = new killie();
                    kie.init();
                });
            }

            /* Init identity object and make sure it's current version */
            var identity = {
                    ver:this.identity_ver,
                    regions: {}
            };

            if(undefined != localStorage.getItem('vospace_oauth_s')) {
                var curIdentity = JSON.parse(localStorage.getItem('vospace_oauth_s'));
                if(undefined == curIdentity.ver || (curIdentity.ver != this.identity_ver)){
                    localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));
                } else {
                    identity = curIdentity;
                }
            } else {
                try {
                    localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));
                } catch (error) {
                    if (error.code === DOMException.QUOTA_EXCEEDED_ERR && localStorage.length === 0)
                        alert('Please disable private browsing mode to log in.');
                    else
                        throw error;
                }
            }

            /* End Init identity object */

            var share = ioQuery.queryToObject(dojo.doc.location.search.substr((dojo.doc.location.search[0] === "?" ? 1 : 0))).share;
            if(undefined != identity.useShare && undefined == share) {
                share = identity.useShare;
                delete identity.useShare;
                localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));
            } else if(undefined != share) {
                identity.useShare = share;
                localStorage.setItem('vospace_oauth_s', JSON.stringify(identity));
            }

            var vospaces = JSON.parse(regions).map(function(vospace) {
                vospace.credentials = identity.regions[vospace.id];
                vospace.isShare = false;
                switch(vospace.auth) {
                    case "oauth":
                        vospace = lang.mixin(vospace, new OAuthLogin());
                        break;
                    case "sciserver":
                        vospace = lang.mixin(vospace, new SciServerLogin());
                        break;
                }
                return vospace;
            });

            // store link to parent (needed to draw the regions control)
            vospaces.forEach(function(vospace) {
              vospace.vospaces = vospaces;
            });

            var defaultReg = vospaces.filter(function(vospace, index, array) {
                return vospace.defaultRegion;
            })[0];

            if("undefined" !== typeof share) {
              defaultReg = lang.mixin({}, defaultReg);
              defaultReg.id = share;
              defaultReg.isShare = true;
              defaultReg.display = "Share";
              if(undefined != identity.regions[share]) {
                  defaultReg.credentials = identity.regions[share];
              }
              vospaces.push(defaultReg);
            }

            if("undefined" == typeof defaultReg)
                console.error("Not found default region");
            else
                defaultReg.loginFunc(identity);
            console.debug("DONE INIT");

        }

    });

});
