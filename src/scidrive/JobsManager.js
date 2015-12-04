define([
        "dojo/_base/declare",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/_base/connect",
        "dojo/dom",
        "dojo/store/Memory",
        "dojo/data/ObjectStore",
        "dojo/mouse",
        "dijit/Tooltip",
        "dojo/on",
        "dojo/text!./templates/JobsManager.html"
        ],
    function(declare, WidgetBase, TemplatedMixin, WidgetsInTemplateMixin, connect, dom, Memory, ObjectStore, 
    	mouse, Tooltip, on, template){
        return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {

        templateString: template,
        transfers_url: null,
        vospace: null,
        
        layout: [{
		    rows: [
		        {name: "direction", field: "direction", width: "70px", formatter: formatJobDirection, style: "text-align: center"},
		        {name: "state", field: "state", width: "50px", formatter: formatJobState, style: "text-align: center"},
		        {name: "endtime", field: "endtime", width: "175px"},
		        {name: "path", field: "path", width: "443px"}
		    ]
		}],
        
        postCreate: function(){
            this.inherited(arguments);
            
            var panel = this;
            this.vospace.request(
                this.transfers_url+"/info",
                "GET", {
                    handleAs: "json"
                }
            ).then(
                function(data) {
        			var store = new Memory({
    					data: data
    				});
        			panel._supportingWidgets.push(store);

        		    panel.jobsgrid = new dojox.grid.DataGrid({
        		        store: ObjectStore({objectStore: store}),
        		        structure: panel.layout,
        		        rowSelector: '0px',
        		        onMouseOver: function(e) {
        		        	var item = e.grid.getItem(e.rowIndex);
        		        	if(e.cell.name == "state" && item.state == "ERROR"){
    							var jobQueryPath = "/"+item.id+"/error";
                                panel.vospace.request(
                                    panel.transfers_url+jobQueryPath,
                                    "GET", {
                                        handleAs: "text"
                                    }
                                ).then(
                                    function(data) {
    						        	var node = e.target;
    									Tooltip.show(data, node);
    									  on.once(node, mouse.leave, function(){
    									      Tooltip.hide(node);
    									  })
    						        }
    						    );
        		        	}
        		        }
        		    }, panel.jobsgridelm);
        		    
        			panel._supportingWidgets.push(panel.jobsgrid);
        		    panel.jobsgrid.startup();
        		    
        		    
    			},
    			function(error) {
    				alert("Error loading the jobs: "+error);
    			}
            );
        }
    });
        
        
    function formatJobDirection(value){
    	switch(value){
    		case 'PULLFROMVOSPACE':
    			return "<img src='scidrive/resources/PullFrom.png' title='PullFromVoSpace' alt='PullFromVoSpace' height='32'/>";
    		case 'PULLTOVOSPACE':
    			return "<img src='scidrive/resources/PullTo.png' title='PullToVoSpace' alt='PullToVoSpace' height='32'/>";
    		case 'PUSHFROMVOSPACE':
    			return "<img src='scidrive/resources/PushFrom.png' title='PushFromVoSpace' alt='PushFromVoSpace' height='32'/>";
    		case 'PUSHTOVOSPACE':
    			return "<img src='scidrive/resources/PushTo.png' title='PushToVoSpace' alt='PushToVoSpace' height='32'/>";
    	}
    }

    function formatJobState(value){
        switch(value){
            case 'PENDING':
                return "<img src='scidrive/resources/submited.png' title='PENDING' alt='PENDING' height='32'/>";
            case 'RUN':
                return "<img src='scidrive/resources/start.png' title='RUN' alt='RUN' height='32'/>";
            case 'COMPLETED':
                return "<img src='scidrive/resources/finished.gif' title='COMPLETED' alt='COMPLETED' height='32'/>";
            case 'ERROR':
                return "<img src='scidrive/resources/error.png' title='ERROR' alt='ERROR' height='32'/>";
        }
    }

    function formatId(value){
        var max_len = 10;
        if(!value || value.length < max_len) {
          return value;
        } else {
          return "<div title='"+value+"'>"+value.substring(0,max_len)+"...</div>";
        }
    }

});