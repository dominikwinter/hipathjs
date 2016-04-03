var Ber = require('asn1').Ber;

var reader = [
    new Ber.Reader(new Buffer([ 0x64, 0x07, 0x30, 0x05, 0x80, 0x03, 0x35, 0x34, 0x38, 0x01, 0x01, 0x01 ])),
    new Ber.Reader(new Buffer([ 0x64, 0x02, 0x87, 0x01, 0x01, 0x01, 0x01 ]))
];


for (var i in reader) {
    console.info('-------------------------------', reader[i].buffer);
    var seq = reader[i].peek();
// -----------------------

    reader[i].readSequence(seq);

    var subSeq = reader[i].peek();
    console.info('subSeq', '0x' + subSeq.toString(16));

    switch (subSeq) {
        case 0x30:
            reader[i].readSequence(subSeq);
            var dialingNumber = reader[i].readString(0x80);
            console.info('1', dialingNumber);
            break;

        default:
            console.info(reader[i].buffer);
            for (var x = reader[i].length; x > 0; --x) {
                console.info('2', reader[i].readByte().toString(16));
            }
            break;
    }

    console.info('remain', reader[i].remain);
}
