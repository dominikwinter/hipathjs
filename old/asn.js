
var data = new Buffer([0x80, 0x09, 0x12, 0x01, 0x05, 0x13, 0x04, 0x12, 0x34, 0x06, 0x01]);
var data = new Buffer([0x80, 0x18, 0xa1, 0x16, 0x02, 0x01, 0x04, 0x02, 0x01, 0x0a, 0x30, 0x0e, 0x30, 0x05, 0x80, 0x03, 0x36, 0x36, 0x34, 0x30, 0x05, 0x80, 0x03, 0x35, 0x33, 0x35]);


function parse(data) {
   var out = [];

    while (true) {
        var _out = {};
        var type = data.readUInt8(0);
        var length = data.readUInt8(1);

        if (length > data.length - 2) {
            throw 'wrong length';
        }

        var val = data.slice(2, length + 2);

        _out.type = type;
        _out.length = length;

        if (length >= 3) {
            try {
                _out.value = parse(val);
            } catch (e) {
                _out.value = val.toString();
            }
        } else {
            _out.value = val.toString();
        }

        out.push(_out);

        if (data.length - length - 2 > 0) {
            data = data.slice(length + 2);
        } else {
            break;
        }
    }

    return out;
}

console.info(JSON.stringify(parse(data), null, 4));
