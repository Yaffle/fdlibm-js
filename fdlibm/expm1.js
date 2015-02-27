//
// ====================================================
// Copyright (C) 2004 by Sun Microsystems, Inc. All rights reserved.
//
// Permission to use, copy, modify, and distribute this
// software is freely granted, provided that this notice 
// is preserved.
// ====================================================
//

// Translated to Javascript by Raymond Toy (rtoy@google.com)

// expm1(x)
// Returns exp(x)-1, the exponential of x minus 1.
//
// Method
//   1. Argument reduction:
//      Given x, find r and integer k such that
//
//               x = k*ln2 + r,  |r| <= 0.5*ln2 ~ 0.34658  
//
//      Here a correction term c will be computed to compensate 
//      the error in r when rounded to a floating-point number.
//
//   2. Approximating expm1(r) by a special rational function on
//      the interval [0,0.34658]:
//      Since
//          r*(exp(r)+1)/(exp(r)-1) = 2+ r^2/6 - r^4/360 + ...
//      we define R1(r*r) by
//          r*(exp(r)+1)/(exp(r)-1) = 2+ r^2/6 * R1(r*r)
//      That is,
//          R1(r**2) = 6/r *((exp(r)+1)/(exp(r)-1) - 2/r)
//                   = 6/r * ( 1 + 2.0*(1/(exp(r)-1) - 1/r))
//                   = 1 - r^2/60 + r^4/2520 - r^6/100800 + ...
//      We use a special Remes algorithm on [0,0.347] to generate 
//      a polynomial of degree 5 in r*r to approximate R1. The 
//      maximum error of this polynomial approximation is bounded 
//      by 2**-61. In other words,
//          R1(z) ~ 1.0 + Q1*z + Q2*z**2 + Q3*z**3 + Q4*z**4 + Q5*z**5
//      where   Q1  =  -1.6666666666666567384E-2,
//              Q2  =   3.9682539681370365873E-4,
//              Q3  =  -9.9206344733435987357E-6,
//              Q4  =   2.5051361420808517002E-7,
//              Q5  =  -6.2843505682382617102E-9;
//      (where z=r*r, and the values of Q1 to Q5 are listed below)
//      with error bounded by
//          |                  5           |     -61
//          | 1.0+Q1*z+...+Q5*z   -  R1(z) | <= 2 
//          |                              |
//      
//      expm1(r) = exp(r)-1 is then computed by the following 
//      specific way which minimize the accumulation rounding error: 
//                             2     3
//                            r     r    [ 3 - (R1 + R1*r/2)  ]
//            expm1(r) = r + --- + --- * [--------------------]
//                            2     2    [ 6 - r*(3 - R1*r/2) ]
//      
//      To compensate the error in the argument reduction, we use
//              expm1(r+c) = expm1(r) + c + expm1(r)*c 
//                         ~ expm1(r) + c + r*c 
//      Thus c+r*c will be added in as the correction terms for
//      expm1(r+c). Now rearrange the term to avoid optimization 
//      screw up:
//                      (      2                                    2 )
//                      ({  ( r    [ R1 -  (3 - R1*r/2) ]  )  }    r  )
//       expm1(r+c)~r - ({r*(--- * [--------------------]-c)-c} - --- )
//                      ({  ( 2    [ 6 - r*(3 - R1*r/2) ]  )  }    2  )
//                      (                                             )
//      
//                 = r - E
//   3. Scale back to obtain expm1(x):
//      From step 1, we have
//         expm1(x) = either 2^k*[expm1(r)+1] - 1
//                  = or     2^k*[expm1(r) + (1-2^-k)]
//   4. Implementation notes:
//      (A). To save one multiplication, we scale the coefficient Qi
//           to Qi*2^i, and replace z by (x^2)/2.
//      (B). To achieve maximum accuracy, we compute expm1(x) by
//        (i)   if x < -56*ln2, return -1.0, (raise inexact if x!=inf)
//        (ii)  if k=0, return r-E
//        (iii) if k=-1, return 0.5*(r-E)-0.5
//        (iv)  if k=1 if r < -0.25, return 2*((r+0.5)- E)
//                     else          return  1.0+2.0*(r-E);
//        (v)   if (k<-2||k>56) return 2^k(1-(E-r)) - 1 (or exp(x)-1)
//        (vi)  if k <= 20, return 2^k((1-2^-k)-(E-r)), else
//        (vii) return 2^k(1-((E+2^-k)-r)) 
//
// Special cases:
//      expm1(INF) is INF, expm1(NaN) is NaN;
//      expm1(-INF) is -1, and
//      for finite argument, only expm1(0)=0 is exact.
//
// Accuracy:
//      according to an error analysis, the error is always less than
//      1 ulp (unit in the last place).
//
// Misc. info.
//      For IEEE double 
//          if x >  7.09782712893383973096e+02 then expm1(x) overflow
//
// Constants:
// The hexadecimal values are the intended ones for the following 
// constants. The decimal values may be used, provided that the 
// compiler will convert from decimal to binary accurately enough
// to produce the hexadecimal values shown.

var huge = 1e300;
var tiny = 1e-300;
var o_threshold = 7.09782712893383973096e+02; //  0x40862E42, 0xFEFA39EF 
var ln2_hi      = 6.93147180369123816490e-01; //  0x3fe62e42, 0xfee00000 
var ln2_lo      = 1.90821492927058770002e-10; //  0x3dea39ef, 0x35793c76 
var invln2      = 1.44269504088896338700e+00; //  0x3ff71547, 0x652b82fe 

