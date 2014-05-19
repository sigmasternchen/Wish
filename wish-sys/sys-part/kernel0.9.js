const SIGHUP = 1;
const SIGKILL = 9;
const SIGALRM = 14;
const SIGTERM = 15;
const SIGCHLD = 20;
const SIGXCPU = 24;
const SIGUSR1 = 30;
const SIGUSR2 = 31;

const SYSHALT = 31415926;

const PERM_OX = 1 <<  0;
const PERM_OW = 1 <<  1;
const PERM_OR = 1 <<  2;
const PERM_GX = 1 <<  3;
const PERM_GW = 1 <<  4;
const PERM_GR = 1 <<  5;
const PERM_UX = 1 <<  6;
const PERM_UW = 1 <<  7;
const PERM_UR = 1 <<  8;
const PERM_D  = 1 <<  9;
const PERM_L  = 1 << 10;

const NO_PARENT = -1;
const NO_MOUNTPOINT = -1;
const NO_SOURCE = -1;

const FS_BASEFS = 1;
const FS_DEVFS  = 2;
const FS_PROCFS = 3;

// read modes
const MODE_FIFO  = 1;
const MODE_LIFO  = 2;
// write modes
const MODE_OVRWD = 3;
const MODE_APPND = 4;
// what should happen, if a file does not exist
const MODE_THROW  = 5;
const MODE_CREATE = 6;

// special chars
const EOF = String.fromCharCode(26);

const OS_NAME = "Wish OS V 0.1"; // Wish-Isn't-a-SHell Operating System
const KERNEL = "Wodka Kernel V 0.9"; // Wish Os Dedicated Kernel Alpha

var OS = function() {
}
OS.system;
OS.runlevel;
OS.staticShift = 7;
OS.hostname = "wish";
OS.logo = "\033[32m" + 
"        .__       .__     \n" +
"__  _  _|__| _____|  |__  \n" +
"\\ \\/ \\/ /  |/  ___/  |  \\ \n" +
" \\     /|  |\\___ \\|   Y  \\\n" +
"  \\/\\_/ |__/____  >___|  /\n" +
"                \\/     \\/   \033[31mOS\033[0m\n";
OS.main = function(system) {
	console.log("OS: main");
	OS.system = system;
	console.log("OS: init Kernel");
	Kernel.init();
}

