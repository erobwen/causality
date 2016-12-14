

# Causality

![Alt text](/logotype.png?raw=true "Causality Logotype")

A library for reactive programming based on Javascript proxies (ES6)

This project is a spin-off project from liquid (https://github.com/erobwen/liquid). This is a scaled down library that captures the essence of liquid's reactive core, and in addition takes full use of ES6 proxies. It is useful to anyone that would like to do reactive programming in Javascript (https://en.wikipedia.org/wiki/Reactive_programming).

Example usage:

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


Causality supports the following powerful reactive primitives:

* create  (creates an observeable object)
* repeatOnChange
* uponChangeDo
* withoutSideEffects  (prevents side effects on observable objects)
* cached (make a cached call, that invalidates upon any change in data that was read)
* infuse (Not finished yet!)
* project (Not finished yet!)


For discussions, see:

https://gitter.im/avantgarde_web_development/Lobby (in swedish, sorry)
