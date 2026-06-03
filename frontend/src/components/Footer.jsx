import React from "react";
import "../index.css";
import "../components/Navbar"
import "../about.css";
import { Link } from 'react-router-dom'

import icon16 from "../assets/logo.png";
import icon17 from "../assets/telephone.png";
import icon18 from "../assets/location.png";
import icon19 from "../assets/Email.png";


function Footer() {
    return (
        <>
    <section className="Fotter-Section">


      <div className="links">
        <p className="fotter-description">
        A passive web vulnerability scanner. Free, open, and built to make web security clear.
      </p>


        <ul>
          <h6>Quick Links</h6>
          <li>  <Link className="link" to="/About">
                          About Us
                              </Link></li>
          <li>  <Link className="link" to="/landing#protection">
                          Services
                              </Link></li>
              <li>  <Link className="link" to="/Contact">
                                 Contact
                                  </Link></li>
        </ul>

        <ul>
          <h6>Services</h6>
          <li>Vulnerability Detection</li>
          <li>Severity Triage</li>
            <li>AI Explanations</li>
              <li>Scan History</li>
        </ul>

        <ul>
           <h6>Contact</h6>
          <li className="info"><img src={icon19} alt="email" /><a href="mailto:0xbaseera@gmail.com"> 0xbaseera@gmail.com</a></li>
          <li className="info"><img src={icon17} alt="telephone" />+20 111 143 9728</li>
            <li className="info"><img src={icon18} alt="location" />Cairo, Egypt</li>

        </ul>

      </div>
        <div className="logo">
         <img src={icon16} alt="logo" />
        <h6>Baseera</h6>
      </div>
   <div className="copyright">
    <p>© 2026 Baseera. Bringing clarity to digital insights.</p>
   </div>
    </section>
        </>
    )
}
export default Footer;
