 contract SimContract is  HelloAfrica, HelloAfrica {
      /**      @notice precondition  HelloAfrica.counter3 == HelloAfrica.counter + 1  
      */
      function  inc() public  {
            HelloAfrica.inc() ; 
            HelloAfrica.inc() ; 
}
      /**      @notice precondition  third comment  
      */
      function  get() view public returns (int256) {
            var impl_0_ = HelloAfrica.get() ; 
            var spec_0_ = HelloAfrica.get() ; 
            require(spec_0_ == impl_0_, "Outputs of spec and impl differ."); 
}
      /**      @notice precondition  HelloAfrica.counter == HelloAfrica.counter - 1  
      */
      function  dec() public  {
            HelloAfrica.dec() ; 
            HelloAfrica.dec() ; 
}
}