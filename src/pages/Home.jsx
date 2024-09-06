/* eslint-disable react/prop-types */
import { useNavigate } from "react-router-dom";
function Home({ setSelectedFile }) {
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      navigate("/editor");
    }
  };
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4">
        <button
          className="w-full bg-[#356C99] text-white py-2 px-4 rounded active:bg-[#0D486C] shadow-lg"
          onClick={() => {
            setSelectedFile(null);
            navigate("/editor");
          }}
        >
          Create new model
        </button>
        <input
          type="file"
          id="fileInput"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button
          className="w-full bg-[#356C99] text-white py-2 px-4 rounded shadow-lg"
          onClick={() => document.getElementById("fileInput").click()}
        >
          Import model
        </button>
      </div>
    </div>
  );
}

export default Home;
