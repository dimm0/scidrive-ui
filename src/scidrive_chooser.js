var SciDriveCallback;
var scidriveWindow;

var SciDriveMessageHandler = function(e) {
	var result = JSON.parse(e.data);
	scidriveWindow.close();
	if(typeof SciDriveCallback !== "undefined"){
	    SciDriveCallback(result);
	}
	window.removeEventListener('message',  SciDriveMessageHandler, false);
};

function sciDriveGetFile(callback) {
	window.addEventListener('message',  SciDriveMessageHandler, false);
    scidriveWindow = window.open('scidrive_chooser.html', 'authWindow', 'width=600, height=400');
    SciDriveCallback = callback;
}



