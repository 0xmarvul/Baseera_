import React from "react";
import "../index.css";
import "../components/Navbar"
import "../about.css";    
import { Link } from 'react-router-dom'                              
import icon1 from "../assets/about.png";
import icon2 from "../assets/Mission.png";
import icon3 from "../assets/networksecurity.png";
import icon4 from "../assets/Row.png";                                      

import icon5 from "../assets/Icon(6).png";
import icon7 from "../assets/lock.png";
import icon8 from "../assets/support.png";          
import icon9 from "../assets/yes.png";
import icon16 from "../assets/logo.png";
import icon17 from "../assets/telephone.png";
import icon18 from "../assets/location.png";
import icon19 from "../assets/Email.png";


function Fotter() {
    return (
        <>  
    <section className="Fotter-Section">

      
      <div className="links">
        <p className="fotter-description">
        Protecting your digital assets with cutting-edge cybersecurity solutions.
      </p>
      
   
        <ul>
          <h6>Quick Links</h6>
          <li>  <Link className="link" to="/About">
                          About Us
                              </Link></li>
          <li><a href="">Services</a></li>
            <li><a href="">Articles</a></li>
              <li>  <Link className="link" to="/Contact">
                                 Contact
                                  </Link></li>
        </ul>
         
        <ul>
          <h6>Services</h6>
          <li>Security Vetting</li>
          <li>Threat Detection</li>
            <li>Data Protection</li>
              <li>Consulting</li>
        </ul>
          
        <ul>
           <h6>Contact</h6>
          <li className="info"><img src={icon19} alt="email" /><a href="" > 0xbaseera@gmail.com</a></li>
          <li className="info"><img src={icon17} alt="telephone" />+1 (555) 123-4567</li>
            <li className="info"><img src={icon18} alt="location" />Cairo, Egypt</li>
              
        </ul>
      
      </div>
        <div className="logo">
         <img src={icon16} alt="logo" />
        <h6>Baseera</h6>
      </div>
   <div className="copyright">
    <p>© 2025 Baseera. Bringing clarity to digital insights.</p>
   </div>
    </section>
        </>
    )
}                   
export default Fotter;