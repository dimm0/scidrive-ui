define([ 'dojo/has', 'require' ], function (has, require) {
	var app = {};

	if (has('host-browser')) {
		if("undefined" !== typeof isChooser && isChooser) {
			require([ './SciDriveChooser', 'dojo/domReady!' ], function (SciDriveChooser) {
				app = new SciDriveChooser();
			});
		} else {
			require([ './SciDrive', 'dojo/domReady!' ], function (SciDrive) {
				app = new SciDrive();
			});
		}

	}
});