var Kernel = function() {
}
Kernel.time;
Kernel.state;
Kernel.machineTimerId;
Kernel.globalLog;
Kernel.init = function() {
	console.log("Kernel: init");
	Kernel.state = 0;
	console.log("Kernel: main timer (100ms)");
	Kernel.machineTimerId = Emulator.registerTimer(100, Kernel.machine);
	Kernel.globalLog = "";
}
Kernel.machine = function() {
	switch(Kernel.state) {
	case 0:
		Emulator.Output.shiftKey = OS.staticShift;
		Emulator.output("\033[2J\033[0;0H" + OS.logo);
		Kernel.wall("\ņbooting kernel: " + KERNEL + "...")
		Kernel.msgOut("reseting kernel timer", true);
		Kernel.time = 0;
		Kernel.msgOut("register main timer (100ms)", true); // pre
		Kernel.wall("\ninit filesystem");
		Kernel.Filesystem.init();
		Kernel.state++;
		break;
	case 1:
		break;
	case 2:
		Kernel.state = SYSHALT; // TODO remove
		Kernel.Filesystem.initCon();
		Kernel.wall("\ninit process manager");
		Kernel.ProcessManager.init();
		Kernel.wall("\ninit user manager");
		Kernel.UserManager.init();
		Kernel.wall("\n   update user db");
		Kernel.UserManager.update();
		Kernel.wall("\ninit scheduler");
		Kernel.Scheduler.init();		
		Kernel.wall("\ninit kernel io");
		Kernel.IO.init();
		Kernel.msgOut("  register keyboard interrupt");
		Emulator.interrupts['key'] = Kernel.IO.key;
		Kernel.msgSuccess(true);
		Kernel.msgOut("  register power switch interrupt");
		Emulator.interrupts['powersw'] = Kernel.IO.powersw;
		Kernel.msgSuccess(true);

		Kernel.msgOut("loading /sbin/init.js");
		var initpid = Kernel.ProcessManager.exec("/sbin/init.js", [], false);
		Kernel.msgSuccess(true);
		Kernel.msgOut("  adding handler for stdio on /dev/tty1", true);
		var init = Kernel.ProcessManager.processList[initpid];
		init.files['stdin'] = new File("/dev/tty1");
		init.files['stdin'].readMode = MODE_FIFO;
		init.files['stdout'] = new File("/dev/tty1");
		init.files['stdout'].writeMode = MODE_APPND;
		Kernel.msgOut("  starting init", true);
		init.main();
		Kernel.msgOut("register scheduler timer (1ms)");
		Emulator.interrupts[0] = Kernel.Scheduler.tick;
		Kernel.msgSuccess(true);
		Kernel.state++;
		break;
	case 4:
		break;
	default:
		break;
	}
}
Kernel.next = function() {
	Kernel.state++;
}
Kernel.wall = function(text) {
	Emulator.output(text);
}
Kernel.msgOut = function(text, success, color) {
	while (text.length < Emulator.Output.xsize - 12)
		text += " ";
	text = "\n" + text;
	if (color) {
		text = color + text;
		text += "\033[0m"
	}
	Kernel.globalLog += text;
	Kernel.wall(text);
	Kernel.msgSuccess(success);
}
Kernel.msgSuccess = function(success) {
	var text = "";
	if (success == true)
		text = "[ \033[32msuccess\033[0m ]";
	else if (success == false)
		text =  "[  \033[31mfailed\033[0m ]";
	else
		text = "";
	Kernel.globalLog += text;
	Kernel.wall(text);
}

Kernel.shutdown = function() {
	Kernel.wall("\n\n\nShuting down...\nKilling all processes...\n");
	var procs = new Array();
	for (var i in Kernel.ProcessManager.processList) {
		var proc = Kernel.ProcessManager.processList[i];
		if (proc)
			procs.push(proc);
	}
	//procs.reverse();
	for (var i = 0; i < procs.length; i++) {
		if (!procs[i].pid)
			continue;
		Kernel.wall("sending sigkill to pid " + procs[i].pid + "...\n");
		try {
			procs[i].signalHandler(9);
		} catch (exception) {
		}	 
	}
	Kernel.wall("all processes killed.\n\nRemoving event handlers\n\n");
	Emulator.interrupts = new Array();
	Kernel.wall("System halt\n\n");
	
}

Kernel.Scheduler = function() {
}
Kernel.Scheduler.jobs;
Kernel.Scheduler.activ;
Kernel.Scheduler.working;
Kernel.Scheduler.init = function() {
	Kernel.msgOut("  init job list");
	Kernel.Scheduler.jobs = new Array();
	Kernel.Scheduler.activ = 0;
	Kernel.Scheduler.working = false;
	Kernel.msgSuccess(true);
}
Kernel.Scheduler.tick = function() {
	if (Kernel.Scheduler.working) {
		Kernel.Scheduler.jobs[Kernel.Scheduler.activ].signalHandler(SIGXCPU);
		Kernel.Scheduler.activ %= Kernel.Scheduler.jobs.length;
		return;
	}
	Kernel.Scheduler.working = true;
	Kernel.Scheduler.activ++;
	Kernel.Scheduler.activ %= Kernel.Scheduler.jobs.length;
	var pid = Kernel.Scheduler.jobs[Kernel.Scheduler.activ].pid;
	try {
		Kernel.Scheduler.jobs[Kernel.Scheduler.activ].tick();
	} catch (error) {
		if ((typeof error) != "number") {
			console.log("Kernel: a wild error appeared in pid" + pid + ".tick");
			console.log(error);
		}
	}
	Kernel.time++;
	Kernel.Scheduler.working = false;
}
Kernel.Scheduler.add = function(process) {
	if (!process.tick)
		return 2; // no tick method
	for (var i = 0; i < this.jobs.length; i++) {
		if (this.jobs[i].pid == process.pid)
			return 3; // no double processes
	}
	this.jobs.push(process);
	return 0;
}
Kernel.Scheduler.remove = function(process) {
	for (var i = 0; i < this.jobs.length; i++) {
		if (this.jobs[i].pid == process.pid) {
			if (this.activ == i)
				this.working = false;
			this.jobs.splice(i, i);
			return 0; // success
		}
	}
	return 1; // not in list
}

