export default function fixEscapeHex(jsonString) {
    return jsonString.replace(/\\x([0-9A-Fa-f]{2})/g, function (match, hex) {
        return String.fromCharCode(parseInt(hex, 16));
    });
}