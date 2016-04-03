var
    util = require('util'),
    net = require('net'),
    Ber = require('asn1').Ber,
    EventEmitter = require('events').EventEmitter
;

function Hipath(host, port, username, password) {
    var
        _hipath   = this,
        _parser   = new Parser(this),
        _socket   = net.createConnection(port, host),
        _invokeId = 1
    ;

    this.debug = false;

    this.getParser = function () {
        return _parser;
    };

    this.send = function (upsb) {
        console.info('put', upsb.buffer);
        _socket.write(upsb.buffer, 'binary');
    };

    this.requestAARQ = function (username, password) {
        var upsb = new Ber.Writer();

        // header
        upsb.writeByte(0x26);   // system_application
        upsb.startSequence(0x80); // message_length (MSB) bin: 10000000 ... first bit is complete msg flag
            // data
            upsb.startSequence(0x60);   // AARQ-apdu ::= [ APPLICATION 0 ] IMPLICIT SEQUENCE
                upsb.startSequence(0xa1);   // protocol-version [0] IMPLICIT BIT STRING
                    upsb.writeBuffer(new Buffer([ 0x2b, 0x0c, 0x00, 0x81, 0x5a ]), 0x06); // {iso(1) identified-organization(3) icd-ecma(12) standard(0) csta(218)}
                upsb.endSequence();

                upsb.writeBuffer(new Buffer([ 0x06, 0x80 ]), 0x8a); // sender-acse-requirements [10] IMPLICIT ACSE-requirements

                upsb.startSequence(0xac);   // PrivatExtPassword ::= [UNIVERSAL 8] IMPLICIT SEQUENCE
                    upsb.startSequence(0xa2);   // EncodingPassword ::= CHOICE (single-ASN1-type)
                        upsb.startSequence(0xa0);   // External-authentication ::= SEQUENCE
                            upsb.startSequence(0xa0);   // Sender-authentication ::= SEQUENCE
                                upsb.writeString(username); // authentication-name OCTET STRING
                                upsb.writeString(password); // authentication-password OCTET STRING
                            upsb.endSequence();
                        upsb.endSequence();
                    upsb.endSequence();
                upsb.endSequence();

                upsb.startSequence(0xbe);   // user-information [30] IMPLICIT Association-information
                    upsb.startSequence(0x28);
                        upsb.startSequence(0xa0);
                            upsb.startSequence(0xa0);
                                upsb.writeBuffer(new Buffer([ 0x00, 0x10, 0x00 ]), 0x03);   // CSTAVersion ::= BIT STRING versionFour  = '0001000000000000'B -- NrBits = 16
                            upsb.endSequence();
                       upsb.endSequence();
                    upsb.endSequence();
                upsb.endSequence();
            upsb.endSequence();
        upsb.endSequence();

        this.send(upsb);
    };

    this.sendRorsApdu = function () {
        var upsb = new Ber.Writer();

        // header
        upsb.writeByte(0x26);   // system_application
        upsb.startSequence(0x80);   // message_length (MSB) bin: 10000000 ... first bit is complete msg flag
            // data
            upsb.startSequence(0xa2);
                upsb.writeInt(++_invokeId); // invokeID
                upsb.startSequence(0x30);
                    upsb.writeInt(0xd3); // 211 (systemStatus)
                    upsb.writeNull(); // result.noData NULL
                upsb.endSequence();
            upsb.endSequence();
        upsb.endSequence();

        this.send(upsb);

        setTimeout(function () {
            _hipath.emit('connect');
        }, 1000);
    };

    this.makeCall = function (from, to) {
        var upsb = new Ber.Writer();

        // header
        upsb.writeByte(0x26);   // system_application
        upsb.startSequence(0x80);   // message_length (MSB) bin: 10000000 ... first bit is complete msg flag
            // data
            upsb.startSequence(0xa1);
                upsb.writeInt(++_invokeId); // invokeID
                upsb.writeInt(0x0a); // operation-value = 10 (makeCall)
                upsb.startSequence(0x30);
                    upsb.startSequence(0x30);
                        upsb.writeBuffer(new Buffer(from + ''), 0x80);
                    upsb.endSequence();
                    upsb.startSequence(0x30);
                        upsb.writeBuffer(new Buffer(to + ''), 0x80);
                    upsb.endSequence();
                upsb.endSequence();
            upsb.endSequence();
        upsb.endSequence();

        this.send(upsb);
    };

    this.snapshotDevice = function (number) {
        var upsb = new Ber.Writer();

        // header
        upsb.writeByte(0x26);   // system_application
        upsb.startSequence(0x80);   // message_length (MSB) bin: 10000000 ... first bit is complete msg flag
            // data
            upsb.startSequence(0xa1);
                upsb.writeInt(++_invokeId); // invokeID
                upsb.writeInt(0x4a); // operation-value = 74 (snapshotDevice),
                upsb.startSequence(0x30);
                    upsb.startSequence(0x30);
                        upsb.writeBuffer(new Buffer(number + ''), 0x80);
                    upsb.endSequence();
                upsb.endSequence();
            upsb.endSequence();
        upsb.endSequence();

        this.send(upsb);
    };

    /**
     * @param number connectionId ???
     */
    this.snapshotCall = function (connectionId) {
        var upsb = new Ber.Writer();

        // header
        upsb.writeByte(0x26);   // system_application
        upsb.startSequence(0x80);   // message_length (MSB) bin: 10000000 ... first bit is complete msg flag
            // data
            upsb.startSequence(0xa1);
                upsb.writeInt(++_invokeId); // invokeID
                upsb.writeInt(0x4b); // operation-value = 75 (snapshotCall),
                upsb.startSequence(0x30);
                    upsb.startSequence(0x30);
                        upsb.writeBuffer(new Buffer(connectionId + ''), 0x80);
                    upsb.endSequence();
                upsb.endSequence();
            upsb.endSequence();
        upsb.endSequence();

        this.send(upsb);
    };

    this.startMonitorDevice = function (number) {
        var upsb = new Ber.Writer();

        // header
        upsb.writeByte(0x26);   // system_application
        upsb.startSequence(0x80);   // message_length (MSB) bin: 10000000 ... first bit is complete msg flag
            // data
            upsb.startSequence(0xa1);
                upsb.writeInt(++_invokeId);
                upsb.writeInt(0x47); // operation-value = 71 (monitorStart)
                upsb.startSequence(0x30);
                    upsb.startSequence(0x30);
                        upsb.writeBuffer(new Buffer(number + ''), 0x80); // dailingNumber
                    upsb.endSequence();
                    upsb.startSequence(0xa0); // requestedMonitorFilter
//                        upsb.writeBuffer(new Buffer([0x06, 0x00, 0x00, 0x00]),  /* 00000110 00000000 00000000 00000000  */ 0x80); // call control
//                        upsb.writeBuffer(new Buffer([0x03, 0x00]),              /* 00000011 00000000                    */ 0x86); // call associated
//                        upsb.writeBuffer(new Buffer([0x06, 0x00]),              /* 00000110 00000000                    */ 0x87); // media attachment
//                        upsb.writeBuffer(new Buffer([0x05, 0x00, 0x00]),        /* 00000101 00000000 00000000           */ 0x88); // physical device feature
//                        upsb.writeBuffer(new Buffer([0x02, 0x00, 0x00]),        /* 00000010 00000000 00000000           */ 0x89); // logical device feature
//                        upsb.writeBuffer(new Buffer([0x05, 0x00]),              /* 00000101 00000000                    */ 0x83); // maintainance
//                        upsb.writeBuffer(new Buffer([0x01, 0x00]),              /* 00000001 00000000                    */ 0x85); // voice unit
//                        upsb.writeBuffer(new Buffer([0x07, 0x00]),              /* 00000111 00000000                    */ 0x84); // private

                        upsb.writeBuffer(new Buffer([0x06, 0x00, 0x00, 0x00]),  /* 00000110 00000000 00000000 00000000  */ 0x80); // call control
                        upsb.writeBuffer(new Buffer([0x03, 0x40]),              /* 00000011 00000000                    */ 0x86); // call associated
                        upsb.writeBuffer(new Buffer([0x06, 0x00]),              /* 00000110 00000000                    */ 0x87); // media attachment
                        upsb.writeBuffer(new Buffer([0x05, 0x54, 0x00]),        /* 00000101 00000000 00000000           */ 0x88); // physical device feature
                        upsb.writeBuffer(new Buffer([0x02, 0x00, 0x00]),        /* 00000010 00000000 00000000           */ 0x89); // logical device feature
                        upsb.writeBuffer(new Buffer([0x05, 0xc0]),              /* 00000101 00000000                    */ 0x83); // maintainance
                        upsb.writeBuffer(new Buffer([0x01, 0xc0]),              /* 00000001 00000000                    */ 0x85); // voice unit
                        upsb.writeBuffer(new Buffer([0x07, 0x00]),              /* 00000111 00000000                    */ 0x84); // private
                    upsb.endSequence();
                upsb.endSequence();
            upsb.endSequence();
        upsb.endSequence();

        this.send(upsb);
    };

    _parser.setHipath(this);

    _socket.setNoDelay(true);

    _socket.on('connect', function () {
        _hipath.requestAARQ(username, password);
    });

    _socket.on('data', function (data) {
        try {
            _hipath.getParser().parse(data);
        } catch (e) {
            console.error(e);
            console.trace();
        }
    });

    _socket.on('error', function (error) {
        console.info('> ' + error + '\n');
    });

    _socket.on('end', function (x) {
        console.info('Disconnected from server ' + _socket.bytesWritten);
        _socket.destroy();
    });

    _socket.on('close', function (x) {
        console.info('close ' + x);
    });
}

