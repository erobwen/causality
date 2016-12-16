

# Causality

![Alt text](/logotype.png?raw=true "Causality Logotype")

A library for reactive programming based on Javascript proxies (ES6)


# Getting started

Coming soon...

# Quick Example

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

* create
* repeatOnChange
* uponChangeDo
* withoutSideEffects  (prevents side effects on observable objects)

Causality objects also have the following methods.

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
        function() {
            x.value = y.value + z.value; xIsValid = true;
        },
        function() {
            xIsValid = false;
        }
    );

In this case, if y.value is changed for instance, it will only mean that the second function is run, setting xIsValid to false. uponChangeDo is in particularly useful when integrating causality with other frameworks. For example, rendering code could be run using uponChangeDo, and the second function could simply invalidate a certain view-component. Later, at a secondary stage when all causality code has finished runnig, we could deal with all invalidated view-components in a more rational way. There is a possibility to add functions that will execute when all causality code finishes.


    addPostPulseAction(function() {
        if (!xIsValid) {
            ...
        }
    });


## withoutSideEffects

What if you want to build a framwork, where you for example want to enforce that a view creating function never makes any changes in the model? Now it is very simple to do so! When you write a "withoutSideEffects" call, the restricted code inside it can only modify objects that were created inside the restricted code section.

    ...
    withoutSideEffects(function() {
        .... // restricted code
    })
    ...

This way it becomes easy to enforce one-directional data flows while still allowing general Javascript code.

## withoutRecording and withoutNotifyChange

When working with causality it could be useful to sometimes break the rules. Reading data without creating a dependency could for example be useful for debug printouts. In the following code, the debug printout itself would create a false dependency on `z.value`  if it wasnt for the withoutRecording clause.

    let x = null
    let y = create({ value: false });
    let z = create({ value: 10});

    repeatOnChange() {
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
    withoutNotifyChange(function() {
        y.value = true;
    });

There are probably less use cases for beeing able to change data without triggering any reactions, using withoutNotifyChange, it is available nevertheless.


# Causality Object Functions

Causality object come equipped with the following powerful features.

## observe

If you simply want to get a stream of events that happens to a causality object, simply write

    let x = create({});
    x.observe(function(event) { console.log(event); });
    x.y = 42; // should give a "set" event to the console.

There are three kinds of events generated. For causality objects, set and delete events will be generated. For causality arrays, splice events will be generated, in addition to set and delete events.


## cached

There is a famous quote from programmer Jeff Atwood (author of blog Coding Horrors):

*There are two hard things in computer science: cache invalidation, naming things, and off-by-one errors.*

Well, at least cache invalidation just got much more simple thanks to causality/cached. With cached, causality completley automates the process of cache invalidation. It works as follows:

    x = create({
        fun : function() {
            this.y  + this.z}
        }
        y : 20,
        z : 22
    });
    console.log(x.fun()); // will output 42. P

    console.log(x.cached('fun')); // Will also output, 42.
    console.log(x.cached('fun')); // Will also output, 42. But this time it will used the cached value.

    x.y = 30;  // This will automatically invalidate your cache! Hardest problem in programming solved! That easy!

It is just as simple as that. If you have arguments you want to pass to the cached function, simply list them after the function name, in a sort of lisp-like in-order:

    x.cached('someFunction', arg1, arg2, arg3);

Every unique sequence of arguments given to cached will result in a new separate function cache.

If you want to write a recursive function it can be useful to cache each recursive function call, making it necessary only to reevaluate exactly the function call that needs reevaluation. If you however want to write a function whose recursive function calls are only cached if its parent function call is cached, the following syntax can be useful.

    x.cachedInCache('fun');

When not inside another cached function call, the above syntax will simply be equivalent to x.fun(), but when inside another cached function, it will be equivalent to x.cached('fun').

A reCache can be removed using the following command:

    x.tryUncache('fun');

The cache will not be removed while some other causality dependee (cached, reCached, repeatOnChange etc.) depends on it.


## reCached

Re Cached is simply put the crown-jewel of causality. If you thought cached was exciting, it is noting compared to reCached. It has the following features:

* Conservative change propagation.
* Stable object identities of created objects.

On the surface, reCached works similar to cached, with a first notable difference. When any value read during a reCache evaluatino is changed, the reCached function will not simply invalidate the cache. It will also re-valuate the cache, compare the new cached return-value to the previously cached return value, and ONLY if the return value has really changed it will signal change to any dependent function cache/reCache, repeatOnChage, uponChangeDo.

