Ber = require('asn1').Ber
fs = require 'fs'

require('buffer').INSPECT_MAX_BYTES = Infinity

# command = []
# command.push parseInt hex, 16 for hex in process.argv[2].split ' '

unexpectedSequenceError = (sequence, tail, data) =>
    e = new Error
    e.sequence = sequence
    e.tail = tail
    e.data = data
    e

Parser_CSTA = (command) ->
    parser =
        # 0x3080a13080: (data, reader) ->
        0x6b: (data, reader) ->
            reader.readSequence seq
            reader.readSequence 0x30
            data.unknown.push reader.readString 0x80, true

            reader.readSequence 0xa1
            reader.readSequence 0x30
            data.unknown.push reader.readString 0x80

    data =
        invokeId: null
        operationValue: null
        unknown: []

    reader = new Ber.Reader command

    reader.readByte() # head 0x26
    reader.readByte() # type 0x80, 0x81 (long or short message)
    reader.readByte() # length ??

    switch seq = reader.readSequence()
        when 0x61
            reader.readSequence 0xa1
            data.unknown.push reader.readString 0x06, true
            data.unknown.push reader.readString 0xa2, true

            reader.readSequence 0xa3
            reader.readSequence 0xa1
            data.unknown.push reader.readInt()
            data.unknown.push reader.readString 0x88, true

            reader.readSequence 0xaa
            reader.readSequence 0xa2
            reader.readSequence 0xa0
            reader.readSequence 0xa1
            data.unknown.push reader.readString()
            data.unknown.push reader.readString()

            reader.readSequence 0xbe
            reader.readSequence 0x28
            reader.readSequence 0xa0
            reader.readSequence 0xa0
            data.unknown.push reader.readString 0x03, true

        when 0xa1
            data.invokeId       = reader.readInt()
            data.operationValue = reader.readInt()

            switch seq = reader.peek()
                when 0x30, 0xa0
                    reader.readSequence seq

                    switch seq = reader.peek()
                        when 0x55
                            data.unknown.push reader.readString seq, true

                    switch seq = reader.peek()
                        when 0x0a
                            data.unknown.push reader.readString seq, true

                        when 0xa0, 0xa4
                            reader.readSequence seq

                            switch seq = reader.peek()
                                when 0xa0, 0xa3, 0xa4, 0xa6, 0xa7, 0xa8, 0xa9, 0xab, 0xac, 0xad, 0xaf, 0xb0, 0xb1
                                    reader.readSequence seq

                                    kill = 0

                                    while reader.remain > 0
                                        if ++kill > 100
                                            throw new unexpectedSequenceError seq, reader.buffer, command

                                        seq = reader.peek()
                                        console.info '>>>>>', seq.toString(16)

                                        switch seq
                                            when 0x01, 0x0a, 0x4e, 0x64
                                                console.info 'asdf', seq.toString(16)
                                                data.unknown.push reader.readString seq, true

                                            when 0x30
                                                reader.readSequence seq
                                                data.unknown.push reader.readString 0x80

                                            when 0x61, 0x62, 0x63, 0x64, 0x65, 0x66
                                                reader.readSequence seq

                                                switch seq = reader.peek()
                                                    when 0x30
                                                        reader.readSequence seq
                                                        data.unknown.push reader.readString reader.peek() # bei 80 is tele

                                                    else
                                                        # data.unknown.push (reader.readByte() for i in [0..reader.length-1])
                                                        # data.unknown.push new Buffer(reader.readByte() for i in [0..reader.length-1])
                                                        data.unknown.push reader.readString seq, true

                                            when 0x6b
                                                parser[seq] data, reader

                                            when 0x7e
                                                reader.readSequence seq
                                                reader.readSequence 0xa0
                                                data.unknown.push reader.readString 0x18

                                            when 0xa0
                                                reader.readSequence seq

                                                switch seq = reader.peek()
                                                    when 0x30
                                                        reader.readSequence seq
                                                        data.unknown.push reader.readString 0x80, true

                                                        switch seq = reader.peek()
                                                            when 0xa1
                                                                reader.readSequence seq
                                                                reader.readSequence 0x30
                                                                data.unknown.push reader.readString 0x80, true

                                                    when 0x80
                                                        data.unknown.push reader.readString seq, true

                                                    else
                                                        # data.unknown.push new Buffer(reader.readByte() for i in [0..reader.length-1])
                                                        data.unknown.push reader.buffer

                                            when 0xa1
                                                readerInner = new Ber.Reader reader.buffer.slice(0, reader.length)
                                                x = reader.readSequence seq
                                                console.info 'xxx', x.toString(16)
                                                break;
                                                reader.readLength(reader.length)
                                                console.info('x3')
                                                while true
                                                    if readerInner.remain <= 0
                                                        break;
                                                    console.info 'o', readerInner.remain.toString(16)

                                                    switch seq = readerInner.peek()
                                                        when 0x30
                                                            console.info 'l', readerInner.buffer
                                                            readerInner.readSequence seq
                                                            run = true

                                                            while run
                                                                switch seq = readerInner.peek()
                                                                    when 0xa0, 0xa1, 0xa2, 0xa3
                                                                        console.info '3', seq.toString(16)
                                                                        readerInner.readSequence seq
                                                                        console.info 'x7'
                                                                        switch seq = readerInner.peek()
                                                                            when 0x30
                                                                                console.info 'x8'
                                                                                readerInner.readSequence seq
                                                                                data.unknown.push readerInner.readString 0x80

                                                                            when 0x6b
                                                                                parser[seq] data, readerInner

                                                                            else
                                                                                data.unknown.push new Buffer(readerInner.readByte() for i in [0..readerInner.length-1])

                                                                    when 0x80
                                                                        data.unknown.push readerInner.readString seq

                                                                    else
                                                                        console.info 'wrong'
                                                                        run = false

                                                        else
                                                            console.info('x1')
                                                            data.unknown.push readerInner.readString seq, true

                                                    console.info('x2')
                                                console.info('x4')

                                            when 0xa5, 0xa6, 0xa7
                                                reader.readSequence seq
                                                run = true

                                                while run
                                                    switch seq = reader.peek()
                                                        when 0x30
                                                            reader.readSequence seq

                                                        when 0x81
                                                            data.unknown.push reader.readString seq, true

                                                        else
                                                            run = false

                                                            # workaround, can be deleted, if everthing is alright
                                                            if (seq != 0x7e)
                                                                throw new unexpectedSequenceError seq, reader.buffer, command

                                            else
                                                throw new unexpectedSequenceError seq, reader.buffer, command

                                else
                                    throw new unexpectedSequenceError seq, reader.buffer, command

                        when 0xa3
                            reader.readSequence seq
                            reader.readSequence 0xa0

                            reader.readSequence 0x63
                            reader.readSequence 0x30
                            data.unknown.push reader.readString 0x80

                            data.unknown.push reader.readString 0x04, true

                            reader.readSequence 0x30
                            data.unknown.push reader.readString 0x80

                            reader.readSequence 0x7e

                            reader.readSequence 0xa0
                            data.unknown.push reader.readString 0x18

                            reader.readSequence 0xa1
                            reader.readSequence 0xe1

                            data.unknown.push reader.readString 0x06, true
                            data.unknown.push reader.readString 0x04, true

                        else
                            throw new unexpectedSequenceError seq, reader.buffer, command

                else
                    throw new unexpectedSequenceError seq, reader.buffer, command

        when 0xa2
            data.invokeId = reader.readInt()

            reader.readSequence 0x30
            data.unknown.push reader.readInt()

            reader.readSequence 0x30
            data.unknown.push reader.readString 0x55, true

            reader.readSequence 0xa0
            data.unknown.push reader.readString 0x86, true
            data.unknown.push reader.readString 0x88, true
            data.unknown.push reader.readString 0x83, true
            data.unknown.push reader.readString 0x85, true

        when 0xa3
            data.invokeId        = reader.readInt()
            data.operationValue  = reader.readInt()

            reader.readSequence 0xa0
            data.unknown.push reader.readString 0x0a, true

        else
            throw new unexpectedSequenceError seq, reader.buffer, command

    if reader.remain > 0
        return [ data ].push(Parser_CSTA reader.buffer)
        # throw new unexpectedSequenceError 0xff, reader.buffer, command

    return [ data ]


# command = new Buffer command
# console.info Parser_CSTA command


fs.readFile 'log_ordered.log', (err, data) =>
    throw err if err
    cnt = 0

    for command in data.toString().split '\n'
        hex = (parseInt hex, 16 for hex in command.split ' ')

        while true
            try
                console.info '=============================================================', ++cnt

                if hex.length > 1
                    hex = new Buffer hex
                    console.info hex.length, hex
                    console.info Parser_CSTA hex

                break
            catch error
                console.info error.tail
                if error.sequence == 0x26
                    hex = error.tail
                else
                    if error.sequence
                        console.error 'sequence',   error.sequence.toString 16
                        console.error 'tail',       error.tail
                        console.error 'data',       error.data

                    throw error

