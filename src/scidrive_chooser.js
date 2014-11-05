var SciDriveCallback;
var scidriveWindow;

function sciDriveGetFile(callback) {
    scidriveWindow = window.open('scidrive_chooser.html', 'authWindow', 'width=600, height=400');
    SciDriveCallback = callback;
}

var SciDriveGetResult = function(result) {
    scidriveWindow.close();
    if(typeof SciDriveCallback !== "undefined"){
        SciDriveCallback(result);
    }
}