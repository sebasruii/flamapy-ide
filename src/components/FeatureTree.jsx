/* eslint-disable react/prop-types */
import { useState } from "react";
import { ResizableBox } from "react-resizable";
import DropdownMenu from "./DropdownMenu";

// TreeNode component for each node in the tree
const TreeNode = ({ node, statusMap, setStatusMap }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Track if the node is expanded

  // Initial status for the node is undefined
  const initialStatus = statusMap[node.name];

  // Handle expanding/collapsing of the tree node
  const handleExpandToggle = () => {
    if (node.children) {
      setIsExpanded(!isExpanded); // Toggle expand/collapse
    }
  };

  // Handle button click to toggle status
  const handleStatusToggle = () => {
    let newStatus;
    switch (statusMap[node.name]) {
      case true:
        newStatus = false;
        break;
      case false:
        newStatus = undefined;
        break;
      default:
        newStatus = true;
        break;
    }

    // Update the status map
    setStatusMap((prevStatusMap) => {
      const updatedMap = { ...prevStatusMap };
      if (newStatus === undefined) {
        delete updatedMap[node.name]; // Remove entry if status is undefined
      } else {
        updatedMap[node.name] = newStatus; // Set new status
      }
      return updatedMap;
    });
  };

  return (
    <div className="ml-4 mt-2">
      {/* Node Name with expand/collapse toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          {/* Toggle button to expand/collapse children */}
          {node.children && (
            <button
              onClick={handleExpandToggle}
              className="mr-2 focus:outline-none ml-2 p-1 text-white rounded bg-gray-500"
            >
              {isExpanded ? "-" : "+"}
            </button>
          )}

          {/* Node Name */}
          <div
            className="cursor-pointer font-semibold"
            style={{ color: node.children ? "blue" : "black" }} // Color nodes with children
          >
            {node.name}
          </div>
        </div>

        {/* Status Button */}
        <button
          onClick={handleStatusToggle}
          className={`ml-2 p-1 text-white rounded ${
            initialStatus === undefined
              ? "bg-gray-500"
              : initialStatus
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        >
          {initialStatus?.toString() || "undefined"}
        </button>
      </div>

      {/* Show children if expanded */}
      {isExpanded && node.children && (
        <div>
          {node.children.map((childNode, index) => (
            <TreeNode
              key={index}
              node={childNode}
              statusMap={statusMap}
              setStatusMap={setStatusMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// TreeView component to render the full tree
const TreeView = ({ treeData, executeAction }) => {
  const SATOperations = [
    { label: "Valid Configuration", value: "PySATSatisfiableConfiguration" },
  ];

  // State to track the status of each node
  const [statusMap, setStatusMap] = useState({});

  return (
    <ResizableBox
      width={300}
      height={Infinity}
      axis="x"
      minConstraints={[150, Infinity]}
      maxConstraints={[500, Infinity]}
      className="bg-neutral-300 text-neutral-900 p-4 resize-handle-right rounded-lg overflow-auto"
      handle={
        <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize" />
      }
    >
      <div>
        <DropdownMenu
          buttonLabel={"Configure"}
          options={SATOperations}
          executeAction={(action) => executeAction(action, statusMap)}
        />
        {/* Render TreeNode with status tracking */}
        {treeData && (
          <TreeNode
            node={treeData}
            statusMap={statusMap}
            setStatusMap={setStatusMap}
          />
        )}
      </div>
    </ResizableBox>
  );
};

export default TreeView;
