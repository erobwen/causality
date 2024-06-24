


const base = {}
Object.defineProperty(base, "foo", {
    get() { return base._foo + "bar"; },
    set(newValue) { base._foo = newValue; },
})
const object = Object.create(base);

