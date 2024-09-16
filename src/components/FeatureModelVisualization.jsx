/* eslint-disable react/prop-types */
import { useEffect, useState, useRef } from "react";
import Tree from "react-d3-tree";

// Function to draw an arc between the children
const drawSemicircle = (rectWidth, rectHeight, isAlternative) => {
  const radius = rectWidth / 4; // Make the radius half the width of the node
  const startX = radius; // Start X position
  const startY = rectHeight / 2; // Start Y position at the bottom of the rectangle
  const endX = -radius;
  const endY = rectHeight / 2;

  return (
    <path
      d={`M ${startX},${startY} A ${radius},${radius} 0 0,1 ${endX},${endY}`}
      fill={isAlternative ? "none" : "gray"}
      stroke="black"
      strokeWidth="1"
    />
  );
};

// Custom render function for each node
const renderRectSvgNode = ({ nodeDatum, toggleNode }) => {
  const rectWidth = 130;
  const rectHeight = 60;
  const isMandatory = nodeDatum.attributes?.isMandatory;
  const isOptional = nodeDatum.attributes?.isOptional;
  const isAlternativeGroup = nodeDatum.attributes?.isAlternativeGroup;
  const isOrGroup = nodeDatum.attributes?.isOrGroup;

  // Calculate position for the mandatory black dot (intersection with parent edge)
  const dotPosition = { x: 0, y: -rectHeight / 2 };

  return (
    <g>
      {/* Rectangle to represent the node */}
      <rect
        width={rectWidth}
        height={rectHeight}
        x={-rectWidth / 2}
        y={-rectHeight / 2}
        fill="lightblue"
        stroke="blue"
        strokeWidth="1"
        rx="10" // Rounded corners
        onClick={toggleNode}
      />

      {/* Node name inside the rectangle */}
      <text
        fill="black"
        x="0"
        y="5" // Center text vertically inside the rectangle
        textAnchor="middle" // Center text horizontally
        style={{ fontSize: "20px", fontWeight: "lighter" }}
      >
        {nodeDatum.name}
      </text>

      {/* Render a black dot if the feature is mandatory */}
      {isMandatory && (
        <circle
          cx={dotPosition.x} // Positioned at the top middle of the rectangle
          cy={dotPosition.y}
          r={5} // Radius of the black dot
          fill="black"
        />
      )}

      {/* Render a black dot if the feature is optional */}
      {isOptional && (
        <circle
          cx={dotPosition.x} // Positioned at the top middle of the rectangle
          cy={dotPosition.y}
          r={5} // Radius of the black dot
          fill="white"
        />
      )}

      {/* Render arc between children if it's an alternative group */}
      {(isAlternativeGroup || isOrGroup) && (
        <g>{drawSemicircle(rectWidth, rectHeight, isAlternativeGroup)}</g>
      )}
    </g>
  );
};

// Component that renders the tree and centers it
export default function FeatureModelVisualization({ treeData }) {
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null); // Reference to the parent container

  // Function to update the tree's translation based on the container size
  const updateTreePosition = () => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: height / 4 }); // Center horizontally and place tree near top vertically
    }
  };

  // Run on initial render and window resize to update the tree position
  useEffect(() => {
    updateTreePosition(); // Initial center
    window.addEventListener("resize", updateTreePosition); // Recenter on resize

    return () => window.removeEventListener("resize", updateTreePosition); // Cleanup on unmount
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Tree component from react-d3-tree */}
      <Tree
        data={treeData} // Pass the treeData prop to Tree component
        translate={translate} // Use calculated translate for centering
        renderCustomNodeElement={(rd3tProps) => renderRectSvgNode(rd3tProps)} // Custom node renderer with rectangles, mandatory dot, and alternative group arc
        orientation="vertical" // Vertical orientation
      />
    </div>
  );
}
