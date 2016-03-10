var BN=require("./");
var factor=10000;

var sizes=[{name:'tiddly',digits:5},
    {name:'small',digits:10},
    {name:'medium',digits:25},
    {name:'large',digits:100},
    {name:'supersize',digits:1000},
    {name:'humungous',digits:10000}];

[{name:'add',scale:1000},
    {name:'minus',scale:1000},
    {name:'mult',scale:100},
    {name:'div',scale:100}].forEach(function (op) {
    console.log("TESTING: "+op.name);
    for (var numerator = 0; numerator < sizes.length; numerator++) {
        for (var denominator = 0; denominator <= numerator; denominator++) {
            start = new Date().getTime();
            var iterations = Math.floor(factor*op.scale / sizes[numerator].digits);
            for (var i = 0; i < iterations; i++) {
                BN().random(sizes[numerator].digits)[op.name](BN().random(sizes[denominator].digits));
            }
            var end = new Date().getTime();
            console.log(((end - start) ).toLocaleString()
                        + " milliseconds to complete "
                        + iterations.toLocaleString()
                        + " iterations for sizes: "
                        + sizes[numerator].name
                        + "/" + sizes[denominator].name);
        }
    }
});
