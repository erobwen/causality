
# Causality

![Alt text](/docs/logotype.png?raw=true "Causality Logotype")

Reactive programming for simple, scalable state management, using ES6 proxies.


# Installation

Installation: npm install causalityjs --save

# Usage

    import {observable, repeat} from "causality";


# Quick Example

This is just to show a simple example of what causality is all about, using the simple repeat primitive.

    import {instance} from "causality";
    let causality = instance(); // Possibility to configure causality

    let x = observable({propA: 11});
    let y = observable({propB: 11, propC: 100});
    let z;

    repeat(function(){
        z = x.propA + y.propB;  // Sets up a reactive setting of variable z
    });
    // z is now 22

    y.propB = 2;      // Setting of propB will cause reevaluation of z
    // z is now 13

    x.propA = 2;
    // z is now 4

However, there are a lot more interesting features to try out. 


# Features

## Configuration 

Causality is configured using the instance function. This creates a possibility of creating multiple unrelated and differently configured instances of causality itself. 

## observable

With observable you simply create a causality object. The observable function takes any other Javascript object as input. Example usage:

    observable({a: 1, b: 2, c: 3});
    observable([1, 2, 3]);
    observable(new MyClass());

A causality object is an object that can be observed by causality. This means that changes in causality objects will be detected automatically by the causality framework. While it is possible to mix the use of causality object and plain Javascript object, it is not recommended to do so, as changes in plain Javascript objects will go undetected by causality.

In every other aspect, a causality object behaves just as an ordinary Javascript object would. So you could for example write:

    var x = observable({a: 1, b: 2});
    var y = x.a + b.2; // should result in 3!

    var l = observable([]);
    l.push("item1");
    l.push("item2");
    l.pop();
    console.log(l); // should print out ["item1"];

If you find it too cumbersome to write "observable" upon every object creation, you can create an alias "o":

    o({a: 1, b: 2});

To access the inner workings of a causality object, you can access it by the causality property. For example write object.causality.id to get a system wide unique id for that particular object. 

## repeat

Repeat is typically used to enforce some certain data constraint. Such as reactive validation of a form, or calculation of some. In its basic form, it is simply a function that is reevaluated every time any of the data it read changes. For example:

    repeat(function() {  x.value = y.value + z.value; });

This will cause x.value to be assigned to y.value + z.value any time either y.value or z.value changes. The good part is that you can write any kind of code inside the function. There can be loops, function calls, recursive functions. Anything. And no matter what code is there, causality will always keep track of what data has been read by the repeater function at any given moment.

It will however not detect changes in local variables, so for example if local or global variable y is assigned in this example, there will be no reevaluation of x.value. In practice however, this is in general not a limitation as application code typically reacts to changes to a specific model, rather than changes in local variables.

## Re Building with repeat
repeat is equipped with some special features when it comes to creating data structures. Assume that you have an algorithm that constructs a data structure. For example a balanced index structure of some sort. However, when the input data is changed and the algorithm needs to repeat once more, you do not want a completely new output data structure.  Instead, you want to execute the algorithm once more, and at the end of it, compare the difference to the result of the last run, and update the previous result in a minimal way. This is something that is supported with causality! 

React users might notice that this is actually a generalization of how React works with the synthetic dom. But instead of being limited to just dom structures, causality can do this trick for any data structure!

For example: 

    repeat(() => {
        for(let input of inputArray) {
            addToIndex(observable({value: input.value},"buildId" + input.id))
        }
    })
    
Note that the only difference is that we added a unique build id for each created object in the data structure. This way causality will know what previously created object correspond to the objects created at each repetition.
   
## Non recorded action with repeat
A repeater can mix cause and effect, and there are some preventive measures in place to prevent a repeater from activating itself. So, in many cases it is safe to use a repeater with a single action (comparable to autorun in MobX). However, there could be situations where you would like to distinguish more between cause and effect. To do that, a second argument for the repeater is an action that is not recorded. 

    repeater([description for debug], recordedAction, nonRecordedAction, options)

The options object contains further configurations for the non-recorded action. Namley debounce and fireImmediatley. 

## invalidateOnChange

There is a famous quote from programmer Jeff Atwood (author of blog Coding Horrors):

*There are two hard things in computer science: cache invalidation, naming things, and off-by-one errors.*

Well, at least cache invalidation just got much more simple thanks to invalidateOnChange. While you could use a repeat to invalidate a cache, invalidateOnChange is a more basic primitive that is optimized for this specific purpose. For example, if a cache is filled up using lazy evaluation, it is convenient to just clear the cache without any direct reevaluation. 

Here is an example:

    invalidateOnChange(
        function() {
            x.value = y.value + z.value; xIsValid = true;
        },
        function() {
            xIsValid = false;
        }
    );

