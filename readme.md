# rebind.js

This library can be used for detecting keyboard and gamepad input, binding input to an "action", and registering callbacks to actions.  The result of this is you can use this library to dynamically bind and rebind keys and buttons to functions at runtime.

# Example

```js
// create a Rebind object
rebind = new Rebind()

// bind some keyboard inputs to an action
// left  -> the 'a' key, the left arrow key, or the left dpad button
// right -> the 'd' key, the right arrow key, or the right dpad button
rebind.bind("move-left", ["a", "ArrowLeft", "Left", "gp-b14"])
rebind.bind("move-right", ["d", "ArrowRight", "Right", "gp-b15"])

// register some callbacks to an action
rebind.on("move-left", (params) => {
    console.log("Move left", params.key_action)
})
rebind.on("move-right", (params) => {
    console.log("Move right", params.key_action)
})

// remove some keybindings
rebind.remove("move-left", ["a"])
rebind.remove("move-right", ["d"])

```

A more detailed (sort of) example can be found at `example/`.

# Usage

rebind.js centres around "actions", which are basically friendly names for things that can happen.  You bind keyboard keys or gamepad buttons to an action, then register callbacks to actions.

First, you have to include the JavaScript file:

```html
<script src="rebind.js"></script>
```
Then, construct a Rebind object:

```js
rebind = new Rebind()
```

## The update method

Gamepad input, and continuous key callbacks, depend on the method `rebind.update()` being called as often as possible.  This method polls each gamepad button and handles calling continuous frequency callbacks.  One way to do this is to use [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame), like this:

```js
function update()
{
    rebind.update()
    requestAnimationFrame(update)
}
requestAnimationFrame(update)
```

If you just want to call a function every time a keyboard key repeats (which is the default frequency), you don't need to call `update()`.

## Binding Keys to Events

To bind keyboard or gamepad inputs to an action, use the method `rebind.bind()`.  For example, to bind the keyboard arrow keys to actions to move something left or right, you could do this:

```js
rebind.bind("move-left", ["a", "ArrowLeft", "Left"])
rebind.bind("move-right", ["d", "ArrowRight", "Right"])
```

(It says "Left" and "ArrowLeft" because old versions of Firefox used "Left", while most browsers nowdays use "ArrowLeft".)

Note that we define what inputs cause what actions, and what each action does separately.

The first argument is the name of the action as a string (it can be literally anything), and the second argument is an array of input names.  The input names can be
- a keyboard key
- a gamepad button
- a gamepad control stick

### Binding Keys to keyboard keys

