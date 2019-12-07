/*
 * Harmon Stove Controller script for EPS8266 on NodeMCU
 * Updated: 12/9/18
 *
 * Start sending raw fan and temp control values to MCU, no math here
 * Import schedule sttings
 *
 * Commands
 * /get (returns mode:tmp:fan:room:timing)
 * /set (mode:tmp:fan:timing)
	x	Mode: Local or Remote, 1:0
	x	Temperature: 55 - 90
	x	Fan: 0 - 100 (step 5)
	n	Room Temperature (F): 000
	n   Timing: Static or Timed, 1:0
    -	Status:
 */

var // Constants
	__timeOut = 30,
    __updateString = "Update",
    __tstUrl = "http://192.168.155.222",

    // Working variables
	_mode = true,       // Shared with mcu
	_timing = true,     // Shared with mcu
	_update = false,    // Page only
	_fan = 0,           // Shared with mcu
	_tmp = 0,           // Shared with mcu
	_room = 0,          // Received from mcu
    _timeCount = 0,     // Page only

    _heap = 0,          // Testing; show heap memory on page
    _upTime = "",

    _timeStart = 0,     //dateStart.getTime();
    _timeStop = 0,      //dateStop.getTime();

    // Flags
	_extChange = false, // Stop or let the change of controls from triggering events
	_working = false,   //
	_autoUpdate = false; //

$(document).bind("mobileinit", function(){
	$( "input:range" ).slider({ disabled: false });
});

// Update the control sliders to a defined value
function SetSlider()
{
	$("#tmp-slider").val( _tmp );
	$("#fan-slider").val( _fan );
	$('input[name*="slider"]').slider("refresh");
}

// Update the label showing the room temperature
function UpdateTempNow() {
    //$("#tmp-now").html("Room Temp Now: " + parseFloat(_room).toFixed(1) + "&deg;F");
    $("#tmp-now").html("Room Temp Now: " + _room + "&deg;F");
}

function ProcessData( data ) {
    // Look for acknowledge
    if (data === "ack" ) {
        // Change some control color back to normal

    } else {
        _extChange = true;  // Stop the change of controls from triggering events

        var dataSets = data.split("!");
        _mode = Number(dataSets[0]);
        _tmp = Number(dataSets[1]);
        _fan = Number(dataSets[2]);
        _timing = Number(dataSets[3]);
        _room = Number(dataSets[4]);
        _heap = Number(dataSets[5]);
        _upTime = dataSets[6];

         // Set the values of the sliders
        ControlsState( _mode );
        SetManual( _mode );
        SetSlider();
        UpdateTempNow();

        $("#info").html( "Up: " + _upTime + ", H: " + _heap );

        _extChange = false; // Let the change of controls from triggering events
    }
}

function ControlsState( mode ) {
	if ( mode === 1 )
	{
		$('input[name*="slider"]').slider("disable");
        $('button[id^="tmp"]').button("disable");
        $('button[id^="fan"]').button("disable");
        $('#flip-timing').slider("disable");
	}
	else
	{
		$('input[name*="slider"]').slider("enable");
        $('button[id^="tmp"]').button("enable");
        $('button[id^="fan"]').button("enable");
        $('#flip-timing').slider("enable");
	}
	$('input[name*="slider"]').slider("refresh");
    $('button[id^="tmp"]').button("refresh");
    $('button[id^="fan"]').button("refresh");
    $('#flip-timing').slider("refresh");
}

function SetManual( mode ) {
	// Check to see if the mode flip switch matches

	if ( mode === 1 ) {
		$('#flip-mode').val("manual");
	}
	else
	{
		$('#flip-mode').val("remote");
	}
	$('#flip-mode').slider("refresh");
}

