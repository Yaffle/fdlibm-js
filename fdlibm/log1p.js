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

// double log1p(double x)
//
// Method :                  
//   1. Argument Reduction: find k and f such that 
//                      1+x = 2^k * (1+f), 
//         where  sqrt(2)/2 < 1+f < sqrt(2) .
//
//      Note. If k=0, then f=x is exact. However, if k!=0, then f
//      may not be representable exactly. In that case, a correction
//      term is need. Let u=1+x rounded. Let c = (1+x)-u, then
//      log(1+x) - log(u) ~ c/u. Thus, we proceed to compute log(u),
//      and add back the correction term c/u.
//      (Note: when x > 2**53, one can simply return log(x))
//
//   2. Approximation of log1p(f).
//      Let s = f/(2+f) ; based on log(1+f) = log(1+s) - log(1-s)
//               = 2s + 2/3 s**3 + 2/5 s**5 + .....,
//               = 2s + s*R
//      We use a special Reme algorithm on [0,0.1716] to generate 
//      a polynomial of degree 14 to approximate R The maximum error 
//      of this polynomial approximation is bounded by 2**-58.45. In
//      other words,
//                      2      4      6      8      10      12      14
//          R(z) ~ Lp1*s +Lp2*s +Lp3*s +Lp4*s +Lp5*s  +Lp6*s  +Lp7*s
//      (the values of Lp1 to Lp7 are listed in the program)
//      and
//          |      2          14          |     -58.45
//          | Lp1*s +...+Lp7*s    -  R(z) | <= 2 
//          |                             |
//      Note that 2s = f - s*f = f - hfsq + s*hfsq, where hfsq = f*f/2.
//      In order to guarantee error in log below 1ulp, we compute log
//      by
//              log1p(f) = f - (hfsq - s*(hfsq+R)).
//      
//      3. Finally, log1p(x) = k*ln2 + log1p(f).  
//                           = k*ln2_hi+(f-(hfsq-(s*(hfsq+R)+k*ln2_lo)))
//         Here ln2 is split into two floating point number: 
//                      ln2_hi + ln2_lo,
//         where n*ln2_hi is always exact for |n| < 2000.
//
// Special cases:
//      log1p(x) is NaN with signal if x < -1 (including -INF) ; 
//      log1p(+INF) is +INF; log1p(-1) is -INF with signal;
//      log1p(NaN) is that NaN with no signal.
//
// Accuracy:
//      according to an error analysis, the error is always less than
//      1 ulp (unit in the last place).
//
// Constants:
// The hexadecimal values are the intended ones for the following 
// constants. The decimal values may be used, provided that the 
// compiler will convert from decimal to binary accurately enough 
// to produce the hexadecimal values shown.
//
// Note: Assuming log() return accurate answer, the following
//       algorithm can be used to compute log1p(x) to within a few ULP:
//      
//              u = 1+x;
//              if(u==1.0) return x ; else
//                         return log(u)*(x/(u-1.0));
//
//       See HP-15C Advanced Functions Handbook, p.193.
//

var ln2_hi  =  6.93147180369123816490e-01;      // 3fe62e42 fee00000 
var ln2_lo  =  1.90821492927058770002e-10;      // 3dea39ef 35793c76 
var two54   =  1.80143985094819840000e+16;  // 43500000 00000000 
var Lp1 = 6.666666666666735130e-01;  // 3FE55555 55555593 
var Lp2 = 3.999999999940941908e-01;  // 3FD99999 9997FA04 
var Lp3 = 2.857142874366239149e-01;  // 3FD24924 94229359 
var Lp4 = 2.222219843214978396e-01;  // 3FCC71C5 1D8E78AF 
var Lp5 = 1.818357216161805012e-01;  // 3FC74664 96CB03DE 
var Lp6 = 1.531383769920937332e-01;  // 3FC39A09 D078C69F 
var Lp7 = 1.479819860511658591e-01;  // 3FC2F112 DF3E5244 

function log1p (x) {
    var hx = _DoubleHi(x);
    var ax = hx & 0x7fffffff;
    var k = 1;
    var f = 0;
    var hu = 1;
    var c = 0;
    var u = 0;

    if (hx < 0x3fda827a) {
        // x < 0.41422
        if (ax >= 0x3ff00000) {
            // x <= -1: log1p(-1) = inf, log1p(x<-1) = NaN
            if (x == -1) {
                return -two54/0;
            } else {
                return (x - x) / (x - x);
            }
        }
        if (ax < 0x3e200000) {
            // |x| < 2^-29
            if ((two54 + x > 0) && (ax < 0x3c900000)) {
                // |x| < 2^-54, so just return x
                return x;
            } else {
                return x - x*x*0.5;
            }
        }
        // (int) 0xbfd2bec3 = -0x402d413d
        if ((hx > 0) || (hx <= -0x402D413D)) {
            // -.2929 < x < 0.41422
            k = 0;
            f = x;
            hu = 1;
        }
    }

    if (hx >= 0x7ff00000)
        return x + x;

    if (k != 0) {
        if (hx < 0x43400000) {
            // x < 9.007199254740992d15
            u = 1 + x;
            hu = _DoubleHi(u);
            k = (hu >> 20) - 1023;
            c = (k > 0) ? 1 - (u - x) : x - (u - 1);
            c = c / u;
            /* istanbul ignore if */
            if (verbose > 0)
                console.log("u, hu, k, c = " + u + ", " + hu + ", " + k + ", " + c);
        } else {
            u = x;
            hu = _DoubleHi(u);
            k = (hu >> 20) - 1023;
            c = 0;
        }
        hu = hu & 0xfffff;
        if (hu < 0x6a09e) {
            // Normalize u
            u = _ConstructDouble(hu | 0x3ff00000, _DoubleLo(u));
        } else {
            ++k;
            u = _ConstructDouble(hu | 0x3fe00000, _DoubleLo(u));
            hu = (0x00100000 - hu) >> 2;
        }
        f = u - 1;
    }

    var hfsq = 0.5 * f * f;
    /* istanbul ignore if */
    if (verbose > 0)
        console.log("hu, f = " + hu + ", " + f);
    if (hu == 0) {
        // |f| < 2^-20;
        if (f == 0) {
            if (k == 0) {
                return 0.0;
            } else {
                return k*ln2_hi + (c + k*ln2_lo);
            }
        }
        var R = hfsq * (1 - (2/3)*f);
        if (k == 0) {
            return f - R;
        } else {
            return k*ln2_hi-((R-(k*ln2_lo+c))-f);
        }
    }

    var s = f/(2.0+f); 
    var z = s*s;
    var R = z*(Lp1+z*(Lp2+z*(Lp3+z*(Lp4+z*(Lp5+z*(Lp6+z*Lp7))))));
    /* istanbul ignore if */
    if (verbose > 0)
        console.log("hfsq, s, z, r = " + hfsq + ", " + s + ", " + z + ", " + R);
    if (k==0) {
        return f-(hfsq-s*(hfsq+R));
    } else {
        return k*ln2_hi-((hfsq-(s*(hfsq+R)+(k*ln2_lo+c)))-f);
    }
}
