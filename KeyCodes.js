var KeyCodes = function() {
}
KeyCodes.normalKey = function(code) {
	return String.fromCharCode(code);
}
KeyCodes.isBackspace = function(code) {
	return (code == 8);
}
KeyCodes.isDelete = function(code) {
	return (code == 46);
}
KeyCodes.isEnter = function(code) {
	return (code == 13) || (code == 10);
}
KeyCodes.isEscape = function(code) {
	return (code == 27);
}
KeyCodes.isLeft = function(code) {
	return (code == 37);
}
KeyCodes.isUp = function(code) {
	return (code == 38);
}
KeyCodes.isRight = function(code) {
	return (code == 39);
}
KeyCodes.isDown = function(code) {
	return (code == 40);
}
