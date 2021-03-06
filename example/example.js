
rebind = new Rebind()

// bind an action (specified by a string) to different keys or gamepad buttons
// you can bind the same key to many actions
// the action will "occur" when any of the bound keys are pressed
rebind.bind("move-left", ["a", "ArrowLeft", "Left"])
rebind.bind("move-right", ["d", "ArrowRight", "Right"])
rebind.bind("print-params", ["p", "gp-b3"])
rebind.bind("frequency-test", ["o", "gp-b0"])

// a settings object can be passed which defines what modifier keys need to
// be pressed for the action to occur.  you can require ctrl, shift, or
// alt modifiers.  you can also set none to true, which requires that
// no modifier keys be pressed for the action to occur
rebind.bind(      "z", ["z"])
rebind.bind("ctrl-z", ["z"], {ctrl: true})
rebind.bind( "none-z", ["z"], {none: true})

// to bind a gamepad button to an action, use the input string "gp-b<n>", where "<n>" is the id of the button you want to do the thing.
// button ids are described at https://www.w3.org/TR/gamepad/#dfn-standard-gamepad
rebind.bind("move-left", ["gp-b14"])
rebind.bind("move-right", ["gp-b15"])

// for gamepad input and continuous keyboard input to work, you need to call rebind.update() every frame
function update()
{
    rebind.update()
    requestAnimationFrame(update)
}
requestAnimationFrame(update)

// these are examples that are called by the buttons on example.html
// they are supposed to show dynamic rebinding
function bind_to_thing(char)
{
    console.log(`bound ${char} to action "thing"`)
    rebind.bind("thing", [char])
}
function remove_from_thing(char)
{
    console.log(`removed ${char} from action "thing"`)
    rebind.remove("thing", [char])
}
function clear_thing()
{
    console.log("cleared all bindings from action \"thing\"")
    rebind.clear("thing")
}

// you can also use a special key name called "any", which will be called whenever
// any key is pressed or when any gamepad button is pressed

function enable_any()
{
    rebind.bind("any-button", ["any"])
    rebind.bind("any-ctrl", ["any"], {ctrl: true})
}
function disable_any()
{
    rebind.clear("any-button")
    rebind.clear("any-ctrl")
}

// register a callback that is called when an action occurs (ie: when any key
// bound to that action is pressed)
// you can register several callbacks to one action
// (but you can't de-register callbacks yet)

rebind.on("move-left", (params) => {console.log("Move left", params.key_action)})
rebind.on("move-right", (params) => {console.log("Move right", params.key_action)})
rebind.on("thing", (params) => {if (params.key_action == "pressed") console.log("Thing Function 1")})
rebind.on("thing", (params) => {if (params.key_action == "pressed") console.log("Thing Function 2")})

rebind.on("frequency-test", (params) => {
    console.log(`frequency test - ${params.input_type} -  ${params.key_action} - ${params.frequency}`)
}, {
    frequency: "change"
})

rebind.on("print-params", (params) => {
    console.log(params)
})

rebind.on("z", (params) => {if (params.key_action == "pressed") console.log("Z pressed")})
rebind.on("ctrl-z", (params) => {if (params.key_action == "pressed") console.log("Ctrl+Z pressed")})
rebind.on("none-z", (params) => {if (params.key_action == "pressed") console.log("Just Z pressed")})

rebind.on("any-button", (params) => {console.log("Any button", params.key_action)})
rebind.on("any-ctrl", (params) => {console.log("Any button + ctrl", params.key_action)})

// remove any keybindings bound to an action
// rebind.clear("move-right")

// remove a specific keybind
// rebind.remove("move-left", ["a"])

// you can set callback registrations to "expire", so they will only work a set number of times.  to do this,
// you can pass a settings object to rebind.on(), with an expiry key.  if expiry = 5, the callback will only
// be called 5 times before it is deregistered.
// keep in mind that the expiry counter will go down on both press and release callbacks!

rebind.bind("expiry", ["e"])

function register_expiry()
{
    console.log("registered expiry callback with a lifetime of 5 calls")
    rebind.on("expiry", (params) => {

        // the number of calls left is passed as the expiry attribute of params
        console.log(`expiry callback, ${params.expiry} calls left`)

    }, {
        expiry: 5
    })
}

// bind axes
rebind.bind("axes-test", ["gp-a-right"]);
rebind.bind("move-left", ["gp-a-left"], {
    condition_x: "neg",
    condition_y: "none"
})
rebind.bind("move-right", ["gp-a-left"], {
    condition_x: "pos",
    condition_y: "none"
})

rebind.on("axes-test", (params) => {
    console.log(`right stick, x: ${params.axes[0]}, y: ${params.axes[1]}`)
}, {
    frequency: "change"
});

// virtual gamepads, using https://github.com/alvaromontoro/gamepad-simulator

function new_gamepad()
{
    var gamepad = gamepadSimulator.create()
    gamepadSimulator.connect()
    console.log(gamepad)
}

function destroy_gamepad()
{
    gamepadSimulator.disconnect()
    gamepadSimulator.destroy()
}

// way to get what key or button a user pressed, using a one-off callback
rebind.bind("get-key", ["any"])
function get_pressed_key()
{
    rebind.on("get-key", function(params) {
        if (params.key_action == "pressed") alert(`${params.input_name} was pressed!`)
    }, {
        expiry: 1
    });
}