In this case, if y.value is changed for instance, it will only mean that the second function is run, setting xIsValid to false. invalidateOnChange is in particularly useful when integrating causality with other frameworks. For example, rendering code could be run using invalidateOnChange, and the second function could simply invalidate a certain view-component. 

## withoutRecording and withoutReactions

When working with causality it could be useful to sometimes break the rules. Reading data without creating a dependency could for example be useful for debug printouts. In the following code, the debug printout itself would create a false dependency on `z.value`  if it wasnt for the withoutRecording clause.

    let x = null
    let y = observable({ value: false });
    let z = observable({ value: 10});

    repeat(function() {
        withoutRecording(function() {
            console.log("Repeating with these values:");
            console.log(y.value);
            console.log(z.value);
        })
        if (y.value) {
            x = z.value;
        } else {
            x = 42;
        }
    }

    // No one is going to notice!
    withoutReactions(function() {
        y.value = true;
    });

There are probably less use cases for being able to change data without triggering any reactions, using withoutReactions, it is available nevertheless.

## Emiting Events   

Somtimes you just need to observe objects, and record events. For this purpose you can activate emitEvents in the causality configuration. If this is set to true, then causality will try to send events both globally, to an onEventGlobal callback that you can setup in the causality configuration.
 
Activating  emitEvents in conjunction with sendEventsToObjects will also cause causality to try to send events to your observable objects as well. 

 - onChange
 - onBuildCreate
 - onBuildRemove

onChange will send a message to the object, containing information about what happened.

The onBuildCreate and onBuildRemove events will be sent specifically when doing reBuild. They correspond to the React concepts of componentDidMount and componentWillUnmount but for a generalized data structure re building framework.

## causalityForwardsTo

The re building mechanism internally uses a forwarding mechanism that can be used directly. To use it, simply type myObject.causalityForwardsTo = otherObject. This will cause myObject have the identity of myObject, but the state of otherObject. Quite useful for some very special scenarios. 


## transaction

It is possible to do many changes at once, before causality has a chance to responde to any of the changes. This can be done by the use of "transaction".  Here is an example: 

    transaction(function() {
       x.a = 12;
       x.b = 30;
    })

Warning: A transaction should typically only write data, as reading data inside a transaction might result in reading non-updated data since all repeaters are frozen inside the transaction.

# Release Notes for 3.0

## Removed features

Since version 2.0 a few features were removed, as they seemed too esoteric to be practically used. For example cached, reCached, withoutSideEffects etc. if you miss any of these features, please let us know. 

## Migration

The 3.0 version uses is a factory that can create multiple instances of causality. Creating a causality instance with default configuration is done as follows. 

```js
import CausalityFactory from "/vendor/causalityjs/causality.js";
const Causality = CausalityFactory();
```
You can name a configuration with the "name" property. Doing so makes it possible to retrieve the same instance from another call to the factory function. A named configuration is created the first time by using the configuration, on successive calls by using the same name, configuration settings will be ignored and you will just be given the instance created the first time that name was used. 

`Causality.create` has been renamed `Causality.observable`.


`Causality.independently` is no longer needed for repeaters created inside other repeaters. If nesting is wanted, use
```js
Causality.repeat( repeaterActions, {dependentOnParent: true});
```

`obj.observe(listener)` has been replaced with a single `obj.onChange` listener. Enable events with config `{emitEvents:true, sendEventsToObjects: true}`. It is also possible to globaly observe events by setting onEventGlobal in the configuration.

Observed object causality metadata are now gathered in a configurable property, defaulting to `causality`. `obj.__id` is now `obj.causality.id`. `obj.__target` is now `obj.causality.target`.

Check if an object is an observable by checking for `obj.causality`.


# React Integration

It is fairly simple to integrate causality with react. The only thing you have to do is to run all render functions wrapped in invalidateUponChange. If change occurs, register the react component as dirty, and later, when all model changes are finished, we run forceUpdate on all dirty components. 

# Community

For discussions, see:

https://gitter.im/causalityjs/Lobby

For discussions in Swedish:

https://gitter.im/avantgarde_web_development/Lobby

# Comparison to MobX

Causality is comparable to MobX. 

Some perhaps non-conclusive experiments indicate that causality could potentially be almost twice as fast as MobX. Causality also takes full advantage of ES6/proxies which makes it comparable to MobX version 5 and above. 

Causality also offers some experimental features that can not be found in MobX, such as reBuild, withoutSideEffects and the possibility for global observation of all objects ever created. On the other hand, MobX is a more mature library with a large supporting community and better integration with other libraries.

# Trivia

Causality is to be a foundation to a isomorphic application framework that will feature full stack data binding and reactive programming (https://github.com/erobwen/liquid). It is useful to anyone that would like to do reactive programming in Javascript (https://en.wikipedia.org/wiki/Reactive_programming).