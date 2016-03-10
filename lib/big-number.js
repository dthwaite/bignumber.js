/*!
 * big-number.js -> Arithmetic operations on big integers
 * Pure javascript implementation, no external libraries needed
 * Copyright(c) 2012-2016 Alex Bardas <alex.bardas@gmail.com>
 * MIT Licensed
 * It supports the following operations:
 *      addition, subtraction, multiplication, division, power, absolute value
 * It works with both positive and negative integers
 */

!(function() {
    'use strict';

    /**
     * The base to which we hold the big number
     *
     * This must be set to no more than the square root of the maximum native integer that JS can represent accurately
     * It can be any number from 2 up this maximum
     * The larger the number the more efficient the big number arithmetic will be
     * However, for division, the choice of number also has a significant impact. Infact for maximum efficiency
     * the base should have as many common factors as possible. This is maximised by having the base to be a power
     * of 2. JS typically holds integers accurately to at least up to 2^50 so a value of 2^25 would be the optimal
     * base to use. Setting the base to a prime number will have the worst effect on performance so far as division
     * is concerned.
     *
     * The original version was hard coded with a base of 10. If we set our base to this now it will have similar
     * performance, though the division routine has been optimised such that even with this base it could be up
     * to twice as fast.
     *
     * Even with the base set to 2 (i.e. the numbers are held in binary!) the arithmetic is surprisingly fast.
     * But nothing like as fast as with a base of 2^25
     *
     * @type {number}
     */
    var base=Math.pow(2,25);

    /*
     * Factorise the base - these then become the most efficient way to segment the division process
     * Essentially, the most efficient base is the one with the most factors
     * Which means that a base of a power of 2 is the best choice
     *
     * Note the factors array is an accumulation of the factors, not the factors themselves
     *
     * This is somewhat over the top, but is a good exercise to ensure that division is performed
     * with maximum efficiency whatever the base :-)
     */
    var factors=(function() {
        var result=[];
        var primes=[];
        var factorisingbase=base;
        var lastprime=2;

        // Check number for prime (assumes previous primes have been found)
        function isprime(prime) {
            // Only need to test divisors so far as the square root of the number under test
            for (var i=0; i<primes.length && primes[i]<Math.sqrt(prime); i++) {
                if (prime%primes[i]==0) return false;
            }
            return true;
        }

        while (factorisingbase>1) {
            if (factorisingbase%lastprime==0) {
                factorisingbase=Math.floor(factorisingbase/lastprime);
                result.push(factorisingbase);
            }
            else {
                do {
                    lastprime=(lastprime==2 ? 3 : lastprime+2);
                } while (!isprime(lastprime));
                primes.push(lastprime);
            }
        }
        return result;
    })();


    // Helper function which tests if a given character is a digit
    var testDigit = function(digit) {
        return (/^\d$/.test(digit));
    };

    // Helper function which returns the absolute value of a given number
    var abs = function(number) {
        var bigNumber;
        if (typeof number === 'undefined') {
            return;
        }
        bigNumber = BigNumber(number);
        bigNumber.sign = 1;
        return bigNumber;
    };

    // Helper function that performs a cheap comparison - -1 if a<b,+1 if >b, 0 if a=b
    var compare=function(a,b) {
        if (a.length== b.length) {
            for (var i= a.length-1; i>0 && a[i]==b[i]; i--);
            return i<0 || a[i]==b[i] ? 0 : (a[i]<b[i] ? -1 : 1);
        }
        return a.length<b.length ? -1 : 1;
    };

    // Helper function to remove leading zero digits from a number
    var clearLeadingZeros=function(number) {
        for (var index = number.length - 1; number[index] === 0 && index >= 0; index--);
        if (index < number.length - 1) number.splice(index-number.length+1);
        return number;
    };

    // Gets a single decimal digit value of the number assuming it is less than 10 (used by the toString() function)
    var singleDigit=function(number) {
        for (var digit= 0,multiplier= 1,i=0; i<number.length && digit<10; i++) {
            digit+=(multiplier*number[i]);
            multiplier*=base;
        }
        if (digit<10) return digit.toString();
        return '';
    };

    // Check if argument is valid array
    var isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };

    // Error values (set on BigNumber.number)
    var errors = {
        'invalid': 'Invalid Number',
        'division by zero': 'Invalid Number - Division By Zero',
        'square root negative': 'Invalid operation - Square root of a negative number'
    };


    /*
     * Constructor function which creates a new BigNumber object from an integer, a string, an array or other BigNumber object
     *
     * IMPORTANT NOTE: Once we allow for any base, the routines to initiate a number from a string of decimal numbers
     * and to output a number in decimal form (.val()) now use big number arithmetic. This has potential to get
     * us into trouble if we are to build numbers from within internal routines that are already manipulating numbers. It can cause
     * a stack overflow. This situation is now avoided by optimising the initialisation to handle more specifically
     * (and efficiently) numbers constructed from existing BigNumber objects or native numbers.
     */
    function BigNumber(initialNumber) {

        if (!(this instanceof BigNumber)) return new BigNumber(initialNumber);

        // Member properties of this class
        this.number = [];
        this.sign = 1;
        this.rest = 0;

        // No parameter initialises the number to zero
        if (!initialNumber) {
            this.number = [0];
            return;
        }

        // A big number parameter initialises this number to the same value
        if (initialNumber instanceof BigNumber) {
            this.number = initialNumber.number.slice();
            this.sign = initialNumber.sign;
            this.rest = initialNumber.rest;
            return;
        }

        // A native number makes for a fast initialisation of the number
        if (typeof initialNumber=='number') {
            this.sign=initialNumber<0 ? -1 : 1;
            initialNumber=Math.abs(initialNumber);
            while (initialNumber>0) {
                this.number.push(initialNumber%base);
                initialNumber=Math.floor(initialNumber/base);
            }
            return;
        }

        // Otherwise, now create the number from a String or Array
        var index;
        var multipleoftens=BigNumber(1);
        var ten=BigNumber(10);

        // Method removed from public API and made local within this context
        function addDigit(digit) {
            if (testDigit(digit)) {
                this.add(BigNumber(digit).mult(multipleoftens));
                multipleoftens.mult(ten);
                return true;
            }
            return false;
        }

        // The initial number can be an array or object
        // e.g. array     : [3,2,1], ['+',3,2,1], ['-',3,2,1]
        //      number    : 312
        //      string    : '321', '+321', -321'
        //      BigNumber : BigNumber(321)
        // Every character except the first must be a digit
        var sign=1;
        if (isArray(initialNumber)) {
            if (initialNumber.length && initialNumber[0] === '-' || initialNumber[0] === '+') {
                sign = initialNumber[0] === '+' ? 1 : -1;
                initialNumber.shift(0);
            }
            for (index = initialNumber.length - 1; index >= 0; index--) {
                if (!addDigit.call(this,initialNumber[index])) {
                    this.number = errors['invalid'];
                    return;
                }
            }
        } else {
            initialNumber = initialNumber.toString();
            if (initialNumber.charAt(0) === '-' || initialNumber.charAt(0) === '+') {
                sign = initialNumber.charAt(0) === '+' ? 1 : -1;
                initialNumber = initialNumber.substring(1);
            }

            for (index = initialNumber.length - 1; index >= 0; index--) {
                if (!addDigit.call(this,parseInt(initialNumber.charAt(index), 10))) {
                    this.number = errors['invalid'];
                    return;
                }
            }
        }
        this.sign=sign;
    }

    // Set the number to a positive random number of the length specified by digits
    BigNumber.prototype.random=function(digits) {
        this.number = [];
        this.sign=1;
        if (typeof digits=='number' && digits>0) {
            var digitsPerElement = Math.log(base) / Math.log(10);
            while (digits > digitsPerElement) {
                this.number.push(Math.floor(Math.random() * base));
                digits -= digitsPerElement;
            }
            this.number.push(1+Math.floor(Math.random() * Math.pow(10, digits)));
        }
        return this;
    };

    // returns:
    //      0 if this.number === number
    //      -1 if this.number < number
    //      1 if this.number > number
    BigNumber.prototype._compare = function(number) {
        // if the function is called with no arguments then return 0
        if (typeof number === 'undefined') return 0;

        var bigNumber = BigNumber(number);
        if (this.sign == bigNumber.sign) return this.sign*compare(this.number,bigNumber.number);
        else return this.sign;
    };

    // Greater than
    BigNumber.prototype.gt = function(number) {
        return this._compare(number) > 0;
    };

    // Greater than or equal
    BigNumber.prototype.gte = function(number) {
        return this._compare(number) >= 0;
    };

    // this.number equals n
    BigNumber.prototype.equals = function(number) {
        return this._compare(number) === 0;
    };

    // Less than or equal
    BigNumber.prototype.lte = function(number) {
        return this._compare(number) <= 0;
    };

    // Less than
    BigNumber.prototype.lt = function(number) {
        return this._compare(number) < 0;
    };

    // Addition
    BigNumber.prototype.add = function(number) {
        if (typeof number === 'undefined') return this;
        var bigNumber = BigNumber(number);

        if (this.sign !== bigNumber.sign) {
            if (this.sign > 0) {
                bigNumber.sign = 1;
                return this.minus(bigNumber);
            }
            else {
                this.sign = 1;
                return bigNumber.minus(this);
            }
        }

        this.number = BigNumber._add(this.number, bigNumber.number);
        return this;
    };

    // Subtraction
    BigNumber.prototype.subtract = function(number) {
        if (typeof number === 'undefined') return this;
        var bigNumber = BigNumber(number);

        if (this.sign !== bigNumber.sign) {
            BigNumber._add(this.number, bigNumber.number);
            return this;
        }

        // If current number is lesser than the given bigNumber, the result will be negative
        var comparison=compare(this.number,bigNumber.number);
        if (this.sign == bigNumber.sign) this.sign=comparison==0 ? 1 : this.sign*comparison;

        this.number = comparison<0 ? BigNumber._subtract(bigNumber.number, this.number) : BigNumber._subtract(this.number, bigNumber.number);
        return this;
    };

    // adds two positive BigNumbers
    BigNumber._add = function(a, b) {
        for (var index = 0,remainder=0; index < b.length || remainder>0; index++) {
            a[index]=remainder+(a[index] || 0)+(b[index] || 0);
            remainder=Math.floor(a[index] / base);
            a[index]%=base;
        }
        return a;
    };

    // a - b
    // a and b are 2 positive BigNumbers and a > b
    BigNumber._subtract = function(a, b) {
        for (var index = 0; index < b.length || a[index]<0; index++) {
            if (index in b) a[index] -= b[index];
            if (a[index] < 0) {
                a[index] += base;
                a[index+1]--;
            }
        }
        return clearLeadingZeros(a);
    };

    // this.number * number
    BigNumber.prototype.multiply = function(number) {
        if (typeof number === 'undefined') return this;

        var bigNumber=number;
        if (!(number instanceof BigNumber)) bigNumber = BigNumber(number);
        if (this.isZero() || bigNumber.isZero()) return BigNumber(0);
        this.sign *= bigNumber.sign;
        var result = [];
        // multiply the numbers
        for (var index = 0; index < this.number.length; index++) {
            for (var remainder = 0, givenNumberIndex = 0; givenNumberIndex < bigNumber.number.length || remainder > 0; givenNumberIndex++) {
                result[index + givenNumberIndex] = (remainder += (result[index + givenNumberIndex] || 0) + this.number[index] * (bigNumber.number[givenNumberIndex] || 0)) % base;
                remainder = Math.floor(remainder / base);
            }
        }
        this.number = result;
        return this;
    };

    // Very simply multiplication with carry assuming b, the multicand is a native number<=base and a is a BigNumber and all positive
    BigNumber._simplemultiply=function(a,b) {
        var remainder=0;
        for (var index = 0; index < a.length; index++) {
            var temp=remainder + a[index] * b;
            a[index] = temp % base;
            remainder = Math.floor(temp / base);
        }
        if (remainder) a.push(remainder);
        return a;
    };

    // this.number / number
    BigNumber.prototype.divide = function(number) {
        if (typeof number === 'undefined') return this;
        var bigNumber=number;
        if (!(number instanceof BigNumber)) bigNumber = BigNumber(number);
        var denominator=bigNumber.number;

        // test if one of the numbers is zero
        if (bigNumber.isZero()) {
            this.number = errors['division by zero'];
            return this;
        }
        if (this.isZero()) return this;

        this.sign *= bigNumber.sign;

        // Skip division by 1

        if (denominator.length === 1 && denominator[0] === 1) return this;

        // Action according to relative size of numerator and denominator
        switch (compare(this.number,denominator)) {
        case -1:
            this.rest = BigNumber(this);
            this.number = [0];
            break;

        case 0:
            this.rest = BigNumber(0);
            this.number = [1];
            break;

        case 1:
            var index;
            if (denominator.length==1) {
                for (index = this.number.length - 1,rest=0; index >= 0; index--) {
                    // If we are dividing by a small number (less than our base) then we can do this division step natively
                    // which is much faster
                    var temp = rest * base + this.number[index];
                    this.number[index] = Math.floor(temp / denominator[0]);
                    rest = temp % denominator[0];
                }
                this.rest = BigNumber(rest);
            } else {
                // Fast initialisation of the remainder (rest) until it is within the base number of the denominator
                // We could use the looping algorithm below to achieve the same thing but this is a little quicker where
                // the denominator is of a significant size
                var rest=[];
                var skip=0;
                skip = denominator.length - (this.number[this.number.length - 1] >= denominator[denominator.length - 1] ? 2 : 1);
                if (skip > 0) rest = this.number.slice(-skip);
                var result = [];

                // Preset multiples of the denominator from the factors of our base. This precalculation improves performance
                var denominatormultiples=[];
                for (index=0; index<factors.length; index++) denominatormultiples.push(BigNumber._simplemultiply(denominator.slice(),factors[index]));

                /*
                * Loop through numerators digits - some observations...
                *
                * Note that this whole routine effectively means we do LOG2(numerator) native subtractions to achieve the division!
                * Which means that the execution speed is essentially in proportion to log(numerator)
                * Denominator size is irrelevant unless it is a significant by comparison to the numerator
                * due to the optimisation detailed above (remainder initialisation)
                *
                * For each numerator digit tot up the result using the factored denominator numbers
                * Essentially we are asking how many times we can subtract the denominator from the powered up remainder
                * Using a base of a power of two is a bit like doing a "binary chop" - we take lots away first and then ever smaller half-chunks
                *
                * For optimum performance, the base should be a power of 2 which means the inner "while" loop only really needs to be an "if"
                */
                for (index = this.number.length - 1 - skip; index >= 0; index--) {
                    result[index] = 0;
                    if (rest.length>0 || this.number[index]>0) {
                        rest.unshift(this.number[index]);
                        for (var i = 0; i < factors.length; i++) {
                            while (compare(denominatormultiples[i], rest) <= 0) {
                                result[index] += factors[i];
                                BigNumber._subtract(rest, denominatormultiples[i]);
                            }
                        }
                    }
                }
                this.rest = BigNumber();
                this.rest.number = rest;
                this.number = result;
            }
            clearLeadingZeros(this.number);
            break;
        }
        return this;
    };

    // this.number % number
    BigNumber.prototype.mod = function(number) {
        return this.divide(number).rest;
    };

    BigNumber.prototype.power = function(number) {
        if (typeof number === 'undefined') return;

        // Convert the argument to a number
        number = +number;
        if (number === 0) return BigNumber(1);
        if (number === 1) return this;

        var bigNumber = BigNumber(this);

        this.number = [1];
        while (number > 0) {
            if (number % 2 === 1) {
                this.multiply(bigNumber);
                number--;
            } else {
                bigNumber.multiply(bigNumber);
                number = Math.floor(number / 2);
            }
        }
        return this;
    };

    BigNumber.prototype.sqrt=function() {
        if (this.lt(0)) {
            this.number=errors['square root negative'];
            return this;
        }
        if (this.isZero()) return this;

        var last;
        var next=BigNumber();
        next.number=[];

        // Create a number that is an approximate square root of this number (i.e. half the digit length)
        for (var size=(this.number.length-1+Math.log(this.number[this.number.length-1])/Math.log(base))/2; size>1; size--) {
            next.number.push(0);
        }
        next.number.push(Math.floor(Math.pow(base,size)));

        // Newton's method to zoom in on the square root by successive approximations
        do {
            last=BigNumber(next);
            next=BigNumber(this).div(last).add(last).div(2);
        } while (!last.equals(next));
        this.number=last.number.slice();
        return this;
    };

    // |this.number|
    BigNumber.prototype.abs = function() {
        this.sign = 1;
        return this;
    };

    // Check if this.number is equal to 0
    BigNumber.prototype.isZero = function() {
        var index;
        for (index = 0; index < this.number.length; index++) {
            if (this.number[index] !== 0) return false;
        }
        return true;
    };

    // this.number.toString()
    // Due to the number not necessarily being in base 10, we need to use BigNumber division
    // to extract the decimal digits
    BigNumber.prototype.toString = function() {
        var str = '';
        if (typeof this.number === 'string') return this.number;

        var ten=BigNumber(10);
        var clone=BigNumber(this).abs();
        while(!clone.isZero()) {
            str=singleDigit(clone.mod(ten).number)+str;
        }
        if (str.length==0) str='0';
        return (this.sign > 0) ? str : ('-' + str);
    };

    // Use shortcuts for functions names
    BigNumber.prototype.plus = BigNumber.prototype.add;
    BigNumber.prototype.minus = BigNumber.prototype.subtract;
    BigNumber.prototype.div = BigNumber.prototype.divide;
    BigNumber.prototype.mult = BigNumber.prototype.multiply;
    BigNumber.prototype.pow = BigNumber.prototype.power;
    BigNumber.prototype.val = BigNumber.prototype.toString;

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = BigNumber;
    } else if (typeof define === 'function' && define.amd) {
        define(['BigNumber'], BigNumber);
    } else if (typeof window !== 'undefined') {
        window.BigNumber = BigNumber;
    }
})();
