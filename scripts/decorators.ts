function classDecorator<T extends {new(...args:any[]):{};test:any}>(constructor:T) {
    console.log('constructor',constructor,);
    (constructor ).test=1
    // return class extends constructor {
    //     newProperty = "new property";
    //     hello = "override";
    // }
}

@classDecorator
class Greeter {
    static test=2
    property = "property";
    hello: string;
    constructor(m: string) {
        this.hello = m;
    }
}

console.log('greeter',new Greeter("world"),Greeter.test);