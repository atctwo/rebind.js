
rebind = new Rebind()

// bind an action (specified by a string) to different keys or gamepad buttons
// you can bind the same key to many actions
// the action will "occur" when any of the bound keys are pressed
rebind.bind("move-left", ["a", "ArrowLeft", "Left"])
rebind.bind("move-right", ["d", "ArrowRight", "Right"])

// a settings object can be passed which defines what modifier keys need to
// be pressed for the action to occur.  you can require ctrl, shift, or
// alt modifiers.  you can also set none to true, which requires that
// no modifier keys be pressed for the action to occur
rebind.bind(      "z", ["z"])
rebind.bind("ctrl-z", ["z"], {ctrl: true})
rebind.bind( "none-z", ["z"], {none: true})

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

// register a callback that is called when an action occurs (ie: when any key
// bound to that action is pressed)
// you can register several callbacks to one action
// (but you can't de-register callbacks yet)
rebind.on("move-left", (event_type, event) => {console.log("Move left", event_type)})
rebind.on("move-right", (event_type, event) => {console.log("Move right", event_type)})
rebind.on("thing", (event_type, event) => {if (event_type == "keydown") console.log("Thing Function 1")})
rebind.on("thing", (event_type, event) => {if (event_type == "keydown") console.log("Thing Function 2")})

rebind.on("z", (event_type, event) => {if (event_type == "keydown") console.log("Z pressed")})
rebind.on("ctrl-z", (event_type, event) => {if (event_type == "keydown") console.log("Ctrl+Z pressed")})
rebind.on("none-z", (event_type, event) => {if (event_type == "keydown") console.log("Just Z pressed")})

// remove any keybindings bound to an action
// rebind.clear("move-right")

// remove a specific keybind
// rebind.remove("move-left", ["a"])

rebind.bind("move-left", ["gp-b14"])
rebind.bind("move-right", ["gp-b15"])

function poll_gamepad()
{
    rebind.poll_gamepad()
    requestAnimationFrame(poll_gamepad)
}
requestAnimationFrame(poll_gamepad)

