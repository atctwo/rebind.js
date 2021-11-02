
/**
 * @callback action_occurrance
 * This describes the parameters of callbacks registered using rebind.on(), called when an action occurs.
 * @param {Object} param an object of parameters.  see readme.md for a description of each parameter
 */


/**
 * @class
 * @classdec A class for dynamically mapping input events to callbacks, via a set of "actions"
 */
class Rebind
{
    /**
     * Constructor for Rebind objects
     */
    constructor()
    {
        // object for storing bound inputs and callbacks

        // an object where each key represents an input, and each value is an array of actions bound to it
        this.keydown_actions = {}
        
        // an object where each key represents an action, and each value is an array of callback object to be called when the action occurs
        this.action_functions = {}

        // an object that stores each connected gamepad
        this.connected_gamepads = {}

        // an object that stores the key state of each key (keys only exist in this object if they were pressed or released at some point)
        this.key_states = {}

        // an object of objects that store the state of each button on each connected gamepad
        this.gamepad_button_states = {}

        // same as gamepad_button_states, but used for detecting changes - pls use gamepad_button_states if you want to read them
        this.last_gamepad_button_states = {}

        // an object of arrays of values that store the most recent value for each gamepad axes
        this.last_gamepad_axes = {};

        // deadzone for gamepad axes released detection
        this.release_deadzone = 0.1;

        // keyevent and gamepad event listeners

        document.addEventListener("keydown", ((event) => {
            //event.preventDefault()
            this.#handle_keydown(event, "pressed")
        }).bind(this))

        document.addEventListener("keyup", ((event) => {
            //event.preventDefault()
            this.#handle_keydown(event, "released")
        }).bind(this))

        window.addEventListener("gamepadconnected", (function(e) { this.#gamepadHandler(e, true); }).bind(this), false);
        window.addEventListener("gamepaddisconnected", (function(e) { this.#gamepadHandler(e, false); }).bind(this), false);
    }

    /**
     * @summary Bind inputs to an action.
     * 
     * The action's callback won't actually be executed by this method.  This just tells rebind.js
     * to map one or more inputs to an action, whose callback will later be executed when those inputs
     * happen.
     * @param {string} action 
     * @param {string[]} inputs 
     */
    bind(action, inputs, settings={})
    {
        inputs.forEach((input => {
            
            // if the keydown action has no action array
            if (!(input in this.keydown_actions)) this.keydown_actions[input] = []

            // if the action isn't already in the actions array
            if (!this.keydown_actions[input].some(e => e.action === action))
            {

                // determine input type
                var input_type = "key";
                if (input === "any") input_type = "any";
                else if (input.startsWith("gp-b")) input_type = "gamepad_button";
                else if (input.startsWith("gp-a")) input_type = "gamepad_axes";
                
                // add the action to the keydown thing
                var bind_settings = {
                    action: action,
                    ctrl: !!settings.ctrl,
                    shift: !!settings.shift,
                    alt: !!settings.alt,
                    none: !!settings.none,
                    input_type: input_type
                }

                // add axes settings
                if (input_type == "gamepad_axes")
                {
                    if ("func" in settings) bind_settings.axes_function = settings.func
                    else {
                        bind_settings.deadzone = settings.deadzone || 0.1
                        bind_settings.condition_x = settings.condition_x || "any"
                        bind_settings.condition_y = settings.condition_y || "any"
                    }

                    if (input == "gp-a-right") bind_settings.axes = [2, 3]
                    else this.bind.axes = [0, 1]
                }

                this.keydown_actions[input].push(bind_settings);

            }

        }).bind(this));
    }

    /**
     * Remove bindings for every input bound to an action
     * @param {string} action 
     */
    clear(action)
    {
        // clear each keybind for an action
        if (action in this.keydown_actions) this.keydown_actions[action].length = 0

        for (const [input, actions] of Object.entries(this.keydown_actions))
        {
            if (this.keydown_actions[input].some(e => e.action === action)) // if the key is bound to the action
            {
                // remove the binding to the action
                var index = this.keydown_actions[input].indexOf(this.keydown_actions[input].find(e => e.action === action))
                if (index > -1) this.keydown_actions[input].splice(index, 1)
            }

        }
    }

    /**
     * Remove bindings for one or more input bound to an action
     * @param {string} action 
     * @param {string[]} inputs 
     */
    remove(action, inputs)
    {
        inputs.forEach((passed_input => {
            
            for (const [input, actions] of Object.entries(this.keydown_actions))
            {
                if (input == passed_input)
                {
                    if (this.keydown_actions[input].some(e => e.action === action)) // if the key is bound to the action
                    {
                        // remove the binding to the action
                        var index = this.keydown_actions[input].indexOf(this.keydown_actions[input].find(e => e.action === action))
                        if (index > -1) this.keydown_actions[input].splice(index, 1)
                    }
                }

            }

        }).bind(this));
    }

    /**
     * @summary Register a callback to be executed when an action occurs.
     * 
     * Use this method to register a function to an action, to be called when an input
     * bound to that action happens.  This method can be called several times for one
     * action, so that an action occuring may cause the execution of many callbacks.
     * 
     * @param {string} action the action name
     * @param {action_occurrance} func a callback to call whenever the action occurs
     */
    on(action, func, settings={})
    {
        // if the action function object has no array for an action, create one
        if (!(action in this.action_functions)) this.action_functions[action] = []

        // add the function to the action function array
        this.action_functions[action].push({
            func: func,
            expiry: settings.expiry || 0,
            frequency: settings.frequency || "default"
        })
    }

    /**
     * @summary Polls the gamepad and handles any "continuous" or "change" keyboard events
     */
    update()
    {
        // poll gamepad

        var gamepads = navigator.getGamepads();
        const num_gamepads = Object.keys(gamepads).length

        for (var g = 0; g < num_gamepads; g++) // for each connected gamepad
        {
            const gamepad = gamepads[g];

            // the list returned by navigator.getGamepads() can contain null values.
            // this checks if the list element is null, or if it's an actual gamepad
            if (gamepad)
            {
                // iterate over each gamepad button
                var any_pressed = false;
                for (var i = 0; i < gamepad.buttons.length; i++)
                {
                    // determine the input name based on the button id
                    var btn = gamepad.buttons[i];
                    var input = "gp-b" + i.toString();

                    // save gamepad button state
                    if (!(gamepad.index in this.gamepad_button_states)) this.gamepad_button_states[gamepad.index] = {}
                    this.gamepad_button_states[gamepad.index][i] = btn.pressed
                    
                    // if the button is pressed, and there is at least one action bound to the input
                    if (btn.pressed && (input in this.keydown_actions))
                    {
                        this.#process_actions(input, "pressed", gamepad, "continuous")
                    }

                    // handle "any" action
                    if (btn.pressed)
                    {
                        if ("any" in this.keydown_actions) this.#process_actions(input, "pressed", gamepad, "continuous", [], true)
                    }

                }

                // process gamepad axes
                this.#process_actions("gp-a-left",  "pressed", gamepad, "continuous", [gamepad.axes[0], gamepad.axes[1]])
                this.#process_actions("gp-a-right", "pressed", gamepad, "continuous", [gamepad.axes[2], gamepad.axes[3]])

                if (!(gamepad.index in this.last_gamepad_axes)) this.last_gamepad_axes[gamepad.index] = []
                if (gamepad.axes[0] != this.last_gamepad_axes[gamepad.index][0] || gamepad.axes[1] != this.last_gamepad_axes[gamepad.index][1]) 
                {
                    this.#process_actions("gp-a-left",  "pressed", gamepad, "change", [gamepad.axes[0], gamepad.axes[1]])
                    this.#process_actions("gp-a-left",  "pressed", gamepad, "change", [gamepad.axes[0], gamepad.axes[1]], true)
                    this.last_gamepad_axes[gamepad.index][0] = gamepad.axes[0];
                    this.last_gamepad_axes[gamepad.index][1] = gamepad.axes[1];

                    if ( (gamepad.axes[0] < this.release_deadzone && gamepad.axes[0] > -this.release_deadzone) &&
                         (gamepad.axes[1] < this.release_deadzone && gamepad.axes[1] > -this.release_deadzone) ) 
                    {
                        this.#process_actions("gp-a-left",  "released", gamepad, "change", [gamepad.axes[0], gamepad.axes[1]])
                        this.#process_actions("gp-a-left",  "released", gamepad, "continuous", [gamepad.axes[0], gamepad.axes[1]])
                        this.#process_actions("gp-a-left",  "released", gamepad, "change", [gamepad.axes[0], gamepad.axes[1]], true)
                        this.#process_actions("gp-a-left",  "released", gamepad, "continuous", [gamepad.axes[0], gamepad.axes[1]], true)
                    }
                }

                if (gamepad.axes[2] != this.last_gamepad_axes[gamepad.index][2] || gamepad.axes[3] != this.last_gamepad_axes[gamepad.index][3]) 
                {
                    this.#process_actions("gp-a-right", "pressed", gamepad, "change", [gamepad.axes[2], gamepad.axes[3]])
                    this.#process_actions("gp-a-right", "pressed", gamepad, "change", [gamepad.axes[2], gamepad.axes[3]], true)
                    this.last_gamepad_axes[gamepad.index][2] = gamepad.axes[2];
                    this.last_gamepad_axes[gamepad.index][3] = gamepad.axes[3];

                    if ( (gamepad.axes[2] < this.release_deadzone && gamepad.axes[2] > -this.release_deadzone) &&
                         (gamepad.axes[3] < this.release_deadzone && gamepad.axes[3] > -this.release_deadzone) ) 
                    {
                        this.#process_actions("gp-a-right",  "released", gamepad, "change", [gamepad.axes[2], gamepad.axes[3]])
                        this.#process_actions("gp-a-right",  "released", gamepad, "continuous", [gamepad.axes[2], gamepad.axes[3]])
                        this.#process_actions("gp-a-right",  "released", gamepad, "change", [gamepad.axes[2], gamepad.axes[3]], true)
                        this.#process_actions("gp-a-right",  "released", gamepad, "continuous", [gamepad.axes[2], gamepad.axes[3]], true)
                    }
                }
            }
        }

        // detect gamepad button changes
        for (const [index, gp] of Object.entries(this.gamepad_button_states))
        {
            for (const [btn, pressed] of Object.entries(gp))
            {
                if (!(index in this.last_gamepad_button_states))
                {
                    this.last_gamepad_button_states[index] = {}
                    this.last_gamepad_button_states[index][btn] = "none"
                }

                // if the button state has changed since last time update() was run
                if (this.last_gamepad_button_states[index][btn] != pressed)
                {
                    // process the action
                    var input = "gp-b" + btn.toString();
                    this.#process_actions(input, pressed ? "pressed" : "released", gamepads[index], "change")
                    this.#process_actions(input, pressed ? "pressed" : "released", gamepads[index], "change", [], true)

                    // if the button is released, process an action as if it were a continuous one
                    // (because the continuous button code doesn't detect button releases)
                    if (!pressed) this.#process_actions(input, "released", gamepads[index], "continuous")

                    if (!(index in this.last_gamepad_button_states)) this.last_gamepad_button_states[index] = {}
                    this.last_gamepad_button_states[index][btn] = pressed
                }
            }
        }

        // handle continuous key events
        for (const [key, state] of Object.entries(this.key_states))
        {
            if (state.state == "pressed") this.#process_actions(key, "pressed", state.event, "continuous")
            if (state.state == "pressed") this.#process_actions(input, "pressed", state.event, "continuous", [], true)
        }
    }

    /**
     * @summary Calls each callback registered for a given input
     * 
     * This method will check to see if there are any callbacks registered for a given input.  If there is, it will call
     * them.  When they are called, this method will check that the conditions for the callback to be called are right
     * (eg: that the control key is pressed for an action the requires it to be pressed).  It also handles callback 
     * expiry.
     * 
     * The context parameter should contain a string that describes how often this method is called from where it is called.
     * It should be one of:
     *  - "continuous": called every frame (for example, in the update() method)
     *  - "change": called when a key or button state changes from pressed to released
     *  - "repeat": called by a keyboard event listener (hence will be called every key repeat)
     * 
     * @param {string} input the name of the input (like "a" or "gp-b4")
     * @param {string} key_action whether the key / button was "pressed" or "released"
     * @param {KeyboardEvent|Gamepad} event if the action was caused by a key, this should be the KeyboardEvent that caused it.  if the action was caused by a gamepad, this should be the Gamepad object for the gamepad that caused it
     * @param {string} context where the method was called from (specifically how often this method is called from the place)
     * @param {boolean} any whether the call to this method was caused by any key
     */
    #process_actions(input, key_action, event, context, axes=[], any=false)
    {
        var actions = this.keydown_actions[any ? "any" : input];
        if (actions)
        {
            actions.forEach((action => {
                
                // check the action conditions
                if (action.input_type === "key" || action.input_type == "any")
                {
                    if (action.ctrl && !event.ctrlKey) return;
                    if (action.alt && !event.altKey) return;
                    if (action.shift && !event.shiftKey) return;
                    if (action.none && (event.ctrlKey || event.altKey || event.shiftKey)) return;
                }

                // if there is a function registered for this action, call it
                if (action.action in this.action_functions) this.action_functions[action.action].forEach(((func, i, arr) => {

                    // check the action frequency
                    // console.log(action.input_type, func.frequency, context)

                    // if the callback context isn't defnied (like "default" or "blah")
                    if (func.frequency != "continuous" && func.frequency != "change" && func.frequency != "repeat")
                    {
                        if (action.input_type == "gamepad_axes" && context != "continuous") return;
                        if (action.input_type == "gamepad_button" && context != "change") return;
                        if (action.input_type == "any" && context != "change") return;
                        if (action.input_type == "key" && context != "repeat") return; 
                    }
                    else
                    {
                        // if the context is a defined one and it is repeat
                        if (func.frequency == "repeat")
                        {
                            
                            // if the action is caused by a gamepad input, and the context isn't a button state change
                            if (action.input_type == "gamepad_button" || action.input_type == "any") 
                            {
                                if (context != "change") return;
                            }

                            // if the action is caused by a gamepad input, and the context isn't continuous
                            if (action.input_type == "gamepad_axes") 
                            {
                                if (context != "continuous") return;
                            }

                            // return if the context isn't the same as the callbacks
                            else if (func.frequency != context) return;

                        }

                        // return if the context isn't the same as the callbacks
                        else if (func.frequency != context) return;
                    }

                    // handle axes conditions
                    if (action.input_type == "gamepad_axes" && key_action != "released")
                    {
                        var conditions = [action.condition_x, action.condition_y]
                        var either_failed = 0;
                        for (var i = 0; i < 2; i++)
                        {
                            switch(conditions[i])
                            {
                                case "pos":
                                    if (axes[i] < action.deadzone) return;
                                    break;

                                case "neg":
                                    if (axes[i] > -action.deadzone) return;
                                    break;

                                case "any":
                                    if ( (axes[i] > -action.deadzone) && (axes[i] < action.deadzone) ) either_failed++;
                                    break;

                                case "either":
                                    if ( (axes[i] > -action.deadzone) && (axes[i] < action.deadzone) ) return;
                                    break;

                                case "deadzone":
                                    if (!( (axes[i] > -action.deadzone) && (axes[i] < action.deadzone) )) return;
                                    break;

                                case "none":
                                    // don't care
                                    break;
                            }
                        }
                        if (either_failed == 2) return;
                    }

                    // call the callback
                    var params = {
                        input_name: input,
                        input_type: action.input_type, 
                        key_action: key_action, 
                        event: (action.input_type == "key") ?  event : null, 
                        gamepad: (action.input_type != "key") ? event : null,
                        expiry: func.expiry,
                        frequency: func.frequency
                    }

                    if (action.input_type == "gamepad_axes")
                    {
                        params.axes = axes;
                    }

                    func.func(params)

                    // handle callback expiry
                    if (func.expiry > 0)
                    {
                        var expiry = func.expiry -= 1;
                        if (expiry == 0) 
                        {
                            console.log(`${action.action} callback ${i} expired`)
                            arr.splice(i, 1)
                        }
                    }

                }).bind(this));

            }).bind(this))
        }
    }

    /**
     * @summary an internal function used to process keyevents
     * @param {KeyboardEvent} event the event passed to the keydown / keyup callback
     * @param {string} key_action the name of the event (ie: "keydown" or "keyup")
     * @private
     */
    #handle_keydown(event, key_action)
    {
        // handle key state change
        if (!(event.key in this.key_states)) this.key_states[event.key] = {
            state: "none",
            event: event
        }

        if (this.key_states[event.key].state != key_action)
        {
            // process change callbacks
            this.#process_actions(event.key, key_action, event, "change")
            this.#process_actions(event.key, key_action, event, "change", [], true)

            // if the key was released, process continuous callbacks
            // (the code for polling key states for continuous callbacks can't see key releases)
            if (key_action == "released")
            {
                this.#process_actions(event.key, key_action, event, "continuous")
                this.#process_actions(event.key, key_action, event, "continuous", [], true)
            }
        }

        // store the key state
        this.key_states[event.key] = {
            state: key_action,
            event: event
        }

        // if the key name (input) has an action bound to it
        if (event.key in this.keydown_actions) this.#process_actions(event.key, key_action, event, "repeat")

        // handle 'any' key
        if ("any" in this.keydown_actions) this.#process_actions(event.key, key_action, event, "repeat", [], true)
    }

    /**
     * @summary Handler for when gamepads are connected or disconnected
     * https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
     * @param {*} event 
     * @param {*} connecting 
     */
    #gamepadHandler(event, connecting) {
        var gamepad = event.gamepad;
        // Note:
        // gamepad === navigator.getGamepads()[gamepad.index]
      
        if (connecting) {

            // save the gamepad
            this.connected_gamepads[gamepad.index] = gamepad;
            if (!(gamepad.index in this.gamepad_button_states)) this.gamepad_button_states[gamepad.index] = {}
            if (!(gamepad.index in this.last_gamepad_button_states)) this.last_gamepad_button_states[gamepad.index] = {}
            if (!(gamepad.index in this.last_gamepad_axes)) this.last_gamepad_axes[gamepad.index] = [gamepad.axes[0], gamepad.axes[1], gamepad.axes[2], gamepad.axes[3]]

            console.log(this.last_gamepad_axes)

            // iterate over each gamepad button
            for (var i = 0; i < gamepad.buttons.length; i++)
            {
                // determine the input name based on the button id
                var btn = gamepad.buttons[i];
                var input = "gp-b" + i.toString();

                // save gamepad button state
                this.gamepad_button_states[gamepad.index][i] = btn.pressed

                // save gamepad button state
                this.last_gamepad_button_states[gamepad.index][i] = btn.pressed? "none" : false

            }
            

        } else {
            delete this.connected_gamepads[gamepad.index];
        }
      }
}