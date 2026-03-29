import {Box} from "lucide-react";
import Button from "./ui/Button";
import { useOutletContext } from "react-router";

const Navbar = () => {
  const {isSignedIn, signIn, signOut, userName} = useOutletContext<AuthContext>()
  const handleAuthClick = async () => {
    if (isSignedIn) {
      try {
        await signOut()
      }
      catch (error) {
        console.error(`Puter sign out failed ${error}`)
      }
      return
    }
    try {
      await signIn()
    }
    catch (error) {
      console.error(`Puter sign in failed ${error}`)
    }
  }

  const handleNotImplemented = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    alert("This feature has not been implemented yet.");
  };

  return (
    <header className="navbar">
      <nav className="inner">
        <div className="left">
          <div className="brand">
            <Box className="logo" />
            <span className="name">Roomify</span>
          </div>
          <ul className="links">
            <a href="#">Product</a>
            <a href="#" onClick={handleNotImplemented}>Pricing</a>
            <a href="#" onClick={handleNotImplemented}>Community</a>
            <a href="#" onClick={handleNotImplemented}>Enterprise</a>
          </ul>
        </div>
        <div className="actions">
          {isSignedIn ? (
            <>
              <span className="greeting">
                {userName ? `Hi, ${userName}` : "Signed in"}
              </span>
              <Button size="sm" onClick={handleAuthClick} className="btn">
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={handleAuthClick} className="btn" variant="ghost">
                Log in
              </Button>
              <a href="#upload" className="cta">Get Started</a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