Kernel.ProcessManager = function() {
}
Kernel.ProcessManager.nextPid;
Kernel.ProcessManager.processList;
Kernel.ProcessManager.innerProcessList;
Kernel.ProcessManager.loadedList;
Kernel.ProcessManager.init = function() {
	Kernel.msgOut("  init process list");
	Kernel.ProcessManager.processList = new Array();
	Kernel.ProcessManager.innerProcessList = new Array();
	Kernel.ProcessManager.nextPid = 1;
	Kernel.msgSuccess(true);
}
Kernel.ProcessManager.lib = function(filepath) {
	Kernel.ProcessManager.exec(filepath, [], false, true);
}
Kernel.ProcessManager.exec = function(filepath, params, execute, lib) {
	var file = Kernel.Filesystem.vfs.getFileByPath(filepath);
	if (!file)
		throw ("No such file or directory: " + filepath);
	
	var parent = Kernel.ProcessManager.getCurrentPID();
	var uid = Kernel.ProcessManager.getUserByPID(parent);
	if (uid != 0) {
		if (uid == file.ownerID) {		
			if (!(file.permissions & PERM_UR))
				throw "not permitted";
			if (!(file.permissions & PERM_UX))
				throw "not permitted";
		}
		if (Kernel.UserManager.isUserIdInGroupId(uid, file.groupID)) {			
			if (!(file.permissions & PERM_GR))
				throw "not permitted";
			if (!(file.permissions & PERM_GX))
				throw "not permitted";
		}

		if (!(file.permissions & PERM_OR))
			throw "not permitted";
		if (!(file.permissions & PERM_OX))
			throw "not permitted";
	} else {
		if (!(file.permissions & (PERM_UX | PERM_GX | PERM_OX)))
			throw "not permitted";
	}
	
	try {
		(1 ? eval : 0)(file.content); // genius hack to switch eval-scope to window
	} catch (e) {
		console.log("Kernel: error in process exec");
		console.log(e.stack);
	}
	if (lib)
		return;
	var program = eval("new " + Kernel.ProcessManager.getClassNameFromFileName(filepath));
	
	program.init(parent);
	Kernel.ProcessManager.processList[program.pid] = program;

	var innerProgram = new InnerProcess();
	innerProgram.user = uid;
	Kernel.ProcessManager.innerProcessList[program.pid] = innerProgram;
	if (execute !== false)
		program.main(params);
	if (program.pid != 1)
		this.processList[program.parentId].signalHandler(SIGCHLD);
	return program.pid;
}
Kernel.ProcessManager.quit = function(process) {
	var parentId = process.parentId;
	var pid = process.pid;
	console.log("Kernel: quiting pid: " + pid);
	Kernel.Scheduler.remove(process);
	if (pid != parentId)
		this.processList[parentId].signalHandler(SIGCHLD);
}
Kernel.ProcessManager.remove = function(process) {
	this.processList.splice(process.pid, 1);
	var childs = this.getAllChilds(process.pid);
	for (var i = 0; i < childs.length; i++)
		childs[i].parentId = 1;
	if (childs.length > 0)
		this.processList[1].signalHandler(SIGCHLD);
}
Kernel.ProcessManager.getAllChilds = function(pid) {
	var kids = new Array();
	for(var index in Kernel.ProcessManager.processList) {
		var proc = Kernel.ProcessManager.processList[index];
		if (proc.parentId == pid) {
			if (proc.exitCode === undefined)
				kids.push(proc);
		}
	}
	return kids;
}
Kernel.ProcessManager.getPid = function() {
	return Kernel.ProcessManager.nextPid++;
}
Kernel.ProcessManager.getClassNameFromFileName = function(name) {	
	name = name.split("/");	
	name = name[name.length - 1];	
	name = name[0].toUpperCase() + name.substring(1);
	name = name.split(".")[0];
	name += "Class";
	return name;
}
Kernel.ProcessManager.getCurrentPID = function() {
	var spid = Kernel.Scheduler.activ;
	var pid;
	if (spid === undefined || !Kernel.Scheduler.jobs[spid])
		pid = 1;
	else
		pid = Kernel.Scheduler.jobs[spid].pid;
	return pid;
}
Kernel.ProcessManager.getProcess = function(pid) {
	return Kernel.ProcessManager.processList[pid];
}
Kernel.ProcessManager.getUserByPID = function(pid) {
	if (pid == 1)
		return 0;	// solves the chicken-or-the-egg-problem (pid 1 may not exist yet), but uid has to be 0
	return Kernel.ProcessManager.innerProcessList[pid].user;
}
Kernel.ProcessManager.getFileListByPID = function(pid) {
	return clone(Kernel.ProcessManager.innerProcessList[pid].files);
}

