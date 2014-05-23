var File = function(path) {
	if (path)
		this.open(path);
}
File.prototype.path;
File.prototype.readMode = MODE_FIFO;
File.prototype.writeMode = MODE_OVRWD;
File.prototype.notExistsMode = MODE_THROW;
File.prototype.open = function(path) {
	this.path = path;
	Kernel.Filesystem.open(path);
	return this.exists();
}
File.prototype.exists = function () {
	return Kernel.Filesystem.exists(this.path);
}
File.prototype.read = function (length, index) {
	return Kernel.Filesystem.read(this.path, length, index, this.readMode);
}
File.prototype.write = function (content) {
	return Kernel.Filesystem.write(this.path, content, this.writeMode, this.notExistsMode);
}
File.prototype.close = function () {
	Kernel.Filesystem.close(this.path);
}
File.prototype.getPermissions = function () {
	return Kernel.Filesystem.getPermissions(this.path);
}
File.prototype.setPermissions = function (perm) {
	return Kernel.Filesystem.setPermissions(this.path, perm);
}
File.prototype.getOwnerId = function () {
	return Kernel.Filesystem.getOwnerId(this.path);
}
File.prototype.setOwnerId = function (owner) {
	return Kernel.Filesystem.setOwnerId(this.path, owner);
}
File.prototype.getGroupId = function () {
	return Kernel.Filesystem.getGroupId(this.path);
}
File.prototype.setGroupId = function (group) {
	return Kernel.Filesystem.setGroupId(this.path, group);
}


var InnerFile = function() {
}
InnerFile.prototype.id;
InnerFile.prototype.name;
InnerFile.prototype.ownerID;
InnerFile.prototype.groupID;
InnerFile.prototype.permissions = PERM_GR | PERM_UW | PERM_UR;
InnerFile.prototype.parent; // id
InnerFile.prototype.mountPoint;
InnerFile.prototype.removeReaded = false;
InnerFile.prototype.neverEnds = false;
InnerFile.prototype.content = "";
InnerFile.prototype.created = 0;
InnerFile.prototype.changed = 0;
InnerFile.prototype.onChange = function(text) {
	return true;
}
InnerFile.prototype.onRead = function () {
	return true;
}
InnerFile.prototype.onReaded = function () {
}

var MountPoint = function() {
}
MountPoint.prototype.id;
MountPoint.prototype.fileId;
MountPoint.prototype.filesystem;
MountPoint.prototype.source;
MountPoint.prototype.mountTime = 0;
MountPoint.prototype.onUnmount = function(id) {
	return true;
}

Kernel.Filesystem = function() {
}
Kernel.Filesystem.init = function() {
	Kernel.msgOut("  init vfs...");
	Kernel.Filesystem.vfs.init();
	Kernel.msgSuccess(true);
}

