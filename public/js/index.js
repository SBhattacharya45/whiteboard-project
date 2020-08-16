$(function(){
    const socket = io('/');
    var peer = new Peer(undefined, {
        host: '/',
        path: '/peerjs',
        port: PORT
    })

    var canvas = $('#board');
    var ctx = canvas[0].getContext('2d');
    var line_color = $('#line_color');
    var line_width = $('#line_width');
    var save_btn = $('#save_btn');
    var inc_btn = $('#increase');
    var scroll_options = $('#scroll_options');
    var draw_mode = $('#draw_mode')

	// Generate an unique ID
	var id = Math.round($.now()*Math.random());

    // the variables for the user
    var cColor = '#000'
    var cLineWidth = 1;
	var cDrawing = false;
    var cLastEmit = $.now();
    var scroll = 'draw';
    var mode = 'pen';

	var clients = {};
    var cursors = {};
    var touch_control;

    // fetch('/getHeight')
    // .then(res => res.json())
    // .then(json => {
    //     ctx.canvas.height = json.data;
    // })
    
    // fetch('/load')
    // .then(res => res.json())
    // .then(json => {
    //     image = new Image;
    //     image.src = json.data;
    //     image.onload = function(){
    //         ctx.drawImage(image, 0, 0)
    //     }
    // })

	// socket.on('moving', function (data) {
    //     // not current user and new? create a cursor
	// 	if(id !== data.id && !(data.id in clients)){
	// 		cursors[data.id] = jQuery('.cursor').appendTo('#cursors');

    //         // Move the mouse pointer
    //         cursors[data.id].css({
    //             'left' : data.x,
    //             'top' : data.y
    //         });
	// 	}

	// 	// Is the user drawing?
	// 	if(data.drawing && clients[data.id]){
    //         draw(clients[data.id], data, data.color, data.lineWidth);
	// 	}

	// 	// Save the last data state
    //     clients[data.id] = data;
    // });
    
    function onMoving(data) {
        if(id !== data.id && !(data.id in clients)){
			cursors[data.id] = jQuery('.cursor').appendTo('#cursors');

            // Move the mouse pointer
            cursors[data.id].css({
                'left' : data.x,
                'top' : data.y
            });
		}

		// Is the user drawing?
		if(data.drawing && clients[data.id]){
            draw(clients[data.id], data, data.color, data.lineWidth);
		}

		// Save the last data state
        clients[data.id] = data;
    }

    socket.on('left', function (id) {
        cursors[id].remove();
    });

    // set cDrawing to true
	canvas.on('mousedown',function(e){
		e.preventDefault();
        cDrawing = true;
    });
    
    canvas.on('touchstart',function(e){
        if(scroll === 'draw') {
            e.preventDefault();       
        }
        cDrawing = true;
        touch_control = 1;
	});

    // not drawing anymore
	canvas.on('mouseup mouseleave',function(){
        cDrawing = false;
    });
    
    canvas.on('touchend',function(){
        cDrawing = false;
	});


    // send the current state to the server if the time difference from last emit is big enough
	canvas.on('mousemove',function(e){
        var cPos = {x: e.pageX-286, y: e.pageY-51 + $('#canvas_container').scrollTop()};
		if($.now() - cLastEmit > 30){
            d = {
				'x': cPos.x,
				'y': cPos.y,
				'drawing': cDrawing,
				'id': id,
                'color': cColor,
                'lineWidth': cLineWidth
			}
            onMoving(d);
            socket.emit('drawing', d);
			cLastEmit = $.now();
		}
    });
    
    canvas.on('touchmove',function(e){
        if (touch_control === 1 || scroll === 'scroll'){
            cDrawing = false;
        } else {
            cDrawing = true;
        }

        touch = undefined;
        if (e.originalEvent.touches)
          touch = e.originalEvent.touches[0];

        var cPos = {x: touch.pageX-20, y: touch.pageY-70 + $('#canvas_container').scrollTop()};
		if($.now() - cLastEmit > 30){
            d = {
				'x': cPos.x,
				'y': cPos.y,
				'drawing': cDrawing,
				'id': id,
                'color': cColor,
                'lineWidth': cLineWidth
			}
            onMoving(d);
            socket.emit('drawing', d);
			cLastEmit = $.now();
        }
        touch_control += 1;
	});


	function draw(from, to, color, w){
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        if(mode === 'pen') {
            ctx.globalCompositeOperation='source-over';
            ctx.lineWidth = w;
        } else {
            ctx.globalCompositeOperation='destination-out';
            ctx.lineWidth = 40;
        }
        ctx.beginPath();
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.stroke();
        ctx.closePath();
    }
    
    //color
    line_color.on('input', function() {
        cColor = line_color.val();
    });

    //linewidth
    line_width.on('input', function() {
        cLineWidth = line_width.val();
    });

    draw_mode.on('input', function() {
        mode = draw_mode.val();
    });

    // //save
    // save_btn.on('click', function() {
    //     var saveData = canvas[0].toDataURL();

    //     fetch('/save', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //           },
    //         body: JSON.stringify({data: saveData})
    //     })
    //     .then(response => response.json())
    //     .then(data => console.log(data))
    //     alert('Saved successfully');
    // })

    inc_btn.on('click', function() {
        ctx.canvas.height += 1200;

        fetch('/saveHeight', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({data: ctx.canvas.height})
        })
        .then(response => response.json())
        .then(data => console.log(data))

        fetch('/load')
        .then(res => res.json())
        .then(json => {
            image = new Image;
            image.src = json.data;
            image.onload = function(){
                ctx.drawImage(image, 0, 0)
            }
        })
    });

    scroll_options.change(function() {
        scroll = $('input[name = scroll]:checked').val();
    })

    //Room Functions
    peer.on('open', id => {
        socket.emit('join-room', BOARD_ID, id);
    })

    socket.on('joined-room', (id) => {
        console.log('User ' + id + " has joined the room");
        var conn = peer.connect(id);
        conn.on('open', function(){
            conn.send(canvas[0].toDataURL());
        });
    })

    peer.on('connection', function(conn) {
        conn.on('data', function(data){
            var img = new Image;
            img.src = data;
            img.onload = function(){
                ctx.drawImage(img,0,0); 
            };
        });
    });

    socket.on('elseDrawing', (data) => {
        onMoving(data);
    })

});