var InnerProcess = function() {
}
InnerProcess.prototype.user;
InnerProcess.prototype.files = new Array();

var Process = function(parentId) {	
}
Process.prototype.pid;
Process.prototype.userId;
Process.prototype.parentId;
Process.prototype.files;
Process.prototype.Environment;
Process.prototype.exitCode;
Process.prototype.init = function(parentId) {
	// DO NOT OVERWRITE
	this.pid = Kernel.ProcessManager.getPid(); 
	this.Environment = function() {
	}
	this.Environment.global = {};
	this.Environment.local = {};
	this.parentId = parentId;
	this.files = new Array();
}
Process.prototype.main = function(args) {

}
Process.prototype.tick = function() {
}
Process.prototype.exit = function(code) {
	this.exitCode = code;
	Kernel.ProcessManager.quit(this);
	throw code;
}
Process.prototype.signalHandler = function(signal) {
	switch(signal) {
	case SIGCHLD:
		break;
	case SIGHUP:
		//break;
	case SIGALRM:
		//break;
	case SIGTERM:
		//break;
	case SIGXCPU:
		//break;
	case SIGUSR1:
		//break;
	case SIGUSR2:
		//break;
	default: //SIGKILL 
		console.log("PID " + this.pid + " got Signal " + signal);
		this.exit(1);
		break;
	}
}

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

	Kernel.msgOut("  init devfs...");
	Kernel.Filesystem.devfs.init();
	Kernel.msgSuccess(true);

	Kernel.msgOut("  init basefs...");
	Kernel.Filesystem.basefs.init();
	Kernel.msgSuccess(true);

	Kernel.msgOut("  loading sd" + (String.fromCharCode("a".charCodeAt(0) + OS.system.hdd)) + (1 + OS.system.partition) + " to RAM (this may take some time)...");
	Kernel.Filesystem.basefs.getRootStructure(); 
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

	if (!file.onRead())
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
		if (index !== undefined) {
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
}
Kernel.Filesystem.devfs.mount = function () {
	var point = new MountPoint();
	point.fileId = Kernel.Filesystem.vfs.getFileByPath("/dev").id;
	point.filesystem = FS_DEVFS;
	point.source = NO_SOURCE;
	Kernel.Filesystem.vfs.mount(point, Kernel.Filesystem.devfs.files);
}

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
		throw ("mountpoint not emty");
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

