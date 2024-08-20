/* eslint-disable react/prop-types */
import { useState } from "react";

const DropdownMenu = ({ options, buttonLabel, executeAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleAction = async (action) => {
    await executeAction(action);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block w-52">
      <button
        onClick={handleToggle}
        className="w-full bg-[#356C99] text-white py-2 px-4 rounded shadow-lg flex justify-between items-center"
      >
        {buttonLabel}
        <span className="ml-2">&#9660;</span> {/* Dropdown arrow */}
      </button>
      {isOpen && (
        <div className="absolute w-full mt-1 bg-white border border-[#356C99] rounded-lg shadow-lg z-10">
          {options?.length ? (
            options.map((option) => (
              <div
                key={option.label}
                onClick={() => handleAction(option)}
                className="w-full text-left py-2 px-4 cursor-pointer hover:bg-[#0D486C] text-[#356C99] hover:text-white"
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="py-2 px-4 text-gray-500">No options available</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
