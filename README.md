## BigNumber.js

[![Build Status](https://secure.travis-ci.org/dthwaite/bignumber.js.png)](http://travis-ci.org/dthwaite/bignumber.js)

BigNumber.js is a light javascript library for node.js and the browser. It supports arithmetic operations on Big Integers.

It is build with performance in mind, uses the fastest algorithms and supports all basic arithmetic operations
(+, -, *, /, %, ^, abs, sqrt). Works with both positive and negative big integers.

The original version should be credited to:

: (http://alexbardas.github.io/bignumber.js/)

From which this is a heavily modified fork. This is a simple and easy to understand library (Thank you, Alex!)
though it suffered performance-wise which I have resolved the best I can. It now performs (almost) as well
as another, much more comprehsive library: http://mikemcl.github.io/bignumber.js. Faster, even, for smaller
numbers as I've put in additional optimisations in such cases.

However, for large divisions Mike's is still slightly faster and I can't work out how to beat him! Oh well.

Install:
npm install

Test:
npm test

Usage:

* in node:
```javascript
	var BigNumber = require('big-number');

    BigNumber(5).plus(97).minus(53).plus(434).multiply(5435423).add(321453).multiply(21).div(2).pow(2);
    // 760056543044267246001
```

* in the browser:
```javascript
	<script src ="big-number.js"></script>

    n(5).plus(97).minus(53).plus(434).multiply(5435423).add(321453).multiply(21).div(2).pow(2);
    // 760056543044267246001
```

### API

Supported methods: `add/plus`, `minus/subtract`, `multiply/mult`, `divide/div`, `power/pow`, `sqrt`, `mod`, `equals`,
`lt`, `lte`, `gt`, `gte`, `isZero`, `abs`

###### Addition
```javascript
	BigNumber(2).plus(10); // or
	BigNumber(2).add(10);
```

###### Subtraction
```javascript
	BigNumber(2).minus(10); // or
	BigNumber(2).subtract(10);
```

###### Multiplication
```javascript
	BigNumber(2).multiply(10); // or
	BigNumber(2).mult(10);
```

###### Division
```javascript
	BigNumber(2).divide(10); // or
	BigNumber(2).div(10);
```

###### Modulo
```javascript
	BigNumber(53).mod(14);
```

###### Power
```javascript
	BigNumber(2).power(10); // or
	BigNumber(2).pow(10);
```

###### Square root
```javascript
	BigNumber(64).sqrt();
```