Kernel.IO = function() {
}
Kernel.IO.inputBuffer;
Kernel.IO.init = function() {
	Kernel.IO.inputBuffer = new Array();
}
Kernel.IO.key = function(code) {
	Kernel.IO.inputBuffer.push(code);
}
Kernel.IO.powersw = function() {
	console.log("Kernel: power switch pressed, but no action defined");
}
Kernel.IO.input = function() {
	return Kernel.IO.inputBuffer;
}
Kernel.IO.output = function(string) {
	Emulator.output(string);
}

Kernel.UserManager = function() {
}
Kernel.UserManager.users = new Array();
Kernel.UserManager.groups = new Array();
Kernel.UserManager.passwdFile;
Kernel.UserManager.groupsFile;
Kernel.UserManager.init = function () {
	Kernel.UserManager.passwdFile = new File("/etc/passwd.json");
	Kernel.UserManager.groupsFile = new File("/etc/groups.json");
}
Kernel.UserManager.update = function () {
	Kernel.UserManager.users  = JSON.parse(Kernel.UserManager.passwdFile.read().replace(EOF, ""));
	Kernel.UserManager.groups = JSON.parse(Kernel.UserManager.groupsFile.read().replace(EOF, ""));
}
Kernel.UserManager.getUserById = function(id) {
	for (var i = 0; i < Kernel.UserManager.users.length; i++) {
		if (Kernel.UserManager.users[i].id == id)
			return Kernel.UserManager.users[i];
	}
	return false;
}
Kernel.UserManager.getUsernameById = function(id) {
	return Kernel.UserManager.getUserById(id).username;
}
Kernel.UserManager.getGroupById = function(id) {
	for (var i = 0; i < this.groups.length; i++) {
		if (Kernel.UserManager.groups[i].id == id)
			return Kernel.UserManager.groups[i];
	}
	return false;
}
Kernel.UserManager.getGroupnameById = function(id) {
	return Kernel.UserManager.getGroupById(id).username;
}
Kernel.UserManager.getGroupsByUserId = function(id) {
	var ret = new Array();
	for (var i = 0; i < Kernel.UserManager.groups.length; i++) {
		for (var j = 0; j < Kernel.UserManager.groups[i].members.length; j++) {
			if (Kernel.UserManager.groups[i].members[j] == id)
				ret.push(Kernel.UserManager.groups[i]);
		}
	}
	return ret;
}
Kernel.UserManager.getUserByName = function(name) {
	for (var i = 0; i < Kernel.UserManager.users.length; i++) {
		if (Kernel.UserManager.users[i].username == name)
			return Kernel.UserManager.users[i];
	}
	return false;
}
Kernel.UserManager.getGroupByName = function(name) {
	for (var i = 0; i < Kernel.UserManager.groups.length; i++) {
		if (Kernel.UserManager.group[i].name == name)
			return Kernel.UserManager.groups[i];
	}
	return false;
}
Kernel.UserManager.isUserIdInGroupId = function(user, group) {
	var groups = Kernel.UserManager.getGroupsByUserId(user);
	for (var i = 0; i < groups.length; i++) {
		if (groups.id == group)
			return true;
	}
	return false;
}
Kernel.UserManager.changeProcessUser = function(pid, username, password) {
	Kernel.ProcessManager.lib("/lib/sha256.js");
	var process = Kernel.ProcessManager.getProcess(pid);
	var user = Kernel.UserManager.getUserByName(username);
	if (!process) {
		console.log("UserManager: process " + pid + " not found");
		return false;
	}
	if (!user) 
		return false;
	if (Sha256.hash(password) != user.password)
		return false;
	Kernel.ProcessManager.innerProcessList[pid].user = user.id;
}
