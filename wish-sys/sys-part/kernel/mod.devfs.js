Kernel.Filesystem.init = extendFunction(Kernel.Filesystem.init, function() {
		Kernel.msgOut("  init devfs...");
		Kernel.Filesystem.devfs.init();
		Kernel.msgSuccess(true);
	}
);

Kernel.Filesystem.devfs = function() {
}
Kernel.Filesystem.devfs.devices;
Kernel.Filesystem.devfs.files = new Array();
Kernel.Filesystem.devfs.init = function() {
	Kernel.Filesystem.devfs.devices = Emulator.Devices.getAll();
}
Kernel.Filesystem.devfs.populate = function() {
	var hdds = Kernel.Filesystem.devfs.devices.harddisks;
	for (var i = 0; i < hdds.length; i++) {
		var hdd = new InnerFile();
		hdd.name = "sd" + (String.fromCharCode("a".charCodeAt(0) + OS.system.hdd));
		hdd.parent = NO_PARENT;
		hdd.id = Kernel.Filesystem.vfs.index++;
		hdd.ownerID = 0;
		hdd.groupID = 0;
		hdd.permissions = PERM_OR | PERM_GR | PERM_UW | PERM_UR;
		hdd.content = "This is a hdd, what's your problem?";
		hdd.onChange = function () {
			throw ("Well, fuck you too.");
		}
		hdd.onRead = function () {
			throw ("...");
		}
		var timestampOfCreation = (new Date(2013, 9, 13, 18, 11, 0)).getTime();
		hdd.created = timestampOfCreation;
		hdd.changed = timestampOfCreation;
		Kernel.Filesystem.devfs.files.push(hdd);
		var parts = hdds[i].partitions;
		for (var j = 0; j < parts.length; j++) {
			var part = new InnerFile();
			part.name = hdd.name + (1 + OS.system.partition);
			part.id = Kernel.Filesystem.vfs.index++;
			part.ownerID = 0;
			part.parent = NO_PARENT;
			part.groupID = 0;
			part.permissions = PERM_OR | PERM_GR | PERM_UW | PERM_UR;
			part.content = "This is a partition, what's your problem?";
			part.onChange = function () {
				throw ("Well, fuck you too.");
			}
			part.onRead = function () {
				throw ("...");
			}
			var timestampOfCreation = (new Date(2013, 9, 13, 18, 11, 0)).getTime();
			part.created = timestampOfCreation;
			part.changed = timestampOfCreation;
			Kernel.Filesystem.devfs.files.push(part);
		}
	}
	var tty = new InnerFile();
	tty.name = "tty1";
	tty.id = Kernel.Filesystem.vfs.index++;
	tty.ownerID = 0;
	tty.groupID = 0;
	tty.parent = NO_PARENT;
	tty.permissions = PERM_OR | PERM_GR | PERM_UW | PERM_UR;
	tty.created = timestampOfCreation;
	tty.changed = timestampOfCreation;
	tty.onChange = function (content) {
		Kernel.IO.output(content);
		return false;
	}
	tty.removeReaded = true;
	tty.neverEnds = true;
	tty.onRead = function () {
		var tmp = Kernel.IO.input();
		for (var i = 0; i < tmp.length; i++) {
			tmp[i] = String.fromCharCode(tmp[i]);
		}
		tmp = tmp.join("");
		this.content += tmp;
		Kernel.IO.inputBuffer = new Array();
		return true;
	}
	Kernel.Filesystem.devfs.files.push(tty);
	
	var urandom = new InnerFile();
	urandom.name = "urandom";
	urandom.id = Kernel.Filesystem.vfs.index++;
	urandom.ownerID = 0;
	urandom.groupID = 0;
	urandom.parent = NO_PARENT;
	urandom.permissions = PERM_OR | PERM_GR | PERM_UR;
	urandom.created = timestampOfCreation;
	urandom.changed = timestampOfCreation;
	urandom.onChange = function (content) {
		// writing to /dev/urandom does nothing
		return false;
	}
	urandom.removeReaded = true;
	urandom.neverEnds = true;
	urandom.onRead = function (number) {
		if (!number)
			number = 4294967296; // 2^32; cheat because we can't generate inf random numbers at once.
		for (var i = 0; i < number; i++)
			this.content += String.fromCharCode(parseInt(Math.random() * 65536));
		return true;
	}
	Kernel.Filesystem.devfs.files.push(urandom);
}
Kernel.Filesystem.devfs.mount = function () {
	var point = new MountPoint();
	point.fileId = Kernel.Filesystem.vfs.getFileByPath("/dev").id;
	point.filesystem = FS_DEVFS;
	point.source = NO_SOURCE;
	Kernel.Filesystem.vfs.mount(point, Kernel.Filesystem.devfs.files);
}