//  scaled coefficients related to expm1 
var Q1  =  -3.33333333333331316428e-02; //  BFA11111 111110F4 
var Q2  =   1.58730158725481460165e-03; //  3F5A01A0 19FE5585 
var Q3  =  -7.93650757867487942473e-05; //  BF14CE19 9EAADBB7 
var Q4  =   4.00821782732936239552e-06; //  3ED0CFCA 86E65239 
var Q5  =  -2.01099218183624371326e-07; //  BE8AFDB7 6E09C32D 

function expm1(x)
{
    var y;
    var hi;
    var lo;
    var k;
    var t;
    var c;
    
    var hx = _DoubleHi(x);
    var xsb = hx & 0x80000000;  // sign bit of x
    // y = |x|
    if (xsb == 0)
        y = x;
    else
        y = -x;
    hx &= 0x7fffffff;           // High word of |x|

    // Filter out huge and non-finite argument
    /* istanbul ignore if */
    if (verbose > 0)
        console.log("hx = " + hx);
    if (hx >= 0x4043687a) {     // if |x| ~=> 56*ln2
        if (hx >= 0x40862e42) { // if |x| >= 709.78
            if (hx >= 0x7ff00000) {
                if (((hx & 0xfffff) | _DoubleLo(x)) != 0) {
                    // NaN
                    return x + x;
                } else {
                    // expm1(inf) = inf; expm1(-inf) = -1
                    return xsb == 0 ? x : -1.0;
                }
            }
            if (x > o_threshold) {
                // Overflow
                return huge * huge;
            }
        }
        if (xsb != 0) {
            // x < -56*ln2 so return -1, with inexact. For Javascript,
            // we can probably skip the stuff to set the inexact flag
            // and just return -1.

            // I don't think the else case is ever reachable because x
            // < -38 and tiny = 1e300 so x + tiny < 0 always.  JS
            // doesn't have an inexact, so maybe just delete the if
            // test?
            /* istanbul ignore else */
            if (x + tiny < 0)   // This raises inexact.
                return tiny - 1;
        }
    }

    // Argument  reduction
    /* istanbul ignore if */
    if (verbose > 0)
        console.log("Arg reduction");
    if (hx > 0x3fd62e42) {      // if |x| > 0.5 * ln2
        /* istanbul ignore if */
        if (verbose > 0)
            console.log("hx > 0.5*log2");
        if (hx < 0x3ff0a2b2) {  // and |x| < 1.5 * ln2
            /* istanbul ignore if */
            if (verbose > 0)
                console.log("hx < 1.5 * log2");
            if (xsb == 0) {
                hi = x - ln2_hi;
                lo = ln2_lo;
                k = 1;
            } else {
                hi = x + ln2_hi;
                lo = -ln2_lo;
                k = -1;
            }
        } else {
            // k = (invln2 * x + ((xsb == 0) ? 0.5 : -0.5));
            k = (invln2 * x + ((xsb == 0) ? 0.5 : -0.5)) | 0;
            /* istanbul ignore if */
            if (verbose > 0)
                console.log("invln2*x, k = " + (invln2*x) + ", " + k);
            t = k;
            // t*ln2_hi is exact here.
            hi = x - t * ln2_hi;
            lo = t * ln2_lo;
        }
        x = hi - lo;
        c = (hi - x) - lo;
    } else if (hx < 0x3c900000) {
        // When |x| < 2^-54, we can // return x, setting inexact flags
        // when x != 0. The inexact stuff is probably not needed in
        // Javascript.
        /* istanbul ignore if */
        if (verbose > 0)
            console.log("hx <  0x3c900000");
        t = huge + x;
        return x - (t - (huge + x));
    } else {
        /* istanbul ignore if */
        if (verbose > 0)
            console.log("Fall through");
        k = 0;
    }

    // x is now in primary range
    /* istanbul ignore if */
    if (verbose > 0)
        console.log("In range, k = " + k);
    var hfx = 0.5 * x;
    var hxs = x * hfx;
    var r1 = 1 + hxs * (Q1 + hxs * (Q2 + hxs * (Q3 + hxs * (Q4 + hxs * Q5))));
    t = 3 - r1 * hfx;
    var e = hxs * ((r1 - t) / (6 - x*t));
    if (k == 0) {
        // c is 0
        return x - (x*e - hxs);
    } else {
        e = (x * (e - c) - c);
        e -= hxs;
        if (k == -1)
            return 0.5 * (x - e) - 0.5;
        if (k == 1) {
            if (x < -0.25)
                return -2 * (e - (x + 0.5));
            else
                return 1 + 2 * (x - e);
        }

        if (k <= -2 || k > 56) {
            /* istanbul ignore if */
            if (verbose > 0)
                console.log("k <= -2 || k > 56: k = " + k);
            // suffice to return exp(x)+1
            y = 1 - (e - x);
            // Add k to y's exponent
            y = _ConstructDouble(_DoubleHi(y) + (k << 20), _DoubleLo(y));
            /* istanbul ignore if */
            if (verbose > 0)
                console.log("New y = " + y + ", result = " + (y - 1));
            return y - 1;
        }
        if (k < 20) {
            // t = 1 - 2^k
            t = _ConstructDouble(0x3ff00000 - (0x200000 >> k), 0);
            y = t - (e - x);
            // Add k to y's exponent
            y = _ConstructDouble(_DoubleHi(y) + (k << 20), _DoubleLo(y));
        } else {
            // t = 2^-k
            t = _ConstructDouble((0x3ff - k) << 20, 0);
            y = x - (e + t);
            y += 1;
            // Add k to y's exponent
            y = _ConstructDouble(_DoubleHi(y) + (k << 20), _DoubleLo(y));
        }
    }
    return y;
}
