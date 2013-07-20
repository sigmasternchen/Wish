var KeyCodes = function() {
}
KeyCodes.normalKey = function(code) {
	return String.fromCharCode(code);
}
KeyCodes.isBackspace = function(code) {
	if (code == 8)
		return true;
	return false;
}
KeyCodes.isDelete = function(code) {
	if (code == 46)
		return true;
	return false;
}
KeyCodes.isEnter = function(code) {
	if (code == 13)
		return true;
	return false;
}