Kernel.Filesystem.initCon = function() {
	Kernel.msgSuccess(true);
	
	Kernel.msgOut("  mounting / ...");
	Kernel.Filesystem.basefs.mount(0, "/dev/sd" + (String.fromCharCode("a".charCodeAt(0) + OS.system.hdd)) + (1 + OS.system.partition));
	Kernel.msgSuccess(true);


	Kernel.msgOut("  waiting for devfs to be fully populated...");
	Kernel.Filesystem.devfs.populate();
	Kernel.msgSuccess(true);

	Kernel.msgOut("  mounting /dev/...");
	Kernel.Filesystem.devfs.mount();
	Kernel.msgSuccess(true);
}
Kernel.Filesystem.shortenPath = function(path) {
	while (path.indexOf("//") != -1)
		path = path.replace("//", "/");
	if (path == "/")
		return "/";
	if (path.substring(path.length - 1) == "/")
		path = path.substring(0, path.length - 1);
	if (path.substring(0, 1) == "/")
		path = path.substring(1);
	var parts = path.split("/");
	for (var i = 0; i < parts.length; i++) {
		if (!parts[i])
			throw("format error: " + path);
		if (parts[i].length == 0) {
			parts.splice(0, i);
			i = 0;
		}
		if (parts[i] == ".") {
			parts.splice(i, 1);
			i--;
		}
		if (parts[i] == "..") {
			parts.splice(i - 1, 2);
			i -= 2;
		}
	}
	return "/" + parts.join("/");
}
Kernel.Filesystem.exists = function(path) {
	if (Kernel.Filesystem.vfs.getFileByPath(path))
		return true;
	return false;
}
Kernel.Filesystem.read = function(path, length, index, readMode) {
	var file = Kernel.Filesystem.vfs.getFileByPath(path);
	if (!file)
		return "";

	if (!Kernel.ProcessManager || !Kernel.Scheduler) // we are bootstraping
		var uid = 0;
	else 
		var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	if (uid != 0) {
		if (uid == file.ownerID) {
			if (!(file.permissions & PERM_UR))
				throw "not permitted";
		} else if (Kernel.UserManager.isUserIdInGroupId(uid, file.groupID)) {
			if (!(file.permissions & PERM_GR))
				throw "not permitted";
		} else {
			if (!(file.permissions & PERM_OR))
				throw "not permitted";
		}
	}

	if (!file.onRead(length))
		return "";
	var content = file.content;

	switch(readMode) {
	case MODE_LIFO:
		content = content.reverse();
		break;
	case MODE_FIFO:
		break;
	default:
		throw ("unknown readMode");
		break;
	}

	var text = "";
	if (length !== undefined) {
		if (index !== undefined && !file.neverEnds) {
			text = content.substring(index, length + index);
			if ((text.length < length) && (!file.neverEnds))
				text += EOF;
			if (file.removeReaded)
				content = content.substring(length + index);
		} else {
			text = content.substring(0, length);
			if ((text.length < length) && (!file.neverEnds))
				text += EOF;
			if (file.removeReaded)
				content = content.substring(length);
		}
	} else {
		text = content;
		if (!file.neverEnds)
			text += EOF;
		if (file.removeReaded)
			content = "";
	}
	
	switch(readMode) {
	case MODE_LIFO:
		content = content.reverse();
		break;
	case MODE_FIFO:
		break;
	default:
		throw ("unknown readMode");
		break;
	}

	file.content = content;
		
	return text;
}
Kernel.Filesystem.write = function(path, content, writeMode, notExistsMode) {
	var file = Kernel.Filesystem.vfs.getFileByPath(path);
	if (!file)
		switch (notExistsMode) {
		case MODE_THROW:
			throw ("no such file or directory: " + path);
			break;
		case MODE_CREATE:
			file = Kernel.Filesystem.vfs.createFile(path);
			break;
		default:
			throw ("unknown notExistsMode");
		}

	var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	if (uid != 0) {
		if (uid == file.ownerID) {
			if (!(file.permissions & PERM_UR))
				throw "not permitted";
		} else if (Kernel.UserManager.isUserIdInGroupId(uid, file.groupID)) {
			if (!(file.permissions & PERM_GR))
				throw "not permitted";
		} else {
			if (!(file.permissions & PERM_OR))
				throw "not permitted";
		}
	} else {
		if (!(file.permissions & (PERM_OR | PERM_GR | PERM_UR)))
			throw "not permitted";
	}

	if (!file.onChange(content))
		return;
	
	switch(writeMode) {
	case MODE_OVRWD:
		file.content = content;
		file.changed = (new Date()).getTime();
		break;
	case MODE_APPND:
		file.content += content;
		file.changed = (new Date()).getTime();
		break;
	default:
		throw ("unknown writeMode");
		break;
	}
}
Kernel.Filesystem.open = function(path) {
	if (!Kernel.ProcessManager || !Kernel.Scheduler) // we are bootstraping
		return;
	var pid = Kernel.ProcessManager.getCurrentPID();
	var iproc = Kernel.ProcessManager.innerProcessList[pid];
	if (iproc === undefined)
		return; // maybe we are the kernel
	var files = iproc.files;
	for (var i = 0; i < files.length; i++) {
		if (files[i] == path)
			return;
	}
	files.push(path);
}
Kernel.Filesystem.close = function(path) {
	var pid = Kernel.ProcessManager.getCurrentPID();
	var iproc = Kernel.ProcessManager.innerProcessList[pid];
	if (iproc === undefined)
		return; // maybe we are the kernel
	var files = iproc.files;
	for (var i = 0; i < files.length; i++) {
		if (files[i] == path) {
			files.splice(i, 1);
			return;
		}
	}
}
Kernel.Filesystem.getPermissions = function(path) {
	return Kernel.Filesystem.vfs.getFileByPath(path).permissions;
}
Kernel.Filesystem.setPermissions = function(path, perm) {
	var file = Kernel.Filesystem.vfs.getFileByPath(path);
	var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	if (file.ownerID != uid)
		throw("not permitted");
	file.permissions = perm;
}
Kernel.Filesystem.getOwnerId = function(path) {
	return Kernel.Filesystem.vfs.getFileByPath(path);
}
Kernel.Filesystem.setOwnerId = function(path, owner) {
	var file = Kernel.Filesystem.vfs.getFileByPath(path);
	var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	if (file.ownerID != uid)
		throw("not permitted");
	file.ownerID = owner;
}
Kernel.Filesystem.getGroupId = function(path) {
	return Kernel.Filesystem.vfs.getFileByPath(path).groupID;
}
Kernel.Filesystem.setGroupId = function(path, group) {
	var file = Kernel.Filesystem.vfs.getFileByPath(path);
	var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	if (file.ownerID != uid)
		throw("not permitted");
	file.groupID = group;
}
Kernel.Filesystem.readDir = function(file) {
	var file = Kernel.Filesystem.vfs.getFileByPath(file);
	var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	if (!(file.permissions & PERM_D)) {
		var sfile = filename.split("/");
		return new Array(sfile[sfile.length - 1]);
	}
	if (uid != 0) {
		if (uid == file.ownerID) {
			if (!(file.permissions & PERM_UR))
				throw "cannot open directory: Permission denied";
		} else if (Kernel.UserManager.isUserIdInGroupId(uid, file.groupID)) {
			if (!(file.permissions & PERM_GR))
				throw "cannot open directory: Permission denied";
		} else {
			if (!(file.permissions & PERM_OR))
				throw "cannot open directory: Permission denied";
		}
	} else {
		if (!(file.permissions & (PERM_OR | PERM_GR | PERM_UR)))
			throw "cannot open directory: Permission denied";
	}

	var childs = Kernel.Filesystem.vfs.getFilesByParentId(file.id);
	var ret = new Array();
	for (var i = 0; i < childs.length; i++) {
		ret.push(childs[i].name);
	}
	return ret;
}

