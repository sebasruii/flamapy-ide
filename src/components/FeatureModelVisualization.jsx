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
      className="group"
    />
  );
};

// Helper function to calculate the width of a text string
const calculateTextWidth = (text, fontSize) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontSize}px sans-serif`; // Use the font family and size
  return context.measureText(text).width;
};

const RenderRectSvgNode = ({ nodeDatum, toggleNode }) => {
  const rectWidth = 130;
  const rectHeight = 60;
  const padding = 10; // Padding inside the rectangle
  const availableWidth = rectWidth - 2 * padding; // Available space for the text

  const isMandatory = nodeDatum.attributes?.isMandatory;
  const isOptional = nodeDatum.attributes?.isOptional;
  const isAlternativeGroup = nodeDatum.attributes?.isAlternativeGroup;
  const isOrGroup = nodeDatum.attributes?.isOrGroup;
  const isAbstract = nodeDatum.attributes?.isAbstract;

  const nodeName = nodeDatum.name;
  const defaultFontSize = 20; // Initial font size

  // State to store the dynamically calculated font size
  const [fontSize, setFontSize] = useState(defaultFontSize);

  useEffect(() => {
    // Calculate the width of the text with the default font size
    const textWidth = calculateTextWidth(nodeName, defaultFontSize);

    // If the text is too wide, calculate the new font size
    if (textWidth > availableWidth) {
      const newFontSize = (availableWidth / textWidth) * defaultFontSize;
      setFontSize(newFontSize); // Set the new font size
    } else {
      setFontSize(defaultFontSize); // Keep the default font size
    }
  }, [nodeName]);

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
        fill={isAbstract ? "lightgray" : "lightblue"}
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
        style={{ fontSize: `${fontSize}px`, fontWeight: "lighter" }}
      >
        {nodeName}
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
          stroke="black"
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
  const svgRef = useRef(null); // Reference to the SVG container for exporting

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

  const exportSVG = () => {
    const svgElement = svgRef.current.querySelector("svg");
    if (!svgElement) return;

    const paths = svgElement.querySelectorAll("path:not(.group)");
    paths.forEach((path) => {
      path.setAttribute("stroke", "black");
      path.setAttribute("stroke-width", "1");
      path.setAttribute("fill", "none");
    });

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "tree-visualization.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <button
        onClick={exportSVG}
        className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        Export as SVG
      </button>
      {/* Tree component from react-d3-tree */}
      <div ref={svgRef} className="w-full h-full">
        <Tree
          data={treeData} // Pass the treeData prop to Tree component
          translate={translate} // Use calculated translate for centering
          renderCustomNodeElement={(rd3tProps) => (
            <RenderRectSvgNode
              nodeDatum={rd3tProps.nodeDatum}
              toggleNode={rd3tProps.toggleNode}
            />
          )} // Custom node renderer with rectangles, mandatory dot, and alternative group arc
          orientation="vertical" // Vertical orientation
          pathFunc={"straight"}
        />
      </div>
    </div>
  );
}
