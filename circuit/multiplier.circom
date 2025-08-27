pragma circom 2.0.0;

/*This circuit template checks that c is the multiplication of a and b.*/  

template Multiplier () {  

   signal input a;  
   signal input b;  
   signal output c;  

   // Constraint   
   c <== a * b;  

}

component main = Multiplier();