function log(pref, data) {
    var hex = '';
    var length = data.length;

    for (var i = 0; i < length; ++i) {
        var part = data[i].toString(16);
        if (part.length === 1) {
            part = '0' + part;
        }

        hex += ' 0x' + part;
    }

    console.info(pref, hex);
}

function convertTimestamp(s) {
    if (Buffer.isBuffer(s) === true) {
        s = s.toString();
    }

    if (!s) {
        var n = new Date();
        s =
            n.getFullYear() +
            n.getMonth()    +
            n.getDate()     +
            n.getHours()    +
            n.getMinutes()  +
            n.getSeconds()
        ;
    }

    var ts = '';

    if (s.length > 0) {
        s = s.split("");

        ts =
            s[0] +
            s[1] +
            s[2] +
            s[3] +
            '-'  +
            s[4] +
            s[5] +
            '-'  +
            s[6] +
            s[7] +
            ' '  +
            s[8] +
            s[9] +
            ':'   +
            s[10] +
            s[11] +
            ':'   +
            s[12] +
            s[13]
        ;
    }

    return ts;
}

function Parser(hipath) {
    var
        _parser = this,
        _hipath = hipath
    ;

    this.setHipath = function (hipath) {
        _hipath = hipath;

        return this;
    };

    this.getHipath = function () {
        return _hipath;
    };

    this.parse = function (got) {
        console.info('got', got);

        var reader = new Ber.Reader(got);

        reader.readByte(); // head 0x26
        reader.readByte(); // type 0x80, 0x81, ..
        reader.readByte(); // length ??

        var seq = reader.readSequence();

        var dialingNumber = {};
        var timestamp = '';
        var callId = '';
        var cause = '';
        var invokeId = '';
        var operationValue = '';

        switch (seq) {
            case 0x61:
                reader.readSequence(0xa1);
                var applicationContextName = reader.readString(0x06, true);                                             _hipath.debug && log('applicationContextName', applicationContextName); // {iso(1) identified-organization(3) icd-ecma(12) standard(0) csta(218)},
                var result = reader.readString(0xa2, true);                                                             _hipath.debug && log('result', result); // 0 (accepted)
                reader.readSequence(0xa3);
                var acseServiceUser = reader.readString(0xa1, true);                                                    _hipath.debug && log('acseServiceUser', acseServiceUser); // 0 (null)
                var responderAcseRequirements = reader.readString(0x88, true);                                          _hipath.debug && log('responderAcseRequirements', responderAcseRequirements); // authentication
                reader.readSequence(0xaa);
                reader.readSequence(0xa2);
                reader.readSequence(0xa0);
                reader.readSequence(0xa1);
                var apsStamp = reader.readString();                                                                     _hipath.debug && console.info('apsStamp', apsStamp);
                var systemVersion = reader.readString();                                                                _hipath.debug && console.info('systemVersion', systemVersion);
                reader.readSequence(0xbe);
                reader.readSequence(0x28);
                reader.readSequence(0xa0);
                reader.readSequence(0xa0);
                var cSTAVersion = reader.readString(0x03, true);                                                        _hipath.debug && log('cSTAVersion', cSTAVersion);
                break;

            case 0xa4:
                invokeId = reader.readInt();                                                                            _hipath.debug && console.info('invokeId', invokeId);
                var unknown = reader.readString(0x80, true);                                                            _hipath.debug && log('unknown1', unknown);
                break;

            case 0xa2:
                invokeId = reader.readInt();                                                                            _hipath.debug && console.info('invokeId', invokeId);

                reader.readSequence(0x30);
                operationValue = reader.readInt();  /* 0x4a */                                                          _hipath.debug && console.info('operationValue1', operationValue);
                reader.readSequence(0x30);
                seq = reader.peek();

                switch (seq) {
                    case 0x55:
                        var unknown = reader.readString(seq, true);                                                     _hipath.debug && log('unknown1', unknown);
                        break;

                    case 0x76:
                        reader.readSequence(seq);
                        reader.readSequence(0x30);
                        reader.readSequence(0x6b);
                        reader.readSequence(0xa1);
                        reader.readSequence(0x30);
                        dialingNumber[seq] = reader.readString(0x80);                                                   _hipath.debug && console.info('dialingNumber1', dialingNumber[seq]);
                        reader.readSequence(0xa0);
                        var staticID = reader.readString(0x4e, true); /* connectionIdentifier.deviceID.staticID */      _hipath.debug && console.info('staticID', staticID);
                        reader.readSequence(0x7e);
                        reader.readSequence(0xa1);
                        var state = reader.readString(0xe1, true); /* localCallState.compoundCallState */               _hipath.debug && log('compoundCallState', state);
                        break;
                }

                break;

            case 0xa3:
                invokeId        = reader.readInt();                                                                     _hipath.debug && console.info('invokeId', invokeId);
                operationValue  = reader.readInt();                                                                     _hipath.debug && console.info('operationValue2', operationValue);

                reader.readSequence(0xa0);
                var unknown = reader.readString(0x0a, true);                                                            _hipath.debug && log('unknown1', unknown);
                break;

            case 0xa1:
                invokeId        = reader.readInt();                                                                     _hipath.debug && console.info('invokeId', invokeId);
                operationValue  = reader.readInt();                                                                     _hipath.debug && console.info('operationValue3', operationValue);

                reader.readSequence(0x30);
                seq = reader.peek();

                switch (seq) {
                    case 0x0a:
                        var unknown = reader.readString(seq, true);                                                     _hipath.debug && log('unknown1', unknown);
                        _hipath.sendRorsApdu(); // second part of auth
                        break;

                    case 0x55:
                        var unknown = reader.readString(seq, true);                                                     _hipath.debug && log('unknown2', unknown);
                        seq = reader.readSequence();

                        switch (seq) {
                            case 0xa3:
                                reader.readSequence(); // TODO can be 0xa3 or 0xa1 ???
                                reader.readSequence(0x63);
                                reader.readSequence(0x30);
                                dialingNumber[seq] = reader.readString(0x80);                                           _hipath.debug && console.info('dialingNumber1', dialingNumber[seq]);
                                var text = reader.readString(0x04, true);                                               _hipath.debug && log('text', text);
                                var bool = reader.readBoolean();                                                        _hipath.debug && console.info('bool', bool);

                                reader.readSequence(0x7e);
                                reader.readSequence(0xa0);
                                var timestamp = reader.readString(0x18, true);                                          _hipath.debug && console.info('timestamp', timestamp.toString());
                                break;

                            case 0xa0:
                                seq = reader.readSequence();

                                switch (seq) {
                                    case 0xa0:
                                    case 0xa3:
                                    case 0xa4:
                                    case 0xa6:
                                    case 0xa7:
                                    case 0xa8:
                                    case 0xab:
                                    case 0xad:
                                    case 0xb0:
                                    case 0xb1:
                                        var kill = 0;
                                        while (true) {
                                            if (reader.remain <= 0) {
                                                break;
                                            }

                                            if (++kill > 50) {
                                                console.info('======== FORCE KILL', seq);
                                                break;
                                            }

                                            seq = reader.peek();

                                            switch (seq) {
                                                case 0x0a:
                                                    var cause = reader.readString(seq, true);                           _hipath.debug && log('cause', cause);
                                                    break;

                                                case 0x4e:
                                                    var localConnectionInfo = reader.readString(seq, true);             _hipath.debug && log('localConnectionInfo', localConnectionInfo.toString());
                                                    break;

                                                case 0x61:
                                                case 0x62:
                                                case 0x63:
                                                case 0x64:
                                                case 0x65: // TODO
                                                case 0x66:
                                                    reader.readSequence(seq);

                                                    switch (reader.readSequence()) {
                                                        case 0x30:
                                                            dialingNumber[seq] = reader.readString(0x80);               _hipath.debug && console.info('dialingNumber3', dialingNumber[seq]);
                                                            break;

                                                        default:
                                                            var unknown = new Buffer(reader.length);

                                                            for (var i = 0; i < reader.length; ++i) {
                                                                unknown[i] = reader.readByte();
                                                            }

                                                            _hipath.debug && log('unknown3', unknown);
                                                            break;
                                                    }
                                                    break;

                                                case 0x6b:
                                                case 0xa0:
                                                    reader.readSequence(seq);
                                                    reader.readSequence(0x30);
                                                    var callId = reader.readString(0x80, true);                         _hipath.debug && log('callId', callId);

                                                    reader.readSequence(0xa1);
                                                    reader.readSequence(0x30);
                                                    dialingNumber[seq] = reader.readString(0x80);                       _hipath.debug && console.info('dialingNumber2', dialingNumber[seq]);
                                                    break;

                                                case 0x7e:
                                                    reader.readSequence(seq);
                                                    reader.readSequence(0xa0);
                                                    var timestamp = reader.readString(0x18, true);                      _hipath.debug && console.info('timestamp', timestamp.toString());
                                                    break;

                                                case 0xa1:

                                                    // TODO weiterleitung und so..
                                                    reader.readSequence(seq);
                                                    var unknown = reader.readString(0x0a, true);                        _hipath.debug && log('unknown7', unknown);
                                                    break;

                                                case 0xa5:
                                                case 0xa6:
                                                case 0xa7:
                                                    reader.readSequence(seq);
                                                    reader.readSequence(0x30);
                                                    var unknown = reader.readString(0x81, true);                        _hipath.debug && log('unknown5', unknown);

                                                    reader.readSequence(0x30);
                                                    var unknown = reader.readString(0x81, true);                        _hipath.debug && log('unknown6', unknown);
                                                    break;
                                            }
                                        }
                                        break;

                                    default:
                                        console.info('======== UNKNOWN SEQ', seq);
                                        break;
                                }
                                break;
                        }
                        break;
                }

                localConnectionInfo = Buffer.isBuffer(localConnectionInfo) ? localConnectionInfo.readUInt8(0) : (localConnectionInfo || null);
                cause = Buffer.isBuffer(cause) ? cause.readUInt8(0) : (cause || null);
                callId = Buffer.isBuffer(callId) ? callId.readUInt16BE(0) : (callId || null);

                if (_hipath.debug) {
                    _parser.getHipath().emit('data', {
                        invokeId: invokeId,
                        operationValue: operationValue, // 21 (cSTAEventReport), 211 (systemStatus), 74 (snapshotDevice), 71 (monitorStart), 10 (makeCall), 203 (getSwitchingFunctionCapabilities),
                        localConnectionInfo: localConnectionInfo, // 0 (null), 1 (initiated), 2 (alerting), 3 (connected)
                        cause: cause, // 48 0x30 (normalClearing), 22 0x16 (newCall)
                        callId: callId, // TODO only first bit :(
                        numbers: dialingNumber,
                        time: convertTimestamp(timestamp)
                    });
                }

                switch (operationValue) {
                    case 21:
                        var emits = ['hangUp', 'pickUp', 'alert', 'deliver'];

                        _parser.getHipath().emit(emits[localConnectionInfo], {
                            invokeId: invokeId,
                            cause: cause, // 48 0x30 (normalClearing), 22 0x16 (newCall)
                            callId: callId, // TODO only first bit :(
                            numbers: dialingNumber,
                            time: convertTimestamp(timestamp)
                        });

                        break;

                    case 211:
                        break;
                }

                break;

            default:
                log('unknown seq', seq);
                break;
        }
    }
}

util.inherits(Hipath, EventEmitter);

module.exports = Hipath;