You can bind actions to anything that KeyboardEvent.key can be ([here's a list from MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values)).  Optionally, you can pass a settings object as a third argument to specify any modifier keys that need to be pressed:

```js
rebind.bind("move-left-faster", ["a", "ArrowLeft", "Left"], {
    shift: true
})
```

The settings object can have `ctrl`, `shift`, `alt`, or `none` as keys, and each of them are false by default.  Any that are set to true must be pressed as part of the input to make the action occur.  If `none` is set to true, there have to be no modifier keys pressed in order to make the action occur.  If `none` is false, and no other modifier key settings are true, the action will occur no matter what modifier keys are pressed.

You can also bind actions to a virtual key called `any`, which will occur whenever any key or gamepad button is pressed or released.

```js
rebind.bind("any-button", ["any"])
```

### Binding to Gamepad Buttons

Binding gamepad butons to actions works the same way as binding keys, except the names are a bit different.  Because each controller type has a different name for each button, the Gamepad API gives each button a standard id instead of a name (so long as the gamepad layout can be represented using a "standard" mapping).  The mapping between button ids and the location of buttons on the controller is defined in the [Gamepad API Standard](https://www.w3.org/TR/gamepad/#dfn-standard-gamepad) (there's a nice diagram here which makes it visual).

To bind a specific button to an action, use the input string `"gp-b<n>"`, where `<n>` is the id of the button you want to use.  For example, the "right button in the right cluster" (A on Nintendo, circle on PlayStation, B on Xbox), with a "standard" mapping, is id 1.  To bind an action to this button (and the enter key on the keyboard), you would call:

```js
rebind.bind("something", ["Enter", "gp-b1"]);
```

### Binding to Gamepad Control Sticks (axes)

You can bind actions to gamepad axes by using the inputs `"gp-a-left"` and `"gp-a-right"`.  For example:

```js
rebind.bind("move-left", ["gp-a-left"], {
    condition_x: "neg",
    condition_y: "none"
})
rebind.bind("move-right", ["gp-a-left"], {
    condition_x: "pos",
    condition_y: "none"
})
```

The `condition_x` and `condition_y` specify where you want each axis to be for any registered callback to be called.  The table below shows each possible value for both settings (both `condition_x` and `condition_y` can have any of the values below).

| Condition     | Description
|---------------|
| `"pos"`       | the axis must be greater than the deadzone
| `"neg"`       | the axis must be less than -(the deadzone)
| `"any"`       | the axis must be outside the deadzone in any direction (except if the other axis' condition is met)
| `"either"`    | the axis must be outside the deadzone in any direction
| `"deadzone"`  | the axis must be within the deadzone (opposite of `"either"`)
| `"none"`      | don't care, this axis is just ignored

The default value is `"any"`.

Most values depend on a setting called `"deadzone"`, which specifies a region of the sticks' possible movement where input isn't registered.  The next two paragraphs contain a description of what deadzone is, so you can skip them if you already know what it is.

Normally a gamepad axis reads as 0 when at rest, and something greater than 0 when tilted.  If we tilt it in the other direction, we'll get a reading of the same magnitude, but of opposite sign.  For example, it might be +1 when tilted all the way to the right, -1 when tilted all the way to the left, and 0 when at rest.

Sometimes, axes don't read exactly zero at rest, for example they might read 0.003.  To get around this, we use a deadzone, where we say "any input that between -deadzone and +deadzone is ignored".  This way, tiny offsets in rest values don't register as an input, and any movement by a user will bring the axis value out of the deadzone, which will register as an input.

The JavaScript API specifies that gamepad axes will range from 0 at rest, to -1 or +1 at the extreme end.  The default deadzone used by rebind.js is 0.1, but this can be overridden by specifying the `"deadzone"` parameter:

```js
rebind.bind("something", ["gp-a-left"], {
    condition_x: "neg",
    condition_y: "none",
    deadzone: 0.05
})
```

## Registering Callbacks to Actions

When an action "occurs" due to any input bound to the action, each callback registered to the action will be called.  To register a callback, use the `rebind.on()` method.  You can register any number of callbacks to one action (although you can't unregister them yet, except when setting an [expiry](#expiry)).  Make sure the action parameter is the same string used to bind inputs to the action.

```js
rebind.on("move-left", (params) => {
    console.log("Move left", params.key_action)
})

rebind.on("move-right", (params) => {
    console.log("Move right", params.key_action)
})
```

The parameter passed to the callback is an object with lots of parameters, which are described in this table:

| `params` attribute    | description                                                                                                                       |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| `input_type`          | whether the input was caused by a keyboard `"key"`, `"gamepad_button"`, or `"gamepad_axes"`                                       |
| `key_action`          | whether the key or button was `"pressed"` or `"released"`                                                                         |
| `event`               | if the action was caused by a keyboard key event, this will be the KeyboardEvent, otherwise it will be null                       |
| `gamepad`             | if the action was caused by a gamepad, this will be the Gamepad that represents it, otherwise it will be null                     |
| `expiry`              | if the callback has an expiry, this will be the number of calls the callback has left see [Callback Expiry](#expiry)              |
| `frequency`           | how often the action is to be called (by default, this is "default")                                                              |
| `axes`                | if the action was caused by a gamepad axis, this attribute will be an array of axis values (index 0 is the x axis, index 1 is the y axis) |

### <a name="expiry"></a>Callback Expiry

When you register a callback, you can set an expiry, so that after a certain number of calls, the callback will be deregistered, and won't be called again (although you can always reregister it).  To set an expiry (and other settings), you can pass a settings object as a third parameter to `rebind.on()`, as shown below:

```js
rebind.on("expiry", (params) => {
    console.log(`expiry callback, ${params.expiry} calls left`)
}, {
    expiry: 5
})

```

The expiry counter will decrement every time the callback is called, including when a key or button is pressed or released, at any callback frequency.

### Callback frequency

You can decide how often callbacks should be called when a key is pressed and held down and released.  When you register a callback, you can pass a settings object with a `frequency` attribute.

```js
rebind.on("something", (params) => {
    console.log("something", params.key_action, params.frequency)
}, {
    frequency: "continuous"
}
})
```

The table below shows the possible frequencies for callbacks, how often they will be called when caused by a keyboard input, and how often they will be called when caused by a gamepad input.

| frequency name    | keyboard frequency                                                                | gamepad button frequency                                                  | gamepad axes frequency                                                    |
|-------------------|-----------------------------------------------------------------------------------|---------------------------------------------------------------------------|---------------------------------------------------------------------------|
| `"continuous"`    | every time `update()` is called (`key_action` == pressed), and on release         | every time `update()` is called (`key_action` == pressed), and on release | every time `update()` is called (`key_action` == pressed), and on release |
| `"change"`        | when the key is pressed or released                                               | when the button is pressed or released                                    | when the value of either x or y axis changes                              |
| `"repeat"`        | when the key is pressed, released, or repeats (based on OS key repeat settings)   | same as `"change"`                                                        | same as `"continuous"`                                                    |
| anything else     | same as `"repeat"`                                                                | same as `"change"`                                                        | same as `"continuous"`                                                    |

Here's more detail about what each frequency does:

- `"continuous"`
    - when the key or button is held down, or axis conditions are met, the callback will be called (with `key_action` == "pressed") every time `rebind.update()` is called.
    - when the key or button is released, or axis is returned to rest, the callback will be called with `key_action` == "released" once
- `"change"`
    - the callback will be called once when the key / button is pressed, and once when the key / button is released
    - if the action is caused by gamepad axes, the callback will be called when the value of either x or y axis changes with `key_action` == "pressed", and once when the axes return to rest (with `key_action` == "released)
- `"repeat"`
    - if the action was caused by a keyboard key, the callback will be called once on keypress, then will be called repeatedly at the key repeat rate set up by the OS (with `key_action` == "pressed").  when the key is released, the callback will be called once with `key_action` == "released".
    - if the action was caused by a gamepad input, the frequency will be the same as if it were `"change"`
    - if the action was caused by gamepad axes, the frequency will be the same as if it were `"continuous"`
- anything else (by default, frequency is `"default"`)
    - the frequency will be the same as if it were set to `"repeat"` (hence it will act like `"change"` for gamepad inputs, and `"continuous"` for gamepad axes)

## Unbinding keys

The idea of this library is to be able to change keybindings at runtime.  To that end, you can remove bindings from actions using two methods.

The first method allows you to specify an array of keys or buttons (like for `rebind.bind()`) to "debind" from an action.  It is used like this:

```js
rebind.remove("move-left", ["a", "ArrowLeft", "Left"])
rebind.remove("move-right", ["d", "ArrowRight", "Right"])
```

The second method just removes all bindings from an action, and is called like this:

```js
rebind.clear("move-left")
rebind.clear("move-right")
```