function GetUpdate() {
	_working = true;

	_timeCount = __timeOut;

    var dateStart = new Date();
    _timeStart = dateStart.getTime();

	// AJAX here
	var request = $.ajax({
		url: __tstUrl + "/get",
        method: "POST"
	});

    var dateStart = new Date();
    _timeStop = dateStart.getTime();

    request.success(function( data ) {
		$("#footer").html( Number( _timeStop -_timeStart ) + "ms" );
        ProcessData( data );
	});

    request.done(function( msg ) {
//      $( "#log" ).html( msg );
    });

	request.complete(function() {
//		$("#footer").html( "" );
	});

    request.fail(function(jqXHR, textStatus) {
		$("#footer").html( "Update request failed: " + textStatus );
	});

	_working = false;
}

function Update() {
	if ( _autoUpdate )
	{
		setTimeout(function () {
			if ( _timeCount===0 ) {
				if ( !_working ) {
					GetUpdate();
				}
                $('#footer').text(__updateString + " (now)");
				_timeCount = __timeOut;
			}
			else
			{
    			$('#footer').text(__updateString + " (in:" + _timeCount + ")");
				_timeCount--;
			}

			Update();
		}, 1000);
	}
	else
	{
		$("#footer").html("");
        _timeCount = __timeOut;
    }
}

function SendSettings(mode, tmp, fan, timing) {
    var dateStart = new Date();
    _timeStart = dateStart.getTime();

	// AJAX the settings to the MCU in three parameters
	var request = $.ajax({
		url: __tstUrl + "/set",
        method: "POST",
		data: { mode: Number(mode), tmp: Number(tmp), fan: Number(fan), timing: Number(timing) }
	});

     var dateStart = new Date();
    _timeStop = dateStart.getTime();

   // Handle the response from the MCU
	request.success(function( data ) {
		$("#footer").html( Number( _timeStop -_timeStart ) + "ms" );
		ProcessData( data );
	});

    request.done(function( msg ) {
//      $( "#log" ).html( msg );
    });

	request.complete(function() {
//		$("#footer").html( "" );
	});

    request.fail(function(jqXHR, textStatus) {
		$("#footer").html( "sendUpdate() Request failed: " + textStatus );
	});
}

$(document).bind("mobileinit", function() {
	$.mobile.ajaxLinksEnabled = false;
});

