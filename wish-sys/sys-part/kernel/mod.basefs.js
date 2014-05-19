Kernel.Filesystem.basefs = function() {
}
Kernel.Filesystem.basefs.baseURL;
Kernel.Filesystem.basefs.files;
Kernel.Filesystem.basefs.init = function() {
	Kernel.Filesystem.basefs.baseURL = Kernel.Filesystem.devfs.devices.harddisks[OS.system.hdd].name + "/";
	Kernel.Filesystem.basefs.baseURL += Kernel.Filesystem.devfs.devices.harddisks[OS.system.hdd].partitions[OS.system.partition].name;
}
Kernel.Filesystem.basefs.getRootStructure = function() {
	// ugly, but necessary for bootstraping
	console.log("Filesystem: trying to get " + Kernel.Filesystem.basefs.baseURL + "/* recursive");
	Emulator.Request.get(Kernel.Filesystem.basefs.baseURL + "/lib/kernel/files.php", "getStructure&dir=" + encodeURIComponent(Kernel.Filesystem.basefs.baseURL), true, function(content) {
		if (typeof content == "string") {
			Kernel.Filesystem.basefs.files = Kernel.Filesystem.basefs.interpretFile(JSON.parse(content), NO_PARENT, NO_MOUNTPOINT); // not mounted yet
			Kernel.next();
			return;
		}
		console.log("Kernel: Filesystem: basefs: error on reading root fs");
		console.dir(content);
	});
}
Kernel.Filesystem.basefs.interpretFile = function(files, parent, mountpoint) {
	var array = new Array();
	for (var i in files) {
		if (i == "diff") // very ugly, change this
			continue;
		var file = new InnerFile();
		file.id = Kernel.Filesystem.vfs.index++;
		file.name = i;
		file.ownerID = 0;
		file.groupID = 0;
		file.permissions = PERM_OR | PERM_GR | PERM_UW | PERM_UR | PERM_UX;
		file.parent = parent;
		file.mountPoint = mountpoint;
		var timestampOfCreation = (new Date(2013, 9, 13, 18, 11, 0)).getTime();
		file.created = timestampOfCreation;
		file.changed = timestampOfCreation;
		if (typeof files[i] == "string") {
			file.content = files[i];
			array.push(file);
		} else {
			file.permissions |= PERM_OX | PERM_GX | PERM_D;
			array.push(file);
			var sub = Kernel.Filesystem.basefs.interpretFile(files[i], file.id, mountpoint);
			for (var j = 0; j < sub.length; j++)
				array.push(sub[j]);
		}
	}
	return array;
}
Kernel.Filesystem.basefs.mount = function(fileid, source) {
	var point = new MountPoint();
	point.fileId = fileid;
	point.filesystem = FS_BASEFS;
	point.source = source;
	Kernel.Filesystem.vfs.mount(point, Kernel.Filesystem.basefs.files);
	Kernel.Filesystem.basefs.files = new Array();
}