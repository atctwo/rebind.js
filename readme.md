# rebind.js

This library can be used for detecting keyboard and gamepad input, binding input to an "action", and registering callbacks to actions.  The result of this is you can use this library to dynamically bind and rebind keys and buttons to functions at runtime.

# Example

```js
// create a Rebind object
rebind = new Rebind()

// bind some keyboard inputs to an action
rebind.bind("move-left", ["a", "ArrowLeft", "Left"])
rebind.bind("move-right", ["d", "ArrowRight", "Right"])

// register some callbacks to an action
rebind.on("move-left", (input_type, key_action, event) => {
    console.log("Move left", key_action)
})

rebind.on("move-right", (input_type, key_action, event) => {
    console.log("Move right", key_action)
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

## Binding Keys to Events

To bind the keyboard arrow keys to actions to move something left or right, you could do this:

```js
rebind.bind("move-left", ["a", "ArrowLeft", "Left"])
rebind.bind("move-right", ["d", "ArrowRight", "Right"])
```

The first argument is the name of the action as a string (it can be literally anything), and the second argument is an array of key names.  The key names can be anything that KeyboardEvent.key can be ([here's a list from MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values)).

Optionally, you can pass a settings object as a third argument to specify any modifier keys that need to be pressed:

```js
rebind.bind("move-left-faster", ["a", "ArrowLeft", "Left"], {
    ctrl: true
})
```

The settings object can have `ctrl`, `shift`, `alt`, or `none` as keys, and each of them are false by default.  Any that are set to true must be pressed as part of the input to make the action occur.  If `none` is set to true, there have to be no modifier keys pressed in order to make the action occur.  If `none` is false, and no other modifier key settings are true, the action will occur no matter what modifier keys are pressed.

You can also bind actions to a virtual key called `any`, which will occur whenever any key or gamepad button is pressed or released.

```js
rebind.bind("any-button", ["any"])
```

todo: how to bind to gamepad buttons and axes

## Registering Callbacks to Actions

When an action "occurs" due to any input bound to the action, each callback registered to the action will be called.  To register a callback, use the `rebind.on()` method.  You can register any number of callbacks to one action (although you can't unregister them yet, except when setting an [expiry](#expiry)).  Make sure the action parameter is the same string used to bind inputs to the action.

```js
rebind.on("move-left", (input_type, key_action, event) => {
    console.log("Move left", key_action)
})

rebind.on("move-right", (input_type, key_action, event) => {
    console.log("Move right", key_action)
})
```

The first parameter of the callback, `input_type`, tells the callback which type of input caused the action to occur.  This can be:
- `key`
- `gamepad_button`
- `gamepad_axes`

The second parameter, `key_action`, will either be `"pressed"` or `"released"`.

If the input was from a keyboard, the third parameter will be the KeyboardEvent that caused the internal keydown or keyup event listener to be executed.  If the input was from a gamepad, the second parameter will be the Gamepad object that represents the gamepad that made the input.

That's all you need to do to bind an input to an action!

### The 4th Parameter: func

There is an optional 4th parameter, `func`, which is the object that is internally used to store the callback itself, and all of it's settings (which are described below).  It can be used like this:

```js
rebind.on("expiry", (input_type, key_action, event, func) => {
    console.log(func)
})
```

This object currently has the following attributes:

| Attribute Name | Description                                                                  |
|----------------|------------------------------------------------------------------------------|
| `func`         | the callback function itself                                                 |
| `expiry`       | how many more calls the callback has left (see [Callback Expiry](#expiry))   |

### <a name="expiry"></a>Callback Expiry

When you register a callback, you can set an expiry, so that after a certain number of calls, the callback will be deregistered, and won't be called again (although you can always reregister it).  To set an expiry (and other settings), you can pass a settings object as a third parameter to `rebind.on()`, as shown below:

```js
rebind.on("expiry", (input_type, key_action, event, func) => {
    console.log(`expiry callback, ${func.expiry} calls left`)
}, {
    expiry: 5
})

```

The expiry counter will decrement every time the callback is called, including when a key or button is pressed or released, at any callback frequency.

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