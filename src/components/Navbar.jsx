import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="flex justify-between items-center py-4 px-6 bg-white shadow">
      <div className="flex gap-4 items-center">
        <Link to="/" className="text-blue-950 text-xl font-semibold">
          FLAMAPY-IDE
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