////////////////////////////////////////////////////////////////////
// DOM Ready
$(document).ready(function () {

	// Mode switch
	$('#flip-mode').slider({
        stop: function( event, ui ){
            if ( !_extChange )
            {
                if ( $('#flip-mode').val()==="remote") {
                    _mode = 0;
                }
                else
                {
                    _mode = 1;
                }

                SendSettings(_mode, _tmp, _fan, _timing);
            }
        }
	});

	// Timing switch
	$('#flip-timing').slider({
        stop: function( event, ui ){
            if ( !_extChange )
            {
                if ( $('#flip-timing').val()==="timed") {
                    _timing = 0;
                }
                else
                {
                    _timing = 1;
                }

                SendSettings(0, _tmp, _fan, _timing);
            }
        }
	});

	// Update switch
	$('#flip-update').slider({
        stop: function( event, ui ){
            if ( $('#flip-update').val()==="auto")
            {
                _autoUpdate = 0;
                Update();
            }
            else
            {
                _autoUpdate = 1;
            }
        }
	});

    // Slider mouseup
	$('input[name*="slider"]').slider({
        stop: function( event, ui ){
            if ( !_extChange ) {
                _tmp = Number($("#tmp-slider").val()),
                _fan = Number($("#fan-slider").val());

                SendSettings(_mode, _tmp, _fan, _timing);
            }
        }
    });

	// Popup buttons
	$('button[name*="ps"]').click(function(){
		$("#popupPanel").popup( "close" );
		var data = $(this).val(),
			dataSet = data.split(":");

        var request = $.ajax({
            url: __tstUrl + "/set",
            method: "POST",
            data: { m: 0, t: dataSet[0], f: dataSet[1] }
        });

        request.success(function( data ) {
            ProcessData( data );
        });

        request.done(function( msg ) {
    //      $( "#log" ).html( msg );
        });

        request.complete(function() {
    //		$("#footer").html( "" );
        });

        request.fail(function(jqXHR, textStatus) {
            $("#footer").html( "sendUpdate() Request failed: " + textStatus );
        });
		// Set the values of the sliders
		//SetSlider(  dataSet[0], dataSet[1] );
	});

	// Status button
	$('a[href="#status"]').click(function(){
		GetUpdate();
	});

	// Preset button
	$('a[href="#popupPanel"]').click(function(){
		$( "#myPopupDiv" ).popup( "open" );
	});

	// Temp Up/Down Buttons
	$('button[id^="tmp"]').click(function(){
        _extChange = true;
		var tmp = $("#tmp-slider").val();
        var id = $(this).attr('id');

        if ( id === "tmp-up") {
            _tmp = Number(tmp) + Number(1);
        }
        else
        {
            _tmp = Number(tmp) - Number(1);
        }

        $("#tmp-slider").val( _tmp );
        $("#tmp-slider").slider("refresh");
        SendSettings(_mode, _tmp, _fan, _timing);
        _extChange = false;
    });

	// Fan Up/Down Buttons
	$('button[id^="fan"]').click(function(){
        _extChange = true;
		var	fan = $("#fan-slider").val();
        var id = $(this).attr('id');

        if ( id === "fan-up") {
            _fan = Number(fan) + Number(5);
        }
        else
        {
            _fan = Number(fan) - Number(5);
        }

        $("#fan-slider").val( _fan );
        $("#fan-slider").slider("refresh");
        SendSettings(_mode, _tmp, _fan, _timing);
        _extChange = false;
	});

   	// Run when DOM ready
	GetUpdate();
	SetManual(_mode);
	ControlsState(_mode);

	if ( _autoUpdate ) {
		$('#flip-update').val("auto");
		Update();
	}
	else
	{
		$('#flip-update').val("manual");
	}
	$('#flip-update').slider("refresh");

// New code for WeSOcket testing 12/7/19
    window.onload = function() {

        // Get references to elements on the page.
        var form = document.getElementById('message-form');
        var messageField = document.getElementById('message');
        var messagesList = document.getElementById('messages');
        var socketStatus = document.getElementById('status');
        var closeBtn = document.getElementById('close');

        // Create a new WebSocket.
        var socket = new WebSocket('wss://echo.websocket.org');

        // Handle any errors that occur.
        socket.onerror = function(error) {
          console.log('WebSocket Error: ' + error);
        };

        // Show a connected message when the WebSocket is opened.
        socket.onopen = function(event) {
          socketStatus.innerHTML = 'Connected to: ' + event.currentTarget.url;
          socketStatus.className = 'open';
        };

        // Handle messages sent by the server.
        socket.onmessage = function(event) {
          var message = event.data;
          messagesList.innerHTML += '<li class="received"><span>Received:</span>' + message + '</li>';
        };

        // Show a disconnected message when the WebSocket is closed.
        socket.onclose = function(event) {
          socketStatus.innerHTML = 'Disconnected from WebSocket.';
          socketStatus.className = 'closed';
        };

        // Send a message when the form is submitted.
        form.onsubmit = function(e) {
          e.preventDefault();

          // Retrieve the message from the textarea.
          var message = messageField.value;

          // Send the message through the WebSocket.
          socket.send(message);

          // Add the message to the messages list.
          messagesList.innerHTML += '<li class="sent"><span>Sent:</span>' + message + '</li>';

          // Clear out the message field.
          messageField.value = '';

          return false;
        };

        // Close the WebSocket connection when the close button is clicked.
        closeBtn.onclick = function(e) {
          e.preventDefault();

          // Close the WebSocket.
          socket.close();

          return false;
        };
    };

});

