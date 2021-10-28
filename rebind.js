
/**
 * @callback action_occurrance
 * This describes the parameters of callbacks registered using rebind.on(), called when an action occurs.
 * @param {string} input_type the name of the input event that caused the action to occur (eg: "key", "gamepad-button", or "gamepad-axes")
 * @param {string} key_action whether the key or button was "pressed" or "released"
 * @param {KeyboardEvent} event [keyboard only] the event passed from keydown or keyup
 * @param {Gamepad} gamepad [gamepad only] the gamepad object that caused the input event
 * @param {action_occurrance} func the callback itself is passed to itself.  this can be used to get things like expiry
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
        this.keydown_actions = {}
        this.action_functions = {}
        this.connected_gamepads = {}

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
                if (action.startsWith("gp-b")) input_type = "gamepad_button";
                else if (action.startsWith("gp-a")) input_type = "gamepad_axes";
                
                // add the action to the keydown thing
                this.keydown_actions[input].push({
                    action: action,
                    ctrl: !!settings.ctrl,
                    shift: !!settings.shift,
                    alt: !!settings.alt,
                    none: !!settings.none,
                    input_type: input_type
                })

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
            expiry: settings.expiry || 0
        })
    }

    poll_gamepad()
    {
        var gamepads = navigator.getGamepads();
        for (var gamepad of gamepads) // for each connected gamepad
        {
            // the list returned by navigator.getGamepads() can contain null values.
            // this checks if the list element is null, or if it's an actual gamepad
            if (gamepad)
            {
                // iterate over each gamepad button
                for (var i = 0; i < gamepad.buttons.length; i++)
                {
                    var btn = gamepad.buttons[i];
                    var input = "gp-b" + i.toString()
                    
                    if (btn.pressed && (input in this.keydown_actions))
                    {
                        this.#process_actions(input, "pressed", gamepad)
                    }

                }
            }
        }
    }

    #process_actions(input, key_action, event)
    {
        var actions = this.keydown_actions[input];
        actions.forEach((action => {

            // check the action conditions
            if (action.input_type === "key")
            {
                if (action.ctrl && !event.ctrlKey) return;
                if (action.alt && !event.altKey) return;
                if (action.shift && !event.shiftKey) return;
                if (action.none && (event.ctrlKey || event.altKey || event.shiftKey)) return;
            }

            // if there is a function registered for this action, call it
            if (action.action in this.action_functions) this.action_functions[action.action].forEach(((func, i, arr) => {

                // call the callback
                func.func(action.input_type, key_action, event, func);

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

    /**
     * @summary an internal function used to process keyevents
     * @param {KeyboardEvent} event the event passed to the keydown / keyup callback
     * @param {string} key_action the name of the event (ie: "keydown" or "keyup")
     * @private
     */
    #handle_keydown(event, key_action)
    {
        // if the key name (input) has an action bound to it
        if (event.key in this.keydown_actions) this.#process_actions(event.key, key_action, event)

        // handle 'any' key
        if ("any" in this.keydown_actions) this.#process_actions("any", key_action, event)
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
          this.connected_gamepads[gamepad.index] = gamepad;
        } else {
          delete this.connected_gamepads[gamepad.index];
        }
      }
}