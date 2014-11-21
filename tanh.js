//
// ====================================================
// Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
//
// Developed at SunSoft, a Sun Microsystems, Inc. business.
// Permission to use, copy, modify, and distribute this
// software is freely granted, provided that this notice 
// is preserved.
// ====================================================
//

// Tanh(x)
// Return the Hyperbolic Tangent of x
//
// Method :
//				       x    -x
//				      e  - e
//	0. tanh(x) is defined to be -----------
//				       x    -x
//				      e  + e
//	1. reduce x to non-negative by tanh(-x) = -tanh(x).
//	2.  0      <= x <= 2**-55 : tanh(x) := x*(one+x)
//					        -t
//	    2**-55 <  x <=  1     : tanh(x) := -----; t = expm1(-2x)
//					       t + 2
//						     2
//	    1      <= x <=  22.0  : tanh(x) := 1-  ----- ; t=expm1(2x)
//						   t + 2
//	    22.0   <  x <= INF    : tanh(x) := 1.
//
// Special cases:
//	tanh(NaN) is NaN;
//	only tanh(0)=0 is exact for finite argument.
//

function tanh (x) {
    // x is Infinity or NaN
    if (!isFinite(x)) {
        // tanh(+/-inf) = +/- 1, tanh(NaN) = NaN;
        if (x > 0) {
            return 1/x + 1;
        } else {
            return 1/x - 1;
        }
    }

    var ax = Math.abs(x);

    // |x| < 22
    if (ax < 22) {
        if (ax < Math.pow(2,-55)) {
            // |x| < 2^-55, tanh(small) = small.
            //
            // The multiplication by 1+x is probably so inexact is
            // signaled when x is not zero. This is probably not
            // required for Javascript, so we could just return x.
            return x*(1 + x);
        }
        if (ax >= 1) {
            // |x| >= 1
            t = expm1(2*ax);
            z = 1 - 2/(t + 2);
        } else {
            t = expm1(-2*ax);
            z = -t/(t + 2);
        }
    } else {
        // |x| > 22, return +/- 1
        z = 1;
    }

    return (x >= 0) ? z : -z;
}
