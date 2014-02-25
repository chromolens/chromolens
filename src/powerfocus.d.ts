///<reference path="../node_modules/DefinitelyTyped/d3/d3.d.ts" />

interface PWInterpolatorFactory {
    (oldScale: D3.Scale.LinearScale) : (t: number)=>powerfocusI;
}

/**
 * A scale with polynomial zoom
 * @class powerfocusI
 * @extends D3.Scale.LinearScale
 */
interface powerfocusI extends D3.Scale.LinearScale {
    (domain: number[], range: number[], interpolate: D3.Transition.Interpolate, focus: number, exponent: number, scaleInterpolate?: PWInterpolatorFactory) : powerfocusI;

    focus: {
        (): number;
        (x: number): powerfocusI;
    };

    exponent: {
        (): number;
        (x: number): powerfocusI;
    };

    derivative(x:number): number;

    invDerivAtFocus(): number;

    scaleInterpolate: {
        (): PWInterpolatorFactory;
        (f: PWInterpolatorFactory): powerfocusI;
    };

    regionFocus(rstart:number, rend:number, proportion:number);

    powerticks(m?): number[][];
    copy(): powerfocusI;
}

declare var powerfocus: powerfocusI;