But there is more to it. reCached really starts to shine when you start to create objects within the reCached function call. If you do so, you can add a cacheId to the created objects. Created objects will then retain their indentity over several reCachings.


    x = create({
        getView : function() {
            return create({ viewY : x.y}, 'xViewId');
        },
        y : 42
    });

    xView = x.reCache('getView');
    console.log(xView.viewY); // This will now show 42

    x.y = 45;  // This will create the view to reevaluate.
    console.log(xView.viewY); // This will now show 45! The result of the reevaluation has been merged into the same object we got the first time we ran reCache!

This is just a simple example, but the reCache function is very capable. You can create all sorts of data structures within the reCached function, whenver you give an id to the created objects, you will reuse the identity of the previously created object with the same id, that was created in a previous evaluation of the reCache.

The assuming of the previous identity is instant at the very createion of an objects inside the reCache. This means you can even set external references to created objects inside the reCache.

    aGlobalView = null
    x = create({
        getView : function() {
            let view = create({ viewY : x.y}, 'xViewId'); // The old identity is reused at this point, but the state of view will be as if newly created.
            globalView = view;
            return view;
        },
        y : 42
    });

    view = x.reCache('getView');

Even if getView is reCached, the global view will still point to the same view.

The purpose of reCache is to reactivley transform data structures, where a small change in the original data structure will lead to a small change in the resulting data structure.

For example, assume you write an algorithm that flattens a tree in pre-order. Then, if you add one node in the original tree, it will result in a limited change in the array or linked list that is the result of the reCache. This has to do with the identity reuse.

![Alt text](/reCached.png?raw=true "Causality Logotype")

This is similar to the technique used in React where elements of the synthetic dom are given ids, so that they are matched with elements in the existing dom. The minimal update is then found, and merged into the existing dom. reCaching generalizes this technique so that it can easily be employed for any data transformation, and attatches it to a sophisticated system of cache invalidation!

The reason why cached does not feature the identity preservation of reCached, is that when a cache created by cached is invalidated, we want all memory used by the cache to be released. With reCache, it is decided that the cache will be in place as long as it is not explicitly removed using the tryUncache command.

A reCache can be removed using the following command:

    x.tryUncache('getView');

The cache will not be removed while some other causality dependee (cached, reCached, repeatOnChange etc.) depends on it.


# Pulses and Transactions

Causality works in pulses. At the end of a pulse, all reactive changes has taken place and causality has performed all necessary internal cleanup. At the end of the pulse, there is also a possibility for the application to attach hooks as mentioned previously:

    addPostPulseAction(function() { console.log("Pulse done!"); });

Any modification to a causality object will start and end a pulse, such as simply writing "x.y = 42" unless we are already in a pulse. But it is also possible to explicitly start a pulse.

    pulse(function() {
        do();
        some();
        things();
    });

Note however, that reactive changes will also take place imediatley inside the pulse. It is just causalitys internal cleanup that will be left until the end of the pulse. So for example, reactive changes that is the result of the "do()" call will have effect on the "some()" call. The main usage of pulses is when integrating causality with other frameworks. When we want to run a number of commands, and after all reactive changes has taken place, we want to continue execution.

In other situations there is a need to modify a lot of data before any kind of reactive response takes place. Typically for efficiency. Then it is useful to use transaction:

    transaction(function() {
       x.a = 12;
       x.b = 30;
    })

A transaction should typically only write data, as reading data inside a transaction might result in reading non-updated data.

The transaction will implicitly create a pulse if not already in a pulse.

Note: If any observer function is registered to an object, events will be sent directly to the observer function both during a transaction and a pulse.

# Community

For discussions, see:

https://gitter.im/avantgarde_web_development/Lobby (in swedish so far, but please state questions/opinions in english and we will reply.)

# Comparison

Causality could work as a replacement for MobX. Some early, and perhaps non-conclusive experiments indicate that causality could potentially be twice as fast as MobX. It also takes full advantage of ES6/proxies. Causality also offers more advanced features such as cached, reCached and withoutSideEffects. On the other hand, MobX is a more mature library with a supporting community.

![Alt text](/performance.png?raw=true "Causality Logotype")

# Trivia

This project is a spin-off project from liquid (https://github.com/erobwen/liquid). This is a scaled down library that captures the essence of liquid's reactive core, and in addition takes full use of ES6 proxies. It is useful to anyone that would like to do reactive programming in Javascript (https://en.wikipedia.org/wiki/Reactive_programming). It could also provide an alternative to MobX.

Causality is based on 10+ years of original research into reactive programming. I was the original author of the 10+ years old "Reactive Programming" article of Wikipedia https://en.wikipedia.org/wiki/Reactive_programming and have been exploring this domain for a long time.

The logotype of causality is based on the ¤ symbol.
