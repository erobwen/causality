

# Causality

![Alt text](/logotype.png?raw=true "Causality Logotype")

A library for reactive programming based on Javascript proxies (ES6)

This project is a spin-off project from liquid (https://github.com/erobwen/liquid). This is a scaled down library that captures the essence of liquid's reactive core, and in addition takes full use of ES6 proxies. It is useful to anyone that would like to do reactive programming in Javascript (https://en.wikipedia.org/wiki/Reactive_programming). It could also provide an alternative to MobX.


# Quick Example:

This is just to show a simple example of what causality is all about, using the simple repeatOnChange primitive.

    require('./causality').install();

    var x = create({propA: 11});
    var y = create({propB: 11, propC: 100});
    var z;

    repeatOnChange(function(){
        z = x.propA + y.propB;  // Sets up a reactive setting of variable z
    });
    // z is now 22

    y.propB = 2;      // Setting of propB will cause reevaluation of z
    // z is now 13

    x.propA = 2;
    // z is now 4

However, the real power of causality lies in its more advanced primitives, cached and reCached which allow advanced reactive construction of data structures.


# Features

Causality supports the following powerful reactive primitives typically available in the global scope (unless otherwise specified):

* create  // Create a causality-object.
* repeatOnChange
* uponChangeDo
* withoutSideEffects  (prevents side effects on observable objects)

Causality objects also have the following powerful methods.

* cached
* reCached
* observe

# Causality Global Functions

The basic primitives of causality are create, repeatOnChange, uponChangeDo and withoutSideEffects. With only these, it is possible to create quite powerful reactive abstractions.

## create

With create you simply create a causality object. The create function takes any other Javascript object as input. Example usage:

    create({a: 1, b: 2, c: 3});
    create([1, 2, 3]);
    create(new MyClass());

A causality object is an object that can be observed by causality. This means that changes in causality objects will be detected automatically by the causality framework. While it is possible to mix the use of causality object and plain Javascript object, it is not recommended to do so, as changes in plain Javascript objects will go undetected by causality.

In addition, causality objects gain additional features, such as cached, reCached and observe.


## repeatOnChange

Repeat on change is typically used to envforce some certain data constraint. Such as reactive validation of a form, or calculation of some. In its basic form, it is simply a function that is reevaluated every time any of the data it read changes. For example:

    repeatOnChange(function() {  x.value = y.value + z.value; });

This will cause x.value to be assigned to y.value + z.value any time either y.value or z.value changes. The good part is that you can write any kind of code inside the function. There can be loops, function calls, recursive functions. Anything. And no matter what code is there, causality will allways keep track of what data has been read by the repeater function at any given moment.

It will however not detect changes in local variables, so for example if local or global variable y is assigned in this example, there will be no reevaluation of x.value. In practice however, this is in general not a limitation as application code typically reacts to changes to a specific model, rather than changes in local variables.

## uponChangeDo

Sometimes you do not want to repeat what you did previously upon change in any read data, at least not instantly. For more control, you might want to use uponChangeDo. It works as follows:

    uponChangeDo(
        function() {x.value = y.value + z.value; xIsValid = true;},
        function() { xIsValid = false;});

In this case, if y.value is changed for instance, it will only mean that the second function is run, setting xIsValid to false. uponChangeDo is in particularly useful when integrating causality with other frameworks. For example, rendering code could be run using uponChangeDo, and the second function could simply invalidate a certain view-component. Later, at a secondary stage when all causality code has finished runnig, we could deal with all invalidated view-components in a more rational way. There is a possibility to add functions that will execute when all causality code finishes.

## withoutSideEffects

...


# Causality Object Functions

Causality object come equipped with the following powerful features.

## observe

If you simply want to get a stream of events that happens to a causality object, simply write

    let x = create({});
    x.observe(function(event) { console.log(event); });
    x.y = 42; // should give a "set" event to the console.

There are three kinds of events generated. For causality objects, set and delete events will be generated. For causality arrays, splice events will be generated, in addition to set and delete events.


## cached

...

## reCached

Re cached might seem simple, but it is the crown-jewel of causality. It is basically a ca ...

# Community

For discussions, see:

https://gitter.im/avantgarde_web_development/Lobby (in swedish, sorry)

# Comparison

Causality could work as a replacement for MobX. We have already found out that causality is about 100% faster for some examples and takes full advantages of Proxies ES6, and in addition it offers more advanced featurs in cached and reCached. On the other hand, it is not quite as a mature library.