Kernel.Filesystem.vfs = function() {
}
Kernel.Filesystem.vfs.index = 0;
Kernel.Filesystem.vfs.mounts = 0;
Kernel.Filesystem.vfs.mountPoints = new Array();
Kernel.Filesystem.vfs.fileList = new Array();
Kernel.Filesystem.vfs.init = function() {
	var root = new InnerFile();
	root.id = Kernel.Filesystem.vfs.index++;
	root.name = "";
	root.ownerID = 0;
	root.groupID = 0;
	root.permissions = PERM_OX | PERM_OR | PERM_GX | PERM_GR | PERM_UX | PERM_UW | PERM_UR | PERM_D;
	root.parent = NO_PARENT;
	root.mountPoint = NO_MOUNTPOINT;
	var timestampOfCreation = (new Date(2013, 9, 13, 18, 11, 0)).getTime();
	root.created = timestampOfCreation;
	root.changed = timestampOfCreation;
	
	Kernel.Filesystem.vfs.fileList.push(root);
}
Kernel.Filesystem.vfs.mount = function(mountpoint, files) {
	console.log("vfs: checking mountpoint " + mountpoint.fileId);
	var file = Kernel.Filesystem.vfs.getFileById(mountpoint.fileId);
	if (!file)
		throw ("no such file or directory");
	var childs = Kernel.Filesystem.vfs.getFilesByParent(file);
	if (childs.length)
		throw ("mountpoint not empty");
	var id = Kernel.Filesystem.vfs.mounts++;
	mountpoint.id = id;
	mountpoint.mountTime = Kernel.time;
	Kernel.Filesystem.vfs.mountPoints.push(mountpoint);
	for (var i = 0; i < files.length; i++) {
		files[i].mountPoint = id;
		if (files[i].parent == NO_PARENT)
			files[i].parent = mountpoint.fileId;
		Kernel.Filesystem.vfs.fileList.push(files[i]);
	}
}
Kernel.Filesystem.vfs.getFileById = function(id, list) {
	if (!list)
		list = Kernel.Filesystem.vfs.fileList;
	for (var i = 0; i < list.length; i++) {
		if (list[i].id == id)
			return list[i];
	}
	return false;
}
Kernel.Filesystem.vfs.getFilesByName = function (name, list) {
	if (!list)
		list = Kernel.Filesystem.vfs.fileList;
	var array = new Array();
	for (var i = 0; i < list.length; i++) {
		if (list[i].name == name)
			array.push(list[i]);
	}
	return array;
}
Kernel.Filesystem.vfs.getFileByChild = function (file, list) {
	return Kernel.Filesystem.vfs.getFileById(file.parent, list);
}
Kernel.Filesystem.vfs.getFilesByParent = function (file, list) {
	return Kernel.Filesystem.vfs.getFilesByParentId(file.id, list);
}
Kernel.Filesystem.vfs.getFilesByParentId = function (id, list) {
	if (!list)
		list = Kernel.Filesystem.vfs.fileList;
	var array = new Array();
	for (var i = 0; i < list.length; i++) {
		if (list[i].parent == id)
			array.push(list[i]);
	}
	return array;
}
Kernel.Filesystem.vfs.getFileByPath = function (path) {
	path = Kernel.Filesystem.shortenPath(path);
	var array = path.split("/");
	array.splice(0, 1);
	if (array.length == 1 && array[0].length == 0)
		array = new Array();
	var file = Kernel.Filesystem.vfs.getFileById(0);
	for (var i = 0; i < array.length; i++) {
		var files = Kernel.Filesystem.vfs.getFilesByName(array[i], Kernel.Filesystem.vfs.getFilesByParent(file));
		if (!files.length)
			return false;
		file = files[0]; // there should only be 1 element
	}
	return file;
}
Kernel.Filesystem.vfs.createFile = function (path) {
	var paths = path.split("/");
	var pathss = path.split("/");
	paths.splice(paths.length - 1, 1);
	paths = paths.join("/");
	var parent = Kernel.Filesystem.vfs.getFileByPath(paths);
	if (!parent)
		throw("no such file or directory: " + paths);
	var timestampOfCreation = (new Date()).getTime();
	file = new InnerFile();
	file.name = pathss[pathss.length - 1];
	file.id = Kernel.Filesystem.vfs.index++;
	var uid = Kernel.ProcessManager.getUserByPID(Kernel.ProcessManager.getCurrentPID());
	var gid = Kernel.UserManager.getUserById(uid).group;
	file.ownerID = uid;
	file.groupID = gid;
	file.parent = parent.id;
	file.mountPoint = parent.mountPoint;
	file.permissions = PERM_OR | PERM_GR | PERM_UW | PERM_UR;
	file.created = timestampOfCreation;
	file.changed = timestampOfCreation;
	Kernel.Filesystem.vfs.fileList.push(file);
	return file;
}