require('buffer').INSPECT_MAX_BYTES = Infinity;

var hipath  = require('./hipath.js');
var io      = require('socket.io').listen(12345).set('transports', ['websocket']);

var host        = '192.168.0.242';
var port        = 7001;
var username    = 'AMHOST';
var password    = '77777';

var users = {
    664: [ { username: 'meeting1', name: 'Meeting 1' } ],
    120: [ { username: 'meeting2', name: 'Meeting 2' } ],

    111: [ { username: 'abc', firstname: 'Anton', lastname: 'Kanga' } ],
    114: [ { username: 'def', firstname: 'Peter', lastname: 'Tala' } ],
    115: [ { username: 'ghi', firstname: 'Miro',  lastname: 'Tach' } ]
};

function resolveNumber(numbers, users) {
    for (var n in numbers) {
        for (var u in users) {
            if (numbers[n] == u) {
                numbers[n] = {
                    number: numbers[n],
                    users: users[u]
                }
            }
        }
    }

    return numbers;
}


var hipathSocket = new hipath(host, port, username, password);

hipathSocket.debug = true;

hipathSocket.on('connect', function () {
    var x = 0;

    for (var no in users) {
        (function (no) {
            setTimeout(function () {
                hipathSocket.startMonitorDevice(no);
            }, x++ * 100); // delay
        })(no);
    }
});

hipathSocket.on('data', function (data) {
    data.numbers = resolveNumber(data.numbers, users);
    console.info('[data]', JSON.stringify(data, null, 4));
    io.sockets.emit('data', data);
});

/*
hipathSocket.on('pickUp', function (data) {
    data.number = resolveNumber(data.number, users);
    console.info('[pickUp]', JSON.stringify(data, null, 4));
});

hipathSocket.on('hangUp', function (data) {
    data.number = resolveNumber(data.number, users);
    console.info('[hangUp]', JSON.stringify(data, null, 4));
});

hipathSocket.on('delivered', function (data) {
    data.number = resolveNumber(data.number, users);
    console.info('[delivered]', JSON.stringify(data, null, 4));
});
*/
