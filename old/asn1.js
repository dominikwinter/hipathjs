var Types = function () {
    var _getLength = function (data) {
        return data.readUInt8(1);
    };

    var _getValue = function (data, length) {
        if (length === undefined) {
            length = _getLength(data);
        }

        return data.slice(2, 2 + length);
    }

    var _types = {
        undefined: function (data) {
            return data.toString('hex');
        },

        0x02: function (data) {
            return _getValue(data).readUInt8(0);
        }
    };

    return {
        getValue: function (data) {
            var type  = data.readUInt8(0);
            var value = (_types[type] || _types.undefined)(data);

            return value;
        },
    }
};

/**
 * @access public
 * @param object options
 */
var Decoder = function (options) {
    // set default if not given
    options        = options        || {};
    options.header = options.header || [ 0x26 ];
    options.Types  = options.Types  || new Types;

    /**
     * @access private
     * @return object
     */
    var _convert = function (data) {
        var output = [];

        do {
            var value     = options.Types.getValue(data);
            var length    = data.readUInt8(1);
            var innerData = data.slice(2, 2 + length);
            var isEnd     = length <= 3;

            value = _convert(innerData);

            output.push({
                type:   type,
                length: length,
                data:   value
            });

            data = data.slice(2 + length);
        } while (data.length > 0);

        return output;
    };


    /**
     * Converts a binary buffer to an object
     *
     * @access public
     * @param Buffer $data
     * @return Object
     */
    this.convert = function (data) {
        if (Buffer.isBuffer(data) === false) {
            throw 'parameter is not a buffer';
        }

        return _convert(data.slice(options.header.length));
    };
};


var data = new Buffer([
    0x26,
    0x80, 0x18,
        0xa1, 0x16,
            0x02, 0x01,
                0x04,
            0x02, 0x01,
                0x0a,
            0x30, 0x0e,
                0x30, 0x05,
                    0x80, 0x03,
                        0x36, 0x36, 0x34,
                0x30, 0x05,
                    0x80, 0x03,
                        0x35, 0x33, 0x35
]);
var data = new Buffer([0xa1, 0x16, 0x02, 0x01, 0x02, 0x02, 0x01, 0x0a, 0x30, 0x0e, 0x30, 0x05, 0x80, 0x03, 0x31, 0x30, 0x30, 0x30, 0x05, 0x80, 0x03, 0x31, 0x30, 0x31]);
var data = new Buffer([0xa2, 0x1b, 0x02, 0x01, 0x02, 0x30, 0x16, 0x02, 0x01, 0x0a, 0x30, 0x11, 0x6b, 0x0f, 0x30, 0x0d, 0x80, 0x02, 0x00, 0x16, 0xa1, 0x07, 0x30, 0x05, 0x80, 0x03, 0x31, 0x30, 0x30]);
var ber = new Decoder();

console.info(data);
console.info(JSON.stringify(ber.convert(data), null, 4));
